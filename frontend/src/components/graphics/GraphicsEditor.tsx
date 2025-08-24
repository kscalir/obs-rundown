// src/components/graphics/GraphicsEditor.tsx
import React, { useEffect, useRef } from 'react';
import Scene from 'scenejs';
import { useGraphicsStore } from './stores/graphicsStore';
import { EditorCanvas } from './EditorCanvas';
import { EditorTimeline } from './EditorTimeline';
import { EditorPropertyPanel } from './EditorPropertyPanel';
import { EditorToolbar } from './EditorToolbar';
import { EditorLayersPanel } from './EditorLayersPanel'; // New component
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import { useState } from 'react';


export const GraphicsEditor: React.FC = () => {
  const sceneRef = useRef<Scene | null>(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(200);
  const [rightPanelWidth, setRightPanelWidth] = useState(240);


  useEffect(() => {
    const scene = new Scene({});
    sceneRef.current = scene;

    return () => {
      scene.clear();
    };
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-900 text-white">
      return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Toolbar */}
      <div className="h-12 bg-gray-800 border-b border-gray-700">
        <EditorToolbar 
          leftPanelWidth={leftPanelWidth} 
          rightPanelWidth={rightPanelWidth} 
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        <Allotment
          onVisibleChange={(sizes) => {
            // Update panel widths when resized
            if (sizes[0]) setLeftPanelWidth(sizes[0]);
            if (sizes[2]) setRightPanelWidth(sizes[2]);
          }}
        >
          {/* Left Panel - Layers */}
          <Allotment.Pane minSize={150} maxSize={400} preferredSize={200}>
            {/* Layers panel content */}
          </Allotment.Pane>

          {/* Middle - Canvas */}
          <Allotment.Pane>
            {/* Canvas content */}
          </Allotment.Pane>

          {/* Right Panel - Properties */}
          <Allotment.Pane minSize={200} maxSize={400} preferredSize={240}>
            {/* Properties panel content */}
          </Allotment.Pane>
        </Allotment>
      </div>

        {/* Bottom - Timeline */}
        <Allotment.Pane minSize={150} preferredSize={256} maxSize={400}>
          <div className="h-full bg-gray-800 border-t border-gray-700">
            <EditorTimeline scene={sceneRef.current} />
          </div>
        </Allotment.Pane>
      </Allotment>
    </div>
  );
};