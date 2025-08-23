import React, { useState, useEffect, useRef } from 'react';
import { CanvasView } from './CanvasView';
import { GraphicsPropertiesPanel } from './Properties/GraphicsPropertiesPanel';
import { LayersPanel } from './Properties/LayersPanel';
import { IntegratedTimeline } from './Timeline/IntegratedTimeline';
import { DirectMoveableController } from './Canvas/DirectMoveableController';
import { AnimationProvider } from './animation/AnimationContext';
import { Toolbar } from './Toolbar';
import { AlignmentTools } from './AlignmentTools';
import { useEditorStore } from './state/editorStore';
import type { ToolType } from './types';

const GraphicsEditorContent: React.FC = () => {
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
    toggleLayers
  } = useEditorStore();

  const [leftPanelWidth, setLeftPanelWidth] = useState(240);
  const [rightPanelWidth, setRightPanelWidth] = useState(420);
  const [isDraggingLeftPanel, setIsDraggingLeftPanel] = useState(false);
  const [isDraggingRightPanel, setIsDraggingRightPanel] = useState(false);
  const [isHoveringLeftHandle, setIsHoveringLeftHandle] = useState(false);
  const [isHoveringRightHandle, setIsHoveringRightHandle] = useState(false);
  // Moveable is now the only transform control system
  const containerRef = useRef<HTMLDivElement>(null);
  
  const minPanelWidth = 200;
  const maxPanelWidth = 600;

  // Handle left panel resize
  const handleLeftPanelResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingLeftPanel(true);
    
    const startX = e.clientX;
    const startWidth = leftPanelWidth;
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const newWidth = Math.min(maxPanelWidth, Math.max(minPanelWidth, startWidth + deltaX));
      setLeftPanelWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      setIsDraggingLeftPanel(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'ew-resize';
  };

  // Handle right panel resize
  const handleRightPanelResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingRightPanel(true);
    
    const startX = e.clientX;
    const startWidth = rightPanelWidth;
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = startX - e.clientX;
      const newWidth = Math.min(maxPanelWidth, Math.max(minPanelWidth, startWidth + deltaX));
      setRightPanelWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      setIsDraggingRightPanel(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'ew-resize';
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Tool shortcuts
      if (!e.ctrlKey && !e.metaKey) {
        switch(e.key.toLowerCase()) {
          case 'v':
            setTool('select');
            break;
          case 't':
            setTool('text');
            break;
          case 'r':
            setTool('shape');
            break;
          case 'p':
            setTool('pen');
            break;
          case 'h':
            setTool('hand');
            break;
          case 'z':
            if (!e.shiftKey) setTool('zoom');
            break;
        }
      }

      // Zoom shortcuts
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          setZoom(Math.min(zoom * 1.2, 5));
        } else if (e.key === '-') {
          e.preventDefault();
          setZoom(Math.max(zoom * 0.8, 0.1));
        } else if (e.key === '0') {
          e.preventDefault();
          setZoom(1);
        }
      }

      // Toggle panels
      if (e.ctrlKey || e.metaKey) {
        switch(e.key.toLowerCase()) {
          case 'g':
            e.preventDefault();
            toggleGrid();
            break;
          case 'r':
            e.preventDefault();
            toggleRulers();
            break;
        }
      }

      // Shift + T to toggle timeline
      if (e.shiftKey && e.key === 'T') {
        e.preventDefault();
        toggleTimeline();
      }

    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoom, setTool, setZoom, toggleGrid, toggleRulers, toggleTimeline]);

  return (
    <div ref={containerRef} style={styles.container}>
      {/* Top Toolbar */}
      <div style={styles.header}>
        <Toolbar />
        <div style={styles.headerControls}>
          <button 
            onClick={toggleTimeline}
            style={{
              ...styles.controlButton,
              backgroundColor: showTimeline ? '#4CAF50' : '#666'
            }}
            title="Toggle Timeline (Shift+T)"
          >
            {showTimeline ? '🎬 Timeline' : '⏱️ Timeline'}
          </button>
        </div>
      </div>

      {/* Alignment Tools Bar */}
      <AlignmentTools />

      {/* Main Content Area */}
      <div style={styles.content}>
        {/* Left Panel - Layers */}
        {showLayers && (
          <>
            <div style={{
              ...styles.leftPanel,
              width: `${leftPanelWidth}px`
            }}>
              <LayersPanel />
            </div>
            <div 
              style={{
                ...styles.verticalResizeHandle,
                ...(isHoveringLeftHandle ? styles.verticalResizeHandleHover : {})
              }}
              onMouseDown={handleLeftPanelResize}
              onMouseEnter={() => setIsHoveringLeftHandle(true)}
              onMouseLeave={() => setIsHoveringLeftHandle(false)}
            >
              <div style={styles.verticalResizeHandleBar} />
            </div>
          </>
        )}

        {/* Center - Canvas */}
        <div style={styles.canvasContainer}>
          <CanvasView />
          <DirectMoveableController />
        </div>

        {/* Right Panel - Properties */}
        {showProperties && (
          <>
            <div 
              style={{
                ...styles.verticalResizeHandle,
                ...(isHoveringRightHandle ? styles.verticalResizeHandleHover : {})
              }}
              onMouseDown={handleRightPanelResize}
              onMouseEnter={() => setIsHoveringRightHandle(true)}
              onMouseLeave={() => setIsHoveringRightHandle(false)}
            >
              <div style={styles.verticalResizeHandleBar} />
            </div>
            <div style={{
              ...styles.rightPanel,
              width: `${rightPanelWidth}px`
            }}>
              <GraphicsPropertiesPanel />
            </div>
          </>
        )}
      </div>

      {/* Timeline */}
      {showTimeline && <IntegratedTimeline />}
    </div>
  );
};

const GraphicsEditor: React.FC = () => {
  return (
    <AnimationProvider>
      <GraphicsEditorContent />
    </AnimationProvider>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#1a1a1a',
    color: '#e0e0e0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '13px',
    overflow: 'hidden'
  },
  header: {
    height: '48px',
    background: '#2a2a2a',
    borderBottom: '1px solid #333',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'visible'
  },
  headerControls: {
    display: 'flex',
    gap: '8px',
    marginRight: '12px'
  },
  controlButton: {
    padding: '6px 12px',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'background-color 0.2s'
  },
  content: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden'
  },
  leftPanel: {
    background: '#252525',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    flexShrink: 0
  },
  canvasContainer: {
    flex: 1,
    background: '#1a1a1a',
    position: 'relative',
    overflow: 'hidden'
  },
  rightPanel: {
    background: '#252525',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    flexShrink: 0
  },
  verticalResizeHandle: {
    width: '6px',
    background: '#1a1a1a',
    borderLeft: '1px solid #333',
    borderRight: '1px solid #333',
    cursor: 'ew-resize',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
    flexShrink: 0
  },
  verticalResizeHandleHover: {
    background: '#2a2a2a'
  },
  verticalResizeHandleBar: {
    width: '2px',
    height: '40px',
    background: '#555',
    borderRadius: '1px'
  }
};

export default GraphicsEditor;