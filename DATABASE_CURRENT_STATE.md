# Current Database State Documentation

## Overview
The database has been successfully migrated to support automation timing and graphics layering.

## Tables Structure

### 1. **shows**
- Basic show information
- Fields: id, name, created_at, updated_at

### 2. **episodes**
- Episodes within shows
- Fields: id, show_id, name, created_at, updated_at

### 3. **media**
- Media files (videos, images, audio)
- Fields: id, show_id, filename, type, originalname, thumb, name, size, duration, created_at, updated_at

### 4. **rundown_segments**
- Top-level segments in an episode
- Fields: id, episode_id, name, position, created_at, updated_at

### 5. **rundown_groups** (Cues)
- Groups within segments (these are the "cues")
- Fields: id, segment_id, name, position, created_at, updated_at

### 6. **rundown_items** (UPDATED)
- Individual items within groups
- Original fields: id, group_id, type, title, data, position, name, created_at, updated_at
- **NEW AUTOMATION FIELDS:**
  - `parent_item_id` - Links overlay items to parent items
  - `automation_mode` - 'manual' or 'auto' (default: 'manual')
  - `automation_duration` - Seconds for auto-advance (default: 10)
  - `use_media_duration` - Boolean for videos (default: 0)
- **NEW OVERLAY FIELDS:**
  - `overlay_type` - Type of overlay (auto/manual/full_screen)
  - `overlay_in_point` - Seconds from parent start (default: 0)
  - `overlay_duration` - Duration in seconds
  - `overlay_automation` - 'auto_out', 'leave_in_local', 'leave_in_global' (default: 'auto_out')
  - `overlay_color_index` - For manual overlay color coding (0-7)

### 7. **graphics** (Existing, separate system)
- Graphics items (appears to be a separate graphics system)
- Fields: id, episode_id, title, template_id, template_data, status, pinned, type, thumbnail, created_at, updated_at
- Current types in use: 'Lower Third', 'lower-third', 'dfdflower-third'

### 8. **graphics_templates** (NEW)
- Templates for graphics
- Fields: id, show_id, name, type, template_data, created_at, updated_at
- Intended types: 'lower_third', 'bug', 'ticker', 'panel', 'full_screen'

### 9. **execution_state** (NEW)
- Tracks live execution state
- Fields:
  - id, episode_id
  - live_item_id, preview_item_id, next_item_id
  - is_paused, paused_at, remaining_time
  - armed_transition, armed_manual_item_id, current_manual_block_id
  - active_overlays (JSON array)
  - created_at, updated_at

## Current Data Status

### Rundown Item Types Currently in Use:
- `FullScreenGraphic`
- `FullScreenVideo`
- `FullScreenPdfImage`
- `manual-block`
- `presenter-note`

### New Features Status:
- ✅ Database schema updated with all new fields
- ✅ No existing data using parent-child relationships yet
- ✅ All items currently set to 'manual' automation mode
- ✅ Graphics table exists with existing graphics data
- ✅ Execution state table ready for use

## Migration Notes

### What's New:
1. **Automation Support**: Every rundown item can now have auto-advance timing
2. **Parent-Child Relationships**: Items can be attached as overlays to parent items
3. **Overlay Configuration**: Full timing and behavior control for overlays
4. **Execution State Tracking**: Dedicated table for live show state
5. **Graphics Templates**: System for reusable graphics templates

### Existing Systems:
- The `graphics` table appears to be an existing graphics system
- Current types suggest lower thirds are already implemented
- This existing system can coexist with the new overlay system

## Next Steps

### API Updates Needed:
1. Update rundown items endpoints to handle new fields
2. Create execution state endpoints
3. Add graphics templates CRUD endpoints
4. Implement parent-child relationship handling

### Frontend Updates Needed:
1. Update data structures to include new fields
2. Implement automation UI controls
3. Create overlay attachment interface
4. Build execution state management

## Data Model Relationships

```
shows
  └── episodes
      ├── rundown_segments
      │   └── rundown_groups (cues)
      │       └── rundown_items
      │           └── rundown_items (child overlays via parent_item_id)
      ├── graphics (existing system)
      └── execution_state

shows
  └── graphics_templates
  └── media
```

## Important Considerations

1. **Two Graphics Systems**: We now have two graphics systems:
   - Original `graphics` table (existing)
   - New overlay system via `rundown_items` with parent relationships
   
2. **Type Field Usage**: The `type` field in rundown_items uses different naming:
   - Current: `FullScreenVideo`, `manual-block`, etc.
   - Planned: `auto_overlay`, `manual_overlay`, `full_screen_graphic`
   - Need to decide on consolidation strategy

3. **Automation Defaults**: All items default to manual mode, which is safe for existing data

The database is ready for the new features. No data migration is needed as all new fields have appropriate defaults.