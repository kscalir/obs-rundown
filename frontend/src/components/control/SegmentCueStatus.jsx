import React from 'react';

const SegmentCueStatus = ({ currentSegment, currentCue, upcomingSegment, upcomingCue }) => {
  return (
    <div style={{
      background: '#f8f8f8',
      borderRadius: '8px',
      padding: '16px',
      border: '1px solid #e1e6ec'
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px'
      }}>
        {/* Current Column */}
        <div>
          <div style={{
            fontSize: '11px',
            color: '#4caf50',
            textTransform: 'uppercase',
            fontWeight: '700',
            marginBottom: '8px',
            letterSpacing: '0.5px'
          }}>Current</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <div style={{
                fontSize: '10px',
                color: '#666',
                marginBottom: '2px'
              }}>SEGMENT</div>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#333'
              }}>
                {currentSegment?.title || '—'}
              </div>
            </div>
            
            <div>
              <div style={{
                fontSize: '10px',
                color: '#666',
                marginBottom: '2px'
              }}>CUE</div>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#333'
              }}>
                {currentCue?.title || '—'}
              </div>
            </div>
          </div>
        </div>
        
        {/* Upcoming Column */}
        <div>
          <div style={{
            fontSize: '11px',
            color: '#999',
            textTransform: 'uppercase',
            fontWeight: '600',
            marginBottom: '8px',
            letterSpacing: '0.5px'
          }}>Upcoming</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <div style={{
                fontSize: '10px',
                color: '#666',
                marginBottom: '2px'
              }}>SEGMENT</div>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#666'
              }}>
                {upcomingSegment?.title || '—'}
              </div>
            </div>
            
            <div>
              <div style={{
                fontSize: '10px',
                color: '#666',
                marginBottom: '2px'
              }}>CUE</div>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#666'
              }}>
                {upcomingCue?.title || '—'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SegmentCueStatus;