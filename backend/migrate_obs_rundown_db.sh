#!/usr/bin/env bash
set -euo pipefail

DB_PATH="${1:-./database.sqlite}"

# Ensure node is present
command -v node >/dev/null 2>&1 || { echo "node is required"; exit 1; }

# Ensure better-sqlite3 is installed in this project
node -e "require('better-sqlite3')" 2>/dev/null || {
  echo "better-sqlite3 not found in this project. Install with:"
  echo "  npm i better-sqlite3"
  exit 1
}

node "$DB_PATH" <<'NODE'
/* Unified migration for OBS Rundown DB (idempotent) */
const Database = require('better-sqlite3');

const dbPath = process.argv[2] || './database.sqlite';
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const tx = db.transaction(() => {
  // ========= Core editorial model (rundown/cues/scene instances) =========
  db.prepare(`
    CREATE TABLE IF NOT EXISTS rundowns (
      id           INTEGER PRIMARY KEY,
      name         TEXT NOT NULL,
      created_at   TEXT DEFAULT (datetime('now')),
      updated_at   TEXT DEFAULT (datetime('now'))
    )
  `).run();

  // Note: keeping prior schema (rundown-scoped cues with 'position')
  db.prepare(`
    CREATE TABLE IF NOT EXISTS cues (
      id           INTEGER PRIMARY KEY,
      rundown_id   INTEGER NOT NULL REFERENCES rundowns(id) ON DELETE CASCADE,
      name         TEXT NOT NULL,
      position     INTEGER NOT NULL, -- order inside rundown
      created_at   TEXT DEFAULT (datetime('now')),
      updated_at   TEXT DEFAULT (datetime('now')),
      UNIQUE (rundown_id, position)
    )
  `).run();

  // Scene catalog (for placeholder mapping & cue_items)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS scenes (
      id    INTEGER PRIMARY KEY,
      name  TEXT NOT NULL UNIQUE
    )
  `).run();

  // Placeholders detected in scenes (OBS color sources, etc.)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS scene_placeholders (
      id            INTEGER PRIMARY KEY,
      scene_id      INTEGER NOT NULL,
      obs_item_id   INTEGER NOT NULL,
      label         TEXT,
      px            REAL, py REAL, pw REAL, ph REAL,
      UNIQUE(scene_id, obs_item_id),
      FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE
    )
  `).run();

  // Specific uses of a scene within a cue (e.g., Scene A #1, Scene A #2)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS scene_instances (
      id             INTEGER PRIMARY KEY,
      cue_id         INTEGER NOT NULL REFERENCES cues(id) ON DELETE CASCADE,
      scene_name     TEXT NOT NULL,          -- name, not FK, for flexibility
      instance_index INTEGER NOT NULL,       -- first "Scene A" = 1, etc.
      notes          TEXT,
      created_at     TEXT DEFAULT (datetime('now')),
      updated_at     TEXT DEFAULT (datetime('now')),
      UNIQUE (cue_id, scene_name, instance_index)
    )
  `).run();

  // Per-instance source states (transform/settings) for runtime recall
  db.prepare(`
    CREATE TABLE IF NOT EXISTS scene_item_states (
      id                  INTEGER PRIMARY KEY,
      scene_instance_id   INTEGER NOT NULL REFERENCES scene_instances(id) ON DELETE CASCADE,
      source_name         TEXT NOT NULL,                    -- e.g., "CG-1", "Video A", camera
      enabled             INTEGER NOT NULL DEFAULT 0,       -- 0/1
      transform_json      TEXT,                             -- JSON for SetSceneItemTransform
      settings_json       TEXT,                             -- JSON for input settings (loop/volume/etc.)
      continue_within_cue INTEGER NOT NULL DEFAULT 0,       -- 0/1 (media continue inside cue)
      assigned_player     TEXT,                             -- nullable (e.g., "Video B")
      updated_at          TEXT DEFAULT (datetime('now')),
      UNIQUE (scene_instance_id, source_name)
    )
  `).run();

  // ========= Alternate multi-scene binding layer (template-ish) =========
  // Cue->Scene ordered relationship
  db.prepare(`
    CREATE TABLE IF NOT EXISTS cue_items (
      id            INTEGER PRIMARY KEY,
      cue_id        INTEGER NOT NULL,
      scene_id      INTEGER NOT NULL,
      order_index   INTEGER NOT NULL,
      FOREIGN KEY (cue_id) REFERENCES cues(id) ON DELETE CASCADE,
      FOREIGN KEY (scene_id) REFERENCES scenes(id)
    )
  `).run();

  // Per-placeholder binding for a cue_item (CG/media/camera/image + options)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS cue_item_bindings (
      id                INTEGER PRIMARY KEY,
      cue_item_id       INTEGER NOT NULL,
      placeholder_id    INTEGER NOT NULL,
      source_type       TEXT NOT NULL CHECK (source_type IN ('cg','media','camera','image')),
      source_ref        TEXT,                                -- e.g., media path, camera source, template id
      continue_video    INTEGER NOT NULL DEFAULT 0,
      loop              INTEGER NOT NULL DEFAULT 0,
      audio_enabled     INTEGER NOT NULL DEFAULT 1,
      audio_volume_pct  INTEGER NOT NULL DEFAULT 100,
      UNIQUE(cue_item_id, placeholder_id),
      FOREIGN KEY (cue_item_id)    REFERENCES cue_items(id)          ON DELETE CASCADE,
      FOREIGN KEY (placeholder_id) REFERENCES scene_placeholders(id)
    )
  `).run();

  // ========= Media catalogs & shared players =========
  // Rich media catalog (video/image/audio + tech metadata)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS media_assets (
      id            INTEGER PRIMARY KEY,
      kind          TEXT NOT NULL CHECK (kind IN ('video','image','audio')),
      path          TEXT NOT NULL UNIQUE,
      duration_ms   INTEGER,
      width         INTEGER,
      height        INTEGER,
      hash          TEXT,
      added_at      INTEGER NOT NULL
    )
  `).run();

  // Legacy/simple library table (kept for compatibility)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS media_library (
      id            INTEGER PRIMARY KEY,
      label         TEXT NOT NULL,
      path          TEXT NOT NULL,
      duration_ms   INTEGER,
      metadata_json TEXT,
      created_at    TEXT DEFAULT (datetime('now')),
      updated_at    TEXT DEFAULT (datetime('now')),
      UNIQUE (path)
    )
  `).run();

  // Pooled players (e.g., "Video A".."Video D")
  db.prepare(`
    CREATE TABLE IF NOT EXISTS video_players (
      id    INTEGER PRIMARY KEY,
      name  TEXT NOT NULL UNIQUE
    )
  `).run();

  // Reservation of a player by a cue (for continue-within-cue)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS player_reservations (
      id              INTEGER PRIMARY KEY,
      player_id       INTEGER NOT NULL,
      cue_id          INTEGER NOT NULL,
      media_id        INTEGER NOT NULL,
      started_at_ms   INTEGER NOT NULL,
      paused          INTEGER NOT NULL DEFAULT 1,
      position_ms     INTEGER NOT NULL DEFAULT 0,
      UNIQUE(player_id, cue_id),
      FOREIGN KEY (player_id) REFERENCES video_players(id) ON DELETE CASCADE,
      FOREIGN KEY (cue_id)    REFERENCES cues(id)         ON DELETE CASCADE,
      FOREIGN KEY (media_id)  REFERENCES media_assets(id) ON DELETE CASCADE
    )
  `).run();

  // Optional cue runtime marker (last-seen, etc.)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS cue_runtime_state (
      cue_id        INTEGER PRIMARY KEY,
      last_seen_ms  INTEGER NOT NULL,
      notes         TEXT,
      FOREIGN KEY (cue_id) REFERENCES cues(id) ON DELETE CASCADE
    )
  `).run();

  // ========= Helpful indexes =========
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_cues_rundown       ON cues(rundown_id)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_scene_instances_cue ON scene_instances(cue_id)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_item_states_instance ON scene_item_states(scene_instance_id)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_media_path          ON media_assets(path)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_bindings_cueitem    ON cue_item_bindings(cue_item_id)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_res_player_cue      ON player_reservations(player_id, cue_id)`).run();

  // ========= Seed minimal data if empty =========
  const rCount = db.prepare(`SELECT COUNT(*) AS n FROM rundowns`).get().n;
  if (rCount === 0) {
    const insRundown = db.prepare(`INSERT INTO rundowns (name) VALUES (?)`);
    const insCue     = db.prepare(`INSERT INTO cues (rundown_id, name, position) VALUES (?,?,?)`);
    const insScene   = db.prepare(`INSERT INTO scenes (name) VALUES (?)`);
    const insInst    = db.prepare(`INSERT INTO scene_instances (cue_id, scene_name, instance_index) VALUES (?,?,?)`);
    const insState   = db.prepare(`
      INSERT INTO scene_item_states
        (scene_instance_id, source_name, enabled, transform_json, settings_json, continue_within_cue, assigned_player)
      VALUES (?,?,?,?,?,?,?)
    `);

    const rundownId = insRundown.run('Sample Rundown').lastInsertRowid;

    // Cue 1
    const cue1 = insCue.run(rundownId, 'Cue 1', 1).lastInsertRowid;

    // Seed a couple of scenes in catalog
    try { insScene.run('Scene A'); } catch (_) {}
    try { insScene.run('Scene B'); } catch (_) {}

    // Scene A (instance 1 and 2)
    const sA1 = insInst.run(cue1, 'Scene A', 1).lastInsertRowid;
    const sA2 = insInst.run(cue1, 'Scene A', 2).lastInsertRowid;

    // In Scene A #1, CG-1 enabled
    insState.run(
      sA1,
      'CG-1',
      1,
      JSON.stringify({ positionX: 100, positionY: 100, scaleX: 1, scaleY: 1, alignment: 5 }),
      JSON.stringify({}),
      0,
      null
    );

    // In Scene A #2, CG-1 disabled
    insState.run(
      sA2,
      'CG-1',
      0,
      JSON.stringify({ positionX: 100, positionY: 100, scaleX: 1, scaleY: 1, alignment: 5 }),
      JSON.stringify({}),
      0,
      null
    );

    // Example media in Scene A #1 marked continue-within-cue
    insState.run(
      sA1,
      'Video A', // abstract; runtime can swap to any real player
      1,
      JSON.stringify({ positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, alignment: 5 }),
      JSON.stringify({
        media: {
          path: '/assets/clips/intro.mp4',
          loop: false,
          volume_percent: 80,
          audio_enabled: true,
          restart_on_activate: false,
          hardware_decode: true
        }
      }),
      1,
      null
    );
  }

  // Seed video players (Video A..D)
  const havePlayers = db.prepare(`SELECT COUNT(*) AS n FROM video_players`).get().n;
  if (havePlayers === 0) {
    const add = db.prepare(`INSERT OR IGNORE INTO video_players (name) VALUES (?)`);
    ['Video A','Video B','Video C','Video D'].forEach(n => { try { add.run(n); } catch(_) {} });
  }
});

tx();

console.log(`✅ Migration complete: ${dbPath}`);
NODE

echo "Done."