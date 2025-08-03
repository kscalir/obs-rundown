import React, { useState, useEffect, useRef } from "react";
import { Droppable, Draggable, DragDropContext } from "@hello-pangea/dnd";
import ModulesPanel from "./ModulesPanel";
import PropertiesPanel from "./PropertiesPanel";

const LOCAL_STORAGE_KEY = "obsRundownState";
const SELECTED_EPISODE_KEY = "obsSelectedEpisode";
const SELECTED_TABS_KEY = "obsSelectedTabs";

// --- Helper: Combine multiple refs ---
function useCombinedRefs(...refs) {
  return (node) => {
    refs.forEach(ref => {
      if (typeof ref === "function") ref(node);
      else if (ref != null) ref.current = node;
    });
  };
}

// --- Helper: LocalStorage JSON get/set ---
function getLocalStorageJSON(key, fallback = {}) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}
function setLocalStorageJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export default function RundownTab({ showId, selectedTab }) {
  // --- State ---
  const [episodes, setEpisodes] = useState([]);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mediaError, setMediaError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [newEpisodeName, setNewEpisodeName] = useState("");
  const [showAddEpisodeModal, setShowAddEpisodeModal] = useState(false);
  const [draggedModule, setDraggedModule] = useState(null);
  const [editingType, setEditingType] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [internalSelectedTab, setInternalSelectedTab] = useState("rundown");

  // --- Refs ---
  const inputRef = useRef(null);
  const restoredEpisodeForShowRef = useRef({}); // Tracks if we've restored for this show

  // --- Effect: Log current episode from localStorage for debugging ---
  useEffect(() => {
    const savedEpisodes = getLocalStorageJSON(SELECTED_EPISODE_KEY);
    console.log("Episode for this show is", showId, ":", savedEpisodes[String(showId)]);
  }, [showId]);

  // --- Effect: Save selected episode to localStorage (debounced) ---
  useEffect(() => {
    if (!showId) return;
    const timer = setTimeout(() => {
      const savedEpisodes = getLocalStorageJSON(SELECTED_EPISODE_KEY);
      savedEpisodes[String(showId)] = selectedEpisode ? selectedEpisode.id : null;
      setLocalStorageJSON(SELECTED_EPISODE_KEY, savedEpisodes);
    }, 500);
    return () => clearTimeout(timer);
  }, [showId, selectedEpisode]);

  // --- Effect: Save selected tab to localStorage ---
  useEffect(() => {
    if (!showId) return;
    const savedTabs = getLocalStorageJSON(SELECTED_TABS_KEY);
    savedTabs[showId] = selectedTab;
    setLocalStorageJSON(SELECTED_TABS_KEY, savedTabs);
  }, [showId, selectedTab]);

  // --- Effect: Reset state on showId change ---
  useEffect(() => {
    if (!showId) {
      setSelectedEpisode(null);
      setInternalSelectedTab("rundown");
      restoredEpisodeForShowRef.current = {};
      setEpisodes([]);
      return;
    }
    // Restore tab selection from localStorage
    const savedTabs = getLocalStorageJSON(SELECTED_TABS_KEY);
    setInternalSelectedTab(savedTabs[showId] || "rundown");
    restoredEpisodeForShowRef.current = {};
  }, [showId]);

  // --- Effect: Fetch episodes for show ---
  useEffect(() => {
    if (!showId) {
      setEpisodes([]);
      setSelectedEpisode(null);
      return;
    }
    setLoading(true);
    fetch(`/api/shows/${showId}/episodes`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch episodes");
        return res.json();
      })
      .then(data => setEpisodes(data || []))
      .catch(() => {
        setEpisodes([]);
        setSelectedEpisode(null);
      })
      .finally(() => setLoading(false));
  }, [showId]);

 // --- Effect: Restore selected episode when tab/episodes change ---
useEffect(() => {
  if (!showId || episodes.length === 0) return;
  
  const savedEpisodes = getLocalStorageJSON(SELECTED_EPISODE_KEY);
  const savedEpisodeId = savedEpisodes[String(showId)] ? String(savedEpisodes[String(showId)]) : null;

  console.log("Restoration attempt:", {
    showId,
    currentTab: selectedTab,
    episodes: episodes.length,
    selectedEpisodeId: selectedEpisode?.id,
    savedEpisodeId,
    hasRestored: restoredEpisodeForShowRef.current[showId]
  });

  // If we have a saved episode and no currently selected episode, restore it
  if (savedEpisodeId && !selectedEpisode) {
    const epToSet = episodes.find(ep => String(ep.id) === savedEpisodeId);
    if (epToSet) {
      console.log("Restoring episode:", epToSet.id);
      setSelectedEpisode(epToSet);
      restoredEpisodeForShowRef.current[showId] = true;
    }
  }
}, [showId, episodes, selectedEpisode]); // Remove selectedTab dependency

  // --- Handler: Episode dropdown change ---
  const handleEpisodeChange = (e) => {
    const selectedId = e.target.value;
    const ep = episodes.find(ep => String(ep.id) === selectedId) || null;
    setSelectedEpisode(ep);
    if (showId) restoredEpisodeForShowRef.current[showId] = true;
  };

  // --- Effect: Fetch segments for selected episode ---
  useEffect(() => {
    if (!selectedEpisode) {
      setSegments([]);
      return;
    }
    setLoading(true);
    fetch(`/api/episodes/${selectedEpisode.id}/segments`)
      .then(res => res.ok ? res.json() : Promise.reject("Failed to fetch segments"))
      .then(async (data) => {
        const withItems = await Promise.all(
          (data || []).map(async (seg) => {
            const groupsWithItems = await Promise.all(
              (seg.groups || []).map(async (grp) => {
                const itemsRes = await fetch(`/api/groups/${grp.id}/items`);
                let items = itemsRes.ok ? await itemsRes.json() : [];
                items = items.map(item => ({
                  ...item,
                  data: typeof item.data === 'string' ? JSON.parse(item.data) : item.data
                }));
                return { ...grp, items };
              })
            );
            return { ...seg, groups: groupsWithItems };
          })
        );
        // Restore expand/collapse state from localStorage
        let persistedState = getLocalStorageJSON(LOCAL_STORAGE_KEY);
        setSegments((prevSegments) => {
          return withItems.map((seg) => {
            const prevSeg = prevSegments.find((ps) => ps.id === seg.id);
            const persistedSegExpanded = persistedState.segments?.[seg.id];
            const segExpanded = typeof persistedSegExpanded === "boolean"
              ? persistedSegExpanded
              : (prevSeg ? prevSeg.expanded : true);
            const mergedGroups = (seg.groups || []).map((grp) => {
              const prevGrp = prevSeg?.groups?.find((pg) => pg.id === grp.id);
              const persistedGrpExpanded = persistedState.groups?.[grp.id];
              const grpExpanded = typeof persistedGrpExpanded === "boolean"
                ? persistedGrpExpanded
                : (prevGrp ? prevGrp.expanded : true);
              return { ...grp, expanded: grpExpanded };
            });
            return { ...seg, expanded: segExpanded, groups: mergedGroups };
          });
        });
      })
      .catch(err => setMediaError(err.toString()))
      .finally(() => setLoading(false));
  }, [selectedEpisode, refreshKey]);

  // --- Handlers: Expand/collapse segment/group and persist state ---
  const toggleSegment = (segId) => {
    setSegments((segs) => {
      const newSegs = segs.map((seg) => seg.id === segId ? { ...seg, expanded: !seg.expanded } : seg);
      const savedState = getLocalStorageJSON(LOCAL_STORAGE_KEY);
      savedState.segments = savedState.segments || {};
      const toggled = newSegs.find(s => s.id === segId);
      savedState.segments[segId] = toggled.expanded;
      setLocalStorageJSON(LOCAL_STORAGE_KEY, savedState);
      return newSegs;
    });
  };
  const toggleGroup = (segId, groupId) => {
    setSegments((segs) => {
      const newSegs = segs.map((seg) =>
        seg.id === segId
          ? {
              ...seg,
              groups: seg.groups.map((grp) =>
                grp.id === groupId ? { ...grp, expanded: !grp.expanded } : grp
              ),
            }
          : seg
      );
      const savedState = getLocalStorageJSON(LOCAL_STORAGE_KEY);
      savedState.groups = savedState.groups || {};
      const seg = newSegs.find(s => s.id === segId);
      const toggledGroup = seg?.groups.find(g => g.id === groupId);
      if (toggledGroup) {
        savedState.groups[groupId] = toggledGroup.expanded;
        setLocalStorageJSON(LOCAL_STORAGE_KEY, savedState);
      }
      return newSegs;
    });
  };

  // --- CRUD: Add segment/group/episode ---
  const addSegment = async () => {
    if (!selectedEpisode) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/episodes/${selectedEpisode.id}/segments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `Segment ${segments.length + 1}` }),
      });
      if (!res.ok) throw new Error("Failed to add segment");
      const newSeg = await res.json();
      setRefreshKey(k => k + 1);
      setEditingType("segment");
      setEditingId(newSeg.id);
      setEditingValue(newSeg.name || "");
    } finally { setLoading(false); }
  };
  const addGroup = async (segId) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/segments/${segId}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `Group ${String.fromCharCode(65 + Math.floor(Math.random()*26))}` }),
      });
      if (!res.ok) throw new Error("Failed to add group");
      const newGroup = await res.json();
      setRefreshKey(k => k + 1);
      setEditingType("group");
      setEditingId(newGroup.id);
      setEditingValue(newGroup.name || "");
    } finally { setLoading(false); }
  };
  const addEpisode = async () => {
    if (!newEpisodeName.trim() || !showId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/shows/${showId}/episodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newEpisodeName }),
      });
      if (!res.ok) throw new Error("Failed to add episode");
      setNewEpisodeName("");
      setShowAddEpisodeModal(false);
      setRefreshKey(k => k + 1);
    } finally {
      setLoading(false);
    }
  };

  // --- Helpers: Save positions after drag-and-drop ---
  const saveSegmentPositions = async (newSegments) => {
    await Promise.all(
      newSegments.map((seg, idx) =>
        fetch(`/api/segments/${seg.id}/position`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: idx }),
        })
      )
    );
  };
  const saveGroupPositions = async (segmentId, newGroups) => {
    await Promise.all(
      newGroups.map((grp, idx) =>
        fetch(`/api/groups/${grp.id}/position`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: idx }),
        })
      )
    );
  };
  const saveItemPositions = async (groupId, newItems) => {
    await Promise.all(
      newItems.map((item, idx) =>
        fetch(`/api/items/${item.id}/position`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: idx }),
        })
      )
    );
  };

  // --- Handler: Drag-and-drop logic ---
  const handleDragEnd = async (result) => {
    setDraggedModule(null);
    const { source, destination, draggableId, type } = result;
    if (source.droppableId === 'toolbox') {
      const destId = destination?.droppableId;
      if (!destId) return;
      if (destId.startsWith('items-')) {
        const [, segId, groupId] = destId.split('-');
        await fetch(`/api/groups/${groupId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: draggableId,
            data: {
              title: draggedModule?.label || "Untitled Item",
              icon: draggedModule?.icon || "",
            },
            position: 0,
          }),
        });
        setRefreshKey(k => k + 1);
      }
      return;
    }
    if (!destination) return;

    // Segment reorder
    if (type === "segment") {
      const reordered = Array.from(segments);
      const [moved] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, moved);
      setSegments(reordered);
      await saveSegmentPositions(reordered);
      return;
    }

    // Group reorder
    if (type === "item" && source.droppableId.startsWith("groups-") && destination.droppableId.startsWith("groups-")) {
      const segId = source.droppableId.split("-")[1];
      const segment = segments.find(s => String(s.id) === String(segId));
      if (!segment) return;
      const groups = Array.from(segment.groups || []);
      const [moved] = groups.splice(source.index, 1);
      groups.splice(destination.index, 0, moved);
      await saveGroupPositions(segment.id, groups);
      setSegments(segments =>
        segments.map(s => s.id === segment.id ? { ...s, groups } : s)
      );
      return;
    }

    // Item reorder (within or across groups)
    if (type === "item" && source.droppableId.startsWith("items-") && destination.droppableId.startsWith("items-")) {
      const [, srcSegId, srcGroupId] = source.droppableId.split("-");
      const [, , destGroupId] = destination.droppableId.split("-");
      const segment = segments.find(s => String(s.id) === srcSegId);
      if (!segment) return;
      const srcGroup = segment.groups.find(g => String(g.id) === srcGroupId);
      const destGroup = segment.groups.find(g => String(g.id) === destGroupId);
      if (!srcGroup || !destGroup) return;
      const srcItems = Array.from(srcGroup.items || []);
      const destItems = srcGroupId === destGroupId ? srcItems : Array.from(destGroup.items || []);
      const [moved] = srcItems.splice(source.index, 1);
      destItems.splice(destination.index, 0, moved);
      if (srcGroupId !== destGroupId) {
        await fetch(`/api/items/${moved.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: moved.type,
            data: moved.data,
            position: destination.index,
            group_id: destGroup.id
          }),
        });
      } else {
        await fetch(`/api/items/${moved.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: moved.type,
            data: moved.data,
            position: destination.index,
            group_id: srcGroup.id
          }),
        });
      }
      await saveItemPositions(srcGroup.id, srcItems);
      if (srcGroupId !== destGroupId) await saveItemPositions(destGroup.id, destItems);
      setSegments((segs) =>
        segs.map((seg) =>
          seg.id === segment.id
            ? {
                ...seg,
                groups: seg.groups.map((g) => {
                  if (g.id === srcGroup.id) return { ...g, items: srcItems };
                  if (g.id === destGroup.id) return { ...g, items: destItems };
                  return g;
                }),
              }
            : seg
        )
      );
      return;
    }
  };

  

  // Rundown list container: prevent horizontal scroll, box-sizing border-box, width 100%
  const rundownListStyle = { flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", width: "100%", boxSizing: "border-box" };

  return (
    <DragDropContext
      onDragEnd={handleDragEnd}
      onBeforeDragStart={start => {
        // Detect toolbox drag
        if (start.source.droppableId === "toolbox") {
          // Save the dragged module info for clone rendering
          const moduleId = start.draggableId;
          setDraggedModule(
            [
              { label: "OBS Command", icon: "🎬", id: "toolbox-obscommand" },
              { label: "Graphics Template", icon: "🖼️", id: "toolbox-graphicstemplate" },
              { label: "Presenter Note", icon: "📝", id: "toolbox-presenternote" },
              { label: "Video Placeholder", icon: "🎥", id: "toolbox-video" },
              { label: "Audio Placeholder", icon: "🔊", id: "toolbox-audio" }
            ].find(m => m.id === moduleId)
          );
        }
      }}
      renderClone={(provided, snapshot, rubric) => {
        // Only clone for toolbox modules
        if (draggedModule) {
          return (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              style={{
                ...provided.draggableProps.style,
                display: "flex",
                alignItems: "center",
                gap: 12,
                border: "2px solid #1976d2",
                borderRadius: 8,
                background: "#e4f1fb",
                padding: "10px 16px",
                fontSize: 16,
                fontWeight: 600,
                color: "#1976d2",
                boxShadow: "0 6px 24px 0 #1976d233",
                opacity: 0.9,
              }}
            >
              <span style={{ fontSize: 22, marginRight: 6, flexShrink: 0 }}>{draggedModule.icon}</span>
              <span>{draggedModule.label}</span>
            </div>
          );
        }
        return null;
      }}
    >
      <div style={{ display: "flex", height: "100%", maxWidth: "100%" }}>
        {/* Left (main rundown) panel */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "#fff" }}>
          {/* Modal for adding new episode */}
          {showAddEpisodeModal && (
            <div
              tabIndex={-1}
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                background: "rgba(0,0,0,0.25)",
                zIndex: 1000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={e => {
                // Only close if clicking the overlay, not the modal box
                if (e.target === e.currentTarget) setShowAddEpisodeModal(false);
              }}
            >
              <div
                style={{
                  background: "#fff",
                  borderRadius: 10,
                  boxShadow: "0 2px 24px rgba(0,0,0,0.16)",
                  padding: 28,
                  minWidth: 340,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "stretch",
                  gap: 18,
                }}
                onClick={e => e.stopPropagation()}
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === "Escape") setShowAddEpisodeModal(false);
                  if (e.key === "Enter") {
                    if (newEpisodeName.trim()) addEpisode();
                  }
                }}
                aria-modal="true"
                role="dialog"
              >
                <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 6 }}>Add New Episode</div>
                <input
                  type="text"
                  placeholder="Episode name"
                  value={newEpisodeName}
                  onChange={e => setNewEpisodeName(e.target.value)}
                  style={{
                    fontSize: 16,
                    padding: "8px 12px",
                    border: "1.5px solid #b1c7e7",
                    borderRadius: 6,
                    outline: "none",
                    marginBottom: 8,
                  }}
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === "Enter" && newEpisodeName.trim()) {
                      addEpisode();
                    }
                    if (e.key === "Escape") setShowAddEpisodeModal(false);
                  }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button
                    style={{
                      padding: "7px 16px",
                      borderRadius: 5,
                      border: "1px solid #b1c7e7",
                      background: "#f5faff",
                      fontWeight: 600,
                      fontSize: 15,
                      cursor: "pointer",
                    }}
                    onClick={() => setShowAddEpisodeModal(false)}
                  >Cancel</button>
                  <button
                    style={{
                      padding: "7px 16px",
                      borderRadius: 5,
                      border: "none",
                      background: "#1976d2",
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: 15,
                      cursor: newEpisodeName.trim() ? "pointer" : "not-allowed",
                      opacity: newEpisodeName.trim() ? 1 : 0.6,
                    }}
                    disabled={!newEpisodeName.trim()}
                    onClick={() => {
                      if (newEpisodeName.trim()) addEpisode();
                    }}
                  >Confirm</button>
                </div>
              </div>
            </div>
          )}
          {/* Episode selector */}
          <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontWeight: 500, fontSize: 15, color: "#1976d2", marginRight: 10, marginLeft: 10 }}>
              Episode:&nbsp;
              <select
                value={selectedEpisode ? String(selectedEpisode.id) : ""}
                onChange={handleEpisodeChange}
                style={{
                  fontSize: 15,
                  padding: "6px 10px",
                  border: "1.2px solid #b1c7e7",
                  borderRadius: 5,
                  minWidth: 160,
                  background: "#fff",
                  color: "#1a237e",
                  fontWeight: 500
                }}
                disabled={episodes.length === 0}
              >
                {episodes.length === 0 ? (
                  <option value="">No episodes</option>
                ) : (
                  <>
                    <option value="">Select an episode…</option>
                    {episodes.map(ep => (
                      <option key={ep.id} value={String(ep.id)}>{ep.name}</option>
                    ))}
                  </>
                )}
              </select>
            </label>
            <button
              onClick={() => {
                setNewEpisodeName("");
                setShowAddEpisodeModal(true);
              }}
              style={{ fontWeight: 600 }}
            >+ Add Episode</button>
            {episodes.length > 0 && (
              <button onClick={addSegment} style={{ fontWeight: 600 }}>+ Add Segment</button>
            )}
          </div>
          {/* Rundown list */}
          <div style={rundownListStyle}>
            <Droppable droppableId="segments" type="segment">
              {(provided, dropSnapshot) => {
                // console.log("Droppable rendering", "segments", provided, dropSnapshot);
                return (
                  <ul
                    style={{ listStyle: "none", padding: 0, width: "100%" }}
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    {segments.map((segment, segIdx) => (
                      <Draggable key={segment.id} draggableId={`segment-${segment.id}`} index={segIdx}>
                        {(provided) => {
                          return (
                            <Droppable
                              droppableId={`segment-drop-${segment.id}`}
                              type="item"
                              isDropDisabled={true}
                            >
                              {(dropProvided, dropSnapshot) => {
                                // Add visible debugging style for segment-drop
                                return (
                                    <li
                                      ref={useCombinedRefs(provided.innerRef, dropProvided.innerRef)}
                                      {...provided.draggableProps}
                                      {...dropProvided.droppableProps}
                                      style={{
                                        ...provided.draggableProps.style,
                                        marginBottom: 18,
                                        padding: "8px",
                                        // Use a more distinct, slightly darker blueish background for segment container
                                        background: dropSnapshot.isDraggingOver ? "#e3f2fd" : "#dbe7f7",
                                        border: "1px solid #d1d9e6",
                                        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                                        minHeight: 80,
                                        borderRadius: 8,
                                        width: "100%",
                                        transition: "background 0.15s, border 0.15s",
                                      }}
                                    >
                                    {/* ...segment content unchanged... */}
                                    {/* See full code above */}
                                    <div style={{ display: "flex", alignItems: "center", padding: "10px 16px", borderBottom: "1px solid #eef3fa", gap: 14 }}>
                                      {/* Collapse/Expand button for segment */}
                                      <button
                                        onClick={() => toggleSegment(segment.id)}
                                        style={{
                                          background: "none",
                                          border: "none",
                                          fontSize: 18,
                                          cursor: "pointer",
                                          marginRight: 6,
                                          color: "#1976d2",
                                          userSelect: "none",
                                          outline: "none",
                                        }}
                                        aria-label={segment.expanded ? "Collapse segment" : "Expand segment"}
                                        tabIndex={0}
                                      >
                                        {segment.expanded ? "▼" : "▶"}
                                      </button>
                                      <span {...provided.dragHandleProps} style={{ cursor: "grab" }}>☰</span>
                                      <span style={{ fontWeight: 600, fontSize: 16, minWidth: 120, marginRight: 14 }}>
                                        {editingType === "segment" && editingId === segment.id ? (
                                          <input
                                            ref={inputRef}
                                            type="text"
                                            value={editingValue}
                                            onChange={e => setEditingValue(e.target.value)}
                                            onBlur={async () => {
                                              if (editingValue !== (segment.name || "")) {
                                                await fetch(`/api/segments/${segment.id}/name`, {
                                                  method: "PATCH",
                                                  headers: { "Content-Type": "application/json" },
                                                  body: JSON.stringify({ name: editingValue }),
                                                });
                                                setRefreshKey(k => k + 1);
                                              }
                                              setEditingType(null);
                                              setEditingId(null);
                                              setEditingValue("");
                                            }}
                                            onKeyDown={async (e) => {
                                              if (e.key === "Enter") {
                                                if (editingValue !== (segment.name || "")) {
                                                  await fetch(`/api/segments/${segment.id}/name`, {
                                                    method: "PATCH",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({ name: editingValue }),
                                                  });
                                                  setRefreshKey(k => k + 1);
                                                }
                                                setEditingType(null);
                                                setEditingId(null);
                                                setEditingValue("");
                                              }
                                              if (e.key === "Escape") {
                                                setEditingType(null);
                                                setEditingId(null);
                                                setEditingValue("");
                                              }
                                            }}
                                            style={{ fontWeight: 600, fontSize: 16, minWidth: 120, border: "1.5px solid #b1c7e7", borderRadius: 5, padding: "2px 7px" }}
                                            autoFocus
                                          />
                                        ) : (
                                          <span
                                            onClick={() => {
                                              setEditingType("segment");
                                              setEditingId(segment.id);
                                              setEditingValue(segment.name || "");
                                            }}
                                            tabIndex={0}
                                            style={{ cursor: "pointer" }}
                                          >
                                            {segment.name || "Untitled Segment"}
                                          </span>
                                        )}
                                      </span>
                                      <button onClick={() => addGroup(segment.id)} style={{ marginLeft: "auto" }}>+ Add Group</button>
                                      <button
                                        onClick={async () => {
                                          if (!window.confirm("Delete this segment and all its groups/items?")) return;
                                          await fetch(`/api/segments/${segment.id}`, { method: "DELETE" });
                                          setRefreshKey(k => k + 1);
                                        }}
                                        style={{ marginLeft: 10, color: "#e53935" }}
                                      >🗑</button>
                                    </div>
                                    {/* Groups */}
                                    {segment.expanded && (
                                      <ul
                                        style={{
                                          listStyle: "none",
                                          padding: "6px 12px",
                                          margin: 0,
                                          minHeight: 48,
                                          borderRadius: 8,
                                        }}
                                      >
                                        {(segment.groups || []).map((group, groupIdx) => (
                                          // ... see above, unchanged ...
                                          <Draggable key={group.id} draggableId={`group-${group.id}`} index={groupIdx}>
                                            {(groupDraggableProvided) => {
                                              return (
                                                <li
                                                  ref={groupDraggableProvided.innerRef}
                                                  {...groupDraggableProvided.draggableProps}
                                                  style={{
                                                    ...groupDraggableProvided.draggableProps.style,
                                                    marginBottom: 10,
                                                    border: "1px solid #e0e5f0",
                                                    borderRadius: 6,
                                                    // Group container background: use lighter neutral color
                                                    background: "#f0f4f8",
                                                    width: "100%",
                                                  }}
                                                >
                                                  <div
                                                    style={{ display: "flex", alignItems: "center", padding: "8px 14px", borderBottom: "1px solid #eef3fa", gap: 10 }}
                                                    {...groupDraggableProvided.dragHandleProps}
                                                  >
                                                    {/* Collapse/Expand button for group */}
                                                    <button
                                                      onClick={() => toggleGroup(segment.id, group.id)}
                                                      style={{
                                                        background: "none",
                                                        border: "none",
                                                        fontSize: 14,
                                                        cursor: "pointer",
                                                        marginRight: 6,
                                                        color: "#1976d2",
                                                        userSelect: "none",
                                                        outline: "none",
                                                      }}
                                                      aria-label={group.expanded ? "Collapse group" : "Expand group"}
                                                      tabIndex={0}
                                                    >
                                                      {group.expanded ? "▼" : "▶"}
                                                    </button>
                                                    <span style={{ cursor: "grab" }}>≡</span>
                                                    <span style={{ fontWeight: 500, fontSize: 15, minWidth: 100 }}>
                                                      {editingType === "group" && editingId === group.id ? (
                                                        <input
                                                          ref={inputRef}
                                                          type="text"
                                                          value={editingValue}
                                                          onChange={e => setEditingValue(e.target.value)}
                                                          onBlur={async () => {
                                                            if (editingValue !== (group.name || "")) {
                                                              await fetch(`/api/groups/${group.id}/name`, {
                                                                method: "PATCH",
                                                                headers: { "Content-Type": "application/json" },
                                                                body: JSON.stringify({ name: editingValue }),
                                                              });
                                                              setRefreshKey(k => k + 1);
                                                            }
                                                            setEditingType(null);
                                                            setEditingId(null);
                                                            setEditingValue("");
                                                          }}
                                                          onKeyDown={async (e) => {
                                                            if (e.key === "Enter") {
                                                              if (editingValue !== (group.name || "")) {
                                                                await fetch(`/api/groups/${group.id}/name`, {
                                                                  method: "PATCH",
                                                                  headers: { "Content-Type": "application/json" },
                                                                  body: JSON.stringify({ name: editingValue }),
                                                                });
                                                                setRefreshKey(k => k + 1);
                                                              }
                                                              setEditingType(null);
                                                              setEditingId(null);
                                                              setEditingValue("");
                                                            }
                                                            if (e.key === "Escape") {
                                                              setEditingType(null);
                                                              setEditingId(null);
                                                              setEditingValue("");
                                                            }
                                                          }}
                                                          style={{ fontWeight: 500, fontSize: 15, minWidth: 100, border: "1.5px solid #b1c7e7", borderRadius: 5, padding: "2px 7px" }}
                                                          autoFocus
                                                        />
                                                      ) : (
                                                        <span
                                                          onClick={() => {
                                                            setEditingType("group");
                                                            setEditingId(group.id);
                                                            setEditingValue(group.name || "");
                                                          }}
                                                          tabIndex={0}
                                                          style={{ cursor: "pointer" }}
                                                        >
                                                          {group.name || "Untitled Group"}
                                                        </span>
                                                      )}
                                                    </span>
                                                    <button
                                                      onClick={async () => {
                                                        if (!window.confirm("Delete this group and all its items?")) return;
                                                        await fetch(`/api/groups/${group.id}`, { method: "DELETE" });
                                                        setRefreshKey(k => k + 1);
                                                      }}
                                                      style={{ marginLeft: "auto", color: "#e53935" }}
                                                    >
                                                      🗑
                                                    </button>
                                                  </div>
                                                  {/* Rundown items */}
                                                  {group.expanded && (
                                                    <Droppable
                                                      droppableId={`items-${segment.id}-${group.id}`}
                                                      type="item"
                                                      isDropDisabled={false}
                                                    >
                                                      {(itemProvided, itemSnapshot) => {
                                                        // Add visible debugging style for items
                                                        return (
                                                          <ul
                                                            style={{
                                                              listStyle: "none",
                                                              padding: "0 0 0 16px",
                                                              margin: 0,
                                                              background: itemSnapshot.isDraggingOver ? "#ffdddd" : "transparent",
                                                              border: "1px solid transparent",
                                                              minHeight: 80,
                                                              borderRadius: 7,
                                                              transition: "background 0.15s, border 0.15s",
                                                            }}
                                                            ref={itemProvided.innerRef}
                                                            {...itemProvided.droppableProps}
                                                          >
                                                            {(group.items || []).map((item, itemIdx) => (
                                                              <Draggable key={item.id} draggableId={`item-${item.id}`} index={itemIdx}>
                                                                {(itemDraggableProvided) => {
                                                                  return (
                                                                    <li
                                                                      ref={itemDraggableProvided.innerRef}
                                                                      {...itemDraggableProvided.draggableProps}
                                                                      {...itemDraggableProvided.dragHandleProps}
                                                                      style={{
                                                                        ...itemDraggableProvided.draggableProps.style,
                                                                        padding: 8,
                                                                        borderBottom: "1px solid #d9e2f3",
                                                                        background: "#fff",
                                                                        borderRadius: 5,
                                                                        marginBottom: 4,
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        cursor: "grab",
                                                                      }}
                                                                    >
                                                                      <span style={{ flex: 1 }}>
                                                                        {editingType === "item" && editingId === item.id ? (
                                                                          <input
                                                                            ref={inputRef}
                                                                            type="text"
                                                                            value={editingValue}
                                                                            onChange={e => setEditingValue(e.target.value)}
                                                                            onBlur={async () => {
                                                                              // Use item.data.title for comparison if present, else fallback
                                                                              const currentTitle = (item.data && item.data.title) || item.name || "";
                                                                              if (editingValue !== currentTitle) {
                                                                                await fetch(`/api/items/${item.id}`, {
                                                                                  method: "PUT",
                                                                                  headers: { "Content-Type": "application/json" },
                                                                                  body: JSON.stringify({
                                                                                    type: item.type,
                                                                                    data: {
                                                                                      ...item.data,
                                                                                      title: editingValue
                                                                                    },
                                                                                    position: item.position
                                                                                  }),
                                                                                });
                                                                                setRefreshKey(k => k + 1);
                                                                              }
                                                                              setEditingType(null);
                                                                              setEditingId(null);
                                                                              setEditingValue("");
                                                                            }}
                                                                            onKeyDown={async (e) => {
                                                                              if (e.key === "Enter") {
                                                                                const currentTitle = (item.data && item.data.title) || item.name || "";
                                                                                if (editingValue !== currentTitle) {
                                                                                  await fetch(`/api/items/${item.id}`, {
                                                                                    method: "PUT",
                                                                                    headers: { "Content-Type": "application/json" },
                                                                                    body: JSON.stringify({
                                                                                      type: item.type,
                                                                                      data: {
                                                                                        ...item.data,
                                                                                        title: editingValue
                                                                                      },
                                                                                      position: item.position
                                                                                    }),
                                                                                  });
                                                                                  setRefreshKey(k => k + 1);
                                                                                }
                                                                                setEditingType(null);
                                                                                setEditingId(null);
                                                                                setEditingValue("");
                                                                              }
                                                                              if (e.key === "Escape") {
                                                                                setEditingType(null);
                                                                                setEditingId(null);
                                                                                setEditingValue("");
                                                                              }
                                                                            }}
                                                                            style={{ width: "100%", fontSize: 14, padding: 2 }}
                                                                            autoFocus
                                                                          />
                                                                        ) : (
                                                                          <span
                                                                            onClick={() => {
                                                                              setEditingType("item");
                                                                              setEditingId(item.id);
                                                                              setEditingValue((item.data && item.data.title) || item.name || "");
                                                                            }}
                                                                            tabIndex={0}
                                                                            style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
                                                                          >
                                                                            <span style={{ marginRight: 6 }}>{item.data?.icon || ""}</span>
                                                                            <span>{item.data?.title || "Untitled Item"}</span>
                                                                          </span>
                                                                        )}
                                                                      </span>
                                                                      <button
                                                                        onClick={async () => {
                                                                          if (!window.confirm("Delete this item?")) return;
                                                                          await fetch(`/api/items/${item.id}`, { method: "DELETE" });
                                                                          setRefreshKey(k => k + 1);
                                                                        }}
                                                                        style={{ marginLeft: 10, color: "#e53935" }}
                                                                      >
                                                                        🗑
                                                                      </button>
                                                                    </li>
                                                                  );
                                                                }}
                                                              </Draggable>
                                                            ))}
                                                            {itemProvided.placeholder}
                                                          </ul>
                                                        );
                                                      }}
                                                    </Droppable>
                                                  )}
                                                </li>
                                              );
                                            }}
                                          </Draggable>
                                        ))}
                                      </ul>
                                    )}
                                    {dropProvided.placeholder}
                                  </li>
                                );
                              }}
                            </Droppable>
                          );
                        }}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </ul>
                );
              }}
            </Droppable>
          </div>
        </div>
        {/* Right properties and modules panel */}
        <div
          style={{
            width: 250,
            minWidth: 250,
            maxWidth: 250,
            borderLeft: "1.5px solid #e1e6ec",
            background: "#f8fafd",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 0 8px 0 #e4e8ed22",
            zIndex: 1,
          }}
        >
          <div style={{ flex: 1, borderBottom: "1.5px solid #e1e6ec", background: "#fff" }}>
            {/* PropertiesPanel */}
            <PropertiesPanel
              showId={showId}
              selectedEpisode={selectedEpisode}
              segments={segments}
              loading={loading}
              mediaError={mediaError}
              editingType={editingType}
              editingId={editingId}
              editingValue={editingValue}
              inputRef={inputRef}
              toggleSegment={toggleSegment}
              toggleGroup={toggleGroup}
              addSegment={addSegment}
              addGroup={addGroup}
              setEditingType={setEditingType}
              setEditingId={setEditingId}
              setEditingValue={setEditingValue}
              setRefreshKey={setRefreshKey}
              selectedTab={selectedTab}
              setSelectedTab={setInternalSelectedTab}
            />
          </div>
          <div style={{ flex: 1, overflowY: "auto", background: "#f8fafd" }}>
            <ModulesPanel />
          </div>
        </div>
      </div>
    </DragDropContext>
  );
}
