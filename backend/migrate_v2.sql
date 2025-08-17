-- Migration script to update existing database for automation and graphics support
-- Run this against your existing database to add new fields

-- Add graphics templates table
CREATE TABLE IF NOT EXISTS graphics_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    show_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'lower_third', 'bug', 'ticker', 'panel', 'full_screen'
    template_data TEXT, -- JSON with template configuration
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE
);

-- Add execution state table
CREATE TABLE IF NOT EXISTS execution_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    episode_id INTEGER NOT NULL,
    live_item_id INTEGER,
    preview_item_id INTEGER,
    next_item_id INTEGER,
    is_paused BOOLEAN DEFAULT 0,
    paused_at INTEGER,
    remaining_time INTEGER,
    armed_transition TEXT,
    armed_manual_item_id INTEGER,
    current_manual_block_id INTEGER,
    active_overlays TEXT, -- JSON array of active overlay states
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE,
    FOREIGN KEY (live_item_id) REFERENCES rundown_items(id) ON DELETE SET NULL,
    FOREIGN KEY (preview_item_id) REFERENCES rundown_items(id) ON DELETE SET NULL,
    FOREIGN KEY (next_item_id) REFERENCES rundown_items(id) ON DELETE SET NULL,
    FOREIGN KEY (armed_manual_item_id) REFERENCES rundown_items(id) ON DELETE SET NULL,
    FOREIGN KEY (current_manual_block_id) REFERENCES rundown_items(id) ON DELETE SET NULL
);

-- Add new columns to rundown_items table
-- Note: SQLite doesn't support adding multiple columns in one ALTER statement
ALTER TABLE rundown_items ADD COLUMN parent_item_id INTEGER REFERENCES rundown_items(id) ON DELETE CASCADE;
ALTER TABLE rundown_items ADD COLUMN automation_mode TEXT DEFAULT 'manual';
ALTER TABLE rundown_items ADD COLUMN automation_duration INTEGER DEFAULT 10;
ALTER TABLE rundown_items ADD COLUMN use_media_duration BOOLEAN DEFAULT 0;
ALTER TABLE rundown_items ADD COLUMN overlay_type TEXT;
ALTER TABLE rundown_items ADD COLUMN overlay_in_point INTEGER DEFAULT 0;
ALTER TABLE rundown_items ADD COLUMN overlay_duration INTEGER;
ALTER TABLE rundown_items ADD COLUMN overlay_automation TEXT DEFAULT 'auto_out';
ALTER TABLE rundown_items ADD COLUMN overlay_color_index INTEGER;

-- Create new indexes
CREATE INDEX IF NOT EXISTS idx_graphics_templates_show ON graphics_templates(show_id);
CREATE INDEX IF NOT EXISTS idx_items_parent ON rundown_items(parent_item_id);
CREATE INDEX IF NOT EXISTS idx_items_overlay_type ON rundown_items(overlay_type);
CREATE INDEX IF NOT EXISTS idx_execution_state_episode ON execution_state(episode_id);

-- Note: Triggers are not created with IF NOT EXISTS in this migration
-- They will be handled separately if needed