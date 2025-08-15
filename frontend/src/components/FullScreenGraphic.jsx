import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '../config';
import GraphicsTemplateEditor from './properties/GraphicsTemplateEditor.jsx';
import { useSelection } from '../selection/SelectionContext.jsx';

// Helper for graceful image preview fallback
function PreviewImage({ url, alt, style, fallback }) {
  const [errored, setErrored] = React.useState(false);
  if (!url || errored) return fallback || null;
  return (
    <img
      src={url}
      alt={alt || ''}
      style={style}
      loading="lazy"
      decoding="async"
      onError={() => setErrored(true)}
    />
  );
}

// Reuse graphics helper from ObsSceneEditor
function buildGraphicsPreviewUrl(graphic, cacheBust = false) {
  if (!graphic) {
    return '';
  }
  const rawTplId = graphic.templateId || graphic.template_id;
  if (!rawTplId) {
    return '';
  }
  const tplId = String(rawTplId).replace(/_/g, '-');
  const dataObj = graphic.templateData || graphic.template_data || {};
  const q = encodeURIComponent(JSON.stringify(dataObj || {}));
  let url = `${API_BASE_URL}/api/templates/${encodeURIComponent(tplId)}/screenshot?data=${q}`;
  if (cacheBust) {
    url += `&ts=${Date.now()}`; // only when we explicitly want to bypass cache
  }
  return url;
}

function getGraphicThumbUrl(graphic, { cacheBustLarge = false } = {}) {
  if (!graphic) return '';
  if (graphic.thumb) return graphic.thumb; // use server-provided thumbnail if available
  // fallback: generate screenshot URL (no cache-bust for lists)
  return buildGraphicsPreviewUrl(graphic, cacheBustLarge);
}

function normalizeGraphicRow(raw) {
  if (!raw) return null;
  return {
    id: raw.id || raw.graphic_id || raw.uuid || null,
    type: raw.type || 'Graphic',
    title: raw.title || raw.name || raw.template || 'Untitled',
    summary: raw.summary || '',
    thumb: raw.thumb || null,
    template_id: raw.template_id || raw.templateId,
    template_data: raw.template_data || raw.templateData,
    templateId: raw.template_id || raw.templateId,
    templateData: raw.template_data || raw.templateData
  };
}

export default function FullScreenGraphic({ item, onSave }) {
  // Use centralized selection state
  const { episodeId } = useSelection();
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

  // Simplified ID resolution - prioritize centralized state
  const getEpisodeIdFromAnywhere = (item) => {
    // Centralized episodeId takes priority
    if (episodeId != null) return Number(episodeId);
    
    // Simple fallback to item data
    const fallbackId = item?.episode_id ?? item?.episodeId ?? item?.data?.episode_id ?? item?.data?.episodeId ?? null;
    return fallbackId ? Number(fallbackId) : null;
  };

  // Graphics modal handlers
  const createNewGraphic = async () => {
    try {
      const episodeId = getEpisodeIdFromAnywhere(item);
      if (episodeId == null || Number.isNaN(Number(episodeId))) {
        throw new Error('No episode_id could be resolved for new graphic');
      }

      // Capture pre-existing IDs so we can diff if server returns no body
      const preIds = new Set((gfxList || []).map(r => String(r.id)));

      // Show a temporary state while creating
      setGfxEditor({ open: true, graphicId: '__PENDING__' });

      const res = await fetch(`${API_BASE_URL}/api/graphics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episode_id: Number(episodeId),
          episodeId: Number(episodeId),
          title: 'Untitled',
          type: 'lower-third',
          template_id: 'lower_third_v1',
          templateId: 'lower_third_v1',
          template_data: {},
          templateData: {}
        })
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Failed to create graphic: ${text || res.status}`);
      }

      let createdRow = null;
      let createdId = null;

      // 1) Try Location header first
      const location = res.headers.get('Location') || res.headers.get('location');
      if (location) {
        const parts = location.split('/').filter(Boolean);
        const last = parts[parts.length - 1];
        if (last && last !== 'graphics') createdId = decodeURIComponent(last);
      }

      // 2) Try to parse JSON body if present
      const ct = res.headers.get('Content-Type') || res.headers.get('content-type') || '';
      const contentLength = Number(res.headers.get('Content-Length') || res.headers.get('content-length') || 0);
      try {
        if (ct.includes('application/json')) {
          // Some servers return 201 with empty body; guard against that
          if (contentLength > 0) {
            const maybe = await res.json();
            if (maybe && typeof maybe === 'object') {
              createdRow = maybe;
              createdId = createdId || maybe.id || maybe.graphic_id || maybe.uuid || null;
            }
          } else {
            // If length is unknown, still try but catch the empty-body error
            try {
              const maybe = await res.clone().json();
              if (maybe && typeof maybe === 'object') {
                createdRow = maybe;
                createdId = createdId || maybe.id || maybe.graphic_id || maybe.uuid || null;
              }
            } catch (_) { /* empty json body */ }
          }
        } else {
          // 3) Fallback: read text and interpret as id or JSON
          const txt = (await res.text()).trim();
          if (txt) {
            try {
              const parsed = JSON.parse(txt);
              if (parsed && typeof parsed === 'object') {
                createdRow = parsed;
                createdId = createdId || parsed.id || parsed.graphic_id || parsed.uuid || null;
              }
            } catch {
              // treat as raw id
              createdId = createdId || txt;
            }
          }
        }
      } catch (e) {
        // Swallow JSON parse errors due to empty body; we'll recover via diff below
        console.warn('[FullScreenGraphic] parse response failed, will attempt fallback', e);
      }

      // 4) If we only have an id, fetch the row
      if (!createdRow && createdId) {
        try {
          const r2 = await fetch(`${API_BASE_URL}/api/graphics/${encodeURIComponent(createdId)}`);
          if (r2.ok && (r2.headers.get('Content-Type') || '').includes('application/json')) {
            createdRow = await r2.json().catch(() => null);
          }
        } catch (_) { /* ignore */ }
      }

      // 5) If we have neither, diff the episode list to find the new row
      if (!createdRow && !createdId) {
        try {
          const r3 = await fetch(`${API_BASE_URL}/api/graphics?episodeId=${encodeURIComponent(Number(episodeId))}`);
          if (r3.ok) {
            const ct3 = r3.headers.get('Content-Type') || '';
            const list = ct3.includes('application/json') ? await r3.json() : [];
            const rows = Array.isArray(list) ? list : (list?.rows || list?.data || []);
            const norm = (rows || []).map(normalizeGraphicRow).filter(r => r.id != null);

            // Update our list state so the new item appears immediately
            if (norm.length) setGfxList(norm);

            // Find the first ID not present before the POST
            const added = norm.find(r => !preIds.has(String(r.id)));
            if (added) {
              createdRow = rows.find(r => (r.id || r.graphic_id || r.uuid) === added.id) || added;
              createdId = added.id;
            }
          }
        } catch (_) { /* ignore */ }
      }

      // Normalize and update local state
      let norm;
      if (createdRow) {
        norm = normalizeGraphicRow(createdRow);
        if (norm.id != null) {
          setGfxList(prev => {
            const exists = prev.some(r => r.id === norm.id);
            return exists ? prev.map(r => (r.id === norm.id ? { ...r, ...norm } : r)) : [norm, ...prev];
          });
        }
      } else if (createdId) {
        // Construct a minimal norm when only id is known
        norm = { id: createdId, type: 'Graphic', title: 'Untitled', summary: '', thumb: null };
        setGfxList(prev => {
          const exists = prev.some(r => r.id === norm.id);
          return exists ? prev : [norm, ...prev];
        });
      }

      if (!norm || !norm.id) {
        throw new Error('Graphic was created but no id was returned by the server, and it could not be found in the list.');
      }

      // Swap the pending editor to the real id (keep the editor OPEN)
      setGfxEditor({ open: true, graphicId: norm.id });
    } catch (err) {
      console.error('[FullScreenGraphic] createNewGraphic error:', err);
      setGfxError(err?.message || String(err));
      // Close editor if creation failed
      setGfxEditor({ open: false, graphicId: null });
    }
  };
  const openGraphicsPicker = async () => {
    setGfxError("");
    setGfxLoading(true);
    setGfxPickerModal({ open: true });
    
    try {
      const episodeId = getEpisodeIdFromAnywhere(item);
      if (!episodeId) {
        throw new Error("No episode ID found");
      }
      
      const res = await fetch(`${API_BASE_URL}/api/graphics?episode_id=${episodeId}`);
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
    const normalized = normalizeGraphicRow(graphic);
    setField('selectedGraphic', normalized);
    closeGraphicsPicker();
  };

  const openGraphicEditor = (graphic) => {
    const gid = graphic?.id || graphic?.graphic_id || null;
    if (!gid) {
      // No id passed — create a new one, then open
      createNewGraphic();
      return;
    }
    setGfxEditor({ open: true, graphicId: gid });
  };

  const closeGraphicEditor = () => {
    setGfxEditor({ open: false, graphicId: null });
  };

  const onGraphicSaved = (savedGraphic) => {
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
                  const url = getGraphicThumbUrl(data.selectedGraphic, { cacheBustLarge: false });
                  return (
                    <PreviewImage 
                      url={url}
                      alt="Graphic preview"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      fallback={
                        <div style={{ color: '#fff', fontSize: 24, fontWeight: 600, textAlign: 'center' }}>
                          {data.selectedGraphic.title}
                        </div>
                      }
                    />
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
                        const url = getGraphicThumbUrl(data.selectedGraphic);
                        return (
                          <PreviewImage
                            url={url}
                            alt="Graphic preview"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            fallback={<span style={{ fontSize: 8, color: '#1976d2', fontWeight: 600 }}>GFX</span>}
                          />
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
              
              {/* New Graphic Button */}
              <div style={{ marginTop: 12 }}>
                <button
                  onClick={createNewGraphic}
                  style={{
                    width: '100%',
                    background: '#4caf50',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    padding: '12px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  + New Graphic
                </button>
              </div>
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
            
            {/* New Graphic Button */}
            <div style={{ padding: '0 16px 16px', borderBottom: '1px solid #e1e6ec' }}>
              <button
                onClick={createNewGraphic}
                style={{
                  background: "#4caf50",
                  border: "none",
                  color: "white",
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}
              >
                + New Graphic
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
                        const url = getGraphicThumbUrl(row);
                        return (
                          <PreviewImage
                            url={url}
                            alt="Graphic preview"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 10, color: '#999' }}>No preview</div>}
                          />
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