import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '../config';
import GraphicsTemplateEditor from './properties/GraphicsTemplateEditor.jsx';

// Reuse graphics helper from ObsSceneEditor
function buildGraphicsPreviewUrl(graphic) {
  if (!graphic?.id) return '';
  return `${API_BASE_URL}/api/graphics/preview/${graphic.id}`;
}

function normalizeGraphicRow(raw) {
  if (!raw) return null;
  return {
    id: raw.id || raw.graphic_id || raw.uuid || null,
    type: raw.type || 'Graphic',
    title: raw.title || raw.name || raw.template || 'Untitled',
    summary: raw.summary || '',
    thumb: raw.thumb || null
  };
}

export default function FullScreenGraphic({ item, onSave }) {
  // Data state (matches ObsSceneEditor structure minus slots)
  const [data, setData] = useState({
    transition: { type: "cut", durationSec: 0 },
    selectedGraphic: null,
    notes: ""
  });

  // Modal states
  const [gfxPickerModal, setGfxPickerModal] = useState({ open: false });
  const [gfxEditor, setGfxEditor] = useState({ open: false, graphicId: null });
  
  // Graphics list state
  const [gfxList, setGfxList] = useState([]);
  const [gfxError, setGfxError] = useState(null);
  const [gfxLoading, setGfxLoading] = useState(false);

  // Load data from item
  useEffect(() => {
    if (!item?.data) return;
    
    const itemData = item.data;
    console.log('[FullScreenGraphic] Loading item data:', itemData);
    
    setData({
      transition: itemData.transition || { type: "cut", durationSec: 0 },
      selectedGraphic: itemData.selectedGraphic || null,
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

  // Graphics modal handlers
  const openGraphicsPicker = async () => {
    setGfxError("");
    setGfxLoading(true);
    setGfxPickerModal({ open: true });
    
    try {
      const episodeId = item?.group?.episode_id || item?.episode_id;
      if (!episodeId) {
        throw new Error("No episode ID found");
      }
      
      const res = await fetch(`${API_BASE_URL}/api/graphics?episodeId=${episodeId}`);
      if (!res.ok) throw new Error("Failed to fetch graphics");
      
      const data = await res.json();
      const normalizedList = (Array.isArray(data) ? data : data?.rows || [])
        .map(normalizeGraphicRow)
        .filter(g => g.id != null);
      
      setGfxList(normalizedList);
    } catch (err) {
      console.error("Error fetching graphics:", err);
      setGfxError(err.message);
    } finally {
      setGfxLoading(false);
    }
  };

  const closeGraphicsPicker = () => {
    setGfxPickerModal({ open: false });
    setGfxList([]);
    setGfxError(null);
    setGfxLoading(false);
  };

  const handleGraphicSelected = (graphic) => {
    console.log('[FullScreenGraphic] Graphic selected:', graphic);
    const normalized = normalizeGraphicRow(graphic);
    setField('selectedGraphic', normalized);
    closeGraphicsPicker();
  };

  const openGraphicEditor = (graphic) => {
    setGfxEditor({
      open: true,
      graphicId: graphic?.id || null
    });
  };

  const closeGraphicEditor = () => {
    setGfxEditor({ open: false, graphicId: null });
  };

  const onGraphicSaved = (savedGraphic) => {
    console.log('[FullScreenGraphic] Graphic saved:', savedGraphic);
    const normalized = normalizeGraphicRow(savedGraphic);
    setField('selectedGraphic', normalized);
    
    // Update graphics list if the saved graphic is in it
    setGfxList(prev => {
      const exists = prev.some(g => g.id === normalized.id);
      return exists ? prev.map(g => g.id === normalized.id ? { ...g, ...normalized } : g) : prev;
    });
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
            Full Screen Graphic
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
            {data.selectedGraphic ? (
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
                {(() => {
                  const url = buildGraphicsPreviewUrl(data.selectedGraphic);
                  return url ? (
                    <img 
                      src={url} 
                      alt="Graphic preview"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain'
                      }}
                    />
                  ) : (
                    <div style={{
                      color: '#fff',
                      fontSize: 24,
                      fontWeight: 600,
                      textAlign: 'center'
                    }}>
                      {data.selectedGraphic.title}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div style={{
                color: '#aaa',
                fontSize: 18,
                textAlign: 'center',
                padding: 40
              }}>
                No graphic selected
                <br />
                <button
                  onClick={openGraphicsPicker}
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
                  Select Graphic
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
              Graphic Properties
            </h4>
          </div>

          <div style={{
            flex: 1,
            padding: 20,
            overflow: 'auto'
          }}>
            {/* Graphic Selection */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ 
                display: 'block',
                fontSize: 14, 
                color: '#222', 
                fontWeight: 600,
                marginBottom: 8
              }}>
                Selected Graphic
              </label>
              
              {data.selectedGraphic ? (
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
                      background: '#e3f2fd',
                      borderRadius: 4,
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #b1c7e7',
                      flexShrink: 0
                    }}>
                      {(() => {
                        const url = buildGraphicsPreviewUrl(data.selectedGraphic);
                        return url ? (
                          <img 
                            src={url} 
                            alt="Graphic preview"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: 8, color: '#1976d2', fontWeight: 600 }}>GFX</span>
                        );
                      })()}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontSize: 14, 
                        fontWeight: 600, 
                        color: '#1976d2',
                        marginBottom: 4
                      }}>
                        {data.selectedGraphic.title}
                      </div>
                      <div style={{ 
                        fontSize: 12, 
                        color: '#666',
                        marginBottom: 6
                      }}>
                        {data.selectedGraphic.type}
                      </div>
                      {data.selectedGraphic.summary && (
                        <div style={{ 
                          fontSize: 12, 
                          color: '#333',
                          fontStyle: 'italic'
                        }}>
                          {data.selectedGraphic.summary}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                      onClick={() => openGraphicEditor(data.selectedGraphic)}
                      style={{
                        background: "#f3e5f5",
                        border: "1px solid #9c27b0",
                        color: "#6a1b99",
                        borderRadius: 6,
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={openGraphicsPicker}
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
                      onClick={() => setField('selectedGraphic', null)}
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
                  onClick={openGraphicsPicker}
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
                  + Select Graphic
                </button>
              )}
            </div>

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

      {/* Graphics Picker Modal */}
      {gfxPickerModal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 680, maxHeight: '80vh', overflow: 'auto', background: '#fafdff', borderRadius: 12, boxShadow: '0 12px 28px rgba(0,0,0,0.25)', padding: 20, border: '1px solid #e1e6ec' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #e1e6ec' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#1976d2' }}>Select Full Screen Graphic</h3>
              <button 
                onClick={closeGraphicsPicker}
                style={{
                  background: "#fff2e0",
                  border: "1px solid #ff9800",
                  color: "#e65100",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Close
              </button>
            </div>
            {gfxLoading && <div style={{ color: '#777', fontStyle: 'italic', padding: 16, textAlign: 'center' }}>Loading…</div>}
            {gfxError && <div style={{ color: '#d32f2f', marginBottom: 12, padding: 12, background: '#ffebee', border: '1px solid #ffcdd2', borderRadius: 6 }}>{gfxError}</div>}
            {!gfxLoading && !gfxError && gfxList.length === 0 && (
              <div style={{ color: '#777', fontStyle: 'italic', padding: 16, textAlign: 'center' }}>No graphics found for this episode.</div>
            )}
            {!gfxLoading && gfxList.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                {gfxList.map(row => (
                  <div
                    key={row.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '120px 1fr auto',
                      gap: 12,
                      padding: 12,
                      border: '1px solid #e1e6ec',
                      borderRadius: 8,
                      background: '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => handleGraphicSelected(row)}
                  >
                    <div style={{ width: 120, height: 68, background: '#f5f5f5', borderRadius: 4, overflow: 'hidden', border: '1px solid #ddd' }}>
                      {(() => {
                        const url = buildGraphicsPreviewUrl(row);
                        return url ? (
                          <img 
                            src={url} 
                            alt="Graphic preview"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 10, color: '#999' }}>No preview</div>
                        );
                      })()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ fontWeight: 600, color: '#333', marginBottom: 4 }}>{row.title}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>{row.type}</div>
                      {row.summary && <div style={{ fontSize: 11, color: '#888', marginTop: 2, fontStyle: 'italic' }}>{row.summary}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <button
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
                        Select
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Graphics Editor Modal */}
      {gfxEditor.open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            width: 900, maxHeight: '88vh', overflow: 'auto',
            background: '#fafdff', borderRadius: 12,
            boxShadow: '0 12px 28px rgba(0,0,0,0.25)', padding: 20, border: '1px solid #e1e6ec'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #e1e6ec' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#1976d2' }}>Edit Graphic</h3>
              <button 
                onClick={closeGraphicEditor}
                style={{
                  background: "#fff2e0",
                  border: "1px solid #ff9800",
                  color: "#e65100",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Close
              </button>
            </div>
            {gfxEditor.graphicId === '__PENDING__' || !gfxEditor.graphicId ? (
              <div style={{ padding: 16, color: '#777', fontStyle: 'italic', textAlign: 'center' }}>Creating graphic…</div>
            ) : (
              <GraphicsTemplateEditor
                key={gfxEditor.graphicId}
                graphicId={gfxEditor.graphicId}
                onSaved={(row) => { onGraphicSaved(row); }}
                onClose={closeGraphicEditor}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}