import React from 'react';
import { formatTime, formatElapsedTime } from './utils/formatters';

const TimePanel = ({ currentTime, segmentElapsed, showElapsed, allottedTime }) => {
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
        border: '1px solid #444'
      }}>
        <div style={{
          fontSize: '42px',
          fontWeight: '700',
          color: '#4caf50',
          fontFamily: 'monospace',
          letterSpacing: '2px'
        }}>
          {formatTime(currentTime)}
        </div>
      </div>
      
      {/* Timer Display */}
      <div style={{
        background: '#f8f8f8',
        borderRadius: '8px',
        padding: '16px',
        border: '1px solid #e1e6ec'
      }}>
        <div style={{
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
      </div>
    </>
  );
};

export default TimePanel;