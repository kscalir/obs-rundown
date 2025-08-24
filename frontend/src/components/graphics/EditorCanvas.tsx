// src/components/graphics/EditorCanvas.tsx
import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Circle, Text, Transformer, Group } from 'react-konva';
import Konva from 'konva';
import { useGraphicsStore } from './stores/graphicsStore';
import Scene from 'scenejs';

interface EditorCanvasProps {
  scene: Scene | null;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({ scene }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  
  const {
    elements,
    selectedElementId,
    setSelectedElementId,
    updateElement,
    addElement,
    activeTool,
    setActiveTool,
  } = useGraphicsStore();

  const [stageSize, setStageSize] = useState({ width: 800, height: 450 });
  const [stageScale, setStageScale] = useState(1);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });

  // Canvas is always 16:9
  const CANVAS_WIDTH = 1920;
  const CANVAS_HEIGHT = 1080;

  // Update canvas size when container resizes
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      
      // Calculate scale to fit 16:9 canvas in container with padding
      const padding = 20; // Padding around canvas
      const availableWidth = containerWidth - padding * 2;
      const availableHeight = containerHeight - padding * 2;
      
      const scaleX = availableWidth / CANVAS_WIDTH;
      const scaleY = availableHeight / CANVAS_HEIGHT;
      const scale = Math.min(scaleX, scaleY);
      
      // Calculate centered position
      const scaledWidth = CANVAS_WIDTH * scale;
      const scaledHeight = CANVAS_HEIGHT * scale;
      const x = (containerWidth - scaledWidth) / 2;
      const y = (containerHeight - scaledHeight) / 2;
      
      setStageSize({
        width: containerWidth,
        height: containerHeight,
      });
      setStageScale(scale);
      setStagePosition({ x, y });
    };

    updateSize();
    
    // Watch for resize
    const resizeObserver = new ResizeObserver(updateSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Update transformer when selection changes
  useEffect(() => {
    if (selectedElementId && transformerRef.current && layerRef.current) {
      const selectedNode = layerRef.current.findOne(`#${selectedElementId}`);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer()?.batchDraw();
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
    }
  }, [selectedElementId]);

  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const point = stage?.getPointerPosition();
    
    // Check if we clicked on the background (checkerboard or white rect)
    const clickedOnBackground = e.target.hasName('background');
    
    if (clickedOnBackground && activeTool !== 'select' && point) {
      // Create new element at click position
      const transform = stage.getAbsoluteTransform().copy();
      transform.invert();
      const pos = transform.point(point);
      
      const id = `element-${Date.now()}`;
      
      let newElement: any = {
        id,
        name: `${activeTool} ${elements.length + 1}`,
        x: pos.x,
        y: pos.y,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        locked: false,
      };
      
      switch (activeTool) {
        case 'rect':
          newElement = {
            ...newElement,
            type: 'rect',
            width: 200,
            height: 100,
            fill: '#3B82F6',
            stroke: '#1E40AF',
            strokeWidth: 2,
            cornerRadius: 0,
          };
          break;
        case 'circle':
          newElement = {
            ...newElement,
            type: 'circle',
            radius: 50,
            fill: '#10B981',
            stroke: '#047857',
            strokeWidth: 2,
          };
          break;
        case 'text':
          newElement = {
            ...newElement,
            type: 'text',
            text: 'Double click to edit',
            fontSize: 32,
            fontFamily: 'Arial',
            fontWeight: 'normal',
            fill: '#000000',
            width: 300,
            align: 'left',
            lineHeight: 1.2,
          };
          break;
      }
      
      if (newElement.type) {
        addElement(newElement);
        setActiveTool('select');
      }
      return;
    }
    
    // Click on background with select tool - deselect
    if (clickedOnBackground) {
      setSelectedElementId(null);
      return;
    }
    
    // Click on an element
    const clickedId = e.target.id();
    if (clickedId && clickedId !== '') {
      setSelectedElementId(clickedId);
    }
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>, elementId: string) => {
    updateElement(elementId, {
      x: e.target.x(),
      y: e.target.y(),
    });
  };

  const handleTransformEnd = (e: Konva.KonvaEventObject<Event>, elementId: string) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    node.scaleX(1);
    node.scaleY(1);

    updateElement(elementId, {
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      width: Math.max(5, node.width() * scaleX),
      height: Math.max(5, node.height() * scaleY),
    });
  };

  // Create checkerboard pattern
  const renderCheckerboard = () => {
    const squares = [];
    const squareSize = 20;
    const numX = Math.ceil(CANVAS_WIDTH / squareSize);
    const numY = Math.ceil(CANVAS_HEIGHT / squareSize);
    
    for (let i = 0; i < numX; i++) {
      for (let j = 0; j < numY; j++) {
        if ((i + j) % 2 === 0) {
          squares.push(
            <Rect
              key={`checker-${i}-${j}`}
              x={i * squareSize}
              y={j * squareSize}
              width={squareSize}
              height={squareSize}
              fill="#e5e7eb"
              listening={false}
            />
          );
        }
      }
    }
    return squares;
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full flex items-center justify-center bg-gray-900"
      style={{
        backgroundImage: `
          radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) 100%)
        `,
      }}
    >
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        onMouseDown={handleStageMouseDown}
      >
        <Layer>
          {/* Shadow/border around canvas */}
          <Rect
            x={stagePosition.x - 2}
            y={stagePosition.y - 2}
            width={(CANVAS_WIDTH * stageScale) + 4}
            height={(CANVAS_HEIGHT * stageScale) + 4}
            fill="rgba(0,0,0,0.3)"
            listening={false}
            shadowColor="black"
            shadowBlur={20}
            shadowOpacity={0.5}
          />
          
          {/* Main canvas group with scaling */}
          <Group
            x={stagePosition.x}
            y={stagePosition.y}
            scaleX={stageScale}
            scaleY={stageScale}
          >
            {/* Checkerboard background */}
            <Group name="background">
              <Rect
                x={0}
                y={0}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                fill="#f3f4f6"
                name="background"
              />
              {renderCheckerboard()}
              <Rect
                x={0}
                y={0}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                fill="transparent"
                name="background"
              />
            </Group>

            {/* Render elements */}
            {elements.filter(el => el.visible).map((element) => {
            const commonProps = {
                id: element.id,
                // Remove 'key' from here
                x: element.x,
                y: element.y,
                rotation: element.rotation || 0,
                draggable: !element.locked,
                onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => handleDragEnd(e, element.id),
                onTransformEnd: (e: Konva.KonvaEventObject<Event>) => handleTransformEnd(e, element.id),
                opacity: element.opacity || 1,
            };

            switch (element.type) {
                case 'rect':
                return (
                    <Rect
                    key={element.id}  // Add key directly here
                    {...commonProps}
                    width={element.width}
                    height={element.height}
                    fill={element.fill}
                    stroke={element.stroke}
                    strokeWidth={element.strokeWidth}
                    cornerRadius={element.cornerRadius || 0}
                    />
                );
                case 'circle':
                return (
                    <Circle
                    key={element.id}  // Add key directly here
                    {...commonProps}
                    radius={element.radius}
                    fill={element.fill}
                    stroke={element.stroke}
                    strokeWidth={element.strokeWidth}
                    />
                );
                case 'text':
                return (
                    <Text
                    key={element.id}  // Add key directly here
                    {...commonProps}
                    text={element.text}
                    fontSize={element.fontSize}
                    fontFamily={element.fontFamily}
                    fill={element.fill}
                    width={element.width}
                    align={element.align}
                    />
                );
                default:
                return null;
            }
            })}

            {/* Transformer */}
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 5 || newBox.height < 5) {
                  return oldBox;
                }
                return newBox;
              }}
            />
          </Group>
        </Layer>
      </Stage>
      
      {/* Canvas size indicator */}
      <div className="absolute bottom-4 right-4 text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
        {CANVAS_WIDTH} × {CANVAS_HEIGHT} ({Math.round(stageScale * 100)}%)
      </div>
    </div>
  );
};