import React from 'react';
import { createRoot } from 'react-dom/client';
import ControlPad from './components/ControlPad.jsx';

// State for the control pad
let controlPadState = {
  buttons: [],
  buttonsPerRow: 8,
  totalRows: 4,
  controlPadZoom: 1.0,
  executionState: {}
};

// Handle button clicks
const handleButtonClick = (button, index) => {
  // Send button click back to main window
  window.opener.postMessage({
    type: 'CONTROL_PAD_BUTTON_CLICK',
    button,
    index
  }, '*');
};

// Handle zoom changes
const handleZoomChange = (zoom) => {
  controlPadState.controlPadZoom = zoom;
  // Send zoom change back to main window
  window.opener.postMessage({
    type: 'CONTROL_PAD_ZOOM_CHANGE',
    zoom
  }, '*');
  renderControlPad();
};

// Render the control pad
const renderControlPad = () => {
  const root = document.getElementById('control-pad-root');
  if (root && window.React) {
    const reactRoot = createRoot(root);
    reactRoot.render(
      React.createElement(ControlPad, {
        buttons: controlPadState.buttons,
        buttonsPerRow: controlPadState.buttonsPerRow,
        totalRows: controlPadState.totalRows,
        controlPadZoom: controlPadState.controlPadZoom,
        onButtonClick: handleButtonClick,
        onZoomChange: handleZoomChange
      })
    );
  }
};

// Listen for updates from main window
window.addEventListener('message', (event) => {
  console.log('Control pad received message:', event.data.type);
  if (event.data.type === 'UPDATE_CONTROL_PAD') {
    console.log('Updating control pad with buttons:', event.data.buttons?.length, 'buttons');
    console.log('First few buttons:', event.data.buttons?.slice(0, 4));
    controlPadState = {
      ...controlPadState,
      buttons: event.data.buttons,
      buttonsPerRow: event.data.buttonsPerRow,
      totalRows: event.data.totalRows,
      controlPadZoom: event.data.controlPadZoom,
      executionState: event.data.executionState
    };
    renderControlPad();
  }
});

// Initial render once React is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderControlPad);
} else {
  renderControlPad();
}