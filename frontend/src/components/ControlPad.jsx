import React, { useState, useEffect, useMemo } from 'react';

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
              {button.content}
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