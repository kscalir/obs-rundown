import React, { useState, useEffect } from 'react';
import ControlPad from './components/ControlPad';

export default function ControlPadPage() {
  const [controlState, setControlState] = useState({
    buttons: [],
    buttonsPerRow: 8,
    totalRows: 4,
    controlPadZoom: 1.0,
    executionState: {}
  });

  // Handle button clicks
  const handleButtonClick = (button, index) => {
    // Send button click back to main window
    if (window.opener) {
      window.opener.postMessage({
        type: 'CONTROL_PAD_BUTTON_CLICK',
        button,
        index
      }, '*');
    }
  };

  // Handle zoom changes
  const handleZoomChange = (zoom) => {
    setControlState(prev => ({ ...prev, controlPadZoom: zoom }));
    // Send zoom change back to main window
    if (window.opener) {
      window.opener.postMessage({
        type: 'CONTROL_PAD_ZOOM_CHANGE',
        zoom
      }, '*');
    }
  };

  // Listen for updates from main window
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === 'UPDATE_CONTROL_PAD') {
        setControlState({
          buttons: event.data.buttons || [],
          buttonsPerRow: event.data.buttonsPerRow || 8,
          totalRows: event.data.totalRows || 4,
          controlPadZoom: event.data.controlPadZoom || 1.0,
          executionState: event.data.executionState || {}
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <ControlPad
      buttons={controlState.buttons}
      buttonsPerRow={controlState.buttonsPerRow}
      totalRows={controlState.totalRows}
      controlPadZoom={controlState.controlPadZoom}
      onButtonClick={handleButtonClick}
      onZoomChange={handleZoomChange}
    />
  );
}