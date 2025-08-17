import React from 'react';

const ManualCueButtons = ({ manualButtons = [], onButtonClick, executionState }) => {
  if (!manualButtons || manualButtons.length === 0) {
    return null;
  }

  const handleClick = (button) => {
    if (onButtonClick) {
      onButtonClick(button);
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
          
          return (
            <button
              key={button.id || index}
              onClick={() => handleClick(button)}
              style={{
                padding: '12px',
                background: isLive ? '#ffebee' : isPreview ? '#fff8e1' : isArmed ? '#fff3cd' : '#fff',
                border: `2px solid ${isLive ? '#f44336' : isPreview ? '#ff9800' : isArmed ? '#ff9800' : '#2196f3'}`,
                borderRadius: '6px',
                color: isLive ? '#f44336' : isPreview ? '#ff9800' : isArmed ? '#f57c00' : '#2196f3',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
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
              <div>{button.title || button.type || 'Manual Item'}</div>
              {(isLive || isPreview || isArmed) && (
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