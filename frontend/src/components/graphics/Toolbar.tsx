import React from 'react';
import { 
  Cursor, 
  Type, 
  Square, 
  PencilFill,
  Film,
  HandIndexThumb,
  ZoomIn,
  ArrowsMove,
  Layers,
  Grid3x3,
  Rulers,
  Clock,
  Eye,
  EyeSlash,
  Download,
  Upload,
  Save,
  Folder,
  Plus,
  Dash,
  ArrowCounterclockwise,
  ArrowClockwise
} from 'react-bootstrap-icons';
import { useEditorStore } from './state/editorStore';
import { ImageUploadAdapter } from './adapters/ImageUploadAdapter';
import { VideoUploadAdapter } from './adapters/VideoUploadAdapter';
import type { ToolType, ShapeElement, TextElement } from './types';

export const Toolbar: React.FC = () => {
  const {
    tool,
    setTool,
    zoom,
    setZoom,
    showGrid,
    showRulers,
    showTimeline,
    showProperties,
    showLayers,
    toggleGrid,
    toggleRulers,
    toggleTimeline,
    toggleProperties,
    toggleLayers,
    undo,
    redo,
    addLayer,
    addElement,
    activeLayerId,
    canvas,
    resetView,
    fitToScreen,
    saveTemplate,
    clearTemplate
  } = useEditorStore();

  const handleAddText = () => {
    const newText: TextElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      name: 'New Text',
      text: 'Click to edit',
      x: canvas.size.width / 2 - 100,
      y: canvas.size.height / 2 - 20,
      width: 200,
      height: 40,
      visible: true,
      locked: false,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      zIndex: 0,
      fontFamily: 'Arial',
      fontSize: 24,
      fontWeight: 400,
      fontStyle: 'normal',
      textAlign: 'left',
      lineHeight: 1.2,
      letterSpacing: 0,
      fill: '#ffffff'
    };
    addElement(newText, activeLayerId || undefined);
    // Switch back to select tool after adding
    setTool('select');
  };

  const handleAddShape = (shapeType: ShapeElement['shapeType']) => {
    // For centered shapes (circles, polygons, etc.), position them at their center
    const needsCentering = ['circle', 'ellipse', 'triangle', 'polygon', 'hexagon', 'pentagon', 'octagon', 'star'].includes(shapeType);
    const x = needsCentering 
      ? canvas.size.width / 2  // Center position for centered shapes
      : canvas.size.width / 2 - 50;  // Top-left position for rectangles
    const y = needsCentering 
      ? canvas.size.height / 2
      : canvas.size.height / 2 - 50;
    
    const newShape: ShapeElement = {
      id: `shape-${Date.now()}`,
      type: 'shape',
      name: `New ${shapeType}`,
      shapeType,
      x,
      y,
      width: 100,
      height: 100,
      visible: true,
      locked: false,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      zIndex: 0,
      fill: '#1976d2',
      stroke: '#ffffff',
      strokeWidth: 0
    };
    addElement(newShape, activeLayerId || undefined);
    // Switch back to select tool after adding
    setTool('select');
  };

  const tools: { type: ToolType; icon: React.ReactNode; tooltip: string; action?: () => void; custom?: boolean }[] = [
    { type: 'select', icon: <Cursor size={18} color="currentColor" />, tooltip: 'Select (V)' },
    { type: 'text', icon: <Type size={18} color="currentColor" />, tooltip: 'Text (T)', action: handleAddText },
    { type: 'shape', icon: <Square size={18} color="currentColor" />, tooltip: 'Shape (R)', action: () => handleAddShape('rectangle') },
    { type: 'pen', icon: <PencilFill size={18} color="currentColor" />, tooltip: 'Pen (P)' },
    { type: 'image', icon: 'image-upload', tooltip: 'Image', custom: true },
    { type: 'video', icon: 'video-upload', tooltip: 'Video', custom: true },
    { type: 'hand', icon: <HandIndexThumb size={18} color="currentColor" />, tooltip: 'Hand (H)' },
    { type: 'zoom', icon: <ZoomIn size={18} color="currentColor" />, tooltip: 'Zoom (Z)' }
  ];

  return (
    <div style={styles.toolbar}>
      {/* Left section - Tools */}
      <div style={styles.section}>
        <div style={styles.toolGroup}>
          {tools.map((t) => {
            // Special handling for image and video upload
            if (t.custom && t.type === 'image') {
              return <ImageUploadAdapter key={t.type} />;
            }
            if (t.custom && t.type === 'video') {
              return <VideoUploadAdapter key={t.type} />;
            }
            
            return (
              <button
                key={t.type}
                style={{
                  ...styles.toolButton,
                  ...(tool === t.type ? styles.toolButtonActive : {})
                }}
                onClick={() => {
                  setTool(t.type);
                  // Execute action if available (for tools that create elements)
                  if (t.action) {
                    t.action();
                  }
                }}
                title={t.tooltip}
                onMouseEnter={(e) => {
                  if (tool !== t.type) {
                    e.currentTarget.style.background = '#333';
                  }
                }}
                onMouseLeave={(e) => {
                  if (tool !== t.type) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {t.icon}
              </button>
            );
          })}
        </div>

        <div style={styles.separator} />

        {/* Undo/Redo */}
        <button
          style={styles.toolButton}
          onClick={undo}
          title="Undo (Ctrl+Z)"
        >
          <ArrowCounterclockwise size={18} color="currentColor" />
        </button>
        
        <button
          style={styles.toolButton}
          onClick={redo}
          title="Redo (Ctrl+Shift+Z)"
        >
          <ArrowClockwise size={18} color="currentColor" />
        </button>
      </div>

      {/* Center section - Canvas controls */}
      <div style={styles.section}>
        <button
          style={styles.toolButton}
          onClick={resetView}
          title="Reset View"
        >
          <ArrowsMove size={18} color="currentColor" />
        </button>
        
        <button
          style={styles.toolButton}
          onClick={fitToScreen}
          title="Fit to Screen"
        >
          <Square size={18} color="currentColor" />
        </button>

        <div style={styles.zoomControl}>
          <button
            style={styles.zoomButton}
            onClick={() => setZoom(zoom * 0.8)}
            title="Zoom Out"
          >
            <Dash size={18} color="currentColor" />
          </button>
          
          <span style={styles.zoomValue}>
            {Math.round(zoom * 100)}%
          </span>
          
          <button
            style={styles.zoomButton}
            onClick={() => setZoom(zoom * 1.2)}
            title="Zoom In"
          >
            <Plus size={18} color="currentColor" />
          </button>
        </div>

        <div style={styles.separator} />

        {/* View toggles */}
        <button
          style={{
            ...styles.toolButton,
            ...(showGrid ? styles.toggleActive : {})
          }}
          onClick={toggleGrid}
          title="Toggle Grid (Ctrl+G)"
        >
          <Grid3x3 size={18} color="currentColor" />
        </button>
        
        <button
          style={{
            ...styles.toolButton,
            ...(showRulers ? styles.toggleActive : {})
          }}
          onClick={toggleRulers}
          title="Toggle Rulers (Ctrl+R)"
        >
          <Rulers size={18} color="currentColor" />
        </button>
      </div>

      {/* Right section - Panels and actions */}
      <div style={styles.section}>
        <button
          style={{
            ...styles.toolButton,
            ...(showLayers ? styles.toggleActive : {})
          }}
          onClick={toggleLayers}
          title="Toggle Layers Panel"
        >
          <Layers size={18} color="currentColor" />
        </button>
        
        <button
          style={{
            ...styles.toolButton,
            ...(showTimeline ? styles.toggleActive : {})
          }}
          onClick={toggleTimeline}
          title="Toggle Timeline"
        >
          <Clock size={18} color="currentColor" />
        </button>
        
        <button
          style={{
            ...styles.toolButton,
            ...(showProperties ? styles.toggleActive : {})
          }}
          onClick={toggleProperties}
          title="Toggle Properties Panel"
        >
          <Eye size={18} color="currentColor" />
        </button>

        <div style={styles.separator} />

        {/* File operations */}
        <button
          style={styles.toolButton}
          onClick={() => clearTemplate()}
          title="New Template"
        >
          <Folder size={18} color="currentColor" />
        </button>
        
        <button
          style={styles.toolButton}
          onClick={() => {
            const template = saveTemplate();
            console.log('Saved template:', template);
          }}
          title="Save Template"
        >
          <Save size={18} color="currentColor" />
        </button>
        
        <button
          style={styles.toolButton}
          onClick={() => console.log('Export')}
          title="Export"
        >
          <Download size={18} color="currentColor" />
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  toolbar: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 12px',
    background: 'transparent'
  },
  section: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  toolGroup: {
    display: 'flex',
    gap: '2px'
  },
  toolButton: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: '4px',
    color: '#b0b0b0',
    cursor: 'pointer',
    transition: 'all 0.2s',
    padding: 0,
    outline: 'none'
  },
  toolButtonActive: {
    background: '#1976d2',
    color: '#fff',
    border: '1px solid #1976d2'
  },
  toggleActive: {
    background: '#333',
    color: '#1976d2',
    border: '1px solid #444'
  },
  separator: {
    width: '1px',
    height: '24px',
    background: '#444',
    margin: '0 8px'
  },
  zoomControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px',
    background: '#1a1a1a',
    borderRadius: '4px'
  },
  zoomButton: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: '1px solid #444',
    borderRadius: '4px',
    color: '#b0b0b0',
    cursor: 'pointer',
    padding: 0,
    outline: 'none'
  },
  zoomValue: {
    minWidth: '50px',
    textAlign: 'center',
    fontSize: '12px',
    color: '#b0b0b0'
  }
};