import React from 'react';

// Color palette for manual overlays (must match Overlay.jsx)
const MANUAL_OVERLAY_COLORS = [
  { name: 'Chartreuse', hex: '#7FFF00', index: 0 },
  { name: 'Pink', hex: '#FF69B4', index: 1 },
  { name: 'Cyan', hex: '#00FFFF', index: 2 },
  { name: 'Orange', hex: '#FFA500', index: 3 },
  { name: 'Purple', hex: '#9370DB', index: 4 },
  { name: 'Yellow', hex: '#FFFF00', index: 5 },
  { name: 'Lime', hex: '#32CD32', index: 6 },
  { name: 'Coral', hex: '#FF7F50', index: 7 }
];

const ManualCueButtons = ({ manualButtons = [], onButtonClick, executionState, onOverlayClick }) => {
  if (!manualButtons || manualButtons.length === 0) {
    return null;
  }

  const handleClick = (button) => {
    // Check if it's a manual overlay
    if (button.type === 'Overlay' && button.overlay_type === 'manual') {
      if (onOverlayClick) {
        onOverlayClick(button);
      }
    } else {
      if (onButtonClick) {
        onButtonClick(button);
      }
    }
  };

  return (
    <div style={{
      background: '#f8f8f8',
      borderRadius: '8px',
      padding: '16px',
      border: '1px solid #e1e6ec',
      marginBottom: '16px'
    }}>
      <div style={{
        fontSize: '12px',
        color: '#666',
        marginBottom: '12px',
        textTransform: 'uppercase',
        fontWeight: '600'
      }}>
        Manual Cue Buttons
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '8px'
      }}>
        {manualButtons.map((button, index) => {
          const isArmed = executionState?.armedManualItem === button.id;
          const isLive = executionState?.currentManualItem === button.id;
          const isPreview = executionState?.previewManualItem === button.id;
          
          // Check if it's a manual overlay and get its color
          const isOverlay = button.type === 'Overlay' && button.overlay_type === 'manual';
          const colorIndex = button.overlay_color_index ?? button.data?.overlay_color_index ?? index;
          const overlayColor = isOverlay ? MANUAL_OVERLAY_COLORS[colorIndex % MANUAL_OVERLAY_COLORS.length] : null;
          
          // Determine button colors
          const borderColor = isOverlay ? overlayColor.hex : 
                             (isLive ? '#f44336' : isPreview ? '#ff9800' : isArmed ? '#ff9800' : '#2196f3');
          const bgColor = isOverlay ? `${overlayColor.hex}20` :
                         (isLive ? '#ffebee' : isPreview ? '#fff8e1' : isArmed ? '#fff3cd' : '#fff');
          const textColor = isOverlay ? overlayColor.hex :
                           (isLive ? '#f44336' : isPreview ? '#ff9800' : isArmed ? '#f57c00' : '#2196f3');
          
          return (
            <button
              key={button.id || index}
              onClick={() => handleClick(button)}
              style={{
                padding: '12px',
                background: bgColor,
                border: `2px solid ${borderColor}`,
                borderRadius: '6px',
                color: textColor,
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (!isLive && !isPreview && !isArmed) {
                  e.currentTarget.style.background = '#f5f5f5';
                }
              }}
              onMouseLeave={(e) => {
                const bgColor = isLive ? '#ffebee' : isPreview ? '#fff8e1' : isArmed ? '#fff3cd' : '#fff';
                e.currentTarget.style.background = bgColor;
              }}
            >
              {isOverlay && (
                <div style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  width: '16px',
                  height: '16px',
                  background: overlayColor.hex,
                  borderRadius: '50%',
                  border: '2px solid white'
                }} />
              )}
              <div>{button.title || button.type || 'Manual Item'}</div>
              {isOverlay && (
                <div style={{
                  fontSize: '9px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  color: overlayColor.hex
                }}>
                  OVERLAY
                </div>
              )}
              {!isOverlay && (isLive || isPreview || isArmed) && (
                <div style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  textTransform: 'uppercase'
                }}>
                  {isLive ? 'LIVE' : isPreview ? 'PREVIEW' : 'ARMED'}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ManualCueButtons;