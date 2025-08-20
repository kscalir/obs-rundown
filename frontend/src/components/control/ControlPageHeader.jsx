import React from 'react';
import { Controller, Display } from 'react-bootstrap-icons';

const ControlPageHeader = ({ 
  showName, 
  episodeTitle, 
  episodes, 
  selectedEpisodeId, 
  onEpisodeChange,
  onControlSurfaceClick,
  onPresenterViewClick 
}) => {
  return (
    <div style={{
      background: '#1e1e1e',
      borderBottom: '2px solid #444',
      padding: '8px 24px',
      color: '#fff',
      flexShrink: 0,
      minHeight: '40px',
      maxHeight: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#fff' }}>
        {showName && episodeTitle ? `${showName} - ${episodeTitle}` : 'Control Page'}
      </h1>
      
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        {/* Episode Selector */}
        {episodes && episodes.length > 0 && (
          <select
            value={selectedEpisodeId || ''}
            onChange={(e) => onEpisodeChange(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: '1px solid #666',
              background: '#2c2c2c',
              color: '#fff',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <option value="">Select Episode</option>
            {episodes.map(episode => (
              <option key={episode.id} value={episode.id}>
                {episode.name || episode.title}
              </option>
            ))}
          </select>
        )}
        
        {/* Presenter View Button */}
        <button
          onClick={onPresenterViewClick}
          style={{
            padding: '6px 16px',
            background: '#ff9800',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Display size={16} />
          Presenter View
        </button>
        
        {/* Control Surface Button */}
        <button
          onClick={onControlSurfaceClick}
          style={{
            padding: '6px 16px',
            background: '#4caf50',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Controller size={16} />
          Control Surface
        </button>
      </div>
    </div>
  );
};

export default ControlPageHeader;