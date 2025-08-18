import React, { useMemo } from 'react';

const ActiveAudioDisplay = ({ segments, liveItemId }) => {
  console.log('ActiveAudioDisplay rendering with:', { segments, liveItemId });
  // Calculate currently active audio
  const activeAudio = useMemo(() => {
    const active = {
      mics: [],
      media: []
    };
    
    if (!segments || !liveItemId) return active;
    
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
                active.media.push({
                  id: audioData.mediaId,
                  name: audioData.sourceName,
                  volume: audioData.volume || 100,
                  trackId: audioData.trackId || `track_${item.id}`
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
    
    return active;
  }, [segments, liveItemId]);
  
  const hasActiveAudio = activeAudio.mics.length > 0 || activeAudio.media.length > 0;
  
  return (
    <div style={{
      background: '#fff3e0',
      borderRadius: '8px',
      padding: '16px',
      border: '1px solid #ffcc80'
    }}>
      <div style={{
        fontSize: '11px',
        color: '#e65100',
        textTransform: 'uppercase',
        fontWeight: '700',
        marginBottom: '12px',
        letterSpacing: '0.5px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span>🔊</span>
        <span>Active Audio</span>
        {hasActiveAudio && (
          <span style={{
            background: '#ff6b6b',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '10px',
            fontSize: '10px',
            marginLeft: 'auto'
          }}>
            {activeAudio.mics.length + activeAudio.media.length}
          </span>
        )}
      </div>
      
      {!hasActiveAudio ? (
        <div style={{
          color: '#999',
          fontSize: '13px',
          fontStyle: 'italic'
        }}>
          No active audio sources
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {/* Active Mics */}
          {activeAudio.mics.map((mic, index) => (
            <div key={mic.trackId || index} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              background: 'rgba(255, 255, 255, 0.7)',
              borderRadius: '6px',
              border: '1px solid #ffcc80'
            }}>
              <span style={{ fontSize: '14px' }}>🎤</span>
              <span style={{
                flex: 1,
                fontSize: '13px',
                fontWeight: '500',
                color: '#333'
              }}>
                {mic.name}
              </span>
              <span style={{
                fontSize: '11px',
                color: '#666',
                background: '#f0f0f0',
                padding: '2px 6px',
                borderRadius: '4px'
              }}>
                {mic.volume}%
              </span>
            </div>
          ))}
          
          {/* Active Media */}
          {activeAudio.media.map((media, index) => (
            <div key={media.trackId || index} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              background: 'rgba(255, 255, 255, 0.7)',
              borderRadius: '6px',
              border: '1px solid #ffcc80'
            }}>
              <span style={{ fontSize: '14px' }}>🎵</span>
              <span style={{
                flex: 1,
                fontSize: '13px',
                fontWeight: '500',
                color: '#333'
              }}>
                {media.name}
              </span>
              <span style={{
                fontSize: '11px',
                color: '#666',
                background: '#f0f0f0',
                padding: '2px 6px',
                borderRadius: '4px'
              }}>
                {media.volume}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActiveAudioDisplay;