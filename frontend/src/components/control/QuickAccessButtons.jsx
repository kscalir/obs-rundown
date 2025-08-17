import React from 'react';

const QuickAccessButtons = ({ onButtonClick, executionState }) => {
  const handleClick = (type) => {
    if (onButtonClick) {
      onButtonClick({ type, active: true });
    }
  };

  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: '16px'
    }}>
      {/* STOP Button */}
      <button
        onClick={() => handleClick('stop')}
        style={{
          width: '80px',
          height: '80px',
          background: executionState?.stopped ? '#f44336' : '#fff',
          border: '2px solid #f44336',
          borderRadius: '8px',
          color: executionState?.stopped ? '#fff' : '#f44336',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.15s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        STOP
      </button>
      
      {/* PAUSE Button */}
      <button
        onClick={() => handleClick('pause')}
        style={{
          width: '80px',
          height: '80px',
          background: executionState?.paused ? '#ff9800' : '#fff',
          border: '2px solid #ff9800',
          borderRadius: '8px',
          color: executionState?.paused ? '#fff' : '#ff9800',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.15s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        PAUSE
      </button>
      
      {/* Spacer between PAUSE and NEXT */}
      <div style={{ width: '10px' }} />
      
      {/* NEXT Button - Larger */}
      <button
        onClick={() => handleClick('next')}
        style={{
          width: '100px',
          height: '100px',
          background: '#4caf50',
          border: '3px solid #4caf50',
          borderRadius: '12px',
          color: '#fff',
          fontSize: '20px',
          fontWeight: '700',
          cursor: 'pointer',
          transition: 'all 0.15s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 8px rgba(76, 175, 80, 0.3)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 6px 12px rgba(76, 175, 80, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(76, 175, 80, 0.3)';
        }}
      >
        NEXT
      </button>
    </div>
  );
};

export default QuickAccessButtons;