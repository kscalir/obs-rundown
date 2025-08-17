import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from './config';
import { createApi } from './api/client.js';

export default function ControlSurfacePage() {
  // API client
  const api = useMemo(() => createApi(API_BASE_URL), []);
  
  // State from main window (will be synced via localStorage)
  const [controlState, setControlState] = useState({
    executionState: {},
    controlPadZoom: 1.0,
    selectedEpisodeId: null,
    segments: [],
    currentEpisode: null,
    liveItemId: null,
    previewItemId: null
  });

  // Helper function to get manual buttons from segments (replicated from main component)
  const getManualButtons = () => {
    if (!controlState.segments || !Array.isArray(controlState.segments)) {
      return [];
    }

    return controlState.segments.flatMap(segment => {
      if (!segment.cues || !Array.isArray(segment.cues)) {
        return [];
      }
      
      return segment.cues.flatMap(cue => {
        if (!cue.data || !Array.isArray(cue.data)) {
          return [];
        }
        
        const manualBlocks = cue.data.filter(block => block.type === 'manual');
        return manualBlocks.flatMap(block => block.data?.items || []);
      });
    });
  };

  // Computed button grid (full recreation with manual buttons)
  const buttonGrid = useMemo(() => {
    const buttonsPerRow = 8;
    const totalRows = 4;
    const totalButtons = buttonsPerRow * totalRows;
    const buttons = new Array(totalButtons).fill(null).map(() => ({ 
      type: 'empty', 
      content: '', 
      active: false 
    }));

    // Get manual buttons
    const currentManualButtons = getManualButtons();
    
    // Add manual buttons (first positions)
    currentManualButtons.forEach((manualButton, index) => {
      if (index < totalButtons - 6) { // Leave space for transition, stop, next
        const content = manualButton.description || manualButton.title || 'Manual';
        buttons[index] = {
          type: 'manual',
          content: content,
          active: true,
          armed: controlState.executionState?.armedManualButton === manualButton.id,
          data: manualButton
        };
      }
    });

    // Add transition buttons
    const transitions = [
      { name: 'Cut', type: 'cut' },
      { name: 'Fade', type: 'fade' },
      { name: 'Slide', type: 'slide' },
      { name: 'Stinger', type: 'stinger' }
    ];
    
    transitions.forEach((transition, index) => {
      if (index < 4) {
        buttons[totalButtons - 6 + index] = {
          type: 'transition',
          content: transition.name,
          active: true,
          armed: controlState.executionState?.armedTransition === transition.type,
          data: transition
        };
      }
    });

    // Add STOP and NEXT buttons
    buttons[totalButtons - 2] = { 
      type: 'stop', 
      content: 'STOP', 
      active: true, 
      stopped: controlState.executionState?.stopped || false 
    };
    buttons[totalButtons - 1] = { 
      type: 'next', 
      content: 'NEXT', 
      active: true 
    };

    return { buttons, buttonsPerRow, totalRows };
  }, [controlState]);

  // Add LED flash animation CSS
  React.useEffect(() => {
    const styleId = 'led-flash-animation';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes ledFlash {
          0%, 50% { 
            opacity: 1; 
            box-shadow: 0 0 6px #ffa500, 0 0 10px #ffa500, 0 0 14px #ffa500;
          }
          51%, 100% { 
            opacity: 0.3; 
            box-shadow: 0 0 2px #ffa500;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Sync state with main window via localStorage
  useEffect(() => {
    const syncState = () => {
      try {
        const storedState = localStorage.getItem('controlSurfaceState');
        if (storedState) {
          setControlState(JSON.parse(storedState));
        }
      } catch (error) {
        console.error('Error reading control surface state:', error);
      }
    };

    // Initial sync
    syncState();

    // Listen for storage changes
    window.addEventListener('storage', syncState);
    
    // Poll for updates (fallback)
    const interval = setInterval(syncState, 500);

    return () => {
      window.removeEventListener('storage', syncState);
      clearInterval(interval);
    };
  }, []);

  // Send button click back to main window
  const handleButtonClick = (button, index) => {
    // Store the action in localStorage for main window to pick up
    localStorage.setItem('controlSurfaceAction', JSON.stringify({
      type: 'BUTTON_CLICK',
      button,
      index,
      timestamp: Date.now()
    }));
  };

  const getButtonStyle = (button) => {
    const baseStyle = {
      width: '100%',
      aspectRatio: '1',
      border: '2px solid',
      borderRadius: '8px',
      fontSize: '12px',
      fontWeight: '600',
      cursor: button.active ? 'pointer' : 'default',
      transition: 'all 0.15s',
      textAlign: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      wordWrap: 'break-word',
      padding: '8px',
      minHeight: '60px'
    };

    if (!button.active) {
      return {
        ...baseStyle,
        background: '#f8f9fa',
        borderColor: '#e9ecef',
        color: '#adb5bd',
        cursor: 'default'
      };
    }

    switch (button.type) {
      case 'manual':
        return {
          ...baseStyle,
          background: button.armed ? '#fff3cd' : '#fff',
          borderColor: button.armed ? '#ff9800' : '#2196f3',
          color: button.armed ? '#f57c00' : '#2196f3',
          fontSize: '16px'
        };
      case 'transition':
        return {
          ...baseStyle,
          background: button.armed ? '#fff3cd' : '#fff',
          borderColor: button.armed ? '#ff9800' : '#6c757d',
          color: button.armed ? '#f57c00' : '#6c757d',
          fontSize: '16px'
        };
      case 'stop':
        return {
          ...baseStyle,
          background: button.stopped ? '#f44336' : '#fff',
          borderColor: '#f44336',
          color: button.stopped ? '#fff' : '#f44336',
          fontSize: '14px'
        };
      case 'next':
        return {
          ...baseStyle,
          background: '#4caf50',
          borderColor: '#4caf50',
          color: '#fff',
          fontSize: '16px',
          fontWeight: '700'
        };
      default:
        return baseStyle;
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#2c2c2c',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px',
      boxSizing: 'border-box',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        color: '#fff',
        fontSize: '24px',
        fontWeight: '700',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        Control Surface
      </div>

      {/* Button Grid - Responsive */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 0
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${buttonGrid.buttonsPerRow}, 1fr)`,
          gridTemplateRows: `repeat(${buttonGrid.totalRows}, 1fr)`,
          gap: '6px',
          width: '100%',
          height: '100%',
          maxWidth: '800px',
          maxHeight: '500px'
        }}>
          {buttonGrid.buttons.map((button, index) => (
            <button
              key={index}
              style={getButtonStyle(button)}
              onClick={() => handleButtonClick(button, index)}
              onMouseEnter={(e) => {
                if (button.active && button.type !== 'stop' && button.type !== 'next') {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1.0)';
              }}
            >
              {button.content}
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        color: '#999',
        fontSize: '12px',
        textAlign: 'center',
        marginTop: '20px'
      }}>
        Resize window to scale • Connected to main control
      </div>
    </div>
  );
}