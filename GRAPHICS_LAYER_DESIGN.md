# Graphics Layering System Design

## Core Concept
Graphics operate as independent "layers" that can be triggered, timed, and cleared separately from the main program rundown. Think of it like Photoshop layers for broadcast.

## Data Structure

```javascript
graphicsState = {
  layers: [
    {
      id: 'layer1',
      name: 'Lower Third',
      type: 'lower_third',
      content: {
        title: 'John Smith',
        subtitle: 'Chief Executive Officer',
        template: 'corporate_l3'
      },
      status: 'live', // ready, preview, live, out
      timing: {
        triggeredAt: timestamp,
        duration: 10000, // 10 seconds
        autoOut: true,
        fadeIn: 500,
        fadeOut: 500
      },
      position: 1 // z-order
    },
    {
      id: 'layer2', 
      name: 'Bug',
      type: 'bug',
      content: {
        image: 'network_logo.png',
        position: 'top-right'
      },
      status: 'live',
      timing: {
        triggeredAt: timestamp,
        duration: null, // indefinite
        autoOut: false
      },
      position: 2
    }
  ],
  presets: [
    {
      name: 'Standard Interview',
      layers: ['lower_third', 'bug']
    }
  ]
}
```

## UI Components

### 1. Graphics Stack Panel (New)
```jsx
<GraphicsStackPanel>
  <ActiveLayers>
    {layers.map(layer => (
      <LayerControl
        status={layer.status}
        timeRemaining={calculateRemaining(layer)}
        onTake={() => takeLayer(layer)}
        onClear={() => clearLayer(layer)}
      />
    ))}
  </ActiveLayers>
  
  <AvailableGraphics>
    {/* Quick access buttons for common graphics */}
  </AvailableGraphics>
</GraphicsStackPanel>
```

### 2. Control Pad Graphics Buttons
Add dedicated graphics control buttons to the control pad:
- **[L3 IN]** - Take lower third to air
- **[L3 OUT]** - Remove lower third
- **[BUG]** - Toggle bug
- **[PANEL]** - Toggle side panel
- **[CLEAR GFX]** - Clear all graphics

### 3. Rundown Integration
Graphics can be:
1. **Manually triggered** - Via control pad buttons
2. **Auto-triggered** - Based on rundown item metadata
3. **Time-triggered** - After X seconds of item going live
4. **Cue-triggered** - Specific cue points in video

## Execution Flow

### Manual Execution
```
1. Operator clicks [L3 IN] button
2. System checks for prepared L3 content
3. L3 animates in with defined transition
4. Timer starts (if duration set)
5. Auto-out after duration OR manual [L3 OUT]
```

### Auto Execution
```
1. Rundown item goes LIVE
2. System checks for attached graphics
3. Graphics trigger based on timing rules:
   - Immediate: Take to air instantly
   - Delayed: Wait X seconds then take
   - Cue point: Wait for specific timecode
4. Graphics auto-clear based on duration
```

## Integration with Existing System

### Modified Rundown Item Structure
```javascript
rundownItem = {
  id: '123',
  type: 'video',
  content: {...},
  graphics: [
    {
      type: 'lower_third',
      trigger: 'auto', // auto, manual, timed
      delay: 5000, // 5 seconds after item live
      duration: 10000,
      content: {
        title: 'Speaker Name',
        subtitle: 'Title'
      }
    }
  ]
}
```

### Graphics-Aware Execution State
```javascript
executionState = {
  // Existing
  liveItemId: '123',
  previewItemId: '124',
  
  // New
  activeGraphics: [
    {layerId: 'l3_1', itemId: '123', status: 'live'},
    {layerId: 'bug_1', itemId: null, status: 'live'}
  ],
  graphicsQueue: [
    {layerId: 'l3_2', scheduledFor: timestamp}
  ]
}
```

## Button Layout Modification

Current button grid (8x4 = 32 buttons):
```
[Man1][Man2][Man3][Man4][Empty][Empty][Empty][Empty]
[Man5][Man6][Empty][Empty][Empty][Empty][Empty][Empty]
[Empty][Empty][Empty][Empty][Empty][Empty][Empty][Empty]
[Empty][Empty][Cut][Fade][Slide][Sting][STOP][NEXT]
```

Proposed with graphics (reserve row 3 for graphics):
```
[Man1][Man2][Man3][Man4][Empty][Empty][Empty][Empty]
[Man5][Man6][Empty][Empty][Empty][Empty][Empty][Empty]
[L3 IN][L3 OUT][BUG][PANEL][TICKER][CLR GFX][Empty][Empty]
[Empty][Empty][Cut][Fade][Slide][Sting][STOP][NEXT]
```

## Benefits of This Approach

1. **Independent Timing**: Graphics have their own lifecycle
2. **Stackable**: Multiple graphics can be active simultaneously
3. **Flexible Triggers**: Manual, auto, timed, or cue-based
4. **Visual Feedback**: Clear indication of what's on-air
5. **Quick Access**: Dedicated buttons for common operations
6. **Preset Support**: Save common graphics combinations
7. **Clean Separation**: Graphics don't interfere with main program flow

## Implementation Priority

1. **Phase 1**: Basic graphics stack with manual triggers
   - Graphics panel UI
   - Manual IN/OUT buttons
   - Simple timer display

2. **Phase 2**: Auto-triggers and timing
   - Attach graphics to rundown items
   - Implement delay/duration logic
   - Auto-out functionality

3. **Phase 3**: Advanced features
   - Graphics presets
   - Cue point triggers
   - Animation controls
   - Multi-layer management

This approach maintains our current rundown flow while adding a parallel graphics execution system that broadcast operators expect.