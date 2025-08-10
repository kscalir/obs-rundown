import React, { useState, useEffect, useRef } from "react";
import { Droppable, Draggable, DragDropContext } from "@hello-pangea/dnd";
import ModulesPanel from "./ModulesPanel";
import PropertiesPanel from "./PropertiesPanel";
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

// --- Styles (originally from RundownList.jsx) ---
const STYLES = {
  // Segment styles
  segmentContainer: {
    marginBottom: "18px",
    background: "#e3f2fd",
    borderRadius: "10px",
    boxShadow: "0 2px 8px rgba(25,118,210,0.07)",
    padding: "0 24px 0 0",
    maxWidth: "100%",
    boxSizing: "border-box",
    overflow: "visible"
  },
  segmentHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "16px 24px 16px 20px",
    fontWeight: 700,
    fontSize: "1.18rem",
    color: "#1976d2",
    background: "none",
    cursor: "pointer",
    position: "relative"
  },
  segmentContent: {
    paddingBottom: "24px"
  },
  addButton: {
    background: "#1976d2",
    border: "none",
    color: "#fff",
    padding: "7px 22px",
    borderRadius: "999px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "1em",
    boxShadow: "0 1px 4px rgba(25,118,210,0.10)",
    marginLeft: "8px",
    letterSpacing: "0.02em",
    outline: "none",
    transition: "background 0.2s, box-shadow 0.2s, filter 0.2s, opacity 0.2s"
  },
  deleteButton: {
    background: "none",
    border: "none",
    color: "rgba(255,87,34,0.55)",
    cursor: "pointer",
    borderRadius: "50%",
    padding: "2px 4px",
    fontSize: "1.1em",
    marginLeft: "8px",
    opacity: 0.65,
    transition: "opacity 0.2s, color 0.2s"
  },
  editInput: {
    padding: "6px",
    borderRadius: "4px",
    border: "1px solid #ddd",
    width: "calc(100% - 30px)",
    fontSize: "1em"
  },
  
  // Group styles
  groupContainer: {
    margin: "12px 24px 12px 24px",
    background: "#fafdff",
    borderRadius: "8px",
    boxShadow: "0 1px 4px rgba(25,118,210,0.05)",
    padding: 0,
    overflow: "visible"
  },
  groupHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 18px 10px 16px",
    fontWeight: 600,
    color: "#1565c0",
    background: "none",
    cursor: "pointer",
    position: "relative"
  },
  groupContent: {
    paddingBottom: "16px",
    overflow: "visible"
  },
  
  // Item styles
  itemsContainer: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    minHeight: "20px",
    overflow: "visible"
  },
  itemContainer: {
    background: "#fff",
    borderRadius: "6px",
    margin: "8px 18px",
    padding: "10px 18px",
    color: "#333",
    fontWeight: 500,
    boxShadow: "0 1px 4px rgba(25,118,210,0.07)",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    justifyContent: "space-between",
    minHeight: "44px"
  },
  
  // Placeholder styles
  placeholder: {
    padding: "15px",
    color: "#999",
    textAlign: "center",
    fontStyle: "italic"
  },
  
  // Draggable styles
  draggingOver: {
    backgroundColor: "#e3f2fd",
    borderColor: "#2196f3"
  },
  dragging: {
    opacity: 0.5
  },
  
  // Container styles - FIXED
  container: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden"
  },
  scrollableContent: {
    flex: 1,
    overflowY: "auto",
    overflowX: "hidden",
    padding: "0 10px 10px 10px",
    minHeight: 0 // This is crucial for flex scrolling
  }
};

// Ensure the page fills the viewport and disables unwanted scrollbars
if (typeof window !== "undefined") {
  document.documentElement.style.height = "100%";
  document.body.style.height = "100%";
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
}

export default function RundownView({ showId, showName: showNameProp, selectedTab, onBackToShows }) {
  // --- Panel Resizing State ---
  const [toolboxWidth, setToolboxWidth] = useState(220);
  const [propertiesWidth, setPropertiesWidth] = useState(300);
  const draggingRef = useRef(null); // 'toolbox' | 'properties' | null
  const startXRef = useRef(0);
  const startWidthsRef = useRef({ toolbox: 220, properties: 300 });

  useEffect(() => {
    function onMouseMove(e) {
      if (!draggingRef.current) return;
      const dx = e.clientX - startXRef.current;
      if (draggingRef.current === "toolbox") {
        let newToolbox = Math.max(120, Math.min(400, startWidthsRef.current.toolbox + dx));
        setToolboxWidth(newToolbox);
      } else if (draggingRef.current === "properties") {
        let newProperties = Math.max(120, startWidthsRef.current.properties - dx);
        setPropertiesWidth(newProperties);
      }
      document.body.style.cursor = "ew-resize";
    }
    function onMouseUp() {
      if (draggingRef.current) {
        draggingRef.current = null;
        document.body.style.cursor = "";
      }
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  function startDrag(panel, e) {
    draggingRef.current = panel;
    startXRef.current = e.clientX;
    startWidthsRef.current = { toolbox: toolboxWidth, properties: propertiesWidth };
    document.body.style.cursor = "ew-resize";
    e.preventDefault();
  }
  console.log("RundownView rendering with showId:", showId);
  
  // --- States from RundownTab ---
  const [segments, setSegments] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mediaError, setMediaError] = useState(null);
  const [showAddEpisodeModal, setShowAddEpisodeModal] = useState(false);
  const [newEpisodeName, setNewEpisodeName] = useState("");
  const [editingType, setEditingType] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [draggedModule, setDraggedModule] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showProperties, setShowProperties] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  // --- Show name state: use prop if provided, else fetch ---
  const [showName, setShowName] = useState(showNameProp || "");
  useEffect(() => {
    if (showNameProp) {
      setShowName(showNameProp);
      return;
    }
    if (!showId) return;
    fetch(`${API_BASE_URL}/api/shows/${showId}`)
      .then(async res => {
        if (!res.ok) throw new Error("Failed to fetch show");
        const data = await res.json();
        if (data && typeof data === 'object') {
          if (data.name) setShowName(data.name);
          else if (data.show && data.show.name) setShowName(data.show.name);
          else setShowName("(Untitled Show)");
        } else {
          setShowName("(Untitled Show)");
        }
      })
      .catch(() => setShowName("(Untitled Show)"));
  }, [showId, showNameProp]);

  // --- Selected tab state handling ---
  const [internalSelectedTab, setInternalSelectedTab] = useState(selectedTab);
  useEffect(() => setInternalSelectedTab(selectedTab), [selectedTab]);
  
  // --- Refs ---
  const inputRef = useRef(null);
  
  // --- Load episodes ---
  useEffect(() => {
    console.log("Episodes useEffect running with showId:", showId);
    
    if (!showId) {
      console.log("No showId provided, skipping episode load");
      return;
    }
    
    setLoading(true);
    const url = `${API_BASE_URL}/api/shows/${showId}/episodes`;
    console.log("Fetching episodes from:", url);
    
    fetch(url)
      .then(res => {
        console.log("Episodes API response status:", res.status);
        if (!res.ok) throw new Error("Failed to fetch episodes");
        return res.json();
      })
      .then(data => {
        console.log("Loaded episodes data:", data);
        setEpisodes(data);
        
        // Get previously selected episode from localStorage
        const savedEpisodeId = localStorage.getItem(SELECTED_EPISODE_KEY);
        console.log("Saved episode ID from localStorage:", savedEpisodeId);
        
        if (savedEpisodeId) {
          const savedEpisode = data.find(e => e.id === parseInt(savedEpisodeId));
          if (savedEpisode) {
            console.log("Found saved episode:", savedEpisode);
            setSelectedEpisode(savedEpisode);
            return;
          }
        }
        
        // If no saved episode or it doesn't exist, select the first one
        if (data.length > 0) {
          console.log("Selecting first episode:", data[0]);
          setSelectedEpisode(data[0]);
        }
      })
      .catch(err => {
        console.error("Error loading episodes:", err);
      })
      .finally(() => setLoading(false));
  }, [showId, refreshKey]); // Add refreshKey as a dependency
  
  // --- Load segments when episode changes ---
  useEffect(() => {
    if (!selectedEpisode?.id) {
      setSegments([]);
      return;
    }
    
    localStorage.setItem(SELECTED_EPISODE_KEY, selectedEpisode.id);
    
    fetchSegments(selectedEpisode.id);
  }, [selectedEpisode?.id, refreshKey]);
  
  // --- Fetch segments function ---
  const fetchSegments = async (episodeId) => {
    if (!episodeId) return;
    
    setLoading(true);
    try {
      console.log(`Fetching segments for episode ${episodeId}`);
      const res = await fetch(`${API_BASE_URL}/api/episodes/${episodeId}/segments?include=groups,items`);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Failed to fetch segments: ${res.status} ${errorText}`);
        throw new Error(`Failed to fetch segments: ${res.status}`);
      }
      
      const data = await res.json();
      console.log(`Received ${data.length} segments with their groups and items`);
      
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
  
  // --- Toggle segment expansion ---
  const toggleSegment = (segmentId) => {
    setSegments(prev => prev.map(segment => 
      segment.id === segmentId 
        ? { ...segment, expanded: !segment.expanded } 
        : segment
    ));
  };
  
  // --- Toggle group expansion ---
  const toggleGroup = (segmentId, groupId) => {
    setSegments(prev => prev.map(segment => 
      segment.id === segmentId 
        ? {
            ...segment,
            groups: segment.groups.map(group => 
              group.id === groupId 
                ? { ...group, expanded: !group.expanded } 
                : group
            )
          } 
        : segment
    ));
  };
  
  // --- Add segment ---
  const addSegment = async () => {
    if (!selectedEpisode) return;
    
    setEditingType("segment");
    setEditingId("new");
    setEditingValue("New Segment");
    
    // Focus the input once it renders
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 10);
  };
  
  // --- Add group ---
  const addGroup = async (segmentId) => {
    if (!selectedEpisode) return;
    
    setEditingType("group");
    setEditingId(`new-${segmentId}`);
    setEditingValue("New Cue");
    
    // Focus the input once it renders
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 10);
  };
  
  // --- Edit segment ---
  const handleEditSegment = (id, title) => {
    console.log(`Editing segment ${id} with title: ${title}`);
    
    if (title === null) {
      console.log("Cancelling segment edit");
      setEditingType(null);
      setEditingId(null);
      setEditingValue("");
      return;
    }
    
    // Clear editing state immediately to prevent UI issues
    setEditingType(null);
    setEditingId(null);
    setEditingValue("");
    
    if (id === "new") {
      if (!title.trim()) {
        console.log("Empty segment title, cancelling");
        return;
      }
      
      console.log(`Creating new segment "${title}" in episode ${selectedEpisode.id}`);
      
      fetch(`${API_BASE_URL}/api/episodes/${selectedEpisode.id}/segments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: title.trim(),
          position: segments.length 
        })
      })
        .then(async res => {
          console.log("Create segment response status:", res.status);
          if (!res.ok) {
            const errorText = await res.text();
            console.error("Create segment error:", errorText);
            throw new Error(`Failed to create segment: ${res.status} ${errorText}`);
          }
          return res.json();
        })
        .then(data => {
          console.log("Created segment:", data);
          // Refresh the segments list
          fetchSegments(selectedEpisode.id);
        })
        .catch(err => {
          console.error("Error creating segment:", err);
          alert(`Error creating segment: ${err.message}`);
        });
    } else {
      console.log(`Updating segment ${id} with title "${title}"`);
      
      fetch(`${API_BASE_URL}/api/segments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() })
      })
        .then(async res => {
          console.log("Update segment response status:", res.status);
          if (!res.ok) {
            const errorText = await res.text();
            console.error("Update segment error:", errorText);
            throw new Error(`Failed to update segment: ${res.status} ${errorText}`);
          }
          return res.json();
        })
        .then(data => {
          console.log("Updated segment:", data);
          // Update local state immediately for better UX
          setSegments(prevSegments => 
            prevSegments.map(segment => 
              segment.id === id 
                ? { ...segment, title: title.trim() } 
                : segment
            )
          );
          // Also refresh to ensure consistency
          fetchSegments(selectedEpisode.id);
        })
        .catch(err => {
          console.error("Error updating segment:", err);
          alert(`Error updating segment: ${err.message}`);
        });
    }
  };
  
  // --- Edit group ---
  const handleEditGroup = (segmentId, groupId, title) => {
    console.log(`Editing group ${groupId} in segment ${segmentId} with title: ${title}`);
    
    if (title === null) {
      // Cancel edit
      console.log("Cancelling group edit");
      setEditingType(null);
      setEditingId(null);
      return;
    }
    
    // Store original editing state in case we need to restore it after error
    const originalEditingType = editingType;
    const originalEditingId = editingId;
    
    // Clear editing state first
    setEditingType(null);
    setEditingId(null);
    
    if (groupId === "new") {
      // Create new group
      if (!title.trim()) {
        console.log("Empty group title, cancelling");
        return;
      }
      
      console.log(`Creating new group "${title}" in segment ${segmentId}`);
      
      fetch(`${API_BASE_URL}/api/segments/${segmentId}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title,
          position: segments.find(s => s.id === segmentId)?.groups.length || 0
        })
      })
        .then(res => {
          console.log("Create group response status:", res.status);
          if (!res.ok) {
            console.error("Create group response text:", res.statusText);
            throw new Error("Failed to create group");
          }
          return res.json();
        })
        .then(data => {
          console.log("Created group:", data);
          // Update local state immediately for better UX
          setSegments(prevSegments => 
            prevSegments.map(segment => 
              segment.id === segmentId 
                ? { 
                    ...segment, 
                    groups: [...segment.groups, { ...data, expanded: true, items: [] }] 
                  } 
                : segment
            )
          );
          setRefreshKey(k => k + 1);
        })
        .catch(err => {
          console.error("Error creating group:", err);
          // Restore editing state if there was an error
          setEditingType(originalEditingType);
          setEditingId(originalEditingId);
          setEditingValue(title);
        });
    } else {
      // Update existing group
      console.log(`Updating group ${groupId} with title "${title}"`);
      
      fetch(`${API_BASE_URL}/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title })
      })
        .then(res => {
          console.log("Update group response status:", res.status);
          if (!res.ok) {
            console.error("Update group response text:", res.statusText);
            throw new Error("Failed to update group");
          }
          return res.json();
        })
        .then(data => {
          console.log("Updated group:", data);
          // Update local state immediately for better UX
          setSegments(prevSegments => 
            prevSegments.map(segment => 
              segment.id === segmentId 
                ? { 
                    ...segment, 
                    groups: segment.groups.map(group => 
                      group.id === groupId 
                        ? { ...group, title: title } 
                        : group
                    )
                  } 
                : segment
            )
          );
          setRefreshKey(k => k + 1);
        })
        .catch(err => {
          console.error("Error updating group:", err);
          // Restore editing state if there was an error
          setEditingType(originalEditingType);
          setEditingId(originalEditingId);
          setEditingValue(title);
        });
    }
  };
  
  // --- Edit item ---
  const handleEditItem = (itemId, title) => {
    console.log(`Editing item ${itemId} with title: ${title}`);
    
    if (title === null) {
      // Cancel edit
      setEditingType(null);
      setEditingId(null);
      setEditingValue("");
      return;
    }
    
    // Clear editing state immediately
    setEditingType(null);
    setEditingId(null);
    setEditingValue("");
    
    fetch(`${API_BASE_URL}/api/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        title: title.trim(),
      })
    })
      .then(async res => {
        console.log("Update item response status:", res.status);
        if (!res.ok) {
          const errorText = await res.text();
          console.error("Update item error:", errorText);
          throw new Error(`Failed to update item: ${res.status} ${errorText}`);
        }
        return res.json();
      })
      .then(data => {
        console.log("Updated item:", data);
        // Update local state
        setSegments(prevSegments => 
          prevSegments.map(segment => ({
            ...segment,
            groups: segment.groups.map(group => ({
              ...group,
              items: group.items.map(item => 
                item.id === itemId 
                  ? { ...item, title: title.trim() }
                  : item
              )
            }))
          }))
        );
        // Also refresh to ensure consistency
        if (selectedEpisode) {
          fetchSegments(selectedEpisode.id);
        }
      })
      .catch(err => {
        console.error("Error updating item:", err);
        alert(`Error updating item: ${err.message}`);
      });
  };
  
  // --- Delete segment ---
  const handleDeleteSegment = (segmentId) => {
    // Confirm deletion
    if (!window.confirm("Are you sure you want to delete this segment and all its contents?")) {
      return;
    }
    
    fetch(`${API_BASE_URL}/api/segments/${segmentId}`, {
      method: "DELETE"
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to delete segment");
        return res.json();
      })
      .then(() => {
        setRefreshKey(k => k + 1);
      })
      .catch(err => {
        console.error("Error deleting segment:", err);
      });
  };
  
  // --- Delete group ---
  const handleDeleteGroup = (groupId) => {
    // Confirm deletion
    if (!window.confirm("Are you sure you want to delete this group and all its items?")) {
      return;
    }
    
    fetch(`${API_BASE_URL}/api/groups/${groupId}`, {
      method: "DELETE"
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to delete group");
        return res.json();
      })
      .then(() => {
        setRefreshKey(k => k + 1);
      })
      .catch(err => {
        console.error("Error deleting group:", err);
      });
  };
  
  // --- Delete item ---
  const handleDeleteItem = (itemId) => {
    fetch(`${API_BASE_URL}/api/items/${itemId}`, {
      method: "DELETE"
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to delete item");
        return res.json();
      })
      .then(() => {
        setRefreshKey(k => k + 1);
      })
      .catch(err => {
        console.error("Error deleting item:", err);
      });
  };

  // --- Handle item click ---
  const handleItemClick = (item) => {
    console.log('Item clicked:', item);
    if (item && item.id) {
      setSelectedItem(item.id);
      setShowProperties(true);
    }
  };
  
  // --- Handle drag start ---
  const handleDragStart = (result) => {
    const { draggableId } = result;
    if (draggableId.startsWith("toolbox-")) {
      const [_, moduleType] = draggableId.split("-");
      setDraggedModule(moduleType);
    }
  };
  
  // --- Handle drag end ---
  const handleDragEnd = async (result) => {
     console.log("handleDragEnd called with:", result);
  console.log("source:", result.source);
  console.log("destination:", result.destination);
  console.log("draggableId:", result.draggableId);
    setDraggedModule(null);
    const { source, destination, draggableId, type } = result;

    if (!destination) return;

    // --- Handle item drag from toolbox to rundown ---
    if (source.droppableId === "toolbox" && destination.droppableId.startsWith("items-")) {
      const [itemPrefix, moduleId, ...sceneNameParts] = draggableId.split("-");
      let moduleType, itemTitle, itemData;
      
      // Handle OBS scene drops
      if (moduleId === "obsscene") {
        moduleType = "obscommand";
        const sceneName = sceneNameParts.join("-"); // Rejoin in case scene name has dashes
        itemTitle = `Switch to Scene: ${sceneName}`;
        itemData = {
          command: "SetCurrentProgramScene",
          parameters: {
            sceneName: sceneName
          }
        };
      } else {
        // Handle regular module drops
        moduleType = moduleId;
        itemTitle = `New ${moduleType}`;
        itemData = {};
      }
      
      // Extract segmentId and groupId from destination droppableId
      const [_, segmentId, groupId] = destination.droppableId.split("-");
      
      console.log("Adding new item:", { moduleType, segmentId, groupId, draggableId });
      
      try {
        console.log('Creating new item:', {
          type: moduleType,
          group_id: parseInt(groupId),
          position: destination.index,
          title: itemTitle,
          data: itemData
        });
        
        const res = await fetch(`${API_BASE_URL}/api/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: moduleType,
            group_id: parseInt(groupId),
            position: destination.index,
            title: itemTitle,
            data: itemData
          })
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error(`Failed to create item: ${res.status} ${errorText}`);
          throw new Error("Failed to create item");
        }
        
        const newItem = await res.json();
        console.log('Created new item:', newItem);
        
        // Parse the data field if it's a string
        if (newItem.data && typeof newItem.data === 'string') {
          try {
            newItem.data = JSON.parse(newItem.data);
          } catch (e) {
            newItem.data = {};
          }
        }
        
        // Update the local state immediately 
        setSegments(prevSegments => {
          return prevSegments.map(seg => {
            if (seg.id === parseInt(segmentId)) {
              return {
                ...seg,
                groups: seg.groups.map(g => {
                  if (g.id === parseInt(groupId)) {
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
          setSelectedItem(newItem.id); // Fix: use newItem.id instead of newItem
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
      
      // Find the group - use == instead of ===
      const segment = segments.find(s => s.id == segmentId); // Change === to ==
      const group = segment?.groups.find(g => g.id == groupId); // Change === to ==
      if (!group) return;
      
      // Create new array with item moved to new position
      const newItems = [...group.items];
      const [removed] = newItems.splice(source.index, 1);
      newItems.splice(destination.index, 0, removed);
      
      // Update the state immediately
      setSegments(prevSegments => {
        return prevSegments.map(seg => {
          if (seg.id == segmentId) { // Change === to ==
            return {
              ...seg,
              groups: seg.groups.map(g => {
                if (g.id == groupId) { // Change === to ==
                  return { ...g, items: newItems };
                }
                return g;
              })
            };
          }
          return seg;
        });
      });
      
      // Log what we're trying to do
      console.log(`Reordering items in group ${groupId}:`, 
        newItems.map((item, idx) => ({ id: item.id, position: idx }))
      );
      
      // Update in database - use individual PATCH calls for each item
      try {
        console.log("Reordering items in group:", groupId);
        
        // Use individual updates for each item
        const results = await Promise.all(
          newItems.map(async (item, idx) => {
            const response = await fetch(`${API_BASE_URL}/api/items/${item.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ position: idx })
            });
            
            console.log(`Item ${item.id} position update status:`, response.status);
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error(`Item ${item.id} update error:`, errorText);
              throw new Error(`Failed to update item ${item.id}: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`Item ${item.id} update response:`, data);
            return data;
          })
        );
        
        console.log("All item position updates completed:", results);
        
      } catch (err) {
        console.error("Error updating item positions:", err);
        // On error, refresh from server to restore correct state
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
      const [destPrefix, destSegmentId, destGroupId] = destination.droppableId.split("-");
      const [itemPrefix, itemId] = draggableId.split("-");
      
      // Find source and destination segments/groups
      const srcSegment = segments.find(s => s.id == srcSegmentId);
      const destSegment = segments.find(s => s.id == destSegmentId);
      const srcGroup = srcSegment?.groups.find(g => g.id == srcGroupId);
      const destGroup = destSegment?.groups.find(g => g.id == destGroupId);
      
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
          if (seg.id == srcSegmentId && seg.id == destSegmentId) {
            // Both groups are in the same segment - handle both updates together
            return {
              ...seg,
              groups: seg.groups.map(g => {
                if (g.id == srcGroupId) {
                  return { ...g, items: srcItems };
                }
                if (g.id == destGroupId) {
                  return { ...g, items: destItems };
                }
                return g;
              })
            };
          } else if (seg.id == srcSegmentId) {
            // Only source segment
            return {
              ...seg,
              groups: seg.groups.map(g => {
                if (g.id == srcGroupId) {
                  return { ...g, items: srcItems };
                }
                return g;
              })
            };
          } else if (seg.id == destSegmentId) {
            // Only destination segment
            return {
              ...seg,
              groups: seg.groups.map(g => {
                if (g.id == destGroupId) {
                  return { ...g, items: destItems };
                }
                return g;
              })
            };
          }
          return seg;
        });
      });
      
      // Update in database using PATCH instead of the non-existent /move endpoint
      try {
        console.log(`Moving item ${item.id} from group ${srcGroupId} to group ${destGroupId} at position ${destination.index}`);
        
        const response = await fetch(`${API_BASE_URL}/api/items/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            group_id: parseInt(destGroupId),
            position: destination.index
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Group move error:`, errorText);
          throw new Error(`Failed to move group: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Group move response:`, data);
        
      } catch (err) {
        console.error("Error moving group:", err);
        // On error, refresh from server
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
      
      // Update in database - use individual PATCH calls for each segment
      try {
        console.log("Reordering segments:", newSegments.map((s, idx) => ({ id: s.id, position: idx })));
        
        // Update each segment's position individually
        const results = await Promise.all(
          newSegments.map((segment, idx) => 
            fetch(`${API_BASE_URL}/api/segments/${segment.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ position: idx })
            })
            .then(res => {
              console.log(`Segment ${segment.id} position update status:`, res.status);
              return res.json();
            })
            .then(data => {
              console.log(`Segment ${segment.id} update response:`, data);
              return data;
            })
          )
        );
        
        console.log("All segment position updates completed:", results);
        
        // Force a refresh to ensure UI reflects server state
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
      const segment = segments.find(s => s.id == segmentId); // Change === to ==
      if (!segment) return;
      
      // Create a new array with reordered groups
      const newGroups = [...segment.groups];
      const [removed] = newGroups.splice(source.index, 1);
      newGroups.splice(destination.index, 0, removed);
      
      // Update state immediately
      setSegments(prevSegments => 
        prevSegments.map(seg => 
          seg.id == segmentId  // Change === to ==
            ? { ...seg, groups: newGroups }
            : seg
        )
      );
      
      // Update in database - use individual PATCH calls for each group
      try {
        console.log("Reordering groups:", newGroups.map((g, idx) => ({ id: g.id, position: idx })));
        
        // Update each group's position individually
        const results = await Promise.all(
          newGroups.map(async (group, idx) => {
            const response = await fetch(`${API_BASE_URL}/api/groups/${group.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ position: idx })
            });
            
            console.log(`Group ${group.id} position update status:`, response.status);
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error(`Group ${group.id} update error:`, errorText);
              throw new Error(`Failed to update group ${group.id}: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`Group ${group.id} update response:`, data);
            return data;
          })
        );
        
        console.log("All group position updates completed:", results);
        
      } catch (err) {
        console.error("Error updating group positions:", err);
        // On error, refresh from server to restore correct state
        if (selectedEpisode) {
          fetchSegments(selectedEpisode.id);
        }
      }
      return;
    }

    // --- Handle group moving between segments ---
    if (type === "group" && 
        source.droppableId.startsWith("groups-") && 
        destination.droppableId.startsWith("groups-") && 
        source.droppableId !== destination.droppableId) {
      
      const srcSegmentId = source.droppableId.split("-")[1];
      const destSegmentId = destination.droppableId.split("-")[1];
      
      const srcSegment = segments.find(s => s.id == srcSegmentId);
      const destSegment = segments.find(s => s.id == destSegmentId);
      
      if (!srcSegment || !destSegment) return;
      
      // Get the group being moved
      const group = srcSegment.groups[source.index];
      
      // Create new arrays for both segments
      const srcGroups = [...srcSegment.groups];
      srcGroups.splice(source.index, 1);
      
      const destGroups = [...destSegment.groups];
      destGroups.splice(destination.index, 0, group);
      
      // Update state immediately
      setSegments(prevSegments => 
        prevSegments.map(seg => {
          if (seg.id == srcSegmentId) {
            return { ...seg, groups: srcGroups };
          }
          if (seg.id == destSegmentId) {
            return { ...seg, groups: destGroups };
          }
          return seg;
        })
      );
      
      // Update in database
      try {
        console.log(`Moving group ${group.id} from segment ${srcSegmentId} to segment ${destSegmentId} at position ${destination.index}`);
        
        const response = await fetch(`${API_BASE_URL}/api/groups/${group.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            segment_id: parseInt(destSegmentId),
            position: destination.index 
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Group move error:`, errorText);
          throw new Error(`Failed to move group: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Group move response:`, data);
        
      } catch (err) {
        console.error("Error moving group:", err);
        // On error, refresh from server to restore correct state
        if (selectedEpisode) {
          fetchSegments(selectedEpisode.id);
        }
      }
      return;
    }
  };
// Find the selected item from the segments state
const getSelectedItem = () => {
  if (!selectedItem) return null;
  
  for (const segment of segments) {
    for (const group of segment.groups || []) {
      const item = (group.items || []).find(item => item.id === selectedItem);
      if (item) return item;
    }
  }
  return null;
};

  // --- Render item component (from RundownList) ---
  const renderItem = (item, dragProvided) => {
    const getItemIcon = (type) => {
      switch (type) {
        case "graphics":
        case "graphicstemplate":
        case "toolbox-graphicstemplate":
          return "🖼️";
        case "obscommand":
        case "toolbox-obscommand":
          return "🎬";
        case "presenternote":
        case "toolbox-presenternote":
          return "📝";
        case "video":
        case "toolbox-video":
          return "🎥";
        case "audio":
        case "toolbox-audio":
          return "🔊";
        default:
          return "📄";
      }
    };

    return (
      <li
        ref={dragProvided.innerRef}
        {...dragProvided.draggableProps}
        {...dragProvided.dragHandleProps}
        onClick={() => handleItemClick(item)}
        style={{
          ...STYLES.itemContainer,
          ...dragProvided.draggableProps.style,
          backgroundColor: selectedItem === item.id ? "#e3f2fd" : "#fff",
          border: selectedItem === item.id ? "2px solid #1976d2" : "1.5px solid #b1c7e7",
          cursor: "pointer",
          boxShadow: selectedItem === item.id ? "0 2px 8px rgba(25,118,210,0.13)" : STYLES.itemContainer.boxShadow
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
          <span style={{ fontSize: "1.2em" }}>{getItemIcon(item.type)}</span>
          <span style={{ flex: 1, fontWeight: 500 }}>
            {item.title || item.data?.title || "Untitled Item"}
          </span>
        </div>
        <DeleteButtonWithHover
          onClick={e => {
            e.stopPropagation();
            handleDeleteItem(item.id);
          }}
          title="Delete item"
        >
          🗑
        </DeleteButtonWithHover>
      </li>
    );
  };

  // --- Render group component (from RundownList) ---
  const renderGroup = (segmentId, group, index) => {
    return (
      <Draggable 
        key={group.id} 
        draggableId={`group-${group.id}`} 
        index={index}
      >
        {(dragProvided, dragSnapshot) => (
          <div
            ref={dragProvided.innerRef}
            {...dragProvided.draggableProps}
            style={{
              ...STYLES.groupContainer,
              ...dragProvided.draggableProps.style,
              ...(dragSnapshot.isDragging ? STYLES.dragging : {})
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
              {/* Expand/collapse arrow at left, always visible, large clickable area */}
              <button
                onClick={e => {
                  e.stopPropagation();
                  toggleGroup(segmentId, group.id);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: group.expanded ? "#1976d2" : "#b1c7e7",
                  fontSize: "1.3em",
                  marginRight: "8px",
                  cursor: "pointer",
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "color 0.2s"
                }}
                tabIndex={-1}
                aria-label={group.expanded ? "Collapse cue" : "Expand cue"}
              >
                <span style={{ display: "inline-block", transform: group.expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▶</span>
              </button>
              {/* Title and edit */}
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                {editingType === "group" && editingId === group.id ? (
                  <input
                    ref={inputRef}
                    value={editingValue}
                    onChange={e => setEditingValue(e.target.value)}
                    onBlur={() => handleEditGroup(segmentId, group.id, editingValue)}
                    onKeyDown={e => {
                      if (e.key === "Enter") handleEditGroup(segmentId, group.id, editingValue);
                      if (e.key === "Escape") handleEditGroup(segmentId, group.id, null);
                    }}
                    style={STYLES.editInput}
                    autoFocus
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <span 
                    onClick={e => {
                      e.stopPropagation();
                      setEditingType("group");
                      setEditingId(group.id);
                      setEditingValue(group.title || "");
                    }}
                    style={{ cursor: "text", fontWeight: 600 }}
                  >
                    {group.title || "Untitled Cue"}
                  </span>
                )}
              </div>
              <DeleteButtonWithHover
                onClick={e => {
                  e.stopPropagation();
                  handleDeleteGroup(group.id);
                }}
                title="Delete cue"
              >
                🗑
              </DeleteButtonWithHover>
            </div>
            {group.expanded && (
              <div style={{ ...STYLES.groupContent, overflow: "visible" }}>
                <Droppable 
                  droppableId={`items-${segmentId}-${group.id}`}
                  type="item"
                >
                  {(dropProvided, dropSnapshot) => (
                    <ul
                      ref={dropProvided.innerRef}
                      style={{
                        ...STYLES.itemsContainer,
                        ...(dropSnapshot.isDraggingOver ? STYLES.draggingOver : {})
                      }}
                      {...dropProvided.droppableProps}
                    >
                      {group.items.map((item, idx) => (
                        <Draggable
                          key={item.id}
                          draggableId={`item-${item.id}`}
                          index={idx}
                        >
                          {(itemDragProvided) => renderItem(item, itemDragProvided)}
                        </Draggable>
                      ))}
                      {dropProvided.placeholder}
                      {(!group.items || group.items.length === 0) && !dropSnapshot.isDraggingOver && (
                        <li style={STYLES.placeholder}>
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
    );
  };

  // --- Render segment component (from RundownList) ---
  const renderSegment = (segment, index) => {
    return (
      <Draggable 
        key={segment.id} 
        draggableId={`segment-${segment.id}`} 
        index={index}
      >
        {(dragProvided, dragSnapshot) => (
          <div
            ref={dragProvided.innerRef}
            {...dragProvided.draggableProps}
            style={{
              ...STYLES.segmentContainer,
              ...dragProvided.draggableProps.style,
              ...(dragSnapshot.isDragging ? STYLES.dragging : {})
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
              {/* Expand/collapse arrow at left, always visible, large clickable area */}
              <button
                onClick={e => {
                  e.stopPropagation();
                  toggleSegment(segment.id);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: segment.expanded ? "#1976d2" : "#b1c7e7",
                  fontSize: "1.5em",
                  marginRight: "10px",
                  cursor: "pointer",
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "color 0.2s"
                }}
                tabIndex={-1}
                aria-label={segment.expanded ? "Collapse segment" : "Expand segment"}
              >
                <span style={{ display: "inline-block", transform: segment.expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▶</span>
              </button>
              {/* Title and edit */}
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                {editingType === "segment" && editingId === segment.id ? (
                  <input
                    ref={inputRef}
                    value={editingValue}
                    onChange={e => setEditingValue(e.target.value)}
                    onBlur={() => handleEditSegment(segment.id, editingValue)}
                    onKeyDown={e => {
                      if (e.key === "Enter") handleEditSegment(segment.id, editingValue);
                      if (e.key === "Escape") handleEditSegment(segment.id, null);
                    }}
                    style={STYLES.editInput}
                    autoFocus
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <span
                    onClick={e => {
                      e.stopPropagation();
                      setEditingType("segment");
                      setEditingId(segment.id);
                      setEditingValue(segment.title || "");
                    }}
                    style={{ cursor: "text", fontWeight: 700 }}
                  >
                    {segment.title || "Untitled Segment"}
                  </span>
                )}
              </div>
              <AddButtonWithHover
                onClick={e => {
                  e.stopPropagation();
                  addGroup(segment.id);
                }}
                title="Add cue"
                style={{
                  padding: "1.5px 8px",
                  fontSize: "0.92em",
                  height: 24,
                  minWidth: 0,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginLeft: 8,
                  background: "#e3f2fd",
                  color: "#1976d2",
                  border: "1px solid #b1c7e7",
                  boxShadow: "none",
                  fontWeight: 500,
                  transition: "background 0.15s, border 0.15s"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#d2e6fa';
                  e.currentTarget.style.border = '1px solid #1976d2';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#e3f2fd';
                  e.currentTarget.style.border = '1px solid #b1c7e7';
                }}
              >
                + Cue
              </AddButtonWithHover>
              <DeleteButtonWithHover
                onClick={e => {
                  e.stopPropagation();
                  handleDeleteSegment(segment.id);
                }}
                title="Delete segment"
              >
                🗑
              </DeleteButtonWithHover>
            </div>
            {segment.expanded && (
              <div style={STYLES.segmentContent}>
                {editingType === "group" && editingId === `new-${segment.id}` && (
                  <div style={{ margin: "10px 0" }}>
                    <input
                      ref={inputRef}
                      value={editingValue}
                      onChange={e => setEditingValue(e.target.value)}
                      onBlur={() => handleEditGroup(segment.id, "new", editingValue)}
                      onKeyDown={e => {
                        if (e.key === "Enter") handleEditGroup(segment.id, "new", editingValue);
                        if (e.key === "Escape") handleEditGroup(segment.id, "new", null);
                      }}
                      style={STYLES.editInput}
                      autoFocus
                    />
                  </div>
                )}
                {/* Droppable for groups (cues) - enables drag and drop reordering of groups */}
                <Droppable droppableId={`groups-${segment.id}`} type="group">
                  {(dropProvided, dropSnapshot) => (
                    <div
                      ref={dropProvided.innerRef}
                      {...dropProvided.droppableProps}
                      style={{
                        minHeight: "10px",
                        ...(dropSnapshot.isDraggingOver ? STYLES.draggingOver : {})
                      }}
                    >
                      {segment.groups.map((group, idx) => (
                        <Draggable key={group.id} draggableId={`group-${group.id}`} index={idx}>
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              style={{
                                ...STYLES.groupContainer,
                                ...dragProvided.draggableProps.style,
                                ...(dragSnapshot.isDragging ? STYLES.dragging : {})
                              }}
                            >
                              {/* Drag handle for group (cue) */}
                              <div {...dragProvided.dragHandleProps} style={{ display: "inline-block", cursor: "grab", marginRight: 4, padding: 2 }} title="Drag cue">≡</div>
                              {/* Render group content */}
                              {renderGroup(segment.id, group, idx)}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {dropProvided.placeholder}
                      {segment.groups.length === 0 && (
                        <div style={STYLES.placeholder}>
                          No cues in this segment. Click "+ Cue" to add one.
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            )}
          </div>
        )}
      </Draggable>
    );
  };

  // --- Main render ---
  return (
    <DragDropContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
    <div style={{
      display: "flex",
      height: "100%",
      width: "100%",
      minHeight: 0,
      minWidth: 0,
      overflow: "hidden",
      boxSizing: "border-box"
    }}>
      {/* Top Bar: Back to Shows and Show Name */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100vw",
        zIndex: 100,
        background: "#fafdff",
        borderBottom: "1.5px solid #e1e6ec",
        display: "flex",
        alignItems: "center",
        padding: "0 0 0 16px",
        height: 48,
        boxSizing: "border-box"
      }}>
        <button
          onClick={() => {
            console.log('Back to Shows button clicked');
            if (typeof onBackToShows === 'function') {
              onBackToShows();
            } else {
              window.location = '/';
            }
          }}
          style={{
            background: "#e3f2fd",
            color: "#1976d2",
            border: "1px solid #b1c7e7",
            borderRadius: 8,
            padding: "4px 14px",
            fontWeight: 500,
            fontSize: 15,
            marginRight: 18,
            marginTop: 2,
            cursor: "pointer",
            boxShadow: "none",
            transition: "background 0.15s, border 0.15s"
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#d2e6fa';
            e.currentTarget.style.border = '1px solid #1976d2';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#e3f2fd';
            e.currentTarget.style.border = '1px solid #b1c7e7';
          }}
        >
          ← Back to Shows
        </button>
        <span style={{ fontWeight: 700, fontSize: 20, color: "#1976d2", letterSpacing: 0.2 }}>{showName}</span>
      </div>
      {/* Toolbox Panel (Left) */}
      <div style={{
        width: toolboxWidth,
        minWidth: 120,
        maxWidth: 400,
        background: "#e3f2fd",
        borderRight: "1.5px solid #e1e6ec",
        padding: "18px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        boxSizing: "border-box",
        flexShrink: 0,
        height: "100vh",
        overflow: "hidden",
        position: "relative"
      }}>
        <div style={{
          fontWeight: 600,
          color: "#1976d2",
          marginBottom: 10,
          fontSize: "1.1rem"
        }}>Module Toolbox</div>
        <div style={{
          width: "100%",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          alignItems: "flex-start",
          overflow: "visible"
        }}>
          <ModulesPanel
            onModuleSelected={setDraggedModule}
            style={{ width: "100%" }}
            itemStyle={{
              background: "#fff",
              borderRadius: 8,
              padding: "10px 24px",
              color: "#1976d2",
              fontWeight: 500,
              boxShadow: "0 1px 4px rgba(25, 118, 210, 0.07)",
              marginBottom: 6,
              width: "80%",
              textAlign: "center",
              cursor: "pointer"
            }}
            hideTitle={true}
          />
        </div>
        {/* Drag handle for toolbox */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: -6,
            width: 12,
            height: "100%",
            cursor: "ew-resize",
            zIndex: 10,
            background: "linear-gradient(90deg, #e1e6ec 60%, #fafdff 100%)",
            borderRadius: 6,
            opacity: 0.7,
            transition: "opacity 0.2s"
          }}
          onMouseDown={e => startDrag("toolbox", e)}
          onDoubleClick={e => setToolboxWidth(220)}
          title="Resize toolbox panel"
        />
      </div>

      {/* Center Panel - Rundown */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        minWidth: 120,
        position: "relative",
        borderBottom: "1.5px solid #e1e6ec",
        background: "#fafdff"
      }}>
        {/* Episode Selection Header */}
        <div style={{
          padding: "10px 15px",
          borderBottom: "1px solid #ddd",
          backgroundColor: "#f5f5f5",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexShrink: 0
        }}>
          <label style={{ fontWeight: 600, color: "#333" }}>Episode:</label>
          <select
            value={selectedEpisode?.id || ""}
            onChange={(e) => {
              const episode = episodes.find(ep => ep.id === parseInt(e.target.value));
              if (episode) {
                setSelectedEpisode(episode);
              }
            }}
            style={{
              padding: "5px 10px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              minWidth: "200px"
            }}
            disabled={loading}
          >
            <option value="">Select an episode...</option>
            {episodes.map(episode => (
              <option key={episode.id} value={episode.id}>
                {episode.name}
              </option>
            ))}
          </select>
          <AddButtonWithHover
            onClick={addSegment}
            disabled={!selectedEpisode}
            style={{
              marginLeft: "auto",
              padding: "1.5px 8px",
              fontSize: "0.92em",
              height: 24,
              minWidth: 0,
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#e3f2fd",
              color: "#1976d2",
              border: "1px solid #b1c7e7",
              boxShadow: "none",
              fontWeight: 500,
              transition: "background 0.15s, border 0.15s"
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#d2e6fa';
              e.currentTarget.style.border = '1px solid #1976d2';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#e3f2fd';
              e.currentTarget.style.border = '1px solid #b1c7e7';
            }}
          >
            + Segment
          </AddButtonWithHover>
        </div>

        {/* Rundown Content */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "5px 5px 20px 5px" }}>
              {loading ? (
                <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
                  Loading...
                </div>
              ) : !selectedEpisode ? (
                <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
                  Please select an episode to view the rundown
                </div>
              ) : (
                <>
                  {/* New Segment Input */}
                  {editingType === "segment" && editingId === "new" && (
                    <div style={{ margin: "10px 0" }}>
                      <input
                        ref={inputRef}
                        value={editingValue}
                        onChange={e => setEditingValue(e.target.value)}
                        onBlur={() => handleEditSegment("new", editingValue)}
                        onKeyDown={e => {
                          if (e.key === "Enter") handleEditSegment("new", editingValue);
                          if (e.key === "Escape") handleEditSegment("new", null);
                        }}
                        style={{
                          ...STYLES.editInput,
                          width: "100%",
                          padding: "10px",
                          fontSize: "16px",
                          fontWeight: 600
                        }}
                        placeholder="Enter segment name..."
                        autoFocus
                      />
                    </div>
                  )}

                  {/* Segments List */}
                  <Droppable droppableId="segments" type="segment">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{
                          minHeight: "50px",
                          ...(snapshot.isDraggingOver ? STYLES.draggingOver : {})
                        }}
                      >
                        {segments.map((segment, index) => (
                          <Draggable key={segment.id} draggableId={`segment-${segment.id}`} index={index}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                style={{
                                  ...STYLES.segmentContainer,
                                  ...dragProvided.draggableProps.style,
                                  ...(dragSnapshot.isDragging ? STYLES.dragging : {})
                                }}
                              >
                                {/* Drag handle for segment */}
                                <div {...dragProvided.dragHandleProps} style={{ display: "inline-block", cursor: "grab", marginRight: 6, padding: 2 }} title="Drag segment">≡</div>
                                {/* Render segment content */}
                                {renderSegment(segment, index)}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {segments.length === 0 && !editingType && (
                          <div style={{
                            ...STYLES.placeholder,
                            padding: "40px 20px",
                            fontSize: "16px"
                          }}>
                            No segments in this episode. Click "+ Segment" to add one.
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Drag handle for properties panel (right) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: -6,
          width: 12,
          height: "100%",
          cursor: "ew-resize",
          zIndex: 10,
          background: "linear-gradient(90deg, #e1e6ec 60%, #fafdff 100%)",
          borderRadius: 6,
          opacity: 0.7,
          transition: "opacity 0.2s"
        }}
        onMouseDown={e => startDrag("properties", e)}
        onDoubleClick={e => setPropertiesWidth(300)}
        title="Resize properties panel"
      />

      {/* Right Panel - Properties */}
      <div style={{
        width: propertiesWidth,
        minWidth: 120,
        /* maxWidth removed for infinite resizing */
        borderLeft: "1.5px solid #e1e6ec",
        backgroundColor: "#f9f9f9",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        flexShrink: 0,
        height: "100vh",
        position: "relative"
      }}>
        {/* Drag handle for properties panel (left edge of right panel) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: -6,
            width: 12,
            height: "100%",
            cursor: "ew-resize",
            zIndex: 10,
            background: "linear-gradient(90deg, #e1e6ec 60%, #fafdff 100%)",
            borderRadius: 6,
            opacity: 0.7,
            transition: "opacity 0.2s"
          }}
          onMouseDown={e => startDrag("properties", e)}
          onDoubleClick={e => setPropertiesWidth(300)}
          title="Resize properties panel"
        />
        <div style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column"
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
            selectedTab={internalSelectedTab}
            setSelectedTab={setInternalSelectedTab}
            itemId={selectedItem}
            itemData={getSelectedItem()}
            onClose={() => {
              setSelectedItem(null);
              setShowProperties(false);
            }}
          />
        </div>
      </div>
    </div>
    </DragDropContext>
  );
}

// --- AddButtonWithHover and DeleteButtonWithHover components ---
function AddButtonWithHover({ children, onClick, disabled, style }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      style={{
        ...STYLES.addButton,
        background: hover ? "#1565c0" : STYLES.addButton.background,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function DeleteButtonWithHover({ onClick, title, style, children }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      style={{
        background: hover ? "rgba(255,87,34,0.08)" : "none",
        border: "none",
        color: hover ? "#ff5722" : "rgba(255,87,34,0.55)",
        cursor: "pointer",
        borderRadius: "50%",
        padding: "2px 4px",
        fontSize: "1.1em",
        marginLeft: "8px",
        opacity: hover ? 1 : 0.65,
        boxShadow: hover ? "0 1px 4px rgba(255,87,34,0.10)" : undefined,
        transition: "opacity 0.2s, color 0.2s, background 0.2s, box-shadow 0.2s",
        ...style
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={title}
    >
      {children}
    </button>
  );
}