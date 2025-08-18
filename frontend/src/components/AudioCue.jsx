import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { API_BASE_URL } from '../config';

export default function AudioCue({ item, segments, isManualContext = false, onSave }) {
  const [audioSources, setAudioSources] = useState([]);
  const [mediaLibrary, setMediaLibrary] = useState([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [playingPreview, setPlayingPreview] = useState(null);
  const audioRef = useRef(null);
  
  const [formData, setFormData] = useState({
    mode: 'new', // 'existing' or 'new'
    sourceId: '',
    sourceName: '',
    sourceType: '', // 'mic', 'media', 'obs_source'
    mediaId: '',
    mediaPath: '',
    action: 'start', // 'start', 'adjust', 'fade_to', 'fade_out', 'stop'
    volume: 100,
    targetVolume: 50,
    fadeIn: 0,
    fadeOut: 0,
    fadeDuration: 3,
    duration: null, // null = play until stopped
    trackId: '', // auto-assigned or user-defined
    // Manual block specific
    manualFadeOut: false, // Only shown in manual context
    manualFadeDuration: 2 // Fade duration when stopping in manual mode
  });

  // Load form data from item
  useEffect(() => {
    if (item?.data) {
      setFormData(prev => ({
        ...prev,
        ...item.data
      }));
    }
  }, [item]);

  // Calculate what audio is active at this point in the rundown
  const activeAudioAtThisPoint = useMemo(() => {
    const active = {
      mics: [],
      media: []
    };
    
    if (!segments) {
      console.log('No segments provided');
      return active;
    }
    
    console.log('=== SCANNING FOR ACTIVE AUDIO ===');
    console.log('Current item ID:', item?.id);
    console.log('Number of segments:', segments.length);
    
    // Create a flat list of all items in order
    const allItems = [];
    for (const segment of segments) {
      const groups = segment.cues || segment.groups || [];
      for (const group of groups) {
        const items = group.items || [];
        for (const rundownItem of items) {
          allItems.push({
            ...rundownItem,
            segmentId: segment.id,
            groupId: group.id
          });
        }
      }
    }
    
    console.log('Total items in rundown:', allItems.length);
    console.log('All item IDs in order:', allItems.map(i => `${i.id}(${i.type})`).join(', '));
    
    // Find current item index
    const currentIndex = allItems.findIndex(i => String(i.id) === String(item?.id));
    console.log('Current item found at index:', currentIndex);
    
    if (currentIndex === -1) {
      console.log('WARNING: Current item not found in rundown!');
      return active;
    }
    
    // Process all items before the current one
    for (let i = 0; i < currentIndex; i++) {
      const rundownItem = allItems[i];
      
      // Track audio state changes - check various audio cue type formats
      const normalizedType = (rundownItem.type || '').toLowerCase().replace(/[-_\s]/g, '');
      const isAudioCue = normalizedType === 'audiocue' || 
                        normalizedType === 'audio' ||
                        rundownItem.type === 'audio-cue' ||
                        rundownItem.type === 'AudioCue';
      
      if (isAudioCue) {
        console.log(`Item ${i}: ID=${rundownItem.id}, Type=${rundownItem.type}, IsAudioCue=YES`);
        
        if (rundownItem.data) {
          const audioData = rundownItem.data;
          console.log('  Audio data:', JSON.stringify(audioData, null, 2));
          
          // For backwards compatibility, also check for old format
          if (audioData.on && audioData.audioSource) {
              // Old format audio cue
              active.mics.push({
                id: audioData.audioSource,
                name: audioData.audioSource,
                volume: audioData.level || 100,
                trackId: `track_${rundownItem.id}`
              });
            } else if (!audioData.mode || audioData.mode === 'new') {
              // New format - starting new audio
              if (audioData.sourceType === 'mic' && audioData.sourceId) {
                active.mics.push({
                  id: audioData.sourceId,
                  name: audioData.sourceName || audioData.sourceId,
                  volume: audioData.volume || 100,
                  trackId: audioData.trackId || `track_${rundownItem.id}`
                });
              } else if (audioData.sourceType === 'media' && audioData.mediaId) {
                console.log('Adding media to active:', {
                  id: audioData.mediaId,
                  name: audioData.sourceName,
                  trackId: audioData.trackId || `track_${rundownItem.id}`
                });
                active.media.push({
                  id: audioData.mediaId,
                  name: audioData.sourceName,
                  path: audioData.mediaPath,
                  volume: audioData.volume || 100,
                  trackId: audioData.trackId || `track_${rundownItem.id}`,
                  startedAt: rundownItem.id
                });
              }
            } else if (audioData.mode === 'existing') {
              // Modifying existing audio
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
          } else {
            console.log('  No data on audio cue item');
          }
        } else {
          // Not an audio cue, skip
        }
    }
    
    console.log('=== FINAL ACTIVE AUDIO ===');
    console.log('Active mics:', active.mics);
    console.log('Active media:', active.media);
    console.log('Total active sources:', active.mics.length + active.media.length);
    return active;
  }, [segments, item]);

  // Fetch audio sources from OBS
  const fetchAudioSources = useCallback(async () => {
    setLoadingSources(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/obs/audio-sources`);
      if (!res.ok) throw new Error(`Failed to fetch audio sources: ${res.status}`);
      const sources = await res.json();
      setAudioSources(Array.isArray(sources) ? sources : []);
    } catch (error) {
      console.warn('Failed to fetch audio sources:', error);
      setAudioSources([]);
    } finally {
      setLoadingSources(false);
    }
  }, []);

  // Get show ID from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const showId = urlParams.get('showId');

  // Fetch media library for this show
  const fetchMediaLibrary = useCallback(async () => {
    if (!showId) {
      console.warn('No show ID in URL parameters');
      return;
    }
    
    setLoadingMedia(true);
    try {
      // Use the correct media endpoint
      const res = await fetch(`${API_BASE_URL}/api/media/show/${showId}`);
      if (!res.ok) throw new Error(`Failed to fetch media: ${res.status}`);
      const media = await res.json();
      setMediaLibrary(Array.isArray(media) ? media : []);
    } catch (error) {
      console.warn('Failed to fetch media:', error);
      setMediaLibrary([]);
    } finally {
      setLoadingMedia(false);
    }
  }, [showId]);

  // Load sources on mount
  useEffect(() => {
    fetchAudioSources();
  }, [fetchAudioSources]);
  
  // Load media when showId is available
  useEffect(() => {
    if (showId) {
      fetchMediaLibrary();
    }
  }, [showId, fetchMediaLibrary]);

  // Handle form changes
  const handleChange = useCallback((field, value) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      
      // Auto-generate track ID if needed
      if (field === 'sourceId' && value && !next.trackId) {
        const source = [...audioSources, ...mediaLibrary].find(s => 
          s.id === value || s.name === value
        );
        if (source) {
          next.sourceName = source.name || source.title || value;
          next.trackId = `track_${item?.id || Date.now()}`;
        }
      }
      
      // Auto-save
      if (onSave) {
        onSave(next);
      }
      
      return next;
    });
  }, [onSave, audioSources, mediaLibrary, item]);

  // Get list of active sources for existing mode
  const existingSources = [
    ...activeAudioAtThisPoint.mics.map(m => ({
      ...m,
      type: 'mic',
      label: `🎤 ${m.name} (ON - ${m.volume}%)`
    })),
    ...activeAudioAtThisPoint.media.map(m => ({
      ...m,
      type: 'media',
      label: `🎵 ${m.name} (PLAYING - ${m.volume}%)`
    }))
  ];
  
  console.log('Existing sources for item', item?.id, ':', existingSources.length, 'sources');

  // Get list of available sources for new mode
  const availableSources = [
    ...audioSources
      .filter(s => !activeAudioAtThisPoint.mics.find(m => m.id === s.id))
      .map(s => ({
        id: s.id || s.name,
        name: s.name,
        type: 'mic',
        label: `🎤 ${s.name} (currently OFF)`
      })),
    { 
      id: '_media_', 
      type: 'media_picker',
      label: '📁 Select from Media Library...' 
    }
  ];

  return (
    <div style={{
      background: '#f8fbff',
      border: '1px solid #e6eef6',
      borderRadius: 10,
      boxShadow: '0 6px 18px rgba(15, 30, 60, .06)',
      overflow: 'hidden',
      marginRight: 16
    }}>
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e1e6ec',
        padding: '16px 20px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 600,
          color: '#ff9800'
        }}>
          Audio Cue
        </h3>
      </div>

      <div style={{ padding: 20 }}>
        {/* Mode Selection */}
        <div style={{ 
          display: 'flex', 
          gap: 8, 
          marginBottom: 24,
          padding: 4,
          background: '#f0f4f8',
          borderRadius: 8
        }}>
          <button
            onClick={() => handleChange('mode', 'new')}
            style={{
              flex: 1,
              padding: '10px 16px',
              border: 'none',
              borderRadius: 6,
              background: formData.mode === 'new' ? '#fff' : 'transparent',
              color: formData.mode === 'new' ? '#ff9800' : '#666',
              fontWeight: formData.mode === 'new' ? 600 : 400,
              fontSize: 14,
              cursor: 'pointer',
              boxShadow: formData.mode === 'new' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            New Audio Source
          </button>
          <button
            onClick={() => handleChange('mode', 'existing')}
            disabled={existingSources.length === 0}
            style={{
              flex: 1,
              padding: '10px 16px',
              border: 'none',
              borderRadius: 6,
              background: formData.mode === 'existing' ? '#fff' : 'transparent',
              color: formData.mode === 'existing' ? '#ff9800' : 
                     existingSources.length === 0 ? '#ccc' : '#666',
              fontWeight: formData.mode === 'existing' ? 600 : 400,
              fontSize: 14,
              cursor: existingSources.length === 0 ? 'not-allowed' : 'pointer',
              boxShadow: formData.mode === 'existing' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            Existing Audio Source {existingSources.length > 0 && `(${existingSources.length})`}
          </button>
        </div>

        {formData.mode === 'existing' ? (
          <>
            {/* Existing Audio Source Mode */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ 
                display: 'block', 
                fontSize: 14, 
                fontWeight: 600, 
                color: '#222', 
                marginBottom: 8 
              }}>
                Select Active Audio Source
              </label>
              <select
                value={formData.trackId}
                onChange={(e) => {
                  const source = existingSources.find(s => s.trackId === e.target.value);
                  if (source) {
                    handleChange('trackId', source.trackId);
                    handleChange('sourceName', source.name);
                    handleChange('sourceType', source.type);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d4deea',
                  borderRadius: 6,
                  background: '#fff',
                  fontSize: 14,
                  fontFamily: 'inherit'
                }}
              >
                <option value="">Select audio to control...</option>
                {existingSources.map(source => (
                  <option key={source.trackId} value={source.trackId}>
                    {source.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Action for Existing */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ 
                display: 'block', 
                fontSize: 14, 
                fontWeight: 600, 
                color: '#222', 
                marginBottom: 8 
              }}>
                Action
              </label>
              <select
                value={formData.action}
                onChange={(e) => handleChange('action', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d4deea',
                  borderRadius: 6,
                  background: '#fff',
                  fontSize: 14,
                  fontFamily: 'inherit'
                }}
              >
                <option value="adjust">Adjust Volume</option>
                <option value="fade_to">Fade To Volume</option>
                <option value="fade_out">Fade Out</option>
                <option value="stop">Stop / Turn Off</option>
              </select>
            </div>

            {/* Parameters based on action */}
            {(formData.action === 'adjust' || formData.action === 'fade_to') && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: 14, 
                  fontWeight: 600, 
                  color: '#222', 
                  marginBottom: 8 
                }}>
                  Target Volume: {formData.targetVolume}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.targetVolume}
                  onChange={(e) => handleChange('targetVolume', parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    height: 6,
                    borderRadius: 3,
                    background: '#e1e6ec',
                    outline: 'none'
                  }}
                />
              </div>
            )}

            {(formData.action === 'fade_to' || formData.action === 'fade_out') && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: 14, 
                  fontWeight: 600, 
                  color: '#222', 
                  marginBottom: 8 
                }}>
                  Fade Duration (seconds)
                </label>
                <input
                  type="number"
                  min="0.1"
                  max="30"
                  step="0.1"
                  value={formData.fadeDuration}
                  onChange={(e) => handleChange('fadeDuration', parseFloat(e.target.value) || 0.1)}
                  style={{
                    width: '120px',
                    padding: '8px 12px',
                    border: '1px solid #d4deea',
                    borderRadius: 6,
                    background: '#fff',
                    fontSize: 14
                  }}
                />
              </div>
            )}
          </>
        ) : (
          <>
            {/* New Audio Source Mode */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ 
                display: 'block', 
                fontSize: 14, 
                fontWeight: 600, 
                color: '#222', 
                marginBottom: 8 
              }}>
                Select Audio Source
              </label>
              <select
                value={formData.sourceId}
                onChange={(e) => {
                  const sourceId = e.target.value;
                  if (sourceId === '_media_') {
                    // Show media picker
                    setFormData(prev => {
                      const next = {
                        ...prev,
                        sourceType: 'media',
                        mode: 'new',
                        sourceId: '',
                        sourceName: ''
                      };
                      if (onSave) onSave(next);
                      return next;
                    });
                  } else if (sourceId) {
                    const source = availableSources.find(s => s.id === sourceId);
                    if (source) {
                      setFormData(prev => {
                        const next = {
                          ...prev,
                          sourceId: source.id,
                          sourceName: source.name,
                          sourceType: source.type,
                          mode: 'new',
                          trackId: prev.trackId || `track_${item?.id || Date.now()}`
                        };
                        console.log('Saving source selection:', next);
                        if (onSave) onSave(next);
                        return next;
                      });
                    }
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d4deea',
                  borderRadius: 6,
                  background: '#fff',
                  fontSize: 14,
                  fontFamily: 'inherit'
                }}
              >
                <option value="">Select audio source...</option>
                {availableSources.map(source => (
                  <option key={source.id} value={source.id}>
                    {source.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Media Picker (if media selected) */}
            {formData.sourceType === 'media' && (
              <div style={{ 
                marginBottom: 20,
                padding: 16,
                background: '#f9f9f9',
                borderRadius: 8,
                border: '1px solid #e0e0e0'
              }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: 13, 
                  fontWeight: 600, 
                  color: '#555', 
                  marginBottom: 8 
                }}>
                  Select Audio File
                </label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select
                    value={formData.mediaId || ''}
                    onChange={(e) => {
                      const mediaId = e.target.value;
                      // Convert to number if needed for comparison
                      const media = mediaLibrary.find(m => String(m.id) === mediaId);
                      if (media) {
                        // Stop any playing preview
                        if (audioRef.current) {
                          audioRef.current.pause();
                          setPlayingPreview(null);
                        }
                        
                        setFormData(prev => {
                          const next = {
                            ...prev,
                            mode: 'new', // Ensure mode is set
                            sourceType: 'media', // Ensure sourceType is set
                            mediaId: media.id,
                            mediaPath: media.path || media.url || media.filepath || media.filename,
                            sourceName: media.title || media.name || media.filename,
                            sourceId: `media_${media.id}`, // Unique ID for media sources
                            trackId: prev.trackId || `track_${item?.id || Date.now()}`,
                            mediaDuration: media.duration // Store the actual media file duration
                          };
                          console.log('Saving media selection:', next);
                          console.log('Media duration:', media.duration);
                          if (onSave) onSave(next);
                          return next;
                        });
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      border: '1px solid #d4deea',
                      borderRadius: 4,
                      background: '#fff',
                      fontSize: 13
                    }}
                  >
                    <option value="">Choose audio file...</option>
                    {mediaLibrary
                      .filter(m => m.type === 'audio' || m.filename?.match(/\.(mp3|wav|aac|ogg|m4a)$/i))
                      .map(media => (
                        <option key={media.id} value={media.id}>
                          {media.title || media.name || media.filename}
                        </option>
                      ))}
                  </select>
                  
                  {/* Preview button */}
                  {formData.mediaId && (
                    <button
                      onClick={() => {
                        const media = mediaLibrary.find(m => m.id === formData.mediaId || String(m.id) === String(formData.mediaId));
                        if (media) {
                          if (playingPreview === media.id) {
                            // Stop preview
                            if (audioRef.current) {
                              audioRef.current.pause();
                              setPlayingPreview(null);
                            }
                          } else {
                            // Start preview - use the correct media file URL
                            if (audioRef.current) {
                              // The media files are served from /media/ static route
                              audioRef.current.src = `${API_BASE_URL}/media/${media.filename}`;
                              audioRef.current.play().catch(err => {
                                console.error('Failed to play audio:', err);
                                setPlayingPreview(null);
                              });
                              setPlayingPreview(media.id);
                            }
                          }
                        }
                      }}
                      style={{
                        padding: '8px 16px',
                        border: '1px solid #d4deea',
                        borderRadius: 4,
                        background: playingPreview === formData.mediaId ? '#ff9800' : '#fff',
                        color: playingPreview === formData.mediaId ? '#fff' : '#666',
                        fontSize: 13,
                        cursor: 'pointer',
                        fontWeight: 500
                      }}
                    >
                      {playingPreview === formData.mediaId ? '⏸ Stop' : '▶ Preview'}
                    </button>
                  )}
                </div>
                
                {/* Audio preview element */}
                <audio 
                  ref={audioRef}
                  onEnded={() => setPlayingPreview(null)}
                  style={{ display: 'none' }}
                />
                
                {/* Show waveform or duration if available */}
                {formData.mediaId && (
                  <div style={{
                    marginTop: 12,
                    padding: '8px 12px',
                    background: '#fff',
                    borderRadius: 4,
                    border: '1px solid #e0e0e0',
                    fontSize: 12,
                    color: '#666'
                  }}>
                    {(() => {
                      const media = mediaLibrary.find(m => m.id === formData.mediaId || String(m.id) === String(formData.mediaId));
                      return media ? (
                        <>
                          <strong>Title:</strong> {media.title || media.name || 'Untitled'}<br/>
                          <strong>File:</strong> {media.filename}<br/>
                          {media.duration && <><strong>Duration:</strong> {Math.floor(media.duration / 60)}:{String(Math.floor(media.duration % 60)).padStart(2, '0')}<br/></>}
                          {media.size && <><strong>Size:</strong> {(media.size / 1024 / 1024).toFixed(2)} MB</>}
                        </>
                      ) : 'Loading...';
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Volume for New */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ 
                display: 'block', 
                fontSize: 14, 
                fontWeight: 600, 
                color: '#222', 
                marginBottom: 8 
              }}>
                Initial Volume: {formData.volume}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={formData.volume}
                onChange={(e) => handleChange('volume', parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: 6,
                  borderRadius: 3,
                  background: '#e1e6ec',
                  outline: 'none'
                }}
              />
            </div>

            {/* Fade In */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ 
                display: 'block', 
                fontSize: 14, 
                fontWeight: 600, 
                color: '#222', 
                marginBottom: 8 
              }}>
                Fade In (seconds)
              </label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={formData.fadeIn}
                onChange={(e) => handleChange('fadeIn', parseFloat(e.target.value) || 0)}
                style={{
                  width: '120px',
                  padding: '8px 12px',
                  border: '1px solid #d4deea',
                  borderRadius: 6,
                  background: '#fff',
                  fontSize: 14
                }}
              />
            </div>

            {/* Duration (optional) */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ 
                display: 'block', 
                fontSize: 14, 
                fontWeight: 600, 
                color: '#222', 
                marginBottom: 8 
              }}>
                Duration (leave blank to play until stopped)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.duration || ''}
                onChange={(e) => handleChange('duration', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="Play full length"
                style={{
                  width: '180px',
                  padding: '8px 12px',
                  border: '1px solid #d4deea',
                  borderRadius: 6,
                  background: '#fff',
                  fontSize: 14
                }}
              />
            </div>

            {/* Manual Block Controls - only shown when in manual context */}
            {isManualContext && (
              <div style={{
                marginBottom: 20,
                padding: 16,
                background: '#fff3e0',
                borderRadius: 8,
                border: '1px solid #ffcc80'
              }}>
                <h4 style={{
                  margin: '0 0 12px 0',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#e65100'
                }}>
                  Manual Control Settings
                </h4>
                
                <div style={{ marginBottom: 12 }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 14,
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={formData.manualFadeOut}
                      onChange={(e) => handleChange('manualFadeOut', e.target.checked)}
                    />
                    <span style={{ color: '#333' }}>
                      Fade out when stopped (instead of hard cut)
                    </span>
                  </label>
                </div>
                
                {formData.manualFadeOut && (
                  <div style={{ marginLeft: 24 }}>
                    <label style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#555',
                      marginBottom: 6
                    }}>
                      Fade Duration (seconds)
                    </label>
                    <input
                      type="number"
                      min="0.1"
                      max="10"
                      step="0.1"
                      value={formData.manualFadeDuration}
                      onChange={(e) => handleChange('manualFadeDuration', parseFloat(e.target.value) || 0.5)}
                      style={{
                        width: '100px',
                        padding: '6px 10px',
                        border: '1px solid #d4deea',
                        borderRadius: 4,
                        background: '#fff',
                        fontSize: 13
                      }}
                    />
                  </div>
                )}
                
                <div style={{
                  marginTop: 12,
                  fontSize: 12,
                  color: '#666',
                  lineHeight: 1.4
                }}>
                  <strong>Note:</strong> When this audio is triggered from the control pad, 
                  {formData.manualFadeOut 
                    ? ` pressing the button again will fade out over ${formData.manualFadeDuration}s`
                    : ' pressing the button again will stop immediately'}
                </div>
              </div>
            )}

            {/* Track ID (advanced) */}
            <details style={{ marginBottom: 20 }}>
              <summary style={{ 
                fontSize: 13, 
                color: '#666', 
                cursor: 'pointer',
                marginBottom: 8
              }}>
                Advanced Settings
              </summary>
              <div style={{ marginTop: 12, paddingLeft: 16 }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: 13, 
                  fontWeight: 500, 
                  color: '#555', 
                  marginBottom: 6 
                }}>
                  Track ID (for referencing later)
                </label>
                <input
                  type="text"
                  value={formData.trackId}
                  onChange={(e) => handleChange('trackId', e.target.value)}
                  placeholder="Auto-generated"
                  style={{
                    width: '200px',
                    padding: '6px 10px',
                    border: '1px solid #d4deea',
                    borderRadius: 4,
                    background: '#fff',
                    fontSize: 13
                  }}
                />
              </div>
            </details>

          </>
        )}

        {/* Status Summary */}
        <div style={{
          padding: '12px 16px',
          background: formData.mode === 'existing' ? '#fff3e0' : '#f0f4f8',
          borderRadius: 6,
          fontSize: 13,
          color: '#555',
          lineHeight: 1.5
        }}>
          <strong>Summary:</strong>{' '}
          {formData.mode === 'existing' ? (
            formData.trackId ? (
              <>
                {formData.action === 'adjust' && `Set "${formData.sourceName}" to ${formData.targetVolume}%`}
                {formData.action === 'fade_to' && `Fade "${formData.sourceName}" to ${formData.targetVolume}% over ${formData.fadeDuration}s`}
                {formData.action === 'fade_out' && `Fade out "${formData.sourceName}" over ${formData.fadeDuration}s`}
                {formData.action === 'stop' && `Stop/Turn off "${formData.sourceName}"`}
              </>
            ) : 'Select audio to control'
          ) : (
            formData.sourceName ? (
              <>
                Start "{formData.sourceName}" at {formData.volume}%
                {formData.fadeIn > 0 && ` (fade in: ${formData.fadeIn}s)`}
                {formData.duration && ` for ${formData.duration}s`}
              </>
            ) : 'Select audio source'
          )}
        </div>
      </div>
    </div>
  );
}