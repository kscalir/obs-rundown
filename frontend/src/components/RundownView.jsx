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

// Smooth collapsible wrapper used for segment and cue bodies
function Collapse({ open, children }) {
  const ref = React.useRef(null);
  // null => natural height (no cap). number => animated px height.
  const [cap, setCap] = React.useState(null);

  // Initialize on first mount based on `open`
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) {
      setCap(null); // natural
    } else {
      setCap(0); // fully collapsed
    }
  }, []);

  // Animate on `open` changes
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Ensure any previous transitionend handler is removed
    const onEnd = () => {
      el.removeEventListener("transitionend", onEnd);
      if (open) {
        // allow natural growth once expanded
        setCap(null);
      }
    };

    if (open) {
      // from closed (0) to measured height, then release to natural
      // Start from 0 to ensure transition runs
      setCap(0);
      // next frame, measure and animate to that height
      requestAnimationFrame(() => {
        // Force reflow so scrollHeight is accurate before we set
        void el.offsetHeight; // reflow
        const target = el.scrollHeight || 0;
        // Listen for the height transition end; then set to natural
        el.addEventListener("transitionend", onEnd);
        setCap(target);
      });
    } else {
      // from natural/unknown to measured height, then to 0
      const current = el.scrollHeight || 0;
      setCap(current);
      // next frame, animate down to 0
      requestAnimationFrame(() => {
        void el.offsetHeight; // reflow
        setCap(0);
      });
    }

    return () => el && el.removeEventListener("transitionend", onEnd);
  }, [open]);

  const style = {
    overflow: "hidden",
    // When `cap` is null we remove the max-height cap to allow natural height
    maxHeight: cap == null ? "none" : `${cap}px`,
    transition: "max-height 260ms ease",
    willChange: "max-height",
  };

  return (
    <div ref={ref} style={style} aria-hidden={!open}>
      {children}
    </div>
  );
}


export default function RundownView({ showId, showName: showNameProp, selectedTab, onBackToShows }) {
  const TOPBAR_H = 48;
  // Panel sizes
  const { leftW, rightW, startDrag, setLeftW, setRightW } = usePanelResize(220, 300);

  // Persist panel widths per show
  const SPLIT_KEY = useMemo(() => `rundown_split:${showId ?? "global"}`, [showId]);

  // Load saved widths (once per show change)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SPLIT_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved && typeof saved === "object") {
        if (typeof saved.leftW === "number" && Number.isFinite(saved.leftW)) {
          setLeftW(saved.leftW);
        }
        if (typeof saved.rightW === "number" && Number.isFinite(saved.rightW)) {
          setRightW(saved.rightW);
        }
      }
    } catch (e) {
      console.warn("Failed to load split widths", e);
    }
  }, [SPLIT_KEY, setLeftW, setRightW]);

  // Save whenever widths change
  useEffect(() => {
    try {
      const payload = { leftW, rightW };
      localStorage.setItem(SPLIT_KEY, JSON.stringify(payload));
    } catch (e) {
      // non-fatal
    }
  }, [SPLIT_KEY, leftW, rightW]);

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
  // Persist expanded state independently of server payload to avoid races on refresh
  const segExpandedRef = useRef(new Map());         // Map<segmentId, boolean>
  const cueExpandedRef = useRef(new Map());         // Map<groupId, boolean>

  // ----- Inline rename state -----
  const [editing, setEditing] = useState({ type: null, segId: null, groupId: null, itemId: null, value: "" });
  const beginEditSegment = (seg) => setEditing({ type: "segment", segId: seg.id, groupId: null, itemId: null, value: seg.title || "Untitled Segment" });
  const beginEditCue = (segId, g) => setEditing({ type: "cue", segId, groupId: g.id, itemId: null, value: g.title || "Untitled Cue" });
  const beginEditItem = (segId, groupId, it) => setEditing({ type: "item", segId, groupId, itemId: it.id, value: it.title || it.data?.title || "Untitled Item" });
  const cancelEdit = () => setEditing({ type: null, segId: null, groupId: null, itemId: null, value: "" });
  React.useEffect(() => {
    setSegmentsState(prev => {
      const prevById = new Map(prev.map(s => [s.id, s]));
      const normalizeCueTitle = (g) => {
        const t = (g.title || "").trim();
        if (!t) return "Untitled Cue";
        if (/^Untitled Group$/i.test(t)) return "Untitled Cue";
        if (/^New Group$/i.test(t)) return "New Cue";
        return t;
      };

      return (segments || []).map(s => {
        // prefer remembered expanded flags, otherwise previous local, otherwise server/default
        const rememberedSeg = segExpandedRef.current.get(s.id);
        const prevSeg = prevById.get(s.id);
        const segExpanded = (typeof rememberedSeg === "boolean")
          ? rememberedSeg
          : (prevSeg?.expanded ?? (typeof s.expanded === "boolean" ? s.expanded : true));

        // ensure ref stays up to date
        segExpandedRef.current.set(s.id, segExpanded);

        const groups = (s.groups || []).map(g => {
          const rememberedCue = cueExpandedRef.current.get(g.id);
          const prevCue = prevSeg?.groups?.find(x => x.id === g.id);
          const cueExpanded = (typeof rememberedCue === "boolean")
            ? rememberedCue
            : (prevCue?.expanded ?? (typeof g.expanded === "boolean" ? g.expanded : true));

          cueExpandedRef.current.set(g.id, cueExpanded);

          return {
            ...g,
            title: normalizeCueTitle(g),
            expanded: cueExpanded,
            items: Array.isArray(g.items) ? g.items : []
          };
        });

        return {
          ...s,
          title: s.title || s.name || "Untitled Segment",
          expanded: segExpanded,
          groups
        };
      });
    });
  }, [segments]);
  // --- Optimistic expand/collapse helpers ---
  function onToggleSegment(segId) {
    setSegmentsState(prev => prev.map(s => {
      if (s.id !== segId) return s;
      const next = !s.expanded;
      segExpandedRef.current.set(segId, next);
      return { ...s, expanded: next };
    }));
    toggleSegment(segId);
  }

  function onToggleCue(segId, groupId) {
    setSegmentsState(prev => prev.map(s => {
      if (s.id !== segId) return s;
      return {
        ...s,
        groups: (s.groups || []).map(g => {
          if (g.id !== groupId) return g;
          const next = !g.expanded;
          cueExpandedRef.current.set(groupId, next);
          return { ...g, expanded: next };
        })
      };
    }));
    toggleGroup(segId, groupId);
  }
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

  // ---- Duplication helpers ----

  // ----- Delete helpers -----
  async function deleteSegment(segId) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/segments/${segId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Delete segment failed: ${res.status} ${await res.text()}`);
      setSegmentsState(prev => prev.filter(s => s.id !== segId));
      toast.success("Segment deleted");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to delete segment");
    }
  }
  async function deleteCue(groupId) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/groups/${groupId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Delete cue failed: ${res.status} ${await res.text()}`);
      setSegmentsState(prev => prev.map(s => ({ ...s, groups: (s.groups || []).filter(g => g.id !== groupId) })));
      toast.success("Cue deleted");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to delete cue");
    }
  }
  async function deleteItem(itemId) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/items/${itemId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Delete item failed: ${res.status} ${await res.text()}`);
      setSegmentsState(prev =>
        prev.map(s => ({
          ...s,
          groups: (s.groups || []).map(g => ({ ...g, items: (g.items || []).filter(it => it.id !== itemId) }))
        }))
      );
      toast.success("Item deleted");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to delete item");
    }
  }

  // ----- Rename helpers -----
  async function saveEdit() {
    if (!editing.type) return;
    const title = (editing.value || "").trim();
    if (!title) { cancelEdit(); return; }

    try {
      if (editing.type === "segment") {
        const res = await fetch(`${API_BASE_URL}/api/segments/${editing.segId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title })
        });
        if (!res.ok) throw new Error(`Rename segment failed: ${res.status} ${await res.text()}`);
        setSegmentsState(prev => prev.map(s => (s.id === editing.segId ? { ...s, title } : s)));
        toast.success("Segment renamed");
      } else if (editing.type === "cue") {
        const res = await fetch(`${API_BASE_URL}/api/groups/${editing.groupId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title })
        });
        if (!res.ok) throw new Error(`Rename cue failed: ${res.status} ${await res.text()}`);
        setSegmentsState(prev => prev.map(s => s.id === editing.segId ? { ...s, groups: (s.groups || []).map(g => g.id === editing.groupId ? { ...g, title } : g) } : s));
        toast.success("Cue renamed");
      } else if (editing.type === "item") {
        const res = await fetch(`${API_BASE_URL}/api/items/${editing.itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title })
        });
        if (!res.ok) throw new Error(`Rename item failed: ${res.status} ${await res.text()}`);
        setSegmentsState(prev => prev.map(s => ({
          ...s,
          groups: (s.groups || []).map(g => ({
            ...g,
            items: (g.items || []).map(it => it.id === editing.itemId ? { ...it, title } : it)
          }))
        })));
        toast.success("Item renamed");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Rename failed");
    } finally {
      cancelEdit();
    }
  }
  const onEditKeyDown = (e) => {
    if (e.key === "Enter") saveEdit();
    if (e.key === "Escape") cancelEdit();
  };

  // Create a new segment inserted after `afterIndex` and return the server payload
  async function apiCreateSegmentAfter({ episodeId, name, afterIndex }) {
    const position = (afterIndex ?? -1) + 1;
    const res = await fetch(`${API_BASE_URL}/api/episodes/${episodeId}/segments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, position })
    });
    if (!res.ok) throw new Error(`Segment create failed: ${res.status} ${await res.text()}`);
    return res.json();
  }

  // Create a new cue in a segment at a given position
  async function apiCreateCue({ segmentId, title, position }) {
    const res = await fetch(`${API_BASE_URL}/api/segments/${segmentId}/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, position })
    });
    if (!res.ok) throw new Error(`Cue create failed: ${res.status} ${await res.text()}`);
    return res.json();
  }

  // Create an item inside a cue at a given position
  async function apiCreateItem({ groupId, title, type, data, position }) {
    const res = await fetch(`${API_BASE_URL}/api/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group_id: groupId, title, type, data, position })
    });
    if (!res.ok) throw new Error(`Item create failed: ${res.status} ${await res.text()}`);
    return res.json();
  }

  // Duplicate an entire segment (deep clone cues+items) and insert right after it
  async function duplicateSegment(segId) {
    try {
      if (!selectedEpisode) return;

      const srcIndex = segmentsState.findIndex(s => s.id === segId);
      if (srcIndex < 0) return;
      const src = segmentsState[srcIndex];

      // 1) Create the new segment after the source
      const segName = (src.title || src.name || "Segment") + " COPY";
      const newSegPayload = await apiCreateSegmentAfter({
        episodeId: selectedEpisode.id,
        name: segName,
        afterIndex: srcIndex
      });

      // Shape for UI
      const newSeg = {
        ...newSegPayload,
        title: newSegPayload.title || newSegPayload.name || segName,
        expanded: true,
        groups: []
      };

      // Optimistically insert empty segment first
      setSegmentsState(prev => {
        const clone = [...prev];
        clone.splice(srcIndex + 1, 0, newSeg);
        return clone;
      });

      // 2) Recreate cues (groups) and items
      for (let gi = 0; gi < (src.groups || []).length; gi++) {
        const g = src.groups[gi];
        const newGroupPayload = await apiCreateCue({
          segmentId: newSegPayload.id,
          title: g.title || "Untitled Cue",
          position: gi
        });
        const newGroup = { ...newGroupPayload, expanded: true, items: [] };

        // insert cue into UI
        setSegmentsState(prev => prev.map(s =>
          s.id === newSegPayload.id
            ? { ...s, groups: [ ...(s.groups || []), newGroup ] }
            : s
        ));

        for (let ii = 0; ii < (g.items || []).length; ii++) {
          const it = g.items[ii];
          const newItemPayload = await apiCreateItem({
            groupId: newGroupPayload.id,
            title: it.title || it.data?.title || "Untitled Item",
            type: it.type,
            data: it.data || {},
            position: ii
          });
          // append item in UI
          setSegmentsState(prev => prev.map(s =>
            s.id === newSegPayload.id
              ? {
                  ...s,
                  groups: s.groups.map(gr =>
                    gr.id === newGroupPayload.id
                      ? { ...gr, items: [ ...(gr.items || []), newItemPayload ] }
                      : gr
                  )
                }
              : s
          ));
        }
      }

      toast.success("Segment duplicated");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to duplicate segment");
    }
  }

  // Duplicate a single cue (group) within its segment; insert right after it
  async function duplicateCue(segId, groupId) {
    try {
      const seg = segmentsState.find(s => s.id === segId);
      if (!seg) return;
      const gi = (seg.groups || []).findIndex(g => g.id === groupId);
      if (gi < 0) return;
      const g = seg.groups[gi];

      // 1) Create new cue after source
      const title = (g.title || "Cue") + " COPY";
      const newGroupPayload = await apiCreateCue({
        segmentId: segId,
        title,
        position: gi + 1
      });
      const newGroup = { ...newGroupPayload, expanded: true, items: [] };

      // Optimistically add cue after the original
      setSegmentsState(prev => prev.map(s => {
        if (s.id !== segId) return s;
        const clone = [ ...(s.groups || []) ];
        clone.splice(gi + 1, 0, newGroup);
        return { ...s, groups: clone };
      }));

      // 2) Recreate items
      for (let ii = 0; ii < (g.items || []).length; ii++) {
        const it = g.items[ii];
        const newItemPayload = await apiCreateItem({
          groupId: newGroupPayload.id,
          title: it.title || it.data?.title || "Untitled Item",
          type: it.type,
          data: it.data || {},
          position: ii
        });
        setSegmentsState(prev => prev.map(s =>
          s.id === segId
            ? {
                ...s,
                groups: s.groups.map(gr =>
                  gr.id === newGroupPayload.id
                    ? { ...gr, items: [ ...(gr.items || []), newItemPayload ] }
                    : gr
                )
              }
            : s
        ));
      }

      toast.success("Cue duplicated");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to duplicate cue");
    }
  }


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

  // keep URL in sync when selection changes (History API, no reload/bounce)
  useEffect(() => {
    if (!selectedEpisode) return;
    try {
      const url = new URL(window.location.href);
      if (selectedItem == null) {
        url.searchParams.delete("item");
      } else {
        url.searchParams.set("item", String(selectedItem));
      }
      // Use replaceState to avoid adding history entries and avoid reloads
      window.history.replaceState({}, "", url);
    } catch (e) {
      // If something goes wrong, fail silently rather than navigating
      console.warn("URL sync (item) failed:", e);
    }
  }, [selectedEpisode, selectedItem]);

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
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#fafdff", borderRight: "1px solid #e1e6ec", paddingTop: 0 }}>
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
                              onClick={() => onToggleSegment(seg.id)}
                              style={{ background: "none", border: "none", color: seg.expanded ? "#1976d2" : "#b1c7e7" }}
                              aria-label={seg.expanded ? "Collapse segment" : "Expand segment"}
                              aria-expanded={seg.expanded}
                            >
                              <span
                                style={{
                                  display: "inline-block",
                                  transition: "transform 180ms ease",
                                  transform: seg.expanded ? "rotate(90deg)" : "rotate(0deg)",
                                }}
                              >
                                ▶
                              </span>
                            </button>
                            {editing.type === "segment" && editing.segId === seg.id ? (
                              <input
                                autoFocus
                                value={editing.value}
                                onChange={e => setEditing(ed => ({ ...ed, value: e.target.value }))}
                                onBlur={saveEdit}
                                onKeyDown={onEditKeyDown}
                                style={{ flex: 1, padding: "4px 6px", border: "1px solid #b1c7e7", borderRadius: 6, fontWeight: 700 }}
                              />
                            ) : (
                              <strong
                                style={{ flex: 1, cursor: "default" }}
                                onDoubleClick={() => beginEditSegment(seg)}
                                title="Rename segment (double-click)"
                              >
                                {seg.title || "Untitled Segment"}
                              </strong>
                            )}
                            <IconButton
                              title="Duplicate segment"
                              aria-label="Duplicate segment"
                              onClick={() => duplicateSegment(seg.id)}
                            >⧉</IconButton>
                            <IconButton
                              title="Delete segment"
                              aria-label="Delete segment"
                              onClick={() => deleteSegment(seg.id)}
                            >🗑</IconButton>
                          </div>
                          <Collapse open={seg.expanded}>
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
                                              onClick={() => onToggleCue(seg.id, g.id)}
                                              style={{ background: "none", border: "none", color: g.expanded ? "#1976d2" : "#b1c7e7" }}
                                              aria-label={g.expanded ? "Collapse cue" : "Expand cue"}
                                              aria-expanded={g.expanded}
                                            >
                                              <span
                                                style={{
                                                  display: "inline-block",
                                                  transition: "transform 180ms ease",
                                                  transform: g.expanded ? "rotate(90deg)" : "rotate(0deg)",
                                                }}
                                              >
                                                ▶
                                              </span>
                                            </button>
                                            {editing.type === "cue" && editing.groupId === g.id ? (
                                              <input
                                                autoFocus
                                                value={editing.value}
                                                onChange={e => setEditing(ed => ({ ...ed, value: e.target.value }))}
                                                onBlur={saveEdit}
                                                onKeyDown={onEditKeyDown}
                                                style={{ padding: "3px 6px", border: "1px solid #b1c7e7", borderRadius: 6, fontWeight: 600 }}
                                              />
                                            ) : (
                                              <strong
                                                style={{ cursor: "default" }}
                                                onDoubleClick={() => beginEditCue(seg.id, g)}
                                                title="Rename cue (double-click)"
                                              >
                                                {g.title}
                                              </strong>
                                            )}
                                            <IconButton
                                              title="Duplicate cue"
                                              aria-label="Duplicate cue"
                                              onClick={() => duplicateCue(seg.id, g.id)}
                                            >⧉</IconButton>
                                            <IconButton
                                              title="Delete cue"
                                              aria-label="Delete cue"
                                              onClick={() => deleteCue(g.id)}
                                            >🗑</IconButton>

                                            {/* Cue items collapse */}
                                            <Collapse open={g.expanded}>
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
                                                              onClick={() => setSelectedItem(it.id)}
                                                              onMouseEnter={e => {
                                                                if (selectedItem !== it.id) {
                                                                  e.currentTarget.style.background = "#f7fbff";
                                                                  e.currentTarget.style.borderColor = "#a9c5e6";
                                                                }
                                                              }}
                                                              onMouseLeave={e => {
                                                                if (selectedItem !== it.id) {
                                                                  e.currentTarget.style.background = "#fff";
                                                                  e.currentTarget.style.borderColor = "#b1c7e7";
                                                                }
                                                              }}
                                                              style={{
                                                                background: selectedItem === it.id ? "#e9f3ff" : "#fff",
                                                                border: selectedItem === it.id ? "2px solid #1976d2" : "1px solid #b1c7e7",
                                                                borderRadius: 6,
                                                                padding: "8px 12px",
                                                                margin: "6px 0",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                transition: "background 120ms ease, border-color 120ms ease, box-shadow 120ms ease",
                                                                boxShadow: selectedItem === it.id ? "0 2px 8px rgba(25,118,210,0.15)" : "none",
                                                                cursor: "default",
                                                                ...itProvided.draggableProps.style
                                                              }}
                                                              role="button"
                                                              aria-label="Drag item"
                                                              aria-selected={selectedItem === it.id}
                                                              tabIndex={0}
                                                            >
                                                              <span style={{ marginRight: 8 }}>🎛</span>
                                                              {editing.type === "item" && editing.itemId === it.id ? (
                                                                <input
                                                                  autoFocus
                                                                  value={editing.value}
                                                                  onChange={e => setEditing(ed => ({ ...ed, value: e.target.value }))}
                                                                  onBlur={saveEdit}
                                                                  onKeyDown={onEditKeyDown}
                                                                  style={{ padding: "2px 6px", border: "1px solid #b1c7e7", borderRadius: 6, flex: 1 }}
                                                                  onClick={e => e.stopPropagation()}
                                                                />
                                                              ) : (
                                                                <span
                                                                  style={{ flex: 1, cursor: "default" }}
                                                                  onDoubleClick={e => { e.stopPropagation(); beginEditItem(seg.id, g.id, it); }}
                                                                  title="Rename item (double-click)"
                                                                >
                                                                  {it.title || it.data?.title || "Untitled Item"}
                                                                </span>
                                                              )}
                                                              <IconButton
                                                                title="Delete item"
                                                                aria-label="Delete item"
                                                                onClick={e => { e.stopPropagation(); deleteItem(it.id); }}
                                                                style={{ marginLeft: 8 }}
                                                              >🗑</IconButton>
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
                                            </Collapse>
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
                          </Collapse>
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
      <ToastContainer position="bottom-right" newestOnTop closeOnClick pauseOnHover draggable={false} />
    </DragDropContext>
  );
}
