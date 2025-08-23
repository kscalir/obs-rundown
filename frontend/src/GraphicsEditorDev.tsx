import React from 'react';
import GraphicsEditorApp from './components/graphics/GraphicsEditorApp';

/**
 * Route wrapper for /graphics-editor
 * This ensures the graphics editor is completely isolated from the main app
 */
const GraphicsEditorDev: React.FC = () => {
  return <GraphicsEditorApp />;
};

export default GraphicsEditorDev;