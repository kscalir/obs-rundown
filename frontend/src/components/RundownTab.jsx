import React, { useState, useEffect, useRef } from "react";
import { Droppable, Draggable, DragDropContext } from "@hello-pangea/dnd";
import ModulesPanel from "./ModulesPanel";
import PropertiesPanel from "./PropertiesPanel";
import RundownList from "./RundownList";
import { API_BASE_URL } from "../config";

// --- Storage keys ---
const LOCAL_STORAGE_KEY = "obsRundownState";
const SELECTED_EPISODE_KEY = "obsSelectedEpisode";
const SELECTED_TABS_KEY = "obsSelectedTabs";

// Make a specific key for expanded state storage
const STORAGE_KEYS = {
  RUNDOWN: "obsRundownExpandedState"
};

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

// Helper for API calls
const apiCall = async (url, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${url}`, options);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
};

export default function RundownTab({ showId, selectedTab }) {
  // --- State ---
  const [segments, setSegments] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mediaError, setMediaError] = useState(null);
  const [showAddEpisodeModal, setShowAddEpisodeModal] = useState(false);
  const [newEpisodeName, setNewEpisodeName] = useState("");
  const [editingType, setEditingType] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [draggedModule, setDraggedModule] = useState(null);
  const [internalSelectedTab, setInternalSelectedTab] = useState("rundown");
  const [selectedItem, setSelectedItem] = useState(null);
  const [showProperties, setShowProperties] = useState(false);

  // --- Refs ---
  const inputRef = useRef(null);
  const restoredEpisodeForShowRef = useRef({}); // Tracks if we've restored for this show

  // --- Handlers for RundownList ---
  const handleItemClick = (item) => {
    console.log('Item clicked:', item);
    // Check for both shortened type and toolbox prefixed type
    if (item && (item.type === 'graphics' || item.type === 'toolbox-graphicstemplate')) {
      setSelectedItem(item.id);
      setShowProperties(true);
    }
  };
    
  const toggleSegment = (segId) => {
    setSegments((segs) => {
      const newSegs = segs.map((seg) => 
        seg.id === segId ? { ...seg, expanded: !seg.expanded } : seg
      );
      return newSegs;
    });
  };

  const toggleGroup = (segId, groupId) => {
    setSegments((segs) => {
      const newSegs = segs.map((seg) =>
        seg.id === segId
          ? {
              ...seg,
              groups: (seg.groups || []).map((grp) =>
                grp.id === groupId ? { ...grp, expanded: !grp.expanded } : grp
              ),
            }
          : seg
      );
      return newSegs;
    });
  };

  const addGroup = async (segId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/segments/${segId}/groups`, {
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

  const handleEditSegment = async (segmentId, newName) => {
    if (!newName || !segmentId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/segments/${segmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) throw new Error("Failed to update segment");
      setRefreshKey(k => k + 1);
      setEditingType(null);
      setEditingId(null);
      setEditingValue("");
    } catch (err) {
      console.error("Failed to update segment:", err);
    }
  };

  const handleEditGroup = async (groupId, newName) => {
    // Ensure we don't send null/empty names
    if (!newName || !newName.trim()) {
      setEditingType(null);
      setEditingId(null);
      setEditingValue("");
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) throw new Error("Failed to update group");
      setRefreshKey(k => k + 1);
      setEditingType(null);
      setEditingId(null);
      setEditingValue("");
    } catch (err) {
      console.error("Failed to update group:", err);
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
      const res = await fetch(`${API_BASE_URL}/api/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title: value.trim(),
          source: 'edit'  // Add source flag to distinguish from dnd
        }),
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
      const res = await fetch(`${API_BASE_URL}/api/segments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete segment");
      setRefreshKey(k => k + 1);
    } catch (err) {
      console.error("Delete segment failed:", err);
    }
  };

  const handleDeleteGroup = async (id) => {
    if (!confirm("Are you sure you want to delete this group?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/groups/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete group");
      setRefreshKey(k => k + 1);
    } catch (err) {
      console.error("Delete group failed:", err);
    }
  };

  const handleDeleteItem = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/items/${id}`, { method: "DELETE" });
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
    fetch(`${API_BASE_URL}/api/shows/${showId}/episodes`)
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
    if (!selectedEpisode?.id) {
      setSegments([]);
      return;
    }

    setLoading(true);
    
    fetch(`${API_BASE_URL}/api/episodes/${selectedEpisode.id}/segments?include=groups,items`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch segments");
        return res.json();
      })
      .then(data => {
        // Add default expanded state to segments and groups
        const segmentsWithState = data.map(segment => ({
          ...segment,
          expanded: true,
          groups: (segment.groups || []).map(group => ({
            ...group,
            expanded: true,
            items: group.items || []
          }))
        }));
        setSegments(segmentsWithState);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading segments:", err);
        setSegments([]);
        setLoading(false);
      });
  }, [selectedEpisode?.id, refreshKey]);

  // Add this function to your RundownTab component
  const fetchSegments = async (episodeId) => {
    if (!episodeId) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/episodes/${episodeId}/segments?include=groups,items`);
      if (!res.ok) throw new Error("Failed to fetch segments");
      
      const data = await res.json();
      // Add default expanded state to segments and groups
      const segmentsWithState = data.map(segment => ({
        ...segment,
        expanded: true,
        groups: (segment.groups || []).map(group => ({
          ...group,
          expanded: true,
          items: group.items || []
        }))
      }));
      setSegments(segmentsWithState);
    } catch (err) {
      console.error("Error loading segments:", err);
      setSegments([]);
    } finally {
      setLoading(false);
    }
  };

  // --- CRUD: Add segment/group/episode ---
  const addSegment = async () => {
    if (!selectedEpisode) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/episodes/${selectedEpisode.id}/segments`, {
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
      const res = await fetch(`${API_BASE_URL}/api/shows/${showId}/episodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newEpisodeName }),
      });
      if (!res.ok) throw new Error("Failed to add episode");
      const newEpisode = await res.json();
      
      setEpisodes(eps => [...eps, newEpisode]);
      setSelectedEpisode(newEpisode);
      setNewEpisodeName("");
      setShowAddEpisodeModal(false);
      if (showId) restoredEpisodeForShowRef.current[showId] = true;
    } finally {
      setLoading(false);
    }
  };

  // --- Helpers: Save positions after drag-and-drop ---
  const saveSegmentPositions = async (newSegments) => {
    try {
      await Promise.all(
        newSegments.map((seg, idx) =>
          fetch(`${API_BASE_URL}/api/segments/${seg.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ position: idx }),
          }).then(res => {
            if (!res.ok) throw new Error(`Failed to update segment ${seg.id} position`);
          })
        )
      );
    } catch (err) {
      console.error('Error saving segment positions:', err);
      // Optionally refresh to get back to consistent state
      setRefreshKey(k => k + 1);
    }
  };
  const saveGroupPositions = async (segmentId, newGroups) => {
    await Promise.all(
      newGroups.map((grp, idx) =>
        fetch(`${API_BASE_URL}/api/groups/${grp.id}`, {  // Remove /position
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
        fetch(`${API_BASE_URL}/api/items/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            position: idx,
            source: 'dnd'  // Add this line
          }),
        })
      )
    );
  };

  // --- Handler: Drag-and-drop logic ---
  const handleDragEnd = async (result) => {
    setDraggedModule(null);
    const { source, destination, draggableId, type } = result;

    if (!destination) return;

    // --- Handle item drag from toolbox to rundown ---
    if (source.droppableId === "toolbox" && destination.droppableId.startsWith("items-")) {
      const [prefix, segmentId, groupId] = destination.droppableId.split("-");
      const [_, moduleType] = draggableId.split("-");
      
      try {
        const res = await fetch(`${API_BASE_URL}/api/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: moduleType,
            group_id: groupId,
            position: destination.index,
            data: {}
          })
        });

        if (!res.ok) throw new Error("Failed to create item");
        const newItem = await res.json();
        
        // Update the local state immediately without waiting for a refetch
        setSegments(prevSegments => {
          return prevSegments.map(seg => {
            if (seg.id === segmentId) {
              return {
                ...seg,
                groups: seg.groups.map(g => {
                  if (g.id === groupId) {
                    const updatedItems = [...g.items];
                    updatedItems.splice(destination.index, 0, newItem);
                    return { ...g, items: updatedItems };
                  }
                  return g;
                })
              };
            }
            return seg;
          });
        });
        
        if (moduleType === "graphicstemplate") {
          setSelectedItem(newItem.id);
          setShowProperties(true);
        }
        
      } catch (err) {
        console.error("Error creating new item:", err);
      }
      return;
    }

    // --- Handle item reordering within the same group ---
    if (type === "item" && source.droppableId === destination.droppableId && 
      source.droppableId.startsWith("items-")) {
      const [_, segmentId, groupId] = source.droppableId.split("-");
      const [itemPrefix, itemId] = draggableId.split("-");
      
      // Find the group
      const segment = segments.find(s => s.id === segmentId);
      const group = segment?.groups.find(g => g.id === groupId);
      if (!group) return;
      
      // Get the item being moved
      const item = group.items[source.index];
      
      // Create new array with item moved to new position
      const newItems = [...group.items];
      newItems.splice(source.index, 1);
      newItems.splice(destination.index, 0, item);
      
      // Update the state immediately
      setSegments(prevSegments => {
        return prevSegments.map(seg => {
          if (seg.id === segmentId) {
            return {
              ...seg,
              groups: seg.groups.map(g => {
                if (g.id === groupId) {
                  return { ...g, items: newItems };
                }
                return g;
              })
            };
          }
          return seg;
        });
      });
      
      // Update in database
      try {
        const updates = newItems.map((item, idx) => ({
          id: item.id,
          position: idx
        }));
        
        const reorderRes = await fetch(`${API_BASE_URL}/api/groups/${groupId}/reorder`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates)
        });
        
        if (!reorderRes.ok) {
          throw new Error("Failed to reorder items");
        }
        
        // Force a refresh after successful update
        if (selectedEpisode) {
          fetchSegments(selectedEpisode.id);
        }
      } catch (err) {
        console.error("Error updating item positions:", err);
        // If error, refetch the data to sync with server
        if (selectedEpisode) {
          fetchSegments(selectedEpisode.id);
        }
      }
      return;
    }

    // --- Handle item moving between groups ---
    if (type === "item" && 
      source.droppableId.startsWith("items-") && 
      destination.droppableId.startsWith("items-") && 
      source.droppableId !== destination.droppableId) {
    
      const [_, srcSegmentId, srcGroupId] = source.droppableId.split("-");
      const [__, destSegmentId, destGroupId] = destination.droppableId.split("-");
      const [itemPrefix, itemId] = draggableId.split("-");
      
      // Find source and destination segments/groups
      const srcSegment = segments.find(s => s.id === srcSegmentId);
      const destSegment = segments.find(s => s.id === destSegmentId);
      const srcGroup = srcSegment?.groups.find(g => g.id === srcGroupId);
      const destGroup = destSegment?.groups.find(g => g.id === destGroupId);
      
      if (!srcGroup || !destGroup) return;
      
      // Get the item being moved
      const item = srcGroup.items[source.index];
      
      // Create new arrays for both groups
      const srcItems = [...srcGroup.items];
      srcItems.splice(source.index, 1);
      
      const destItems = [...destGroup.items];
      destItems.splice(destination.index, 0, item);
      
      // Update the state immediately
      setSegments(prevSegments => {
        return prevSegments.map(seg => {
          if (seg.id === srcSegmentId) {
            return {
              ...seg,
              groups: seg.groups.map(g => {
                if (g.id === srcGroupId) {
                  return { ...g, items: srcItems };
                }
                return g;
              })
            };
          }
          if (seg.id === destSegmentId) {
            return {
              ...seg,
              groups: seg.groups.map(g => {
                if (g.id === destGroupId) {
                  return { ...g, items: destItems };
                }
                return g;
              })
            };
          }
          return seg;
        });
      });
      
      // Update in database
      try {
        // Move the item to the new group and position
        const moveRes = await fetch(`${API_BASE_URL}/api/items/${item.id}/move`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            group_id: destGroupId,
            position: destination.index
          })
        });
        
        if (!moveRes.ok) {
          throw new Error("Failed to move item");
        }
        
        // Force a refresh to ensure database and UI are in sync
        if (selectedEpisode) {
          fetchSegments(selectedEpisode.id);
        }
      } catch (err) {
        console.error("Error moving item between groups:", err);
        // Always refetch to ensure UI matches database state
        if (selectedEpisode) {
          fetchSegments(selectedEpisode.id);
        }
      }
      return;
    }

    // --- Handle segment reordering ---
    if (type === "segment") {
      // Create a new array with reordered segments
      const newSegments = [...segments];
      const [removed] = newSegments.splice(source.index, 1);
      newSegments.splice(destination.index, 0, removed);
      
      // Update state immediately for better UX
      setSegments(newSegments);
      
      // Update in database
      try {
        const updates = newSegments.map((segment, idx) => ({
          id: segment.id,
          position: idx
        }));
        
        const response = await fetch(`${API_BASE_URL}/api/episodes/${selectedEpisode.id}/reorder-segments`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates)
        });
        
        if (!response.ok) {
          throw new Error("Failed to reorder segments");
        }
        
        // Optionally refresh to ensure database and UI are in sync
        fetchSegments(selectedEpisode.id);
      } catch (err) {
        console.error("Error updating segment positions:", err);
        // On error, refresh from server to restore correct state
        fetchSegments(selectedEpisode.id);
      }
      return;
    }

    // --- Handle group reordering within a segment ---
    if (type === "group" && 
        source.droppableId.startsWith("groups-") && 
        destination.droppableId === source.droppableId) {
      
      const segmentId = source.droppableId.split("-")[1];
      const segment = segments.find(s => s.id === segmentId);
      if (!segment) return;
      
      // Create a new array with reordered groups
      const newGroups = [...segment.groups];
      const [removed] = newGroups.splice(source.index, 1);
      newGroups.splice(destination.index, 0, removed);
      
      // Update state immediately
      setSegments(prevSegments => 
        prevSegments.map(seg => 
          seg.id === segmentId 
            ? { ...seg, groups: newGroups }
            : seg
        )
      );
      
      // Update in database
      try {
        const updates = newGroups.map((group, idx) => ({
          id: group.id,
          position: idx
        }));
        
        const response = await fetch(`${API_BASE_URL}/api/segments/${segmentId}/reorder-groups`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates)
        });
        
        if (!response.ok) {
          throw new Error("Failed to reorder groups");
        }
        
        // Optionally refresh to ensure database and UI are in sync
        fetchSegments(selectedEpisode.id);
      } catch (err) {
        console.error("Error updating group positions:", err);
        // On error, refresh from server to restore correct state
        fetchSegments(selectedEpisode.id);
      }
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
    <div style={{ 
  display: "flex", 
  height: "100vh", // Changed from 100% to 100vh
  maxWidth: "100%",
  overflow: "hidden" // Add this
}}>
  <div style={{ 
    flex: 1, 
    minWidth: 0, 
    display: "flex", 
    flexDirection: "column",
    background: "#fff",
    overflow: "hidden" // Add this
  }}>
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
      style={{ flex: 1, overflow: "auto" }} // Add these styles
      segments={segments}
      onToggleSegment={toggleSegment}
      onToggleGroup={toggleGroup}
      onAddGroup={addGroup}
      onAddSegment={addSegment}  // Add this line
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
      onItemClick={handleItemClick}
      selectedItem={selectedItem}
    />
  </div>

  <div style={{
    width: 250,
    minWidth: 250,
    maxWidth: 250,
    borderLeft: "1.5px solid #e1e6ec",
    background: "#f8fafd",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 0 8px 0 #e4e8ed22",
    zIndex: 1,
    overflow: "hidden" // Add this
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
      show={showProperties}  // Add this
      itemId={selectedItem}  // Add this
      onClose={() => setShowProperties(false)} 


    />
    <ModulesPanel 
      style={{ flex: 1, overflow: "auto" }} // Add these styles
    />
  </div>
</div>

    {showAddEpisodeModal && (
  <div style={{
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000
  }}>
    <div style={{
      background: "white",
      padding: 24,
      borderRadius: 8,
      minWidth: 300
    }}>
      <h3 style={{ marginTop: 0 }}>Add New Episode</h3>
      <form onSubmit={(e) => {
        e.preventDefault();
        addEpisode();
      }}>
        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            value={newEpisodeName}
            onChange={(e) => setNewEpisodeName(e.target.value)}
            placeholder="Episode name"
            style={{
              width: "100%",
              padding: "6px 8px",
              borderRadius: 4,
              border: "1px solid #ccc"
            }}
            autoFocus
          />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button 
            type="button" 
            onClick={() => setShowAddEpisodeModal(false)}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={!newEpisodeName.trim() || loading}
            style={{ fontWeight: 600 }}
          >
            {loading ? "Creating..." : "Create Episode"}
          </button>
        </div>
      </form>
    </div>
  </div>
)}
  </DragDropContext>
);
}
