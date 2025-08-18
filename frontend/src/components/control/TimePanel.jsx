import React from 'react';
import { formatTime, formatElapsedTime } from './utils/formatters';

const TimePanel = ({ currentTime, segmentElapsed, showElapsed, allottedTime, timersPaused, onToggleTimersPause, use24HourTime, onToggleTimeFormat }) => {
  const isOverTime = allottedTime && segmentElapsed > allottedTime;
  const timeRemaining = allottedTime ? allottedTime - segmentElapsed : 0;
  
  return (
    <>
      {/* Clock Display */}
      <div style={{
        background: '#2c2c2c',
        borderRadius: '8px',
        padding: '16px 20px',
        textAlign: 'center',
        border: '1px solid #444',
        position: 'relative'
      }}>
        <div style={{
          fontSize: '42px',
          fontWeight: '700',
          color: '#4caf50',
          fontFamily: 'monospace',
          letterSpacing: '2px'
        }}>
          {formatTime(currentTime, use24HourTime)}
        </div>
        
        {/* Time Format Toggle Button */}
        <button
          onClick={onToggleTimeFormat}
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#4caf50',
            border: '1px solid rgba(76, 175, 80, 0.3)',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '11px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontFamily: 'monospace'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(76, 175, 80, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(76, 175, 80, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(76, 175, 80, 0.3)';
          }}
        >
          {use24HourTime ? '24H' : '12H'}
        </button>
      </div>
      
      {/* Timer Display */}
      <div style={{
        background: '#f8f8f8',
        borderRadius: '8px',
        padding: '16px',
        border: '1px solid #e1e6ec',
        position: 'relative'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px'
        }}>
          {/* Left side - Timers */}
          <div style={{
            flex: '1 1 auto',
            display: 'flex',
            gap: '20px'
          }}>
            {/* Segment Timer */}
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '12px',
                color: '#666',
                marginBottom: '8px',
                textTransform: 'uppercase',
                fontWeight: '600'
              }}>
                Segment Time
              </div>
              <div style={{
                fontSize: '28px',
                fontWeight: '700',
                color: isOverTime ? '#f44336' : '#2196f3',
                fontFamily: 'monospace'
              }}>
                {formatElapsedTime(segmentElapsed)}
              </div>
              {allottedTime && (
                <div style={{
                  fontSize: '12px',
                  color: isOverTime ? '#f44336' : '#666',
                  marginTop: '4px',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center'
                }}>
                  <span>Allotted:</span>
                  <span style={{ fontWeight: '600' }}>{formatElapsedTime(allottedTime)}</span>
                  {isOverTime && (
                    <span style={{ 
                      color: '#f44336',
                      fontWeight: '700'
                    }}>
                      (+{formatElapsedTime(Math.abs(timeRemaining))})
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {/* Show Timer */}
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '12px',
                color: '#666',
                marginBottom: '8px',
                textTransform: 'uppercase',
                fontWeight: '600'
              }}>
                Show Duration
              </div>
              <div style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#673ab7',
                fontFamily: 'monospace'
              }}>
                {formatElapsedTime(showElapsed)}
              </div>
            </div>
          </div>
          
          {/* Right side - Pause Button */}
          <div style={{
            flex: '0 0 auto',
            paddingTop: '28px'
          }}>
            <button
              onClick={onToggleTimersPause}
              style={{
                background: timersPaused ? '#ff9800' : '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background 0.2s',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = timersPaused ? '#f57c00' : '#1976d2';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = timersPaused ? '#ff9800' : '#2196f3';
              }}
            >
              {timersPaused ? '▶' : '⏸'}
              <span>{timersPaused ? 'Resume' : 'Pause'} Timers</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default TimePanel;