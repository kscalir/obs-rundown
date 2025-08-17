import React from 'react';

const PresenterNotes = ({ noteData }) => {
  return (
    <div style={{
      background: '#f8f8f8',
      borderRadius: '8px',
      padding: '16px',
      border: '1px solid #e1e6ec',
      display: 'flex',
      flexDirection: 'column',
      maxHeight: '300px',
      overflow: 'hidden'
    }}>
      <div style={{
        fontSize: '14px',
        color: noteData?.isCurrent ? '#4caf50' : '#666',
        marginBottom: '12px',
        textTransform: 'uppercase',
        fontWeight: '600'
      }}>
        {noteData?.isCurrent ? 'Current Presenter Note' : 'Upcoming Presenter Note'}
      </div>
      <div style={{
        flex: 1,
        fontSize: '20px',
        lineHeight: '1.6',
        color: '#333',
        overflowY: 'auto',
        paddingRight: '8px',
        marginRight: '-8px'
      }}>
        {!noteData ? (
          <em style={{ color: '#999' }}>No presenter notes available</em>
        ) : (
          <div style={{ whiteSpace: 'pre-wrap' }}>{noteData.note}</div>
        )}
      </div>
    </div>
  );
};

export default PresenterNotes;