import React, { useState, useEffect, useMemo } from 'react';

// Color palette for manual overlays (must match Overlay.jsx)
const MANUAL_OVERLAY_COLORS = [
  { name: 'Red', hex: '#E53935', index: 0 },        // Bright Red
  { name: 'Blue', hex: '#1E88E5', index: 1 },       // Strong Blue
  { name: 'Green', hex: '#43A047', index: 2 },      // Forest Green
  { name: 'Orange', hex: '#FB8C00', index: 3 },     // Vivid Orange
  { name: 'Purple', hex: '#8E24AA', index: 4 },     // Deep Purple
  { name: 'Teal', hex: '#00ACC1', index: 5 },       // Cyan/Teal
  { name: 'Pink', hex: '#D81B60', index: 6 },       // Hot Pink
  { name: 'Lime', hex: '#7CB342', index: 7 },       // Lime Green
  { name: 'Indigo', hex: '#3949AB', index: 8 },     // Deep Indigo
  { name: 'Amber', hex: '#FFB300', index: 9 },      // Golden Amber
  { name: 'Brown', hex: '#6D4C41', index: 10 },     // Dark Brown
  { name: 'Navy', hex: '#283593', index: 11 },      // Navy Blue
  { name: 'Olive', hex: '#558B2F', index: 12 },     // Olive Green
  { name: 'Maroon', hex: '#AD1457', index: 13 },    // Deep Maroon
  { name: 'Steel', hex: '#546E7A', index: 14 },     // Blue Grey
  { name: 'Coral', hex: '#FF5252', index: 15 }      // Light Coral
];

export default function ControlPad({ 
  buttons = [], 
  buttonsPerRow = 8, 
  totalRows = 4, 
  onButtonClick,
  controlPadZoom = 1.0,
  onZoomChange 
}) {
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

  const getButtonStyle = (button, index) => {
    const baseStyle = {
      width: '100%',
      height: `${80 * controlPadZoom}px`,
      border: `${2 * controlPadZoom}px solid`,
      borderRadius: `${8 * controlPadZoom}px`,
      fontSize: `${12 * controlPadZoom}px`,
      fontWeight: '600',
      cursor: button.active ? 'pointer' : 'default',
      transition: 'all 0.15s',
      textAlign: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      wordWrap: 'break-word',
      padding: `${8 * controlPadZoom}px`
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
        // Check if it's a manual overlay
        const isOverlay = button.data?.type === 'Overlay' && button.data?.overlay_type === 'manual';
        if (isOverlay) {
          const colorIndex = button.data?.overlay_color_index ?? button.data?.data?.overlay_color_index ?? 0;
          const overlayColor = MANUAL_OVERLAY_COLORS[colorIndex % MANUAL_OVERLAY_COLORS.length];
          
          // Check if the overlay is live
          if (button.isLive) {
            // Live state - full color background with white text
            return {
              ...baseStyle,
              background: overlayColor.hex,
              borderColor: overlayColor.hex,
              color: '#ffffff',
              fontSize: `${16 * controlPadZoom}px`,
              fontWeight: '700',
              boxShadow: `0 0 ${10 * controlPadZoom}px ${overlayColor.hex}`
            };
          } else if (button.armed) {
            // Armed/preview state - medium opacity
            return {
              ...baseStyle,
              background: `${overlayColor.hex}40`,
              borderColor: overlayColor.hex,
              color: overlayColor.hex,
              fontSize: `${16 * controlPadZoom}px`,
              fontWeight: '700'
            };
          } else {
            // Inactive state - light opacity
            return {
              ...baseStyle,
              background: `${overlayColor.hex}20`,
              borderColor: overlayColor.hex,
              color: overlayColor.hex,
              fontSize: `${16 * controlPadZoom}px`,
              fontWeight: '700'
            };
          }
        }
        return {
          ...baseStyle,
          background: button.armed ? '#fff3cd' : '#fff',
          borderColor: button.armed ? '#ff9800' : '#2196f3',
          color: button.armed ? '#f57c00' : '#2196f3',
          fontSize: `${18 * controlPadZoom}px`
        };
      case 'transition':
        return {
          ...baseStyle,
          background: button.armed ? '#fff3cd' : '#fff',
          borderColor: button.armed ? '#ff9800' : '#6c757d',
          color: button.armed ? '#f57c00' : '#6c757d',
          fontSize: `${18 * controlPadZoom}px`
        };
      case 'stop':
        return {
          ...baseStyle,
          background: button.stopped ? '#f44336' : '#fff',
          borderColor: '#f44336',
          color: button.stopped ? '#fff' : '#f44336',
          fontSize: `${14 * controlPadZoom}px`
        };
      case 'pause':
        return {
          ...baseStyle,
          background: button.paused ? '#ff9800' : '#fff',
          borderColor: '#ff9800',
          color: button.paused ? '#fff' : '#ff9800',
          fontSize: `${14 * controlPadZoom}px`
        };
      case 'next':
        return {
          ...baseStyle,
          background: '#4caf50',
          borderColor: '#4caf50',
          color: '#fff',
          fontSize: `${16 * controlPadZoom}px`,
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
      boxSizing: 'border-box'
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

      {/* Button Grid */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${buttonsPerRow}, ${80 * controlPadZoom}px)`,
          gridTemplateRows: `repeat(${totalRows}, ${80 * controlPadZoom}px)`,
          rowGap: `${4 * controlPadZoom}px`,
          columnGap: `${6 * controlPadZoom}px`,
          justifyContent: 'center'
        }}>
          {buttons.map((button, index) => (
            <button
              key={index}
              style={getButtonStyle(button, index)}
              onClick={() => onButtonClick && onButtonClick(button, index)}
              onMouseEnter={(e) => {
                if (button.active && button.type !== 'stop' && button.type !== 'next') {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1.0)';
              }}
            >
              {(() => {
                // Check if it's a manual overlay and add indicator
                const isOverlay = button.type === 'manual' && 
                                  button.data?.type === 'Overlay' && 
                                  button.data?.overlay_type === 'manual';
                if (isOverlay) {
                  const colorIndex = button.data?.overlay_color_index ?? button.data?.data?.overlay_color_index ?? 0;
                  const overlayColor = MANUAL_OVERLAY_COLORS[colorIndex % MANUAL_OVERLAY_COLORS.length];
                  return (
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center',
                      gap: `${4 * controlPadZoom}px`
                    }}>
                      <div style={{
                        width: `${20 * controlPadZoom}px`,
                        height: `${20 * controlPadZoom}px`,
                        background: button.isLive ? '#ffffff' : overlayColor.hex,
                        borderRadius: '50%',
                        border: `${2 * controlPadZoom}px solid ${button.isLive ? overlayColor.hex : 'white'}`,
                        boxShadow: button.isLive ? `0 0 ${8 * controlPadZoom}px ${overlayColor.hex}` : 'none'
                      }} />
                      <div style={{ color: button.isLive ? '#ffffff' : 'inherit' }}>{button.content}</div>
                      <div style={{
                        fontSize: `${9 * controlPadZoom}px`,
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        opacity: button.isLive ? 1 : 0.8,
                        color: button.isLive ? '#ffffff' : 'inherit'
                      }}>
                        {button.isLive ? 'LIVE' : 'OVERLAY'}
                      </div>
                    </div>
                  );
                }
                return button.content;
              })()}
            </button>
          ))}
        </div>
      </div>

      {/* Zoom Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        marginTop: '20px'
      }}>
        <span style={{
          color: '#fff',
          fontSize: '12px',
          fontWeight: '600',
          minWidth: '35px'
        }}>
          ZOOM
        </span>
        <input
          type="range"
          min="0.5"
          max="1.5"
          step="0.1"
          value={controlPadZoom}
          onChange={(e) => onZoomChange && onZoomChange(parseFloat(e.target.value))}
          style={{
            width: '150px',
            height: '4px',
            background: '#666',
            borderRadius: '2px',
            outline: 'none',
            cursor: 'pointer'
          }}
        />
        <span style={{
          color: '#fff',
          fontSize: '11px',
          minWidth: '35px',
          textAlign: 'right'
        }}>
          {Math.round(controlPadZoom * 100)}%
        </span>
      </div>
    </div>
  );
}