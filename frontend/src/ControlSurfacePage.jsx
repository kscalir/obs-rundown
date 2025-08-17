import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from './config';
import { createApi } from './api/client.js';

export default function ControlSurfacePage() {
  // API client
  const api = useMemo(() => createApi(API_BASE_URL), []);
  
  // WebSocket connection
  const [ws, setWs] = useState(null);
  
  // Add iOS meta tags for web app
  useEffect(() => {
    // Add meta tags for iOS web app
    const metaTags = [
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover' },
      { name: 'apple-mobile-web-app-title', content: 'Control Surface' }
    ];
    
    metaTags.forEach(tag => {
      let meta = document.querySelector(`meta[name="${tag.name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = tag.name;
        document.head.appendChild(meta);
      }
      meta.content = tag.content;
    });
  }, []);
  
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  
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
  
  // Detect if running on iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  
  // Detect if running as standalone app (added to home screen)
  const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
  
  // Set up WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?control=true`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    const websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      console.log('WebSocket connected');
      setWs(websocket);
    };
    
    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    websocket.onclose = () => {
      console.log('WebSocket disconnected');
      setWs(null);
    };
    
    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
    };
  }, []);
  
  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (isIOS) {
      // iOS doesn't support fullscreen API, show instructions instead
      if (!isStandalone) {
        alert('To use fullscreen on iPhone:\n\n1. Tap the Share button (box with arrow)\n2. Select "Add to Home Screen"\n3. Open from your home screen\n\nThe app will run in fullscreen mode.');
      }
      return;
    }
    
    if (!document.fullscreenElement) {
      // Enter fullscreen
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) { // Safari/iOS
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) { // IE11
        elem.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) { // Safari/iOS
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) { // IE11
        document.msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };
  
  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

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
      if (index < totalButtons - 7) { // Leave space for transitions, stop, pause, next
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

    // Bottom row layout:
    // Position 0: STOP
    // Positions 1-4: Transitions (Cut, Fade, Slide, Stinger)
    // Position 5: (empty)
    // Position 6: PAUSE
    // Position 7: NEXT
    
    const lastRowStart = (totalRows - 1) * buttonsPerRow;
    
    // Add STOP button (last row, position 0 - far left)
    buttons[lastRowStart + 0] = { 
      type: 'stop', 
      content: 'STOP', 
      active: true, 
      stopped: controlState.executionState?.stopped || false 
    };
    
    // Add transition buttons (last row, positions 1-4)
    const transitions = [
      { name: 'Cut', type: 'cut' },
      { name: 'Fade', type: 'fade' },
      { name: 'Slide', type: 'slide' },
      { name: 'Stinger', type: 'stinger' }
    ];
    
    transitions.forEach((transition, index) => {
      buttons[lastRowStart + 1 + index] = {
        type: 'transition',
        content: transition.name,
        active: true,
        armed: controlState.executionState?.armedTransition === transition.type,
        data: transition
      };
    });
    
    // Add PAUSE button (last row, position 6)
    buttons[lastRowStart + 6] = { 
      type: 'pause', 
      content: 'PAUSE', 
      active: true,
      paused: controlState.executionState?.paused || false
    };
    
    // Add NEXT button (last row, position 7)
    buttons[lastRowStart + 7] = { 
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
    console.log('Control surface button clicked:', button);
    
    const action = {
      type: 'CONTROL_ACTION',
      button,
      index,
      timestamp: Date.now()
    };
    
    // Send via WebSocket if connected
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(action));
      console.log('Sent action via WebSocket:', action);
    } else {
      console.log('WebSocket not connected, trying fallback methods');
      
      // Try BroadcastChannel as fallback
      try {
        const channel = new BroadcastChannel('control-surface-actions');
        channel.postMessage(action);
        console.log('Sent action via BroadcastChannel:', action);
        channel.close();
      } catch (error) {
        console.log('BroadcastChannel not supported');
      }
      
      // Store in localStorage as last resort
      localStorage.setItem('controlSurfaceAction', JSON.stringify({
        ...action,
        type: 'BUTTON_CLICK' // Use old type for localStorage
      }));
      console.log('Stored action in localStorage');
    }
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
      case 'pause':
        return {
          ...baseStyle,
          background: button.paused ? '#ff9800' : '#fff',
          borderColor: '#ff9800',
          color: button.paused ? '#fff' : '#ff9800',
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
      padding: isFullscreen ? '10px' : '20px',
      boxSizing: 'border-box',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header with Fullscreen Button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <div style={{ flex: 1 }}></div>
        <div style={{
          color: '#fff',
          fontSize: isFullscreen ? '20px' : '24px',
          fontWeight: '700',
          textAlign: 'center',
          flex: 2
        }}>
          Control Surface
        </div>
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          justifyContent: 'flex-end' 
        }}>
          <button
            onClick={toggleFullscreen}
            style={{
              background: '#4caf50',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#45a049';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#4caf50';
            }}
          >
            {isFullscreen ? (
              <>
                <span style={{ fontSize: '16px' }}>◱</span>
                Exit Fullscreen
              </>
            ) : (
              <>
                <span style={{ fontSize: '16px' }}>⛶</span>
                Fullscreen
              </>
            )}
          </button>
        </div>
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

      {/* Footer - Hide in fullscreen */}
      {!isFullscreen && (
        <div style={{
          color: '#999',
          fontSize: '12px',
          textAlign: 'center',
          marginTop: '20px'
        }}>
          Resize window to scale • Connected to main control
        </div>
      )}
    </div>
  );
}