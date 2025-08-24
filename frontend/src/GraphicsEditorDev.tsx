import React, { useEffect } from 'react';
import ResizableLoopicEditor from './components/graphics/Editor/ResizableLoopicEditor';
import './components/graphics/editor-reset.css';
// Updated: 2025-08-23

const GraphicsEditorDev: React.FC = () => {
  useEffect(() => {
    // Reset body styles for graphics editor
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.display = 'block';
    document.body.style.placeItems = 'unset';
    document.body.style.minWidth = 'unset';
    document.body.style.minHeight = 'unset';
    document.body.style.width = '100vw';
    document.body.style.height = '100vh';
    document.body.style.overflow = 'hidden';
    
    return () => {
      // Clean up on unmount
      document.body.style.cssText = '';
    };
  }, []);
  
  return (
    <div className="graphics-editor-root">
      <ResizableLoopicEditor />
    </div>
  );
};

export default GraphicsEditorDev;