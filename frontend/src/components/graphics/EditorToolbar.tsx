// src/components/graphics/EditorToolbar.tsx
import React, { useState } from 'react';
import {
  MousePointer2,
  Hand,
  Type,
  Square,
  Circle,
  Triangle,
  Hexagon,
  Star,
  PenTool,
  Image,
  Video,
  Group,
  Ungroup,
  Undo2,
  Redo2,
  AlignLeft,
  AlignCenterHorizontal,
  AlignRight,
  AlignStartHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  ZoomIn,
  ZoomOut,
  Maximize,
  ChevronDown,
} from 'lucide-react';
import { useGraphicsStore } from './stores/graphicsStore';
import clsx from 'clsx';

export const EditorToolbar: React.FC = () => {
  const {
    activeTool,
    setActiveTool,
    selectedElementId,
    undo,
    redo,
    zoom,
    setZoom,
  } = useGraphicsStore();

  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [selectedShape, setSelectedShape] = useState('rect');

  const mainTools = [
    { id: 'select', icon: MousePointer2, label: 'Select (V)' },
    { id: 'hand', icon: Hand, label: 'Hand (H)' },
    { id: 'text', icon: Type, label: 'Text (T)' },
  ];

  const shapes = [
    { id: 'rect', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'triangle', icon: Triangle, label: 'Triangle' },
    { id: 'star', icon: Star, label: 'Star' },
    { id: 'hexagon', icon: Hexagon, label: 'Hexagon' },
  ];

  const alignmentTools = [
    { id: 'align-left', icon: AlignLeft, label: 'Align Left' },
    { id: 'align-center-h', icon: AlignCenterHorizontal, label: 'Align Center' },
    { id: 'align-right', icon: AlignRight, label: 'Align Right' },
    { id: 'align-top', icon: AlignStartHorizontal, label: 'Align Top' },
    { id: 'align-center-v', icon: AlignCenterVertical, label: 'Align Middle' },
    { id: 'align-bottom', icon: AlignEndHorizontal, label: 'Align Bottom' },
    { id: 'distribute-h', icon: AlignHorizontalDistributeCenter, label: 'Distribute Horizontal' },
    { id: 'distribute-v', icon: AlignVerticalDistributeCenter, label: 'Distribute Vertical' },
  ];

  const handleShapeSelect = (shapeId: string) => {
    setSelectedShape(shapeId);
    setActiveTool(shapeId as any);
    setShowShapeMenu(false);
  };

  const getCurrentShapeIcon = () => {
    const shape = shapes.find(s => s.id === selectedShape);
    return shape ? shape.icon : Square;
  };

  const ShapeIcon = getCurrentShapeIcon();

  return (
    <div className="h-full flex items-center justify-between px-3">
      <div className="flex items-center gap-3">
        {/* Main Tools Group */}
        <div className="flex items-center gap-0.5">
          {mainTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id as any)}
                title={tool.label}
                className={clsx(
                  'p-1.5 rounded transition-colors',
                  activeTool === tool.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                )}
              >
                <Icon size={16} />
              </button>
            );
          })}
          
          {/* Multi-Shape Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowShapeMenu(!showShapeMenu)}
              title="Shapes"
              className={clsx(
                'p-1.5 rounded transition-colors flex items-center gap-0.5',
                shapes.some(s => s.id === activeTool)
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              )}
            >
              <ShapeIcon size={16} />
              <ChevronDown size={12} />
            </button>
            
            {showShapeMenu && (
              <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg z-50">
                {shapes.map((shape) => {
                  const Icon = shape.icon;
                  return (
                    <button
                      key={shape.id}
                      onClick={() => handleShapeSelect(shape.id)}
                      className="flex items-center gap-2 px-3 py-1.5 text-gray-400 hover:text-white hover:bg-gray-700 w-full text-left"
                    >
                      <Icon size={16} />
                      <span className="text-sm">{shape.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pen Tool */}
          <button
            onClick={() => setActiveTool('pen' as any)}
            title="Pen Tool (P)"
            className={clsx(
              'p-1.5 rounded transition-colors',
              activeTool === 'pen'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            )}
          >
            <PenTool size={16} />
          </button>

          {/* Image Tool */}
          <button
            onClick={() => setActiveTool('image' as any)}
            title="Image (I)"
            className={clsx(
              'p-1.5 rounded transition-colors',
              activeTool === 'image'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            )}
          >
            <Image size={16} />
          </button>

          {/* Video Tool */}
          <button
            onClick={() => setActiveTool('video' as any)}
            title="Video"
            className={clsx(
              'p-1.5 rounded transition-colors',
              activeTool === 'video'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            )}
          >
            <Video size={16} />
          </button>
        </div>

        {/* Group/Ungroup */}
        <div className="flex items-center gap-0.5">
          <button
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Group (Ctrl+G)"
          >
            <Group size={16} />
          </button>
          <button
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Ungroup (Ctrl+Shift+G)"
          >
            <Ungroup size={16} />
          </button>
        </div>

        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={undo}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={redo}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={16} />
          </button>
        </div>

        {/* Alignment Tools */}
        <div className="flex items-center gap-0.5">
          {alignmentTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                title={tool.label}
              >
                <Icon size={16} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Right-aligned Zoom Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <span className="text-xs text-gray-400 min-w-[2.5rem] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(Math.min(5, zoom + 0.1))}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={() => setZoom(1)}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          title="Fit to Screen"
        >
          <Maximize size={16} />
        </button>
      </div>
    </div>
  );
};