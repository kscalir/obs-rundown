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

export default function ActiveOverlaysDisplay({ activeOverlays, onRemoveOverlay }) {
  if (!activeOverlays || activeOverlays.length === 0) {
    return null;
  }
  
  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      maxWidth: 300
    }}>
      <div style={{
        background: 'rgba(0, 0, 0, 0.8)',
        color: '#fff',
        padding: '8px 12px',
        borderRadius: '8px 8px 0 0',
        fontSize: 12,
        fontWeight: 600,
        textAlign: 'center'
      }}>
        ACTIVE OVERLAYS ({activeOverlays.length})
      </div>
      
      {activeOverlays.map((overlay) => {
        const isManual = overlay.overlay_type === 'manual' || overlay.automation === 'manual';
        const colorIndex = overlay.overlay_color_index || overlay.data?.overlay_color_index;
        const color = isManual && colorIndex != null 
          ? MANUAL_OVERLAY_COLORS[colorIndex % MANUAL_OVERLAY_COLORS.length]
          : null;
        
        // Calculate time remaining for auto_out overlays
        const timeRemaining = (() => {
          if (overlay.automation !== 'auto_out' || !overlay.overlay_duration) return null;
          const elapsed = (Date.now() - overlay.startTime) / 1000;
          const remaining = overlay.overlay_duration - elapsed;
          return remaining > 0 ? Math.ceil(remaining) : 0;
        })();
        
        return (
          <div
            key={overlay.id}
            style={{
              background: color ? `${color.hex}20` : 'rgba(156, 39, 176, 0.1)',
              border: `2px solid ${color ? color.hex : '#9c27b0'}`,
              borderRadius: 6,
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              position: 'relative'
            }}
          >
            {/* Type indicator */}
            <div style={{
              width: 20,
              height: 20,
              background: color ? color.hex : '#9c27b0',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 'bold',
              color: '#fff',
              flexShrink: 0
            }}>
              {isManual ? 'M' : 'A'}
            </div>
            
            {/* Overlay info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#333',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {overlay.title || 'Untitled Overlay'}
              </div>
              
              {/* Automation mode and timing */}
              <div style={{
                fontSize: 11,
                color: '#666',
                marginTop: 2
              }}>
                {overlay.automation === 'auto_out' && timeRemaining !== null && (
                  <span>Auto Out: {timeRemaining}s</span>
                )}
                {overlay.automation === 'leave_in_local' && (
                  <span>Until Segment End</span>
                )}
                {overlay.automation === 'leave_in_global' && (
                  <span>Persistent</span>
                )}
                {isManual && (
                  <span>Manual Control</span>
                )}
              </div>
            </div>
            
            {/* Remove button */}
            <button
              onClick={() => onRemoveOverlay(overlay.id)}
              style={{
                background: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid #ff5252',
                color: '#ff5252',
                borderRadius: 4,
                padding: '4px 8px',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0
              }}
              title="Remove overlay"
            >
              ✕
            </button>
          </div>
        );
      })}
      
      {/* Channel indicator */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.6)',
        color: '#fff',
        padding: '4px 8px',
        borderRadius: '0 0 8px 8px',
        fontSize: 10,
        textAlign: 'center',
        opacity: 0.8
      }}>
        Graphics Channel 2 (Overlays)
      </div>
    </div>
  );
}