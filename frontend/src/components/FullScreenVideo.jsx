import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import MediaPicker from './MediaPicker.jsx';
import { useSelection } from '../selection/SelectionContext.jsx';

// Mine showId from props regardless of naming/nesting
function getShowIdFromProps({ showId, rundown, episode, show, ...restProps }) {
  const coerce = (v) => {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };

  // 1) Standard prop
  const fromStandard = coerce(showId);
  if (fromStandard != null) return fromStandard;

  // 2) Common alternates the rest of the app might use
  const candidateKeys = [
    'showID', 'currentShowId', 'selectedShowId', 'activeShowId', 'rundownShowId', 'sceneShowId'
  ];
  for (const k of candidateKeys) {
    if (k in restProps) {
      const v = coerce(restProps[k]);
      if (v != null) return v;
    }
  }

  // 3) Nested objects often passed down from PropertiesPanel
  const nestedDirect = coerce(
    rundown?.show_id ?? rundown?.showId ?? rundown?.show?.id ??
    episode?.show_id ?? episode?.showId ?? episode?.show?.id ??
    show?.id ?? null
  );
  if (nestedDirect != null) return nestedDirect;

  // 4) Anything in a generic `context` prop
  const ctx = restProps?.context;
  if (ctx) {
    const fromCtx = coerce(
      ctx.showId ?? ctx.show_id ?? ctx.show?.id ??
      ctx.rundown?.showId ?? ctx.rundown?.show_id ?? ctx.rundown?.show?.id ?? null
    );
    if (fromCtx != null) return fromCtx;
  }

  return null;
}

// Helper to get media URL
function getMediaUrl(media) {
  if (!media?.filename) return '';
  return `${API_BASE_URL}/media/${media.filename}`;
}

// Format duration helper
function formatDuration(seconds) {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function FullScreenVideo({ item, onSave, showId, rundown, episode, show, ...rest }) {
  // Use centralized selection state
  const { showId: contextShowId } = useSelection();
  // Data state (matches ObsSceneEditor structure minus slots)
  const [data, setData] = useState({
    transition: { type: "cut", durationSec: 0 },
    selectedMedia: null,
    mediaProperties: {
      autoplay: false,
      loop: false,
      volume: 1.0,
      startTime: 0,
      playbackSpeed: 1.0
    },
    notes: ""
  });

  // Modal states
  const [mediaPickerModal, setMediaPickerModal] = useState({ open: false });

  // Load data from item
  useEffect(() => {
    if (!item?.data) return;
    
    const itemData = item.data;
    console.log('[FullScreenVideo] Loading item data:', itemData);
    
    setData({
      transition: itemData.transition || { type: "cut", durationSec: 0 },
      selectedMedia: itemData.selectedMedia || null,
      mediaProperties: {
        autoplay: itemData.mediaProperties?.autoplay ?? false,
        loop: itemData.mediaProperties?.loop ?? false,
        volume: itemData.mediaProperties?.volume ?? 1.0,
        startTime: itemData.mediaProperties?.startTime ?? 0,
        playbackSpeed: itemData.mediaProperties?.playbackSpeed ?? 1.0
      },
      notes: itemData.notes || ""
    });
  }, [item]);

  // Save data helper
  const saveData = (newData) => {
    if (onSave) {
      onSave({ ...newData });
    }
  };

  // Field update helper
  const setField = (path, value) => {
    setData(prev => {
      const newData = { ...prev };
      const keys = path.split('.');
      let current = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      
      // Save to database
      saveData(newData);
      
      return newData;
    });
  };

  const transitionNeedsDuration = (t) => t && t.toLowerCase() !== "cut";

  // Legacy function - now uses centralized SelectionContext
  // Get show ID helper (simplified to prioritize centralized state)
  function getShowIdFromAnywhere(item) {
    // 1) First try the centralized showId from SelectionContext
    if (contextShowId != null) {
      console.log('[FullScreenVideo] showId via centralized context:', contextShowId);
      return Number(contextShowId);
    }
    
    // 2) Fallback to direct fields on item for backwards compatibility
    const directShowId =
      item?.show_id ??
      item?.showId ??
      item?.data?.show_id ??
      item?.data?.showId ??
      item?.show?.id ??
      null;
    if (directShowId != null && directShowId !== '') {
      console.log('[FullScreenVideo] showId via direct fields:', directShowId);
      return Number(directShowId);
    }

    // 3) From nested structures commonly present in rundown items
    const rundownShowId =
      item?.rundown?.show_id ??
      item?.rundown?.showId ??
      item?.group?.show_id ??
      item?.group?.showId ??
      item?.episode?.show_id ??
      item?.episode?.showId ??
      item?.episode?.show?.id ??
      null;
    if (rundownShowId != null && rundownShowId !== '') {
      console.log('[FullScreenVideo] showId via rundown/episode/group:', rundownShowId);
      return Number(rundownShowId);
    }

    console.warn('[FullScreenVideo] Unable to resolve showId for MediaPicker. Item snapshot:', item);
    return null;
  }

  // Prefer whatever the parent actually passed, under any common key
  const coerceId = (v) => {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };

  const propShowId = getShowIdFromProps({ showId, rundown, episode, show, ...rest });

  // Compute resolvedShowId once per render for reuse and remounting
  const resolvedShowId = propShowId ?? getShowIdFromAnywhere(item);

  // One-time diagnostic log when resolvedShowId changes
  useEffect(() => {
    console.log('[FullScreenVideo] incoming props:', { showId, rundown, episode, show, rest });
    console.log('[FullScreenVideo] derived propShowId =', propShowId, 'final resolvedShowId =', resolvedShowId);
  }, [showId, rundown, episode, show, JSON.stringify(rest), propShowId, resolvedShowId]);

  // Media picker handlers
  const openMediaPicker = () => {
    if (!resolvedShowId) {
      console.warn('[FullScreenVideo] MediaPicker blocked: missing showId.');
      alert('Cannot open media browser: missing show context (showId).');
      return;
    }
    // Debug: log the showId being used for MediaPicker
    console.log('[FullScreenVideo] Opening MediaPicker with showId =', resolvedShowId);
    setMediaPickerModal({ open: true });
  };

  const closeMediaPicker = () => {
    setMediaPickerModal({ open: false });
  };

  const handleMediaSelected = (media) => {
    console.log('[FullScreenVideo] Media selected:', media);
    setField('selectedMedia', media);
    closeMediaPicker();
  };


  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: '#f8fbff',
      overflow: 'hidden'
    }}>
      {/* Header with Transition Controls */}
      <div style={{
        background: '#fff',
        borderBottom: '2px solid #e1e6ec',
        padding: '16px 20px',
        flexShrink: 0
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 12
        }}>
          <h3 style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 600,
            color: '#1976d2'
          }}>
            Full Screen Video
          </h3>
        </div>

        {/* Transition Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <label style={{ fontSize: 14, fontWeight: 600, color: '#222' }}>Transition</label>
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={data.transition?.type || "cut"}
              onChange={(e) => setField("transition.type", e.target.value)}
              style={{ 
                padding: "6px 10px", 
                borderRadius: 6, 
                border: "1px solid #b1c7e7",
                background: "#fff"
              }}
            >
              <option value="cut">Cut</option>
              <option value="fade">Fade</option>
              <option value="slide">Slide</option>
              <option value="stinger">Stinger</option>
            </select>
            {transitionNeedsDuration(data.transition?.type) && (
              <>
                <label style={{ alignSelf: "center", fontWeight: 600, color: "#222", fontSize: 14 }}>Duration (s)</label>
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={data.transition?.durationSec ?? 0}
                  onChange={(e) => setField("transition.durationSec", Number(e.target.value))}
                  style={{ 
                    width: 90,
                    padding: "6px 8px", 
                    borderRadius: 6, 
                    border: "1px solid #b1c7e7"
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        gap: 20, 
        padding: 20,
        overflow: 'hidden'
      }}>
        {/* Left: Preview Area */}
        <div style={{ 
          flex: 2, 
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #e1e6ec',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e1e6ec',
            background: '#f8fbff',
            flexShrink: 0
          }}>
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1976d2' }}>
              Preview
            </h4>
          </div>
          
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            background: '#fafdff'
          }}>
            {data.selectedMedia ? (
              <div style={{
                width: '100%',
                height: '100%',
                maxWidth: 800,
                maxHeight: 450,
                background: '#000',
                borderRadius: 8,
                overflow: 'hidden',
                border: '2px solid #e1e6ec',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <video
                  src={getMediaUrl(data.selectedMedia)}
                  controls
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                  autoPlay={data.mediaProperties.autoplay}
                  loop={data.mediaProperties.loop}
                  volume={data.mediaProperties.volume}
                  playbackRate={data.mediaProperties.playbackSpeed}
                />
              </div>
            ) : (
              <div style={{
                color: '#aaa',
                fontSize: 18,
                textAlign: 'center',
                padding: 40
              }}>
                No video selected
                <br />
                <button
                  onClick={openMediaPicker}
                  style={{
                    marginTop: 16,
                    background: '#1976d2',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    padding: '12px 24px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Select Video
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Properties Panel */}
        <div style={{ 
          flex: 1, 
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #e1e6ec',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e1e6ec',
            background: '#f8fbff',
            flexShrink: 0
          }}>
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1976d2' }}>
              Video Properties
            </h4>
          </div>

          <div style={{
            flex: 1,
            padding: 20,
            overflow: 'auto'
          }}>
            {/* Media Selection */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ 
                display: 'block',
                fontSize: 14, 
                color: '#222', 
                fontWeight: 600,
                marginBottom: 8
              }}>
                Selected Video
              </label>
              
              {data.selectedMedia ? (
                <div style={{
                  background: '#f8fbff',
                  border: '1px solid #b1c7e7',
                  borderRadius: 8,
                  padding: 12
                }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 80,
                      height: 45,
                      background: '#000',
                      borderRadius: 4,
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #b1c7e7',
                      flexShrink: 0
                    }}>
                      <video
                        src={getMediaUrl(data.selectedMedia)}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        muted
                        preload="metadata"
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontSize: 14, 
                        fontWeight: 600, 
                        color: '#1976d2',
                        marginBottom: 4
                      }}>
                        {data.selectedMedia.name || data.selectedMedia.originalname}
                      </div>
                      <div style={{ 
                        fontSize: 12, 
                        color: '#666',
                        marginBottom: 6
                      }}>
                        {data.selectedMedia.type} • {formatDuration(data.selectedMedia.duration)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                      onClick={openMediaPicker}
                      style={{
                        background: "#e3f2fd",
                        border: "1px solid #1976d2",
                        color: "#1976d2",
                        borderRadius: 6,
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      Change
                    </button>
                    <button
                      onClick={() => setField('selectedMedia', null)}
                      style={{
                        background: "#fff2e0",
                        border: "1px solid #ff9800",
                        color: "#e65100",
                        borderRadius: 6,
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={openMediaPicker}
                  style={{
                    width: '100%',
                    background: '#e3f2fd',
                    border: '2px dashed #1976d2',
                    color: '#1976d2',
                    borderRadius: 8,
                    padding: '20px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  + Select Video
                </button>
              )}
            </div>

            {/* Video Properties */}
            {data.selectedMedia && (
              <div style={{ marginBottom: 24 }}>
                <label style={{ 
                  display: 'block',
                  fontSize: 14, 
                  color: '#222', 
                  fontWeight: 600,
                  marginBottom: 12
                }}>
                  Playback Properties
                </label>

                {/* Autoplay */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={data.mediaProperties.autoplay}
                      onChange={(e) => setField('mediaProperties.autoplay', e.target.checked)}
                    />
                    <span style={{ fontSize: 14, color: '#333' }}>Autoplay</span>
                  </label>
                </div>

                {/* Loop */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={data.mediaProperties.loop}
                      onChange={(e) => setField('mediaProperties.loop', e.target.checked)}
                    />
                    <span style={{ fontSize: 14, color: '#333' }}>Loop</span>
                  </label>
                </div>

                {/* Volume */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ 
                    display: 'block',
                    fontSize: 14, 
                    color: '#333',
                    marginBottom: 4
                  }}>
                    Volume: {Math.round(data.mediaProperties.volume * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={data.mediaProperties.volume}
                    onChange={(e) => setField('mediaProperties.volume', Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Playback Speed */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ 
                    display: 'block',
                    fontSize: 14, 
                    color: '#333',
                    marginBottom: 4
                  }}>
                    Playback Speed: {data.mediaProperties.playbackSpeed}x
                  </label>
                  <input
                    type="range"
                    min="0.25"
                    max="3"
                    step="0.25"
                    value={data.mediaProperties.playbackSpeed}
                    onChange={(e) => setField('mediaProperties.playbackSpeed', Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Start Time */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ 
                    display: 'block',
                    fontSize: 14, 
                    color: '#333',
                    marginBottom: 4
                  }}>
                    Start Time (seconds)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={data.selectedMedia.duration || 999}
                    step="0.1"
                    value={data.mediaProperties.startTime}
                    onChange={(e) => setField('mediaProperties.startTime', Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: '1px solid #b1c7e7',
                      background: '#fff',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Notes Section */}
            <div>
              <label style={{ 
                display: 'block',
                fontSize: 14, 
                color: '#222', 
                fontWeight: 600,
                marginBottom: 8
              }}>
                Notes
              </label>
              <textarea
                value={data.notes}
                onChange={(e) => setField('notes', e.target.value)}
                placeholder="Add notes..."
                style={{
                  width: '100%',
                  height: 80,
                  padding: 12,
                  borderRadius: 6,
                  border: '1px solid #b1c7e7',
                  background: '#fff',
                  fontSize: 14,
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Media Picker Modal */}
      <MediaPicker
        key={`media-picker-${resolvedShowId || 'none'}`}
        showId={resolvedShowId}
        isOpen={mediaPickerModal.open}
        onClose={closeMediaPicker}
        onMediaSelected={handleMediaSelected}
        title="Select Video for Full Screen"
      />
    </div>
  );
}