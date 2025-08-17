# Graphics System Final Specification

## Three Graphics Types

### 1. Auto Overlay
**Purpose**: Graphics that fire automatically with timing relative to their parent item
**Placement**: Main rundown only (cannot be placed in manual cue blocks)
**Visual**: Indented under parent item with connecting line
**Properties**:
- **Timing**: In-point (seconds from parent start) 
- **Duration**: Length on screen
- **Automation Mode**:
  - **Auto Out**: Clears after duration
  - **Leave In (Local)**: Stays up until parent item ends, button appears while active
  - **Leave In (Global)**: Stays up indefinitely, persistent button for entire show

**Examples**:
- Package with 4 timed lower thirds
- Locator that appears with camera switch
- Bug that runs during specific segment

### 2. Manual Overlay  
**Purpose**: Graphics available on-demand during manual cue blocks
**Placement**: Manual cue blocks only
**Visual**: Color-coded items (chartreuse, pink, cyan, orange, purple, yellow, lime, coral)
**Execution**: Available as colored buttons when manual cue is active
**Behavior**: Like manual cues - buttons appear when block is entered

### 3. Full Screen
**Purpose**: Graphics that act as primary sources (like video or scenes)
**Placement**: Main rundown as regular items
**Visual**: Treated like any other source
**Properties**: 
- Respects armed transitions
- Can have overlays on top
- Full transition control

## Visual Design

### Toolbox Module Layout
```
┌─ MODULES ──────────────┐
│ ┌─ Sources ──────────┐ │
│ │ • Video            │ │
│ │ • Graphics         │ │
│ │ • OBS Scene        │ │
│ │ • Macro            │ │
│ └────────────────────┘ │
│                        │
│ ─────Graphics───────   │
│                        │
│ ┌─ Overlays ─────────┐ │
│ │ • Auto Overlay     │ │
│ │ • Manual Overlay   │ │
│ │ • Full Screen      │ │
│ └────────────────────┘ │
└────────────────────────┘
```

### Rundown Visual Hierarchy
```
┌─ RUNDOWN ──────────────────────┐
│ • Opening Video                │
│ • Camera 1                     │
│   └── Bug (Leave In - Global) │  <- Indented, connected
│   └── L3 @ 0:05 (Auto Out)   │
│ • Package                      │
│   └── L3 @ 0:00 (8s)         │
│   └── L3 @ 0:15 (8s)         │
│   └── L3 @ 0:30 (8s)         │
│ • Manual Block                 │
│   ├─ Camera 2                  │
│   ├─ 🟢 Guest L3 (Manual)     │  <- Green color
│   └─ 🟣 Stats Panel (Manual)  │  <- Purple color
│ • Full Screen Graphic         │  <- Regular item
│ • Camera 3                     │
└────────────────────────────────┘
```

## Control Pad Button Mapping

### Dynamic Button Layout
```
When Manual Block Active:
[Manual 1][Manual 2][🟢 L3][🟣 Panel][Empty][Empty][Empty][Empty]

Global Leave-In Graphics (Persistent Row):
[BUG OFF][TICKER][Empty][Empty][Empty][Empty][Empty][Empty]

Standard Controls (Always Present):
[Empty][Empty][Cut][Fade][Slide][Sting][STOP][NEXT]
```

### Color Coding System
Order persists across entire show:
1. 🟢 Chartreuse - First manual overlay 
2. 🩷 Pink - Second manual overlay
3. 🟦 Cyan - Third manual overlay
4. 🟧 Orange - Fourth manual overlay
5. 🟣 Purple - Fifth manual overlay
6. 🟡 Yellow - Sixth manual overlay
7. 🟢 Lime - Seventh manual overlay
8. 🟥 Coral - Eighth manual overlay

## Execution Behavior

### Auto Overlay Execution
```javascript
// When parent item goes live
onItemLive(item) {
  item.autoOverlays.forEach(overlay => {
    setTimeout(() => {
      takeOverlay(overlay);
      
      if (overlay.automation === 'auto_out') {
        setTimeout(() => clearOverlay(overlay), overlay.duration);
      } else if (overlay.automation === 'leave_in_local') {
        addTemporaryButton(overlay);
      } else if (overlay.automation === 'leave_in_global') {
        addPersistentButton(overlay);
      }
    }, overlay.inPoint * 1000);
  });
}

// When parent item ends
onItemEnd(item) {
  item.autoOverlays.forEach(overlay => {
    if (overlay.automation === 'leave_in_local') {
      clearOverlay(overlay);
      removeTemporaryButton(overlay);
    }
    // Global leave-in graphics stay
  });
}
```

### Manual Overlay Execution
```javascript
// When manual block becomes active
onManualBlockActive(block) {
  block.manualOverlays.forEach((overlay, index) => {
    const color = COLOR_SEQUENCE[index % 8];
    addColoredButton(overlay, color);
  });
}

// Button press toggles overlay
onManualOverlayButton(overlay) {
  if (overlay.isActive) {
    clearOverlay(overlay);
  } else {
    takeOverlay(overlay);
  }
}
```

### Leave-In Graphics State Display
```
┌─ ACTIVE OVERLAYS ──────────────┐
│ 🟢 Network Bug (Global)        │
│ 🔵 Lower Third: John (Local)   │
│ 🟡 Ticker (Global)             │
└────────────────────────────────┘
```

## Properties Panel Updates

### Auto Overlay Properties
```
┌─ Auto Overlay Properties ──────┐
│ Name: [Lower Third - John]     │
│                                 │
│ Timing:                         │
│   In Point: [5] seconds        │
│   Duration: [8] seconds        │
│                                 │
│ Automation:                     │
│   ○ Auto Out (after duration)  │
│   ○ Leave In (Local)           │
│   ○ Leave In (Global) ☑        │
│                                 │
│ Template: [L3_Standard_v2]     │
│ Data: {...}                    │
└─────────────────────────────────┘
```

### Manual Overlay Properties  
```
┌─ Manual Overlay Properties ────┐
│ Name: [Guest Lower Third]      │
│                                 │
│ Color: 🟢 (Auto-assigned)      │
│                                 │
│ Template: [L3_Interview_v1]    │
│ Data: {...}                    │
└─────────────────────────────────┘
```

## Implementation Priority

### Phase 1: Core Structure
1. Update rundown data model for parent-child relationships
2. Create Auto Overlay attachment logic
3. Implement visual indentation and connection lines
4. Add graphics section to toolbox

### Phase 2: Auto Overlay System
1. Timing engine for in-point and duration
2. Three automation modes (auto-out, local, global)
3. Dynamic button management for leave-in graphics
4. Active overlays status panel

### Phase 3: Manual Overlay System
1. Color coding system
2. Manual cue block integration
3. Toggle behavior for manual overlays
4. Color persistence across show

### Phase 4: Full Screen Graphics
1. Treat as standard rundown items
2. Ensure overlay compatibility
3. Transition support

### Phase 5: Polish
1. Drag-drop restrictions (auto can't go in manual blocks)
2. Visual feedback and animations
3. Button layout optimization
4. Persistent state display

## Key Design Decisions

1. **No Manual Out Mode**: Simplified to just leave-in with global option
2. **Instant Graphics Buttons**: No NEXT required for overlay control
3. **Color Persistence**: Same color order throughout show for consistency
4. **Stacking Support**: Multiple auto overlays can attach to one item
5. **Independent Timing**: Each overlay has its own timeline
6. **Visual Hierarchy**: Clear parent-child relationships in rundown

This specification provides a complete graphics system that handles all broadcast scenarios while maintaining operational clarity.