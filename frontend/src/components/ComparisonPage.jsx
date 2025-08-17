import React, { useState, useEffect, useMemo } from 'react';
import { createApi } from '../api/client.js';
import { API_BASE_URL } from '../config';
import { SelectionProvider } from '../selection/SelectionContext.jsx';
import ControlPage from './ControlPage';
import ControlPageRefactored from './control/ControlPageRefactored';

export default function ComparisonPage() {
  const [showOld, setShowOld] = useState(true);
  
  // Get showId and episodeId from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const showId = urlParams.get('showId');
  const episodeId = urlParams.get('episodeId');
  
  return (
    <SelectionProvider>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Toggle buttons */}
        <div style={{
          background: '#333',
          padding: '10px',
          display: 'flex',
          gap: '10px',
          alignItems: 'center'
        }}>
          <button
            onClick={() => setShowOld(true)}
            style={{
              padding: '8px 16px',
              background: showOld ? '#4caf50' : '#666',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: showOld ? 'bold' : 'normal'
            }}
          >
            OLD Control Page
          </button>
          <button
            onClick={() => setShowOld(false)}
            style={{
              padding: '8px 16px',
              background: !showOld ? '#4caf50' : '#666',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: !showOld ? 'bold' : 'normal'
            }}
          >
            NEW Refactored Page
          </button>
          <span style={{ color: '#fff', marginLeft: '20px' }}>
            URL: ?showId={showId}&episodeId={episodeId}
          </span>
        </div>
        
        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {showOld ? (
            <ControlPage showId={showId} />
          ) : (
            <ControlPageRefactored />
          )}
        </div>
      </div>
    </SelectionProvider>
  );
}