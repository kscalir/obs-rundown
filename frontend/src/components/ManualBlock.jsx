import React, { useState, useEffect } from 'react';

// Helper to check if transition type needs duration
function transitionNeedsDuration(type) {
  return type && type !== 'cut';
}

export default function ManualBlock({ item, onSave }) {
  const [data, setData] = useState({
    transition: { type: "cut", durationSec: 0 },
    items: []
  });

  // Load data from item
  useEffect(() => {
    if (!item?.data) return;
    
    const itemData = item.data;
    setData({
      transition: itemData.transition || { type: "cut", durationSec: 0 },
      items: itemData.items || []
    });
  }, [item]);

  // Save data helper
  const saveData = (newData) => {
    if (onSave) {
      onSave({ ...newData });
    }
  };

  // Helper to set nested field values
  const setField = (path, value) => {
    const newData = { ...data };
    const parts = path.split('.');
    let target = newData;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!target[parts[i]]) {
        target[parts[i]] = {};
      }
      target = target[parts[i]];
    }
    
    target[parts[parts.length - 1]] = value;
    setData(newData);
    saveData(newData);
  };

  // Remove an item from the block
  const removeItem = (itemIndex) => {
    const newItems = data.items.filter((_, index) => index !== itemIndex);
    const newData = { ...data, items: newItems };
    setData(newData);
    saveData(newData);
  };

  // Get display name for item type and title
  const getItemDisplayInfo = (item) => {
    const typeMap = {
      'FullScreenGraphic': 'Graphic',
      'FullScreenVideo': 'Video', 
      'FullScreenYouTube': 'YouTube',
      'FullScreenPdfImage': 'PDF/Image',
      'PresenterNote': 'Presenter Note',
      'AudioCue': 'Audio Cue',
      'obscommand': 'OBS Scene'
    };
    
    const displayType = typeMap[item.type] || item.type;
    
    // For OBS scenes, extract the scene name from the title or data
    if (item.type === 'obscommand' && item.title) {
      const sceneName = item.title.replace('Switch to Scene: ', '');
      return { type: displayType, title: sceneName };
    }
    
    // For other items, show relevant data
    let title = item.title || '';
    if (item.data?.selectedGraphic?.title) {
      title = item.data.selectedGraphic.title;
    } else if (item.data?.audioSource) {
      title = item.data.audioSource;
    } else if (item.data?.note) {
      title = item.data.note.length > 30 ? item.data.note.substring(0, 30) + '...' : item.data.note;
    }
    
    return { type: displayType, title };
  };

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
          color: '#1976d2'
        }}>
          Manual Cue Block
        </h3>
      </div>

      <div style={{ padding: 20 }}>
        {/* Transition Selector */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            <label style={{ fontSize: 14, fontWeight: 600, color: '#222' }}>
              Transition
            </label>
            <div style={{ display: "flex", gap: 8, alignItems: 'center' }}>
              <select
                value={data.transition?.type || "cut"}
                onChange={(e) => setField("transition.type", e.target.value)}
                style={{ 
                  padding: "6px 10px", 
                  borderRadius: 6, 
                  border: "1px solid #d4deea",
                  background: "#fff",
                  fontSize: 14,
                  fontFamily: 'inherit'
                }}
              >
                <option value="cut">Cut</option>
                <option value="fade">Fade</option>
                <option value="slide">Slide</option>
                <option value="stinger">Stinger</option>
              </select>
              {transitionNeedsDuration(data.transition?.type) && (
                <>
                  <label style={{ 
                    fontSize: 14, 
                    fontWeight: 600, 
                    color: "#222" 
                  }}>
                    Duration (s)
                  </label>
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
                      border: "1px solid #d4deea",
                      fontSize: 14,
                      fontFamily: 'inherit'
                    }}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div style={{
          padding: '12px 16px',
          background: '#e8f4fd',
          borderRadius: 6,
          marginBottom: 20,
          borderLeft: '4px solid #1976d2'
        }}>
          <div style={{
            fontSize: 14,
            color: '#1565c0',
            fontWeight: 500
          }}>
            Drag other items into this block to create a set of manual cues inside a show cue
          </div>
        </div>

        {/* Contained Items */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ 
            display: 'block',
            fontSize: 14, 
            fontWeight: 600, 
            color: '#222', 
            marginBottom: 12 
          }}>
            Contained Items ({data.items.length})
          </label>
          
          {data.items.length === 0 ? (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              border: '2px dashed #d4deea',
              borderRadius: 8,
              color: '#666',
              fontSize: 14,
              background: '#fafbfc'
            }}>
              No items added yet. Drag items from the toolbox to add them to this manual block.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.items.map((item, index) => {
                const displayInfo = getItemDisplayInfo(item);
                
                return (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: '#fff',
                      border: '1px solid #e1e6ec',
                      borderRadius: 6,
                      fontSize: 13
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        background: '#f0f4f8',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#666'
                      }}>
                        {index + 1}
                      </span>
                      <span style={{ fontWeight: 500, color: '#222' }}>
                        {displayInfo.type}
                      </span>
                      {displayInfo.title && (
                        <span style={{ color: '#666', fontSize: 12 }}>
                          - {displayInfo.title}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(index)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#dc3545',
                        cursor: 'pointer',
                        padding: '4px',
                        fontSize: 16,
                        borderRadius: 4
                      }}
                      title="Remove item"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Status Info */}
        <div style={{
          padding: '12px 16px',
          background: '#f0f4f8',
          borderRadius: 6,
          fontSize: 12,
          color: '#666',
          lineHeight: 1.4
        }}>
          <strong>Block Status:</strong> {data.items.length} item{data.items.length !== 1 ? 's' : ''} • 
          Transition: {data.transition?.type || 'cut'}
          {transitionNeedsDuration(data.transition?.type) && 
            ` (${data.transition?.durationSec || 0}s)`
          }
        </div>
      </div>
    </div>
  );
}