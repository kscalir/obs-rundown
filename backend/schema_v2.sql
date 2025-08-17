-- OBS Rundown Database Schema v2
-- Adds support for automation timing and graphics layering system

-- Drop existing tables if they exist
DROP TABLE IF EXISTS rundown_overlays;
DROP TABLE IF EXISTS rundown_items;
DROP TABLE IF EXISTS rundown_groups;
DROP TABLE IF EXISTS rundown_segments;
DROP TABLE IF EXISTS episodes;
DROP TABLE IF EXISTS media;
DROP TABLE IF EXISTS shows;
DROP TABLE IF EXISTS graphics_templates;

-- Shows table (unchanged)
CREATE TABLE shows (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now'))
);

-- Episodes table (unchanged)
CREATE TABLE episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    show_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE
);

-- Media table (unchanged)
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

-- Graphics Templates table (new)
CREATE TABLE graphics_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    show_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'lower_third', 'bug', 'ticker', 'panel', 'full_screen'
    template_data TEXT, -- JSON with template configuration
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE
);

-- Rundown Segments table (unchanged)
CREATE TABLE rundown_segments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    episode_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
);

-- Rundown Groups table (unchanged)
CREATE TABLE rundown_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    segment_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    FOREIGN KEY (segment_id) REFERENCES rundown_segments(id) ON DELETE CASCADE
);

-- Rundown Items table (updated with automation fields)
CREATE TABLE rundown_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    parent_item_id INTEGER, -- For child items (overlays attached to parent)
    type TEXT NOT NULL, -- 'video', 'graphics', 'obs_scene', 'manual', 'presenter_note', 'auto_overlay', 'manual_overlay', 'full_screen_graphic'
    title TEXT,
    data TEXT, -- JSON data for the item
    position INTEGER DEFAULT 0,
    name TEXT,
    
    -- Automation fields (new)
    automation_mode TEXT DEFAULT 'manual', -- 'manual' or 'auto'
    automation_duration INTEGER DEFAULT 10, -- Duration in seconds for auto mode
    use_media_duration BOOLEAN DEFAULT 0, -- For videos, use actual media duration
    
    -- Graphics overlay specific fields (new)
    overlay_type TEXT, -- 'auto_overlay', 'manual_overlay', 'full_screen'
    overlay_in_point INTEGER DEFAULT 0, -- Seconds from parent start for auto overlays
    overlay_duration INTEGER, -- Duration for auto overlays
    overlay_automation TEXT DEFAULT 'auto_out', -- 'auto_out', 'leave_in_local', 'leave_in_global'
    overlay_color_index INTEGER, -- For manual overlays color coding (0-7)
    
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    FOREIGN KEY (group_id) REFERENCES rundown_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_item_id) REFERENCES rundown_items(id) ON DELETE CASCADE
);

-- Execution State table (new - for tracking live execution)
CREATE TABLE execution_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    episode_id INTEGER NOT NULL,
    live_item_id INTEGER,
    preview_item_id INTEGER,
    next_item_id INTEGER,
    is_paused BOOLEAN DEFAULT 0,
    paused_at INTEGER, -- Timestamp when paused
    remaining_time INTEGER, -- Remaining countdown time when paused
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

-- Create indexes
CREATE INDEX idx_episodes_show ON episodes(show_id);
CREATE INDEX idx_media_show ON media(show_id);
CREATE INDEX idx_graphics_templates_show ON graphics_templates(show_id);
CREATE INDEX idx_segments_episode ON rundown_segments(episode_id);
CREATE INDEX idx_groups_segment ON rundown_groups(segment_id);
CREATE INDEX idx_items_group ON rundown_items(group_id);
CREATE INDEX idx_items_parent ON rundown_items(parent_item_id);
CREATE INDEX idx_items_type ON rundown_items(type);
CREATE INDEX idx_items_overlay_type ON rundown_items(overlay_type);
CREATE INDEX idx_media_type ON media(type);
CREATE INDEX idx_execution_state_episode ON execution_state(episode_id);

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

CREATE TRIGGER graphics_templates_update_timestamp AFTER UPDATE ON graphics_templates
BEGIN
    UPDATE graphics_templates SET updated_at = strftime('%Y-%m-%d %H:%M:%S', 'now') WHERE id = NEW.id;
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

CREATE TRIGGER execution_state_update_timestamp AFTER UPDATE ON execution_state
BEGIN
    UPDATE execution_state SET updated_at = strftime('%Y-%m-%d %H:%M:%S', 'now') WHERE id = NEW.id;
END;