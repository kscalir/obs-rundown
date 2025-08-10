// =============================================
// /src/views/RundownView.jsx (DROP‑IN REPLACEMENT)
// All side‑effects + data ops moved to hooks; component is declarative.
// =============================================
import React, { useMemo, useState, useRef, useEffect } from "react";
import { toast } from "react-toastify";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { API_BASE_URL } from "../config";
import { createApi } from "../api/client";
import { usePanelResize } from "../hooks/usePanelResize";
import { useEpisodes } from "../hooks/useEpisodes";
import { useSegments } from "../hooks/useSegments";
import { useRundownDnD } from "../dnd/useRundownDnD";
import { AddButton, IconButton } from "../components/Buttons.jsx";
import PropertiesPanel from "./PropertiesPanel";
import ModulesPanel from "./ModulesPanel";
import { useQueryParam } from "../hooks/useQueryParam";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


export default function RundownView({ showId, showName: showNameProp, selectedTab, onBackToShows }) {
  const TOPBAR_H = 48;
  // Panel sizes
  const { leftW, rightW, startDrag, setLeftW, setRightW } = usePanelResize(220, 300);

  // API
  const api = useMemo(() => createApi(API_BASE_URL), []);

  // Episodes
  const { episodes, selectedEpisode, setSelectedEpisode, loading: epLoading } = useEpisodes(api, showId);

  const [urlEpisodeId, setUrlEpisodeId] = useQueryParam("episode", {
    parse: v => Number(v),
    serialize: v => (v == null ? null : String(v))
  });
  const [urlItemId, setUrlItemId] = useQueryParam("item", {
    parse: v => Number(v),
    serialize: v => (v == null ? null : String(v))
  });

  // Sync selected episode with ?episode=
  useEffect(() => {
    if (!episodes.length) return;
    // prefer URL if it matches an episode
    const fromUrl = episodes.find(e => e.id === urlEpisodeId);
    if (fromUrl && (!selectedEpisode || selectedEpisode.id !== fromUrl.id)) {
      setSelectedEpisode(fromUrl);
      return;
    }
    // keep URL in sync with chosen episode
    if (selectedEpisode && selectedEpisode.id !== urlEpisodeId) {
      setUrlEpisodeId(selectedEpisode.id);
    }
  }, [episodes, selectedEpisode, urlEpisodeId, setSelectedEpisode, setUrlEpisodeId]);


  // Segments+groups+items
  const { segments, loading: segLoading, toggleSegment, toggleGroup, dispatch } = useSegments(api, selectedEpisode?.id);
  const loading = epLoading || segLoading;

  // DnD
  const [segmentsState, setSegmentsState] = useState([]);
  React.useEffect(() => {
    const normalized = (segments || []).map(s => ({
      ...s,
      groups: (s.groups || []).map(g => {
        const t = (g.title || "").trim();
        let title = t;
        if (!t) title = "Untitled Cue";
        else if (/^Untitled Group$/i.test(t)) title = "Untitled Cue";
        else if (/^New Group$/i.test(t)) title = "New Cue";
        return { ...g, title };
      })
    }));
    setSegmentsState(normalized);
  }, [segments]);
  const { handleDragEnd, handleDragStart } = useRundownDnD({ api, segments: segmentsState, setSegments: setSegmentsState, selectedEpisode });

  // Create a new cue (frontend uses "cue", backend endpoint is still /groups)
  const createCue = async (segmentId) => {
    try {
      if (!segmentId) return;
      // Determine next position based on current groups in the segment
      const seg = (segmentsState || []).find(s => s.id === segmentId) || (segments || []).find(s => s.id === segmentId);
      const position = seg && Array.isArray(seg.groups) ? seg.groups.length : 0;

      const res = await fetch(`${API_BASE_URL}/api/segments/${segmentId}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Cue", position })
      });

      if (!res.ok) {
        const txt = await res.text();
        toast.error(`Failed to create cue: ${res.status} ${txt}`);
        throw new Error(`Failed to create cue: ${res.status} ${txt}`);
      }

      const data = await res.json();
      const newGroup = {
        ...data,
        title: data.title || "New Cue",
        expanded: true,
        items: Array.isArray(data.items) ? data.items : []
      };

      // Optimistically update local UI
      setSegmentsState(prev =>
        (prev || []).map(s =>
          s.id === segmentId
            ? { ...s, groups: [ ...(s.groups || []), newGroup ] }
            : s
        )
      );
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Error creating cue");
    }
  };

  // Create a new segment (backend expects "name" on create)
  const createSegment = async () => {
    try {
      if (!selectedEpisode) return;
      const position = (segmentsState || []).length;
      const res = await fetch(`${API_BASE_URL}/api/episodes/${selectedEpisode.id}/segments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Segment", position })
      });
      if (!res.ok) {
        const txt = await res.text();
        toast.error(`Failed to create segment: ${res.status} ${txt}`);
        throw new Error(`Failed to create segment: ${res.status} ${txt}`);
      }
      const data = await res.json();
      const newSeg = {
        ...data,
        title: data.title || data.name || "Untitled Segment",
        expanded: true,
        groups: Array.isArray(data.groups) ? data.groups : []
      };
      // Optimistically append to UI
      setSegmentsState(prev => [ ...(prev || []), newSeg ]);
      // Scroll to bottom so the newly created segment is visible
      requestAnimationFrame(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
      });
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Error creating segment");
    }
  };


  // Selected item
  const [selectedItem, setSelectedItem] = useState(null);

  // per-episode key
  const ITEM_KEY = useMemo(
    () => `rundown_selectedItem:${selectedEpisode?.id ?? "none"}`,
    [selectedEpisode?.id]
  );

  // load on episode/segments change

  useEffect(() => {
  if (!selectedEpisode) { setSelectedItem(null); return; }
  const raw = localStorage.getItem(ITEM_KEY);
  if (!raw) return;
  const savedId = Number(raw);
  if (Number.isNaN(savedId)) return;

  // check existence against segments (not segmentsState)
  const exists = (segments || []).some(seg =>
    (seg.groups || []).some(g =>
      (g.items || []).some(it => it.id === savedId)
    )
  );
  setSelectedItem(exists ? savedId : null);
}, [ITEM_KEY, selectedEpisode, segments]);

  // save on change
  useEffect(() => {
    if (!selectedEpisode) return;
    if (selectedItem == null) {
      localStorage.removeItem(ITEM_KEY);
    } else {
      localStorage.setItem(ITEM_KEY, String(selectedItem));
    }
  }, [ITEM_KEY, selectedEpisode, selectedItem]);

  // restore item from URL (only if it exists in current data)
  useEffect(() => {
    if (!selectedEpisode || urlItemId == null) return;
    const exists = (segments || []).some(seg =>
      (seg.groups || []).some(g => (g.items || []).some(it => it.id === urlItemId))
    );
    if (exists) setSelectedItem(urlItemId);
  }, [selectedEpisode, urlItemId, segments]);

  // keep URL in sync when selection changes
  useEffect(() => {
    if (!selectedEpisode) return;
    setUrlItemId(selectedItem ?? null);
  }, [selectedEpisode, selectedItem, setUrlItemId]);

  // when clicking an item, remember to call setSelectedItem(it.id)

  const listRef = useRef(null);

  const SCROLL_KEY = useMemo(
    () => `rundown_scrollTop:${selectedEpisode?.id ?? "none"}`,
    [selectedEpisode?.id]
  );

  // restore on episode/segments load
  useEffect(() => {
    const y = Number(localStorage.getItem(SCROLL_KEY) || 0);
    // defer until layout/children exist
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = y;
    });
  }, [SCROLL_KEY, segmentsState.length]);

  // save as user scrolls
  const handleScroll = (e) => {
    localStorage.setItem(SCROLL_KEY, String(e.currentTarget.scrollTop));
  };
  
  
  
  // Simple helpers
  const showName = showNameProp ?? "";
  const getSelectedItem = () => {
    for (const seg of segmentsState) for (const g of seg.groups || []) for (const it of g.items || []) if (it.id === selectedItem) return it;
    return null;
  };

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={{ display: "flex", height: "100%", width: "100%", overflow: "hidden" }}>
        {/* Top bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 48, background: "#fafdff", borderBottom: "1px solid #e1e6ec", display: "flex", alignItems: "center", gap: 12, padding: "0 12px", zIndex: 5 }}>
          <button onClick={() => (onBackToShows ? onBackToShows() : (window.location = "/"))} style={{ background: "#e3f2fd", border: "1px solid #b1c7e7", color: "#1976d2", borderRadius: 8, padding: "4px 12px" }}>← Back to Shows</button>
          <strong style={{ color: "#1976d2" }}>{showName}</strong>
          <div style={{ marginLeft: "auto", color: "#777", fontSize: 12 }}>{loading ? "Loading…" : ""}</div>
        </div>

        {/* Left: Toolbox */}
        <div style={{ width: leftW, background: "#e3f2fd", borderRight: "1px solid #e1e6ec", padding: 16, paddingTop: TOPBAR_H + 16, position: "relative" }}>
          <div style={{ fontWeight: 600, color: "#1976d2", marginBottom: 10 }}>Module Toolbox</div>
          <ModulesPanel onModuleSelected={() => { /* reserved for future */ }} />
          <div onMouseDown={e => startDrag("left", e)} onDoubleClick={() => setLeftW(220)} title="Resize" style={{ position: "absolute", top: 0, right: -6, width: 12, height: "100%", cursor: "ew-resize" }} />
        </div>

        {/* Center: Rundown */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#fafdff", borderRight: "1px solid #e1e6ec", paddingTop: 0}}>
          {/* Episode bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 15, borderBottom: "1px solid #ddd", background: "#f5f5f5" }}>
            <label style={{ fontWeight: 600 }}>Episode:</label>
            <select
  value={selectedEpisode?.id || ""}
  onChange={e => {
    const ep = episodes.find(x => String(x.id) === e.target.value);
    if (ep) { setSelectedEpisode(ep); setUrlEpisodeId(ep.id); }
  }}
  style={{ padding: "6px 10px", minWidth: 200 }}
  disabled={loading}
>
  <option value="">Select…</option>
  {episodes.map(ep => (
    <option key={ep.id} value={String(ep.id)}>{ep.name}</option>
  ))}
</select>
          </div>

          {/* Segments list */}
          <div ref={listRef} onScroll={handleScroll} style={{ flex: 1, overflow: "auto", padding: 10, paddingBottom: 200 }}>
            <Droppable droppableId="segments" type="segment">
              {provided => (
                <div ref={provided.innerRef} {...provided.droppableProps}>
                  {segmentsState.map((seg, i) => (
                    <Draggable key={seg.id} draggableId={`segment-${seg.id}`} index={i}>
                      {dragProvided => (
                        <div
  ref={dragProvided.innerRef}
  {...dragProvided.draggableProps}
  style={{
    background: "#e3f2fd",
    borderRadius: 10,
    marginBottom: 12,
    padding: 12,
    ...dragProvided.draggableProps.style
  }}
>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div
                              {...dragProvided.dragHandleProps}
                              style={{ cursor: "grab", padding: 2 }}
                              role="button"
                              aria-label="Drag segment"
                            >≡</div>
                            <button
                              onClick={() => toggleSegment(seg.id)}
                              style={{ background: "none", border: "none", color: seg.expanded ? "#1976d2" : "#b1c7e7" }}
                              aria-label={seg.expanded ? "Collapse segment" : "Expand segment"}
                            >▶</button>
                            <strong style={{ flex: 1 }}>{seg.title || "Untitled Segment"}</strong>
                            <IconButton title="Delete">🗑</IconButton>
                          </div>
                          {seg.expanded && (
                            <div style={{ paddingLeft: 20, paddingTop: 8 }}>
                              <Droppable droppableId={`groups-${seg.id}`} type="group">
                                {grpProvided => (
                                  <div ref={grpProvided.innerRef} {...grpProvided.droppableProps}>
                                    {(seg.groups || []).map((g, gi) => (
                                      <Draggable key={g.id} draggableId={`group-${g.id}`} index={gi}>
                                        {gProvided => (
                                          <div
  ref={gProvided.innerRef}
  {...gProvided.draggableProps}
  style={{
    background: "#fff",
    borderRadius: 8,
    margin: "8px 0",
    padding: 10,
    ...gProvided.draggableProps.style
  }}
>
                                            <div
                                              {...gProvided.dragHandleProps}
                                              style={{ cursor: "grab", padding: 2, display: "inline-block" }}
                                              role="button"
                                              aria-label="Drag cue"
                                            >≡</div>
                                            <button
                                              onClick={() => toggleGroup(seg.id, g.id)}
                                              style={{ background: "none", border: "none", color: g.expanded ? "#1976d2" : "#b1c7e7" }}
                                              aria-label={g.expanded ? "Collapse cue" : "Expand cue"}
                                            >▶</button>
                                            <strong>{g.title}</strong>
                                            {g.expanded && (
  <div style={{ paddingLeft: 16, paddingTop: 8 }}>
    <Droppable droppableId={`items-${seg.id}-${g.id}`} type="item">
      {itemsProvided => (
        <ul ref={itemsProvided.innerRef} {...itemsProvided.droppableProps} style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {(g.items || []).map((it, ii) => (
            <Draggable key={it.id} draggableId={`item-${it.id}`} index={ii}>
              {itProvided => (
                <li
                  ref={itProvided.innerRef}
                  {...itProvided.draggableProps}
                  {...itProvided.dragHandleProps}
                  style={{
                    background: "#fff",
                    border: "1px solid #b1c7e7",
                    borderRadius: 6,
                    padding: "8px 12px",
                    margin: "6px 0",
                    ...itProvided.draggableProps.style
                  }}
                  role="button"
                  aria-label="Drag item"
                >
                  <span style={{ marginRight: 8 }}>🎛</span>
                  {it.title || it.data?.title || "Untitled Item"}
                </li>
              )}
            </Draggable>
          ))}
          {itemsProvided.placeholder}
          {(!g.items || g.items.length === 0) && (
            <li style={{ color: "#999", fontStyle: "italic", padding: "6px 0" }}>
              Drag items here from the toolbox
            </li>
          )}
        </ul>
      )}
    </Droppable>
  </div>
)}
                                          </div>
                                        )}
                                      </Draggable>
                                    ))}
                                    {grpProvided.placeholder}
                                    {/* Soft add-cue control at the end of this segment's cues */}
                                    <div style={{ marginTop: 8, marginBottom: 8 }}>
                                      <button
                                        onClick={() => createCue(seg.id)}
                                        disabled={!selectedEpisode}
                                        style={{
                                          width: "100%",
                                          padding: "8px 10px",
                                          border: "1px dashed #b1c7e7",
                                          background: "#fff",
                                          borderRadius: 8,
                                          color: "#1976d2",
                                          fontWeight: 600,
                                          cursor: selectedEpisode ? "pointer" : "not-allowed",
                                          transition: "background 0.15s, border-color 0.15s"
                                        }}
                                        onMouseEnter={e => {
                                          e.currentTarget.style.background = "#f5faff";
                                          e.currentTarget.style.borderColor = "#1976d2";
                                        }}
                                        onMouseLeave={e => {
                                          e.currentTarget.style.background = "#fff";
                                          e.currentTarget.style.borderColor = "#b1c7e7";
                                        }}
                                        title={selectedEpisode ? "Add a new cue at the end" : "Select an episode first"}
                                        aria-label="Add new cue"
                                      >
                                        + Add Cue
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </Droppable>
                            </div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
            {/* Soft add-segment control at the end of the list */}
            <div style={{ marginTop: 12 }}>
              <button
                onClick={createSegment}
                disabled={!selectedEpisode}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px dashed #b1c7e7",
                  background: "#fafdff",
                  borderRadius: 8,
                  color: "#1976d2",
                  fontWeight: 600,
                  cursor: selectedEpisode ? "pointer" : "not-allowed",
                  transition: "background 0.15s, border-color 0.15s"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "#eef6ff";
                  e.currentTarget.style.borderColor = "#1976d2";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "#fafdff";
                  e.currentTarget.style.borderColor = "#b1c7e7";
                }}
                title={selectedEpisode ? "Add a new segment at the end" : "Select an episode first"}
                aria-label="Add new segment"
              >
                + Add Segment
              </button>
            </div>
          </div>
        </div>

        {/* Right: Properties */}
        <div style={{ width: rightW, background: "#f9f9f9", position: "relative", paddingTop: TOPBAR_H }}>
          <div onMouseDown={e => startDrag("right", e)} onDoubleClick={() => setRightW(300)} title="Resize" style={{ position: "absolute", top: 0, left: -6, width: 12, height: "100%", cursor: "ew-resize" }} />
          <div style={{ paddingTop: 0, height: "100%", display: "flex", flexDirection: "column" }}>
            <PropertiesPanel
              showId={showId}
              selectedEpisode={selectedEpisode}
              segments={segmentsState}
              loading={loading}
              itemId={selectedItem}
              itemData={getSelectedItem()}
              onClose={() => setSelectedItem(null)}
              selectedTab={selectedTab}
              setSelectedTab={() => {}}
            />
          </div>
        </div>
      </div>
    </DragDropContext>
  );
  <ToastContainer
  position="bottom-right"
  newestOnTop
  closeOnClick
  pauseOnHover
  draggable={false}
/>
}
