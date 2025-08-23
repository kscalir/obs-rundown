# Graphics Template Editor

## Overview
A comprehensive graphics template editor component for creating broadcast-quality graphics templates with professional animations and real-time data binding capabilities. Built with React, TypeScript, Konva.js for canvas rendering, and Zustand for state management.

## Access the Editor
Navigate to: http://localhost:5176/graphics-editor

## Current Features Implemented

### Core Architecture
- ✅ Standalone development route (`/graphics-editor`)
- ✅ TypeScript type definitions for all components
- ✅ Zustand state management with full editor state
- ✅ Modular component architecture

### Canvas & Workspace
- ✅ Konva.js canvas implementation
- ✅ Multiple resolution support (HD/4K)
- ✅ Zoom controls (10% - 500%)
- ✅ Pan with hand tool
- ✅ Grid system with toggleable visibility
- ✅ Rulers with measurements
- ✅ Transparency checker pattern
- ✅ Safe zones visualization

### Element System
- ✅ Text elements with full typography controls
- ✅ Shape elements (rectangle, circle, triangle, polygon, star, line, arrow)
- ✅ Element selection and transformation
- ✅ Drag and drop positioning
- ✅ Rotation and scaling
- ✅ Element properties editing

### Layer Management
- ✅ Multiple layers support
- ✅ Layer visibility toggle
- ✅ Layer locking
- ✅ Add/delete layers
- ✅ Elements within layers
- ✅ Active layer selection

### UI Panels
- ✅ **Toolbar**: Tool selection, quick add buttons, view controls
- ✅ **Properties Panel**: Transform, appearance, type-specific properties
- ✅ **Layers Panel**: Layer management and element organization
- ✅ **Timeline Panel**: Basic timeline with playback controls

### Tools Available
- **Select Tool (V)**: Select and transform elements
- **Text Tool (T)**: Add text elements
- **Shape Tool (R)**: Add shape elements
- **Hand Tool (H)**: Pan the canvas
- **Zoom Tool (Z)**: Zoom in/out

### Keyboard Shortcuts
- `V` - Select tool
- `T` - Text tool
- `R` - Shape tool
- `H` - Hand tool
- `Z` - Zoom tool
- `F` - Fit canvas to viewport
- `Ctrl/Cmd + G` - Toggle grid
- `Ctrl/Cmd + R` - Toggle rulers
- `Ctrl/Cmd + +` - Zoom in
- `Ctrl/Cmd + -` - Zoom out
- `Ctrl/Cmd + 0` - Reset zoom

## Development Status

### Phase 1: Core Editor ✅ COMPLETED
- Canvas implementation
- Basic shapes and text
- Layer system
- Property panels
- Basic transformations

### Phase 2: Advanced Elements ✅ COMPLETED
- [x] Image element support
  - Upload images via button
  - Drag and drop images onto canvas
  - Image properties panel
  - Replace image functionality
- [x] Video element support
  - Upload videos via button
  - Drag and drop videos onto canvas
  - Video properties panel with playback controls
  - Play/pause, loop, mute, volume controls
  - Real-time video rendering on canvas
- [x] Advanced shapes and paths
  - Extended shape library: Rectangle, Circle, Ellipse, Triangle
  - Polygon shapes: Pentagon, Hexagon, Octagon
  - Special shapes: Heart, Cross, Star
  - Line and Arrow tools
- [x] Advanced alignment tools
  - Align left/center/right
  - Align top/middle/bottom
  - Distribute horizontal/vertical
  - Smart alignment (single element centers on canvas, multiple align to each other)
- [x] Multi-selection improvements
  - Shift-click to add/remove from selection
  - Marquee selection with drag rectangle
  - Group movement of selected elements
- [x] Gradient support
  - Linear and radial gradients for shapes and text
  - Gradient color picker with visual editor
  - Support for multiple color stops
  - Angle control for linear gradients
- [x] Dynamic font loading
  - System font detection using Local Font Access API
  - Font categorization (Serif, Sans-serif, Display, Monospace, etc.)
  - Font search and filtering
  - Web-safe font fallbacks
  - Custom font input option
- [x] Advanced text properties
  - Sizing modes: Fixed and Auto
  - Auto-squeeze: Compress text to fit container
  - Text wrapping controls
  - Drop shadow with full customization
  - Letter spacing control
  - Line height adjustment
- [x] Visual filters for text
  - Blur effect
  - Brightness adjustment
  - Contrast control
  - Grayscale filter
  - Hue rotation
  - Invert colors
  - Saturation control
  - Sepia tone
  - Reset buttons for each filter
- [x] Properties panel enhancements
  - Wider panel (420px) for better usability
  - Organized sections with clear headers
  - Slider controls with value displays
  - Color pickers with hex input

### Phase 3: Animation System 🚧 IN PROGRESS
#### Completed:
- [x] Timeline UI shell
  - Play/pause/stop controls
  - Time scrubber
  - Duration and FPS controls (24/30/60 fps)
- [x] Resizable panels with drag handles
  - Timeline height: draggable (100px - 500px)
  - Left panel (Layers): draggable width (200px - 600px)  
  - Right panel (Properties): draggable width (200px - 600px)
- [x] Canvas viewport controls
  - ResizeObserver for responsive canvas updates
  - Press 'F' to fit canvas to viewport

#### In Development - Complex Animation Engine:
- [ ] **Hierarchical Timeline Tracks**
  - [ ] Main element track with expand/collapse toggle
  - [ ] Individual property tracks (one per animatable property)
  - [ ] Property tracks show under parent element when expanded
  - [ ] Visual hierarchy with indentation and connection lines
  
- [ ] **Comprehensive Property Animation**
  - [ ] Transform properties: X, Y, Scale X, Scale Y, Rotation, Anchor X, Anchor Y
  - [ ] Appearance: Opacity, Fill Color (RGBA channels), Stroke Color, Stroke Width
  - [ ] Text-specific: Font Size, Letter Spacing, Line Height
  - [ ] Filter properties: Blur, Brightness, Contrast, etc.
  - [ ] Each property gets its own timeline track
  
- [ ] **Keyframe System**
  - [ ] Click on timeline to add keyframe at playhead position
  - [ ] Diamond-shaped keyframe indicators
  - [ ] Different colors for different property types
  - [ ] Keyframe selection (single and multi-select)
  - [ ] Visual feedback for selected keyframes
  
- [ ] **Keyframe Manipulation**
  - [ ] Drag keyframes to new positions
  - [ ] Copy keyframes (Alt+drag or Ctrl+C/V)
  - [ ] Delete keyframes (Delete key or right-click menu)
  - [ ] Snap to grid/frame boundaries
  - [ ] Snap to other keyframes
  - [ ] Box select multiple keyframes
  
- [ ] **Properties Panel Integration**
  - [ ] Keyframe buttons next to each property
  - [ ] Diamond icon shows keyframe state (empty/filled/selected)
  - [ ] Click to add/remove keyframe at current time
  - [ ] Show interpolated value at playhead
  - [ ] Mini timeline for each property
  - [ ] Jump to next/previous keyframe buttons
  
- [ ] **Interpolation Engine**
  - [ ] Linear interpolation between keyframes
  - [ ] Easing curves (ease-in, ease-out, ease-in-out, custom)
  - [ ] Bezier curve editor for custom easing
  - [ ] Hold keyframes (no interpolation)
  - [ ] Real-time preview during playback
  
- [ ] **Advanced Timeline Features**
  - [ ] Zoom timeline horizontally (time scale)
  - [ ] Scroll timeline vertically (many tracks)
  - [ ] Onion skinning (see previous/next frames)
  - [ ] Auto-keyframe mode (record changes)
  - [ ] Timeline markers and labels
  - [ ] Loop regions
  - [ ] Work area (in/out points)
  
- [ ] **Animation Tools**
  - [ ] Motion paths for position animation
  - [ ] Graph editor for fine-tuning curves
  - [ ] Animation presets library
  - [ ] Copy/paste animation between elements
  - [ ] Reverse keyframes
  - [ ] Scale keyframe timing
  
- [ ] **Performance & Preview**
  - [ ] RAM preview for smooth playback
  - [ ] Skip frames for complex animations
  - [ ] Preview quality settings
  - [ ] Export animation as JSON
  - [ ] Export as image sequence
  - [ ] Export as video (WebM/MP4)

### Phase 4: Data & Templates (Pending)
- [ ] Data binding system
- [ ] Template save/load
- [ ] Template library
- [ ] Dynamic content
- [ ] API integration

### Phase 5: Integration (Pending)
- [ ] OBS integration
- [ ] Main app integration
- [ ] Performance optimization
- [x] Panel drag to resize (completed)
- [ ] Guide lines and snapping
- [ ] Text-to-path conversion on export (ensure font consistency across machines)

## Project Structure
```
frontend/src/
├── GraphicsEditorDev.tsx                # Development wrapper
└── components/graphics/
    ├── GraphicsEditor.tsx                # Main editor component
    ├── CanvasView.tsx                   # Canvas rendering
    ├── Toolbar.tsx                      # Top toolbar
    ├── types.ts                         # TypeScript definitions
    ├── engine/
    │   └── ElementRenderer.tsx          # Element rendering engine (with filters)
    ├── state/
    │   └── editorStore.ts              # Zustand state store
    ├── components/
    │   ├── ColorPicker.tsx             # Gradient-enabled color picker
    │   └── FontSelector.tsx            # System font selector
    ├── utils/
    │   └── fontUtils.ts                # Font detection utilities
    ├── Properties/
    │   ├── GraphicsPropertiesPanel.tsx # Main properties panel
    │   ├── LayersPanel.tsx             # Layers management
    │   ├── TransformProperties.tsx     # Transform controls
    │   ├── AppearanceProperties.tsx    # Appearance controls
    │   ├── TextProperties.tsx          # Text properties with filters
    │   ├── ShapeProperties.tsx         # Shape-specific properties
    │   ├── ImageProperties.tsx         # Image-specific properties
    │   └── VideoProperties.tsx         # Video-specific properties
    └── Timeline/
        └── TimelinePanel.tsx            # Timeline controls
```

## Next Steps
1. Add data binding capabilities for dynamic content
2. Create template save/load functionality
3. Implement guide lines and snapping for precise alignment
4. Add OBS WebSocket integration for live graphics
5. Implement text-to-path conversion for export consistency

## Notes
- The editor is being developed as a standalone component for easy integration
- All features are being built to match Loopic.io functionality
- The system is designed to integrate with the existing OBS rundown app
- Current implementation focuses on core editing capabilities before advanced features
- **Font Consistency**: Text will be converted to paths on export to ensure graphics appear identical on any machine regardless of installed fonts. This is critical for broadcast graphics where consistency is paramount.