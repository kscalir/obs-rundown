import React, { useState, useEffect } from 'react';
import YouTubePicker from './YouTubePicker.jsx';

// Helper functions from ObsSceneEditor
function getYouTubeEmbedUrl(videoId, autoplay = false) {
  if (!videoId) return '';
  return `https://www.youtube.com/embed/${videoId}?${autoplay ? 'autoplay=1&' : ''}mute=1&rel=0&controls=1`;
}

function getYouTubeThumbnail(videoId) {
  if (!videoId) return '';
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export default function FullScreenYouTube({ item, onSave }) {
  // Data state (matches ObsSceneEditor structure minus slots)
  const [data, setData] = useState({
    transition: { type: "cut", durationSec: 0 },
    selectedYouTube: null,
    youtubeProperties: {
      autoplay: false,
      continue: false,
      volume: 1.0,
      audioTrack: 'original'
    },
    notes: ""
  });

  // Modal states
  const [youtubePickerModal, setYoutubePickerModal] = useState({ open: false });

  // Load data from item
  useEffect(() => {
    if (!item?.data) return;
    
    const itemData = item.data;
    console.log('[FullScreenYouTube] Loading item data:', itemData);
    
    setData({
      transition: itemData.transition || { type: "cut", durationSec: 0 },
      selectedYouTube: itemData.selectedYouTube || null,
      youtubeProperties: {
        autoplay: itemData.youtubeProperties?.autoplay ?? false,
        continue: itemData.youtubeProperties?.continue ?? false,
        volume: itemData.youtubeProperties?.volume ?? 1.0,
        audioTrack: itemData.youtubeProperties?.audioTrack ?? 'original'
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

  // YouTube picker handlers
  const openYouTubePicker = () => {
    setYoutubePickerModal({ open: true });
  };

  const closeYouTubePicker = () => {
    setYoutubePickerModal({ open: false });
  };

  const handleYouTubeSelected = (youtubeData) => {
    console.log('[FullScreenYouTube] YouTube selected:', youtubeData);
    setField('selectedYouTube', youtubeData);
    closeYouTubePicker();
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
            Full Screen YouTube
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
            {data.selectedYouTube ? (
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
                <iframe
                  width="100%"
                  height="100%"
                  src={getYouTubeEmbedUrl(data.selectedYouTube.videoId, data.youtubeProperties.autoplay)}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ display: 'block' }}
                />
              </div>
            ) : (
              <div style={{
                color: '#aaa',
                fontSize: 18,
                textAlign: 'center',
                padding: 40
              }}>
                No YouTube video selected
                <br />
                <button
                  onClick={openYouTubePicker}
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
                  Add YouTube Video
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
              YouTube Properties
            </h4>
          </div>

          <div style={{
            flex: 1,
            padding: 20,
            overflow: 'auto'
          }}>
            {/* YouTube Selection */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ 
                display: 'block',
                fontSize: 14, 
                color: '#222', 
                fontWeight: 600,
                marginBottom: 8
              }}>
                Selected YouTube Video
              </label>
              
              {data.selectedYouTube ? (
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
                      <img
                        src={getYouTubeThumbnail(data.selectedYouTube.videoId)}
                        alt="YouTube Thumbnail"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontSize: 14, 
                        fontWeight: 600, 
                        color: '#1976d2',
                        marginBottom: 4
                      }}>
                        {data.selectedYouTube.title}
                      </div>
                      <div style={{ 
                        fontSize: 12, 
                        color: '#666',
                        marginBottom: 6
                      }}>
                        Video ID: {data.selectedYouTube.videoId}
                      </div>
                      {data.selectedYouTube.url && (
                        <div style={{ 
                          fontSize: 12, 
                          color: '#333',
                          fontStyle: 'italic',
                          wordBreak: 'break-all'
                        }}>
                          {data.selectedYouTube.url}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                      onClick={openYouTubePicker}
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
                      onClick={() => setField('selectedYouTube', null)}
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
                  onClick={openYouTubePicker}
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
                  + Add YouTube Video
                </button>
              )}
            </div>

            {/* YouTube Properties */}
            {data.selectedYouTube && (
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
                      checked={data.youtubeProperties.autoplay}
                      onChange={(e) => setField('youtubeProperties.autoplay', e.target.checked)}
                    />
                    <span style={{ fontSize: 14, color: '#333' }}>Autoplay</span>
                  </label>
                </div>

                {/* Continue */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={data.youtubeProperties.continue}
                      onChange={(e) => setField('youtubeProperties.continue', e.target.checked)}
                    />
                    <span style={{ fontSize: 14, color: '#333' }}>Continue playback from last position</span>
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
                    Volume: {Math.round(data.youtubeProperties.volume * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={data.youtubeProperties.volume}
                    onChange={(e) => setField('youtubeProperties.volume', Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Audio Track */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ 
                    display: 'block',
                    fontSize: 14, 
                    color: '#333',
                    marginBottom: 4
                  }}>
                    Audio Track
                  </label>
                  <select
                    value={data.youtubeProperties.audioTrack}
                    onChange={(e) => setField('youtubeProperties.audioTrack', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: '1px solid #b1c7e7',
                      background: '#fff'
                    }}
                  >
                    <option value="original">Original Audio</option>
                    <option value="muted">Muted</option>
                    <option value="desktop">Desktop Audio</option>
                    <option value="microphone">Microphone</option>
                  </select>
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

      {/* YouTube Picker Modal */}
      <YouTubePicker
        isOpen={youtubePickerModal.open}
        onClose={closeYouTubePicker}
        onYouTubeSelected={handleYouTubeSelected}
        title="Add YouTube Video for Full Screen"
      />
    </div>
  );
}