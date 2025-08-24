// src/components/graphics/EditorLayersPanel.tsx
import React from 'react';
import { 
  Layers, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock,
  ChevronDown,
  ChevronRight 
} from 'lucide-react';
import { useGraphicsStore } from './stores/graphicsStore';
import clsx from 'clsx';

export const EditorLayersPanel: React.FC = () => {
  const { 
    elements, 
    selectedElementId, 
    setSelectedElementId,
    updateElement 
  } = useGraphicsStore();

  const toggleVisibility = (id: string, currentVisible: boolean) => {
    updateElement(id, { visible: !currentVisible });
  };

  const toggleLock = (id: string, currentLocked: boolean) => {
    updateElement(id, { locked: !currentLocked });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Layers size={16} />
          <span className="font-medium">Layers</span>
        </div>
      </div>

      {/* Layers List */}
      <div className="flex-1 overflow-y-auto">
        {elements.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No elements yet
          </div>
        ) : (
          <div className="py-1">
            {[...elements].reverse().map((element) => (
              <div
                key={element.id}
                onClick={() => setSelectedElementId(element.id)}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors',
                  selectedElementId === element.id
                    ? 'bg-blue-600/20 border-l-2 border-blue-500'
                    : 'hover:bg-gray-700/50'
                )}
              >
                {/* Element Type Icon */}
                <div className="text-gray-400">
                  {element.type === 'rect' && '▢'}
                  {element.type === 'circle' && '○'}
                  {element.type === 'text' && 'T'}
                  {element.type === 'image' && '▣'}
                </div>

                {/* Element Name */}
                <span className="flex-1 text-sm truncate">
                  {element.name || `${element.type} ${element.id.slice(-4)}`}
                </span>

                {/* Visibility Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleVisibility(element.id, element.visible);
                  }}
                  className="p-1 hover:bg-gray-600 rounded"
                >
                  {element.visible ? (
                    <Eye size={14} className="text-gray-400" />
                  ) : (
                    <EyeOff size={14} className="text-gray-600" />
                  )}
                </button>

                {/* Lock Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLock(element.id, element.locked);
                  }}
                  className="p-1 hover:bg-gray-600 rounded"
                >
                  {element.locked ? (
                    <Lock size={14} className="text-gray-400" />
                  ) : (
                    <Unlock size={14} className="text-gray-600" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with element count */}
      <div className="p-3 border-t border-gray-700 text-xs text-gray-500">
        {elements.length} element{elements.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};