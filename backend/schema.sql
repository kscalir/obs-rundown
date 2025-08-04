-- Drop existing tables if they exist
DROP TABLE IF EXISTS rundown_items;
DROP TABLE IF EXISTS rundown_groups;
DROP TABLE IF EXISTS rundown_segments;
DROP TABLE IF EXISTS episodes;
DROP TABLE IF EXISTS media;
DROP TABLE IF EXISTS shows;

-- Shows table
CREATE TABLE shows (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now'))
);

-- Episodes table
CREATE TABLE episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    show_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE
);

-- Media table
CREATE TABLE media (
    id INTEGER PRIMARY KEY,
    show_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    type TEXT NOT NULL,
    originalname TEXT,
    thumb TEXT,
    name TEXT,
    size INTEGER,
    duration REAL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE
);

-- Rundown Segments table
CREATE TABLE rundown_segments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    episode_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
);

-- Rundown Groups table
CREATE TABLE rundown_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    segment_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    FOREIGN KEY (segment_id) REFERENCES rundown_segments(id) ON DELETE CASCADE
);

-- Rundown Items table
CREATE TABLE rundown_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT,
    data TEXT,
    position INTEGER DEFAULT 0,
    name TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    FOREIGN KEY (group_id) REFERENCES rundown_groups(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_episodes_show ON episodes(show_id);
CREATE INDEX idx_media_show ON media(show_id);
CREATE INDEX idx_segments_episode ON rundown_segments(episode_id);
CREATE INDEX idx_groups_segment ON rundown_groups(segment_id);
CREATE INDEX idx_items_group ON rundown_items(group_id);
CREATE INDEX idx_media_type ON media(type);

-- Create update triggers
CREATE TRIGGER shows_update_timestamp AFTER UPDATE ON shows
BEGIN
    UPDATE shows SET updated_at = strftime('%Y-%m-%d %H:%M:%S', 'now') WHERE id = NEW.id;
END;

CREATE TRIGGER episodes_update_timestamp AFTER UPDATE ON episodes
BEGIN
    UPDATE episodes SET updated_at = strftime('%Y-%m-%d %H:%M:%S', 'now') WHERE id = NEW.id;
END;

CREATE TRIGGER media_update_timestamp AFTER UPDATE ON media
BEGIN
    UPDATE media SET updated_at = strftime('%Y-%m-%d %H:%M:%S', 'now') WHERE id = NEW.id;
END;

CREATE TRIGGER segments_update_timestamp AFTER UPDATE ON rundown_segments
BEGIN
    UPDATE rundown_segments SET updated_at = strftime('%Y-%m-%d %H:%M:%S', 'now') WHERE id = NEW.id;
END;

CREATE TRIGGER groups_update_timestamp AFTER UPDATE ON rundown_groups
BEGIN
    UPDATE rundown_groups SET updated_at = strftime('%Y-%m-%d %H:%M:%S', 'now') WHERE id = NEW.id;
END;

CREATE TRIGGER items_update_timestamp AFTER UPDATE ON rundown_items
BEGIN
    UPDATE rundown_items SET updated_at = strftime('%Y-%m-%d %H:%M:%S', 'now') WHERE id = NEW.id;
END;
