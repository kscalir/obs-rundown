import React from 'react';
import GraphicsEditor from './GraphicsEditor';

/**
 * Isolated Graphics Editor Application
 * This component ensures complete isolation from the main app
 * Only loads at /graphics-editor route
 */
export const GraphicsEditorApp: React.FC = () => {
  // Check if we're on the correct route
  React.useEffect(() => {
    // Only initialize if we're on the graphics-editor route
    if (window.location.pathname !== '/graphics-editor') {
      console.warn('GraphicsEditorApp loaded outside of /graphics-editor route');
      return;
    }

    console.log('Graphics Editor initialized at /graphics-editor');
    
    // Clean up any global styles or listeners when unmounting
    return () => {
      console.log('Graphics Editor unmounted');
      // Remove any Moveable proxy elements that might be lingering
      document.querySelectorAll('.moveable-proxy, .moveable-container').forEach(el => el.remove());
    };
  }, []);

  // Only render if we're on the correct route
  if (window.location.pathname !== '/graphics-editor') {
    return null;
  }

  return (
    <div 
      id="graphics-editor-root"
      style={{ 
        width: '100vw', 
        height: '100vh', 
        overflow: 'hidden',
        background: '#1a1a1a',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999,
        isolation: 'isolate' // CSS containment
      }}
    >
      <GraphicsEditor />
    </div>
  );
};

export default GraphicsEditorApp;