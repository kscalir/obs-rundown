# Graphics Layering System Design V2
## Three Graphics Behavior Types

### Type 1: BOUND Graphics (Tightly Coupled)
**Definition**: Graphics with specific timing tied directly to rundown elements
**Examples**: 
- 4 lower thirds at specific timecodes in a video package
- Location graphic that appears immediately when switching to remote camera
- Credits that roll at 02:45 into end video

### Type 2: AVAILABLE Graphics (Loosely Coupled)  
**Definition**: Graphics associated with rundown elements but triggered on-demand
**Examples**:
- Host interview has 3 guest L3s ready to fire when needed
- Panel discussion with 5 participant graphics available
- Breaking news graphics ready during live segment

### Type 3: PERSISTENT Graphics (Show-Wide)
**Definition**: Graphics that run independently across multiple rundown items
**Examples**:
- Network bug (entire show)
- Clock (specific segments)
- Ticker/Crawl (breaking news periods)
- Score bug (sports shows)

## Unified Data Structure

```javascript
// Rundown Item with all three types
rundownItem = {
  id: 'item_123',
  type: 'live_interview',
  content: { source: 'Camera 1' },
  
  graphics: {
    // Type 1: BOUND - Auto-fire at specific times
    bound: [
      {
        id: 'gfx_1',
        type: 'lower_third',
        content: { title: 'John Smith', subtitle: 'CEO' },
        trigger: {
          type: 'timecode',  // 'immediate', 'timecode', 'percentage'
          value: 5000,        // 5 seconds after item starts
          duration: 8000      // on screen for 8 seconds
        }
      },
      {
        id: 'gfx_2',
        type: 'locator',
        content: { text: 'WASHINGTON, DC' },
        trigger: {
          type: 'immediate',  // fires as soon as item goes live
          duration: 5000
        }
      }
    ],
    
    // Type 2: AVAILABLE - Ready to fire on demand
    available: [
      {
        id: 'gfx_3',
        type: 'lower_third',
        content: { title: 'Jane Doe', subtitle: 'Expert' },
        hotkey: '1',  // Optional: map to control pad button
        group: 'guests'  // Optional: group related graphics
      },
      {
        id: 'gfx_4',
        type: 'panel',
        content: { data: 'statistics.json' },
        hotkey: '2',
        group: 'data'
      }
    ]
  }
}

// Type 3: PERSISTENT - Managed separately
persistentGraphics = {
  show_wide: [
    {
      id: 'bug_1',
      type: 'bug',
      content: { image: 'network_logo.png' },
      segments: ['all'],  // or specific segment IDs
      autoStart: true,
      autoClear: false
    }
  ],
  segment_specific: [
    {
      id: 'clock_1',
      type: 'clock',
      segments: ['segment_1', 'segment_3'],
      autoStart: true,
      autoClear: true
    }
  ]
}
```

## Integrated UI Design

### Control Page Layout
```
┌─────────────────────────────────────────────────────────────┐
│ RUNDOWN                    │ GRAPHICS CONTROL                 │
├────────────────────────────┼──────────────────────────────────┤
│ ▶ Segment 1                │ ┌─ PERSISTENT ─────────────────┐ │
│   • Opening Video          │ │ 🟢 Bug         [CLEAR]       │ │
│   • Host Cam               │ │ ⚪ Clock       [TAKE]        │ │
│     └─ 🎨 3 Available      │ │ ⚪ Ticker      [TAKE]        │ │
│   • Interview              │ └──────────────────────────────┘ │
│     ├─ 🎯 L3 @ 0:05       │                                   │
│     ├─ 🎯 L3 @ 0:15       │ ┌─ ACTIVE LAYERS ──────────────┐ │
│     └─ 🎨 2 Available      │ │ L3: John Smith    0:03/0:08  │ │
│   • Package                │ │ Bug: Network      ∞           │ │
│     └─ 🎯 4 Bound         │ │ Locator: DC       0:02/0:05  │ │
│                            │ └──────────────────────────────┘ │
│                            │                                   │
│                            │ ┌─ AVAILABLE (Host Cam) ────────┐ │
│                            │ │ [1: Jane L3] [2: John L3]    │ │
│                            │ │ [3: Stats]   [4: Empty]      │ │
│                            │ │ [5: Empty]   [6: Empty]      │ │
│                            │ └──────────────────────────────┘ │
└────────────────────────────┴──────────────────────────────────┘

CONTROL PAD:
[1: Jane][2: John][3: Stats][Empty][L3 OUT][BUG][CLOCK][CLR ALL]
[Empty]  [Empty]  [Empty]  [Empty] [Empty] [Empty][Empty][Empty]
[Empty]  [Empty]  [Empty]  [Empty] [Empty] [Empty][Empty][Empty]
[Empty]  [Empty]  [Cut]    [Fade]  [Slide] [Sting][STOP] [NEXT]
```

### Visual Indicators in Rundown
- 🎯 = Bound graphics (with count)
- 🎨 = Available graphics (with count)  
- 🟢 = Currently active graphic
- ⏱️ = Timed graphic pending

## Execution Flow

### Type 1: BOUND Graphics Execution
```javascript
// Automatic execution when item goes live
onItemLive(item) {
  item.graphics.bound.forEach(graphic => {
    if (graphic.trigger.type === 'immediate') {
      takeGraphic(graphic);
    } else if (graphic.trigger.type === 'timecode') {
      scheduleGraphic(graphic, graphic.trigger.value);
    }
  });
}

// Timeline visualization for operator
Timeline: |--5s--[L3:John]--8s--|--10s--[L3:Jane]--8s--|
```

### Type 2: AVAILABLE Graphics Execution
```javascript
// When item with available graphics goes live
onItemLive(item) {
  // Load available graphics into quick-access buttons
  updateControlPadButtons(item.graphics.available);
  
  // Show in graphics panel
  updateAvailableGraphicsPanel(item.graphics.available);
}

// Manual trigger by operator
onButtonPress(buttonIndex) {
  const graphic = currentAvailableGraphics[buttonIndex];
  if (graphic) {
    takeGraphic(graphic);
  }
}
```

### Type 3: PERSISTENT Graphics Execution
```javascript
// On show/segment start
onSegmentStart(segment) {
  persistentGraphics.forEach(graphic => {
    if (graphic.segments.includes(segment.id) || graphic.segments.includes('all')) {
      if (graphic.autoStart) {
        takeGraphic(graphic);
      }
    }
  });
}
```

## Building Interface

### Graphics Template Builder
```
┌─ Add Graphics to: Interview (Item #3) ─────────────────────┐
│                                                            │
│ BOUND GRAPHICS (Auto-trigger)                             │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ + Add Bound Graphic                                  │  │
│ │                                                       │  │
│ │ 1. Lower Third - "John Smith, CEO"                   │  │
│ │    Trigger: @ 5 seconds | Duration: 8 seconds        │  │
│ │    [Edit] [Delete]                                    │  │
│ │                                                       │  │
│ │ 2. Lower Third - "Jane Doe, CTO"                     │  │
│ │    Trigger: @ 15 seconds | Duration: 8 seconds       │  │
│ │    [Edit] [Delete]                                    │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                            │
│ AVAILABLE GRAPHICS (Manual trigger)                       │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ + Add Available Graphic                              │  │
│ │                                                       │  │
│ │ 1. Lower Third - "Breaking News Update"              │  │
│ │    Hotkey: 1 | Group: Breaking                       │  │
│ │    [Edit] [Delete]                                    │  │
│ │                                                       │  │
│ │ 2. Side Panel - "Election Results"                   │  │
│ │    Hotkey: 2 | Group: Data                          │  │
│ │    [Edit] [Delete]                                    │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                            │
│ [Save] [Cancel]                                           │
└────────────────────────────────────────────────────────────┘
```

## Smart Control Pad Mapping

The control pad dynamically adjusts based on context:

### When no item is live:
```
Row 1-2: Empty or persistent graphics controls
Row 3: [L3 OUT][CLR GFX][BUG][CLOCK][TICKER][Empty][Empty][Empty]
Row 4: [Empty][Empty][Cut][Fade][Slide][Sting][STOP][NEXT]
```

### When item with AVAILABLE graphics is live:
```
Row 1-2: Available graphics mapped to buttons (up to 16)
Row 3: [L3 OUT][CLR GFX][BUG][CLOCK][TICKER][Empty][Empty][Empty]  
Row 4: [Empty][Empty][Cut][Fade][Slide][Sting][STOP][NEXT]
```

### Manual block active (existing behavior):
```
Row 1-2: Manual cue items
Row 3: Graphics controls
Row 4: Transitions and execution
```

## Key Benefits

1. **Unified System**: All three graphics types in one coherent interface
2. **Context-Aware**: Control pad adapts to current needs
3. **Visual Clarity**: Operators can see what's bound, available, and active
4. **Flexible Timing**: Supports immediate, timed, and manual triggers
5. **Persistent Management**: Show-wide graphics don't clutter item controls
6. **Preview Timeline**: See when bound graphics will fire
7. **Group Organization**: Related graphics stay together

## Implementation Priority

### Phase 1: Core Infrastructure
- Graphics state management
- Active layers panel
- Basic take/clear functionality

### Phase 2: Type Implementation  
- PERSISTENT graphics (simplest)
- AVAILABLE graphics with control pad mapping
- BOUND graphics with timing engine

### Phase 3: Builder Interface
- Template creation/editing
- Timing preview timeline
- Hotkey mapping UI

### Phase 4: Advanced Features
- Graphics presets/macros
- Conditional triggers
- Data binding for dynamic content
- Transition animations

This design provides a professional broadcast graphics workflow while maintaining the simplicity of your current rundown system. The operator always knows what graphics are ready, what's coming up automatically, and what's currently on-air.