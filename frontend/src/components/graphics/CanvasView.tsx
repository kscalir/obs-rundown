import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Stage, Layer, Rect, Line, Group, Text } from 'react-konva';
import Konva from 'konva';
import { useEditorStore } from './state/editorStore';
import { ElementRenderer } from './engine/ElementRenderer';
import type { Element as EditorElement, ImageElement, VideoElement } from './types';

// Create checker pattern once
const createCheckerPattern = () => {
  const patternCanvas = document.createElement('canvas');
  patternCanvas.width = 32;
  patternCanvas.height = 32;
  const ctx = patternCanvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillRect(16, 16, 16, 16);
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(16, 0, 16, 16);
    ctx.fillRect(0, 16, 16, 16);
  }
  return patternCanvas;
};

const checkerPattern = createCheckerPattern();

export const CanvasView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  
  const {
    canvas,
    layers,
    zoom,
    panX,
    panY,
    tool,
    showGrid,
    showRulers,
    selectedElementIds,
    selectElement,
    deselectAll,
    updateElement,
    setPan,
    setZoom,
    addElement,
    activeLayerId,
    setTool
  } = useEditorStore();

  // Fit canvas to viewport function
  const fitToView = useCallback(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      const padding = 40; // pixels of padding on each side
      const scaleX = (width - padding * 2) / canvas.size.width;
      const scaleY = (height - padding * 2) / canvas.size.height;
      const fitZoom = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%
      
      setZoom(fitZoom);
      setPan(0, 0); // Reset pan to center
    }
  }, [canvas.size.width, canvas.size.height, setZoom, setPan]);

  // Add keyboard shortcut for fit to view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F key for fit to view
      if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        fitToView();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fitToView]);

  // Update container size on mount and resize, and fit canvas to viewport
  useEffect(() => {
    let resizeTimeout: ReturnType<typeof setTimeout>;
    let resizeObserver: ResizeObserver | null = null;
    let isInitialMount = true;
    
    const updateSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const prevWidth = containerSize.width;
        const prevHeight = containerSize.height;
        setContainerSize({ width, height });
        
        // Auto-fit on initial mount
        if (isInitialMount) {
          isInitialMount = false;
          fitToView();
        }
      }
    };
    
    // Debounced resize handler
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateSize, 50);
    };

    // Use ResizeObserver to detect container size changes
    if (containerRef.current) {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(containerRef.current);
    }

    updateSize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [fitToView]);

  // Calculate stage position to center canvas - memoized
  const stageX = useMemo(() => (containerSize.width - canvas.size.width * zoom) / 2 + panX, 
    [containerSize.width, canvas.size.width, zoom, panX]);
  const stageY = useMemo(() => (containerSize.height - canvas.size.height * zoom) / 2 + panY,
    [containerSize.height, canvas.size.height, zoom, panY]);

  
  // Handle mouse wheel for zoom
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    
    const scaleBy = 1.1;
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = zoom;
    const pointer = stage.getPointerPosition();
    
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    // Batch state updates
    useEditorStore.setState((state) => ({
      ...state,
      zoom: Math.max(0.1, Math.min(5, newScale)),
      panX: newPos.x - stageX + panX,
      panY: newPos.y - stageY + panY
    }));
  }, [zoom, stageX, stageY, panX, panY]);

  // Handle stage drag for panning
  const handleStageDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    // Only handle stage drag when using hand tool
    if (tool === 'hand' && e.target.getClassName() === 'Stage') {
      const stage = e.target as Konva.Stage;
      // Update pan based on new stage position
      const newPanX = stage.x() - (containerSize.width - canvas.size.width * zoom) / 2;
      const newPanY = stage.y() - (containerSize.height - canvas.size.height * zoom) / 2;
      setPan(newPanX, newPanY);
    }
  }, [tool, zoom, containerSize, canvas.size, setPan]);

  // Handle mouse down for selection
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Only start selection if clicking on stage background and using select tool
    if (e.target === e.target.getStage() && tool === 'select' && !e.evt.shiftKey) {
      const stage = e.target.getStage();
      if (!stage) return;
      
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      
      // Convert to canvas coordinates
      const x = (pointer.x - stageX) / zoom;
      const y = (pointer.y - stageY) / zoom;
      
      setIsSelecting(true);
      setSelectionStart({ x, y });
      setSelectionRect({ x, y, width: 0, height: 0 });
      deselectAll();
    }
  }, [tool, stageX, stageY, zoom, deselectAll]);
  
  // Handle mouse move for selection - throttled for performance
  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isSelecting) return;
    
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    
    // Convert to canvas coordinates
    const x = (pointer.x - stageX) / zoom;
    const y = (pointer.y - stageY) / zoom;
    
    const rect = {
      x: Math.min(selectionStart.x, x),
      y: Math.min(selectionStart.y, y),
      width: Math.abs(x - selectionStart.x),
      height: Math.abs(y - selectionStart.y)
    };
    
    setSelectionRect(rect);
  }, [isSelecting, selectionStart, stageX, stageY, zoom]);
  
  // Handle mouse up for selection
  const handleMouseUp = useCallback(() => {
    if (isSelecting) {
      // Perform final selection calculation
      const rect = selectionRect;
      if (rect.width > 5 && rect.height > 5) { // Minimum selection size
        const selectedIds: string[] = [];
        
        layers.forEach(layer => {
          if (!layer.visible || layer.locked) return;
          
          layer.elements.forEach(element => {
            if (element.locked || !element.visible) return;
            
            // Check if element is within selection rectangle
            const elementBounds = {
              left: element.x,
              right: element.x + element.width,
              top: element.y,
              bottom: element.y + element.height
            };
            
            const selectionBounds = {
              left: rect.x,
              right: rect.x + rect.width,
              top: rect.y,
              bottom: rect.y + rect.height
            };
            
            // Check for intersection
            if (elementBounds.left < selectionBounds.right &&
                elementBounds.right > selectionBounds.left &&
                elementBounds.top < selectionBounds.bottom &&
                elementBounds.bottom > selectionBounds.top) {
              selectedIds.push(element.id);
            }
          });
        });
        
        // Batch update selection
        if (selectedIds.length > 0) {
          const store = useEditorStore.getState();
          store.deselectAll();
          selectedIds.forEach(id => store.selectElement(id, true));
        }
      }
      
      setIsSelecting(false);
      setSelectionRect({ x: 0, y: 0, width: 0, height: 0 });
    }
  }, [isSelecting, selectionRect, layers]);

  // Handle drag and drop for images
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    const videoFile = files.find(file => file.type.startsWith('video/'));
    
    // Calculate position relative to canvas
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (e.clientX - rect.left - stageX) / zoom;
    const y = (e.clientY - rect.top - stageY) / zoom;
    
    if (imageFile) {
      const imageUrl = URL.createObjectURL(imageFile);
      const img = new Image();
      
      img.onload = () => {
        // Calculate appropriate size
        const maxSize = 400;
        let width = img.width;
        let height = img.height;
        
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width *= ratio;
          height *= ratio;
        }
        
        const newImage: ImageElement = {
          id: `image-${Date.now()}`,
          type: 'image',
          name: imageFile.name,
          src: imageUrl,
          x: x - width / 2,
          y: y - height / 2,
          width,
          height,
          visible: true,
          locked: false,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1,
          zIndex: 0
        };
        
        addElement(newImage, activeLayerId || undefined);
        setTool('select');
      };
      
      img.src = imageUrl;
    } else if (videoFile) {
      const videoUrl = URL.createObjectURL(videoFile);
      const video = document.createElement('video');
      
      video.onloadedmetadata = () => {
        // Calculate appropriate size
        const maxSize = 600;
        let width = video.videoWidth;
        let height = video.videoHeight;
        
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width *= ratio;
          height *= ratio;
        }
        
        const newVideo: VideoElement = {
          id: `video-${Date.now()}`,
          type: 'video',
          name: videoFile.name,
          src: videoUrl,
          x: x - width / 2,
          y: y - height / 2,
          width,
          height,
          visible: true,
          locked: false,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1,
          zIndex: 0,
          playing: false,
          loop: false,
          muted: false,
          volume: 1,
          currentTime: 0,
          duration: video.duration
        };
        
        addElement(newVideo, activeLayerId || undefined);
        setTool('select');
      };
      
      video.src = videoUrl;
    }
  }, [zoom, stageX, stageY, addElement, activeLayerId, setTool]);

  // Render grid - memoized
  const renderGrid = useMemo(() => () => {
    if (!showGrid) return null;

    const gridLines = [];
    const { width, height } = canvas.size;
    const { gridSize } = canvas;

    // Vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      gridLines.push(
        <Line
          key={`v-${x}`}
          points={[x, 0, x, height]}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={1}
        />
      );
    }

    // Horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      gridLines.push(
        <Line
          key={`h-${y}`}
          points={[0, y, width, y]}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={1}
        />
      );
    }

    return gridLines;
  }, [showGrid, canvas.size, canvas.gridSize]);

  // Render rulers - memoized
  const renderRulers = useMemo(() => () => {
    if (!showRulers) return null;

    const rulerElements = [];
    const { width, height } = canvas.size;
    const step = 100;

    // Top ruler
    for (let x = 0; x <= width; x += step) {
      rulerElements.push(
        <Group key={`ruler-top-${x}`}>
          <Line
            points={[x, -20, x, 0]}
            stroke="rgba(255, 255, 255, 0.3)"
            strokeWidth={1}
          />
          <Text
            x={x - 15}
            y={-35}
            text={x.toString()}
            fontSize={10}
            fill="rgba(255, 255, 255, 0.5)"
          />
        </Group>
      );
    }

    // Left ruler
    for (let y = 0; y <= height; y += step) {
      rulerElements.push(
        <Group key={`ruler-left-${y}`}>
          <Line
            points={[-20, y, 0, y]}
            stroke="rgba(255, 255, 255, 0.3)"
            strokeWidth={1}
          />
          <Text
            x={-45}
            y={y - 5}
            text={y.toString()}
            fontSize={10}
            fill="rgba(255, 255, 255, 0.5)"
          />
        </Group>
      );
    }

    return rulerElements;
  }, [showRulers, canvas.size]);

  // Render safe zones - memoized
  const renderSafeZones = useMemo(() => () => {
    if (!canvas.showSafeZones) return null;

    const { width, height } = canvas.size;
    const titleSafe = 0.1; // 10% margin
    const actionSafe = 0.05; // 5% margin

    return (
      <>
        {/* Action safe */}
        <Rect
          x={width * actionSafe}
          y={height * actionSafe}
          width={width * (1 - actionSafe * 2)}
          height={height * (1 - actionSafe * 2)}
          stroke="rgba(255, 200, 0, 0.3)"
          strokeWidth={1}
          dash={[5, 5]}
        />
        {/* Title safe */}
        <Rect
          x={width * titleSafe}
          y={height * titleSafe}
          width={width * (1 - titleSafe * 2)}
          height={height * (1 - titleSafe * 2)}
          stroke="rgba(255, 100, 0, 0.3)"
          strokeWidth={1}
          dash={[5, 5]}
        />
      </>
    );
  }, [canvas.showSafeZones, canvas.size]);

  // Render all elements from layers - memoized
  const renderElements = useMemo(() => () => {
    const elements: React.ReactNode[] = [];

    // Render layers in reverse order (bottom to top)
    [...layers].reverse().forEach((layer) => {
      if (!layer.visible) return;

      layer.elements.forEach((element) => {
        elements.push(
          <ElementRenderer
            key={element.id}
            element={element}
            isSelected={selectedElementIds.includes(element.id)}
            onSelect={(id) => selectElement(id)}
            onUpdate={(updates) => updateElement(element.id, updates)}
          />
        );
      });
    });

    return elements;
  }, [layers, selectedElementIds, selectElement, updateElement]);

  return (
    <div 
      ref={containerRef}
      style={{ 
        width: '100%', 
        height: '100%', 
        overflow: 'hidden',
        background: '#1a1a1a',
        position: 'relative'
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Stage
        ref={stageRef}
        width={containerSize.width}
        height={containerSize.height}
        x={stageX}
        y={stageY}
        scaleX={zoom}
        scaleY={zoom}
        onWheel={handleWheel}
        onDragEnd={handleStageDragEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        draggable={tool === 'hand'}
        style={{ cursor: tool === 'hand' ? 'grab' : tool === 'select' ? 'crosshair' : 'default' }}
        listening={true}
      >
        <Layer>
          {/* Canvas background */}
          <Rect
            x={0}
            y={0}
            width={canvas.size.width}
            height={canvas.size.height}
            fill={canvas.backgroundColor === 'transparent' ? undefined : canvas.backgroundColor}
            listening={false}
          />
          
          {/* Transparency checkerboard pattern for transparent background - optimized */}
          {canvas.backgroundColor === 'transparent' && (
            <Group listening={false}>
              <Rect
                x={0}
                y={0}
                width={canvas.size.width}
                height={canvas.size.height}
                fillPatternImage={checkerPattern}
                fillPatternRepeat="repeat"
                listening={false}
              />
            </Group>
          )}
          
          {/* Grid */}
          {renderGrid()}
          
          {/* Safe zones */}
          {renderSafeZones()}
          
          {/* Elements */}
          {renderElements()}
          
          {/* Rulers (on top) */}
          {renderRulers()}
          
          {/* Selection rectangle */}
          {isSelecting && (
            <Rect
              x={selectionRect.x}
              y={selectionRect.y}
              width={selectionRect.width}
              height={selectionRect.height}
              fill="rgba(26, 115, 232, 0.1)"
              stroke="#1a73e8"
              strokeWidth={1}
              dash={[5, 5]}
              listening={false}
            />
          )}
        </Layer>
      </Stage>
      
      {/* Zoom indicator */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        background: 'rgba(0, 0, 0, 0.6)',
        color: '#fff',
        padding: '5px 10px',
        borderRadius: '4px',
        fontSize: '12px',
        fontFamily: 'monospace'
      }}>
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
};