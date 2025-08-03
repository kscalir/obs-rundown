import React, { useState, useEffect, useRef } from "react";
import { Droppable, Draggable, DragDropContext } from "@hello-pangea/dnd";
import ModulesPanel from "./ModulesPanel";
import PropertiesPanel from "./PropertiesPanel";
import RundownList from "./RundownList";

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

  // --- Handlers for RundownList ---
  const toggleSegment = (segId) => {
    setSegments((segs) => {
      const newSegs = segs.map((seg) => 
        seg.id === segId ? { ...seg, expanded: !seg.expanded } : seg
      );
      const savedState = getLocalStorageJSON(STORAGE_KEYS.RUNDOWN);
      savedState.segments = savedState.segments || {};
      const toggled = newSegs.find(s => s.id === segId);
      savedState.segments[segId] = toggled.expanded;
      setLocalStorageJSON(STORAGE_KEYS.RUNDOWN, savedState);
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
      const savedState = getLocalStorageJSON(STORAGE_KEYS.RUNDOWN);
      savedState.groups = savedState.groups || {};
      const seg = newSegs.find(s => s.id === segId);
      const toggledGroup = seg?.groups.find(g => g.id === groupId);
      if (toggledGroup) {
        savedState.groups[groupId] = toggledGroup.expanded;
        setLocalStorageJSON(STORAGE_KEYS.RUNDOWN, savedState);
      }
      return newSegs;
    });
  };

  const addGroup = async (segId) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/segments/${segId}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: `Group ${String.fromCharCode(65 + Math.floor(Math.random()*26))}` 
        }),
      });
      if (!res.ok) throw new Error("Failed to add group");
      const newGroup = await res.json();
      setRefreshKey(k => k + 1);
      setEditingType("group");
      setEditingId(newGroup.id);
      setEditingValue(newGroup.name || "");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSegment = async (id, value) => {
    if (value === null) {
      setEditingType(null);
      setEditingId(null);
      setEditingValue("");
      return;
    }
    if (!value.trim()) return;
    
    try {
      const res = await fetch(`/api/segments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: value.trim() }),
      });
      if (!res.ok) throw new Error("Failed to update segment");
      setRefreshKey(k => k + 1);
    } finally {
      setEditingType(null);
      setEditingId(null);
      setEditingValue("");
    }
  };

  const handleEditGroup = async (id, value) => {
    if (value === null) {
      setEditingType(null);
      setEditingId(null);
      setEditingValue("");
      return;
    }
    if (!value.trim()) return;

    try {
      const res = await fetch(`/api/groups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: value.trim() }),
      });
      if (!res.ok) throw new Error("Failed to update group");
      setRefreshKey(k => k + 1);
    } finally {
      setEditingType(null);
      setEditingId(null);
      setEditingValue("");
    }
  };

  const handleEditItem = async (id, value) => {
    if (value === null) {
      setEditingType(null);
      setEditingId(null);
      setEditingValue("");
      return;
    }
    if (!value.trim()) return;

    try {
      const res = await fetch(`/api/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: value.trim() }),
      });
      if (!res.ok) throw new Error("Failed to update item");
      setRefreshKey(k => k + 1);
    } finally {
      setEditingType(null);
      setEditingId(null);
      setEditingValue("");
    }
  };

  const handleDeleteSegment = async (id) => {
    if (!confirm("Are you sure you want to delete this segment?")) return;
    try {
      const res = await fetch(`/api/segments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete segment");
      setRefreshKey(k => k + 1);
    } catch (err) {
      console.error("Delete segment failed:", err);
    }
  };

  const handleDeleteGroup = async (id) => {
    if (!confirm("Are you sure you want to delete this group?")) return;
    try {
      const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete group");
      setRefreshKey(k => k + 1);
    } catch (err) {
      console.error("Delete group failed:", err);
    }
  };

  const handleDeleteItem = async (id) => {
    try {
      const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete item");
      setRefreshKey(k => k + 1);
    } catch (err) {
      console.error("Delete item failed:", err);
    }
  };

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
      if (start.source.droppableId === "toolbox") {
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
  >
    <div style={{ display: "flex", height: "100%", maxWidth: "100%" }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "#fff" }}>
        {/* Episode selector */}
        <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px' }}>
          <label style={{ fontWeight: 500, fontSize: 15, color: "#1976d2" }}>
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
          >
            + Add Episode
          </button>
        </div>

        {/* Rundown List */}
        <RundownList
          segments={segments}
          onToggleSegment={toggleSegment}
          onToggleGroup={toggleGroup}
          onAddGroup={addGroup}
          onEditSegment={handleEditSegment}
          onEditGroup={handleEditGroup}
          onEditItem={handleEditItem}
          onDeleteSegment={handleDeleteSegment}
          onDeleteGroup={handleDeleteGroup}
          onDeleteItem={handleDeleteItem}
          editingType={editingType}
          editingId={editingId}
          editingValue={editingValue}
          setEditingValue={setEditingValue}
          inputRef={inputRef}
        />
      </div>

      {/* Right Panel */}
      <div style={{
        width: 250,
        minWidth: 250,
        maxWidth: 250,
        borderLeft: "1.5px solid #e1e6ec",
        background: "#f8fafd",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 0 8px 0 #e4e8ed22",
        zIndex: 1
      }}>
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
        <ModulesPanel />
      </div>
    </div>
  </DragDropContext>
);
}