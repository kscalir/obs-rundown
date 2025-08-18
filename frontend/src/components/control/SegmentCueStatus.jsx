import React from 'react';

const SegmentCueStatus = ({ currentSegment, currentCue, upcomingSegment, upcomingCue, segments, liveItemId, currentManualItems = [] }) => {
  // Track when audio items went live for countdown
  const [audioStartTimes, setAudioStartTimes] = React.useState({});
  const [currentTime, setCurrentTime] = React.useState(Date.now());
  
  // Update current time every second for countdown
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Calculate currently active audio inline
  const activeAudio = React.useMemo(() => {
    const active = {
      mics: [],
      media: []
    };
    
    if (!segments) return active;
    
    // Find all items up to and including the live item
    let foundLive = false;
    for (const segment of segments) {
      for (const cue of (segment.cues || segment.groups || [])) {
        for (const item of (cue.items || [])) {
          // Stop after processing live item
          if (item.id === liveItemId) {
            foundLive = true;
          }
          
          // Check if it's an audio cue
          const normalizedType = (item.type || '').toLowerCase().replace(/[-_\s]/g, '');
          const isAudioCue = normalizedType === 'audiocue' || 
                            item.type === 'AudioCue' || 
                            item.type === 'audio-cue';
          
          if (isAudioCue && item.data) {
            const audioData = item.data;
            
            // Handle new format audio cues
            if (audioData.mode === 'new' || !audioData.mode) {
              if (audioData.sourceType === 'mic' && audioData.sourceId) {
                active.mics.push({
                  id: audioData.sourceId,
                  name: audioData.sourceName || audioData.sourceId,
                  volume: audioData.volume || 100,
                  trackId: audioData.trackId || `track_${item.id}`
                });
              } else if (audioData.sourceType === 'media' && audioData.mediaId) {
                const trackId = audioData.trackId || `track_${item.id}`;
                active.media.push({
                  id: audioData.mediaId,
                  name: audioData.sourceName,
                  volume: audioData.volume || 100,
                  trackId: trackId,
                  duration: audioData.mediaDuration, // Actual media file duration in seconds
                  itemId: item.id
                });
              }
            } else if (audioData.mode === 'existing') {
              // Handle modifications to existing audio
              const trackId = audioData.trackId;
              
              if (audioData.action === 'stop' || audioData.action === 'fade_out') {
                // Remove from active
                active.mics = active.mics.filter(m => m.trackId !== trackId);
                active.media = active.media.filter(m => m.trackId !== trackId);
              } else if (audioData.action === 'adjust' || audioData.action === 'fade_to') {
                // Update volume
                const mic = active.mics.find(m => m.trackId === trackId);
                const media = active.media.find(m => m.trackId === trackId);
                if (mic) mic.volume = audioData.targetVolume || 50;
                if (media) media.volume = audioData.targetVolume || 50;
              }
            }
          }
          
          if (foundLive) break;
        }
        if (foundLive) break;
      }
      if (foundLive) break;
    }
    
    // Also process any live manual items
    if (currentManualItems && currentManualItems.length > 0) {
      for (const segment of segments) {
        for (const cue of (segment.cues || segment.groups || [])) {
          for (const item of (cue.items || [])) {
            // Check if this is a manual block
            const normalizedType = (item.type || '').toLowerCase().replace(/[-_\s]/g, '');
            const isManualBlock = normalizedType === 'manualblock';
            
            if (isManualBlock && item.data?.items) {
              // Check each item in the manual block
              for (const manualItem of item.data.items) {
                // Check if this manual item is currently live
                if (currentManualItems.includes(manualItem.id)) {
                  // Check if it's an audio cue
                  const manualType = (manualItem.type || '').toLowerCase().replace(/[-_\s]/g, '');
                  const isAudioCue = manualType === 'audiocue' || manualItem.type === 'audio-cue';
                  
                  if (isAudioCue && manualItem.data) {
                    const audioData = manualItem.data;
                    
                    // Handle new format audio cues  
                    if (audioData.mode === 'new' || !audioData.mode) {
                      if (audioData.sourceType === 'mic' && audioData.sourceId) {
                        // Check if not already added
                        const trackId = audioData.trackId || `track_${manualItem.id}`;
                        if (!active.mics.find(m => m.trackId === trackId)) {
                          active.mics.push({
                            id: audioData.sourceId,
                            name: audioData.sourceName || audioData.sourceId,
                            volume: audioData.volume || 100,
                            trackId: trackId,
                            isManual: true
                          });
                        }
                      } else if (audioData.sourceType === 'media' && audioData.mediaId) {
                        const trackId = audioData.trackId || `track_${manualItem.id}`;
                        if (!active.media.find(m => m.trackId === trackId)) {
                          active.media.push({
                            id: audioData.mediaId,
                            name: audioData.sourceName,
                            volume: audioData.volume || 100,
                            trackId: trackId,
                            duration: audioData.mediaDuration,
                            itemId: manualItem.id,
                            isManual: true
                          });
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    
    return active;
  }, [segments, liveItemId, currentManualItems]);
  
  const hasActiveAudio = activeAudio.mics.length > 0 || activeAudio.media.length > 0;
  
  // Track start times for new audio items
  React.useEffect(() => {
    setAudioStartTimes(prev => {
      const newStartTimes = { ...prev };
      
      // Add start times for new media items
      activeAudio.media.forEach(media => {
        if (!newStartTimes[media.trackId]) {
          newStartTimes[media.trackId] = Date.now();
        }
      });
      
      // Remove start times for stopped media
      Object.keys(newStartTimes).forEach(trackId => {
        if (!activeAudio.media.find(m => m.trackId === trackId)) {
          delete newStartTimes[trackId];
        }
      });
      
      return newStartTimes;
    });
  }, [activeAudio.media]);
  
  return (
    <div style={{
      display: 'flex',
      gap: '16px',
      width: '100%'
    }}>
      {/* Segment/Cue Status Panel */}
      <div style={{
        background: '#f8f8f8',
        borderRadius: '8px',
        padding: '16px',
        border: '1px solid #e1e6ec',
        flex: '1',
        minWidth: 0
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
                {currentSegment?.name || currentSegment?.title || '—'}
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
                {currentCue?.name || currentCue?.title || '—'}
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
                {upcomingSegment?.name || upcomingSegment?.title || '—'}
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
                {upcomingCue?.name || upcomingCue?.title || '—'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    {/* Active Audio Panel - To the right */}
    <div style={{
      background: '#fff3e0',
      borderRadius: '8px',
      padding: '16px',
      border: '1px solid #ffcc80',
      flex: '1.5',
      minWidth: 0,
      maxHeight: '180px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        fontSize: '12px',
        color: '#ff6600',
        textTransform: 'uppercase',
        fontWeight: '700',
        marginBottom: '12px',
        letterSpacing: '0.5px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span>🔊 Active Audio</span>
        {hasActiveAudio && (
          <span style={{
            background: '#ff6b6b',
            color: 'white',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            marginLeft: 'auto'
          }}>
            {activeAudio.mics.length + activeAudio.media.length}
          </span>
        )}
      </div>
      
      {!hasActiveAudio ? (
        <div style={{
          color: '#999',
          fontSize: '14px',
          fontStyle: 'italic',
          padding: '8px 0'
        }}>
          No active audio sources
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          flex: 1,
          overflowY: 'auto',
          minHeight: 0
        }}>
              {/* Active Mics */}
              {activeAudio.mics.map((mic, index) => (
                <div key={mic.trackId || index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  background: 'rgba(255, 255, 255, 0.8)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  border: '1px solid rgba(255, 152, 0, 0.3)'
                }}>
                  <span style={{ fontSize: '18px' }}>🎤</span>
                  <span style={{
                    flex: 1,
                    fontWeight: '600',
                    color: '#333',
                    fontSize: '15px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {mic.name}{mic.isManual && ' [M]'}
                  </span>
                  <span style={{
                    fontSize: '13px',
                    color: '#666',
                    fontWeight: '700',
                    background: 'rgba(0,0,0,0.05)',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>
                    {mic.volume}%
                  </span>
                </div>
              ))}
              
              {/* Active Media */}
              {activeAudio.media.map((media, index) => {
                const startTime = audioStartTimes[media.trackId];
                const elapsed = startTime ? Math.floor((currentTime - startTime) / 1000) : 0;
                const remaining = media.duration ? Math.max(0, media.duration - elapsed) : null;
                const isExpired = media.duration && elapsed >= media.duration;
                
                return (
                  <div key={media.trackId || index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    background: isExpired ? 'rgba(255, 200, 200, 0.9)' : 'rgba(255, 255, 255, 0.8)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    border: `1px solid ${isExpired ? 'rgba(255, 0, 0, 0.3)' : 'rgba(255, 152, 0, 0.3)'}`,
                    opacity: isExpired ? 0.8 : 1
                  }}>
                    <span style={{ fontSize: '18px' }}>🎵</span>
                    <span style={{
                      flex: 1,
                      fontWeight: '600',
                      color: isExpired ? '#666' : '#333',
                      fontSize: '15px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {media.name}{media.isManual && ' [M]'}
                    </span>
                    {media.duration ? (
                      <span style={{
                        fontSize: '16px',
                        color: isExpired ? '#f44336' : '#333',
                        fontWeight: '700',
                        fontFamily: 'monospace',
                        background: isExpired ? 'rgba(255,0,0,0.15)' : 'rgba(0,0,0,0.05)',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        minWidth: '60px',
                        textAlign: 'center'
                      }}>
                        {isExpired ? 'END' : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`}
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '13px',
                        color: '#666',
                        fontWeight: '700',
                        background: 'rgba(0,0,0,0.05)',
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}>
                        {media.volume}%
                      </span>
                    )}
                  </div>
                );
              })}
        </div>
      )}
    </div>
    </div>
  );
};

export default SegmentCueStatus;