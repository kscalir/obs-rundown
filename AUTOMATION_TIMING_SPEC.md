# Automation Timing Specification

## Overview
All non-overlay sources (Video, Graphics, OBS Scene, Camera, Full Screen Graphics) can have automatic timing that advances the rundown without operator intervention.

## Automation Modes

### Manual Mode (M)
- **Default mode** for all new items
- Waits for operator to press NEXT
- Shows flashing [M] indicator when item is live
- Flashing stops after NEXT is pressed

### Auto Mode (A)
- Automatically advances after specified duration
- Shows countdown timer [A: MM:SS]
- Timer flashes when ≤ 5 seconds remain
- Default duration: 10 seconds (configurable per item type)

## Visual Indicators

### In Rundown Display
```
┌─ RUNDOWN ─────────────────────────────────────────┐
│ • Opening Video        [A: 01:30]  [VIDEO]        │  <- Auto, 1:30 duration
│ • Camera 1            [M]          [CAMERA]       │  <- Manual
│   └── Bug (Leave In)                              │  <- No automation (overlay)
│   └── L3 @ 0:05                                   │  <- No automation (overlay)
│ • Package             [A: 02:45]  [VIDEO]         │  <- Auto, video duration
│ • Manual Block                                    │
│   ├─ Camera 2                     [CAMERA]        │  <- No automation in manual blocks
│   └─ 🟢 Guest L3                                  │  <- No automation (overlay)
│ • Full Screen GFX     [A: 00:30]  [GRAPHICS]     │  <- Auto, 30 seconds
└────────────────────────────────────────────────────┘

When Live:
│ • Camera 1            [M] 🔴      [CAMERA]        │  <- Flashing red M
│ • Package             [A: 00:27]  [VIDEO]         │  <- Counting down
│ • Package             [A: 00:05] ⚠️ [VIDEO]        │  <- Flashing final 5 seconds
```

### Position and Styling
- Automation indicator positioned center-right of item name
- Sufficient spacing from type pill for visual separation
- Uses consistent width for clean column alignment

## Properties Panel

### Standard Automation Section (All Sources)
```
┌─ Camera Properties ─────────────┐
│ Name: [Camera 1]                │
│                                 │
│ ─── Transition ───               │
│ Type: Cut                       │
│                                 │
│ ─── Automation ───               │  <- Always second section
│ ○ Manual                         │
│ ● Auto                          │
│   Duration: [00:30] (MM:SS)    │
│                                 │
│ ─── Source Settings ───          │
│ Camera: Input 1                 │
└─────────────────────────────────┘
```

### Video-Specific Automation
```
┌─ Video Properties ──────────────┐
│ Name: [Interview Segment]       │
│                                 │
│ ─── Transition ───               │
│ Type: Fade                      │
│                                 │
│ ─── Automation ───               │
│ ○ Manual                         │
│ ● Auto                          │
│   Duration: [02:45] (MM:SS)    │
│   ☑ Use video duration (2:45)  │  <- Helper checkbox
│                                 │
│ ─── Playback ───                 │
│ □ Loop                          │
│ □ Continue to next              │
└─────────────────────────────────┘
```

## Execution Behavior

### Auto-Advance Logic
```javascript
onItemLive(item) {
  if (item.automation === 'auto') {
    startCountdown(item.duration, () => {
      // Parent timing overrules all children
      clearAllChildOverlays(item);
      executeNext();
    });
  } else {
    showFlashingManualIndicator();
  }
}

onCountdownTick(remaining) {
  updateDisplay(`[A: ${formatTime(remaining)}]`);
  if (remaining <= 5) {
    flashWarning();
  }
}
```

### Pause/Resume System
```javascript
onPausePressed() {
  if (isPaused) {
    // Resume
    resumeCountdown();
    resumeOverlays();
    updateButtonStyle('PAUSE', 'yellow');
  } else {
    // Pause
    pauseCountdown();
    pauseOverlays();
    updateButtonStyle('PAUSE', 'yellow-flashing');
  }
}
```

### Manual Override
```javascript
onNextPressed() {
  if (isCountingDown()) {
    cancelCountdown();
  }
  clearAllChildOverlays(currentItem);
  executeNext();
}
```

## Special Behaviors

### Video Duration Integration
1. When video file selected → auto-populate duration field
2. When automation changed to Auto → set duration to video length
3. When video file changed while Auto → update duration
4. When video file changed while Manual → don't update duration

### Manual Blocks
- Items within manual blocks have NO automation options
- Automation panel hidden in properties when item is in manual block
- Preserves manual-only workflow for these special sections

### Overlay Timing vs Parent Timing
**Parent ALWAYS wins:**
- If parent auto-advances → all child overlays clear
- If parent manually advanced → all child overlays clear  
- No waiting for overlays to complete
- Clean transition to next item handles all clearing

### Pause Behavior
**PAUSE affects everything:**
- Countdown timer freezes and flashes yellow
- All overlay timers pause
- Visual indication: [A: 00:15] with yellow flashing
- Resume continues from paused position

## Control Pad Updates

### STOP → PAUSE Button
```
Before:                After:
[STOP] (Red)     →    [PAUSE] (Yellow)

States:
- Normal: Yellow background
- Paused: Yellow flashing
- Pressed: Darker yellow
```

## Default Durations

| Source Type | Default Duration | Notes |
|------------|-----------------|-------|
| Camera | 10 seconds | User configurable |
| OBS Scene | 10 seconds | User configurable |
| Video | Video length | Auto-detected |
| Full Screen GFX | 30 seconds | User configurable |
| Package | Video length | Auto-detected |

## Implementation Priority

### Phase 1: Core Automation
1. Add automation property to data model
2. Implement Manual mode with flashing [M]
3. Implement Auto mode with countdown
4. Basic NEXT override behavior

### Phase 2: Pause System
1. Rename STOP to PAUSE
2. Implement pause/resume for countdown
3. Add visual pause indicators
4. Coordinate with overlay timing

### Phase 3: Video Integration
1. Auto-detect video duration
2. "Use video duration" checkbox
3. Update logic for file changes
4. Handle loop/continue settings

### Phase 4: Visual Polish
1. Countdown formatting (MM:SS)
2. 5-second warning flash
3. Proper spacing in rundown
4. Color transitions for pause

### Phase 5: Edge Cases
1. Parent/child timing conflicts
2. Manual block restrictions
3. Rapid state changes
4. Network/performance delays

## Key Design Principles

1. **Parent Timing Wins**: No overlay can delay parent advancement
2. **Manual Blocks Stay Manual**: Preserve existing manual workflow
3. **Clear Visual Feedback**: Always know what's automatic vs manual
4. **Operator Override**: NEXT always works immediately
5. **Predictable Defaults**: Smart defaults based on source type
6. **Clean Transitions**: Let transition system handle all clearing

This automation system provides both fully-automated rundown execution and manual control where needed, with clear visual feedback at every step.