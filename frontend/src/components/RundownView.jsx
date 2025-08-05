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
    margin: "10px 0",
    backgroundColor: "#ffffff",
    borderRadius: "5px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)",
    overflow: "hidden"
  },
  segmentHeader: {
    padding: "12px 15px",
    backgroundColor: "#2196f3",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer"
  },
  segmentContent: {
    padding: "0 10px 10px"
  },
  addButton: {
    marginLeft: "auto",
    backgroundColor: "#4CAF50",
    border: "none",
    color: "white",
    padding: "4px 8px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.8em"
  },
  deleteButton: {
    backgroundColor: "transparent",
    border: "none",
    color: "#ff5722",
    cursor: "pointer",
    marginLeft: "8px",
    padding: "2px 6px",
    fontSize: "1em"
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
    margin: "12px 0",
    backgroundColor: "#f9f9f9",
    borderRadius: "4px",
    border: "1px solid #e0e0e0",
    overflow: "hidden"
  },
  groupHeader: {
    padding: "8px 12px",
    backgroundColor: "#e0e0e0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer"
  },
  groupContent: {
    padding: "8px",
    overflow: "visible" // Change from any scroll value to visible
  },
  
  // Item styles
  itemsContainer: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    overflow: "visible" // Add this to prevent scroll conflicts
  },
  itemContainer: {
    padding: "8px 12px",
    marginBottom: "8px",
    backgroundColor: "#fff",
    border: "1px solid #e1e7ef",
    borderRadius: "4px",
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
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
  }
};

export default function RundownView({ showId, selectedTab }) {
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
    setEditingValue("New Group");
    
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
          title: title.trim(),
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
      // Check item type more carefully
      const itemType = item.type || '';
      if (itemType === 'graphics' || itemType === 'graphicstemplate' || 
          itemType.includes('graphics')) {
        setSelectedItem(item.id);
        setShowProperties(true);
      }
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
    setDraggedModule(null);
    const { source, destination, draggableId, type } = result;

    if (!destination) return;

    // --- Handle item drag from toolbox to rundown ---
    if (source.droppableId === "toolbox" && destination.droppableId.startsWith("items-")) {
      const [prefix, segmentId, groupId] = destination.droppableId.split("-");
      const [_, moduleType] = draggableId.split("-");
      
      try {
        console.log('Creating new item:', {
          type: moduleType,
          group_id: groupId,
          position: destination.index,
          data: {}
        });
        
        // Modify this URL to match your backend API endpoint structure
        // This might be the issue - check what the correct endpoint is
        const res = await fetch(`${API_BASE_URL}/api/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: moduleType,
            group_id: parseInt(groupId),
            position: destination.index,
            data: {}
          })
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error(`Failed to create item: ${res.status} ${errorText}`);
          throw new Error("Failed to create item");
        }
        
        const newItem = await res.json();
        console.log('Created new item:', newItem);
        
        // Update the local state immediately 
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
      
      // Find the group
      const segment = segments.find(s => s.id === segmentId);
      const group = segment?.groups.find(g => g.id === groupId);
      if (!group) return;
      
      // Create new array with item moved to new position
      const newItems = [...group.items];
      const [removed] = newItems.splice(source.index, 1);
      newItems.splice(destination.index, 0, removed);
      
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
        await fetch(`${API_BASE_URL}/api/items/${item.id}/move`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            group_id: destGroupId,
            position: destination.index
          })
        });
      } catch (err) {
        console.error("Error moving item:", err);
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
  };

  // --- Render item component (from RundownList) ---
  const renderItem = (item, dragProvided) => {
    const getItemIcon = (type) => {
      switch (type) {
        case "graphics":
        case "toolbox-graphicstemplate":
          return "🖼️";
        case "obscommand":
        case "toolbox-obscommand":
          return "🎬";
        case "note":
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
          border: selectedItem === item.id ? "1.5px solid #1976d2" : "1.5px solid #b1c7e7",
          cursor: "pointer"
        }}
      >
        {editingType === "item" && editingId === item.id ? (
          <input
            ref={inputRef}
            value={editingValue}
            onChange={e => setEditingValue(e.target.value)}
            onBlur={() => handleEditItem(item.id, editingValue)}
            onKeyDown={e => {
              if (e.key === "Enter") handleEditItem(item.id, editingValue);
              if (e.key === "Escape") handleEditItem(item.id, null);
            }}
            style={STYLES.editInput}
            autoFocus
            onClick={e => e.stopPropagation()} // Prevent item selection when editing
          />
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
            <span style={{ fontSize: "1.2em" }}>{getItemIcon(item.type)}</span>
            <span 
              style={{ flex: 1 }}
              onClick={e => {
                e.stopPropagation(); // Prevent item selection when editing title
                setEditingType("item");
                setEditingId(item.id);
                setEditingValue(item.title || "");
              }}
            >
              {item.title || item.data?.title || "Untitled Item"}
            </span>
          </div>
        )}
        <button
          onClick={e => {
            e.stopPropagation(); // Prevent item selection when deleting
            handleDeleteItem(item.id);
          }}
          style={STYLES.deleteButton}
        >
          🗑
        </button>
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
            <div 
              {...dragProvided.dragHandleProps} 
              style={STYLES.groupHeader}
              onClick={() => toggleGroup(segmentId, group.id)}
            >
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
                <>
                  <span 
                    onClick={e => {
                      e.stopPropagation();
                      setEditingType("group");
                      setEditingId(group.id);
                      setEditingValue(group.title || "");
                    }}
                    style={{ cursor: "text" }}
                  >
                    {group.title || "Untitled Group"}
                  </span>
                  <span>{group.expanded ? "▼" : "▶"}</span>
                </>
              )}
              <button 
                onClick={e => {
                  e.stopPropagation();
                  handleDeleteGroup(group.id);
                }}
                style={STYLES.deleteButton}
              >
                🗑
              </button>
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
            <div 
              {...dragProvided.dragHandleProps} 
              style={STYLES.segmentHeader}
              onClick={() => toggleSegment(segment.id)}
            >
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
                <>
                  <span
                    onClick={e => {
                      e.stopPropagation();
                      setEditingType("segment");
                      setEditingId(segment.id);
                      setEditingValue(segment.title || "");
                    }}
                    style={{ cursor: "text" }}
                  >
                    {segment.title || "Untitled Segment"}
                  </span>
                  <span>{segment.expanded ? "▼" : "▶"}</span>
                </>
              )}
              
              <div>
                <button 
                  onClick={e => {
                    e.stopPropagation();
                    addGroup(segment.id);
                  }}
                  style={STYLES.addButton}
                >
                  + Group
                </button>
                <button 
                  onClick={e => {
                    e.stopPropagation();
                    handleDeleteSegment(segment.id);
                  }}
                  style={STYLES.deleteButton}
                >
                  🗑
                </button>
              </div>
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
                
                <Droppable 
                  droppableId={`groups-${segment.id}`}
                  type="group"
                >
                  {(dropProvided, dropSnapshot) => (
                    <div
                      ref={dropProvided.innerRef}
                      style={{
                        minHeight: "10px",
                        ...(dropSnapshot.isDraggingOver ? STYLES.draggingOver : {})
                      }}
                      {...dropProvided.droppableProps}
                    >
                      {segment.groups.map((group, idx) => renderGroup(segment.id, group, idx))}
                      {dropProvided.placeholder}
                    </div>
                  )}
                </Droppable>
                
                {segment.groups.length === 0 && (
                  <div style={STYLES.placeholder}>
                    No groups in this segment. Click "+ Group" to add one.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Draggable>
    );
  };

  // --- Main render ---
  return (
    <DragDropContext 
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
        {/* Middle: Rundown List */}
        <div style={{ 
          flex: 1, 
          overflowY: "auto", 
          padding: "0 20px 20px 20px",
          borderRight: "1px solid #ddd" 
        }}>
          {/* Episode selector */}
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            padding: "10px 0", 
            position: "sticky",
            top: 0,
            backgroundColor: "#f5f5f5",
            zIndex: 10,
            marginBottom: "10px"
          }}>
            {/* Existing episode selector code */}
            <select 
              value={selectedEpisode?.id || ""}
              onChange={(e) => {
                const episodeId = e.target.value;
                const episode = episodes.find(ep => ep.id === parseInt(episodeId));
                setSelectedEpisode(episode || null);
              }}
              style={{
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                marginRight: "10px"
              }}
              disabled={loading || episodes.length === 0}
            >
              {episodes.length > 0 ? (
                episodes.map(episode => (
                  <option key={episode.id} value={episode.id}>
                    {episode.title || `Episode ${episode.id}`}
                  </option>
                ))
              ) : (
                <option value="">No Episodes</option>
              )}
            </select>
            
            {/* Add segment button */}
            <button
              onClick={addSegment}
              disabled={!selectedEpisode}
              style={{
                backgroundColor: "#4CAF50",
                color: "white",
                border: "none",
                padding: "8px 12px",
                borderRadius: "4px",
                cursor: !selectedEpisode ? "not-allowed" : "pointer"
              }}
            >
              + Segment
            </button>
            
            {/* Add episode button */}
            <button
              onClick={() => setShowAddEpisodeModal(true)}
              style={{
                backgroundColor: "#2196F3",
                color: "white",
                border: "none",
                padding: "8px 12px",
                borderRadius: "4px",
                cursor: "pointer",
                marginLeft: "10px"
              }}
            >
              + Episode
            </button>
            
            {/* Refresh button */}
            <button 
              onClick={() => {
                if (selectedEpisode?.id) {
                  fetchSegments(selectedEpisode.id);
                }
              }}
              disabled={!selectedEpisode || loading}
              style={{
                marginLeft: "auto",
                backgroundColor: "transparent",
                border: "1px solid #ccc",
                padding: "8px 12px",
                borderRadius: "4px",
                cursor: !selectedEpisode || loading ? "not-allowed" : "pointer"
              }}
            >
              🔄 Refresh
            </button>
          </div>
          
          {/* New segment input */}
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
                  fontSize: "1.2em",
                  padding: "10px",
                  width: "100%"
                }}
                autoFocus
              />
            </div>
          )}
          
          {/* Loading state */}
          {loading && (
            <div style={{ textAlign: "center", padding: "20px" }}>
              Loading...
            </div>
          )}
          
          {/* Segments list */}
          <Droppable droppableId="rundown" type="segment">
            {(dropProvided, dropSnapshot) => (
              <div
                ref={dropProvided.innerRef}
                {...dropProvided.droppableProps}
                style={{
                  minHeight: "100px",
                  ...(dropSnapshot.isDraggingOver ? STYLES.draggingOver : {})
                }}
              >
                {segments.map((segment, idx) => renderSegment(segment, idx))}
                {dropProvided.placeholder}
              </div>
            )}
          </Droppable>
          
          {/* Empty state */}
          {!loading && segments.length === 0 && (
            <div style={{ 
              textAlign: "center", 
              padding: "40px", 
              color: "#888" 
            }}>
              {selectedEpisode ? (
                <div>
                  <p>No segments in this episode.</p>
                  <p>Click "+ Segment" to add one.</p>
                </div>
              ) : (
                <div>
                  <p>Select an episode to view its rundown</p>
                  <p>or create a new episode.</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Right side: Properties and Modules panels */}
        <div style={{ width: "300px", flexShrink: 0, display: "flex", flexDirection: "column", height: "100%" }}>
          {/* Properties panel */}
          <div style={{ flex: "1 1 50%", overflow: "auto", borderBottom: "1px solid #ddd" }}>
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
              show={showProperties}
              itemId={selectedItem}
              onClose={() => setShowProperties(false)}
            />
          </div>
          
          {/* Modules panel */}
          <div style={{ flex: "1 1 50%", overflow: "auto" }}>
            <ModulesPanel 
              draggedModule={draggedModule} 
              setDraggedModule={setDraggedModule}
            />
          </div>
        </div>
        
        {/* Add episode modal */}
        {showAddEpisodeModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100
          }}>
            {/* Modal content */}
            <div style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "5px",
              width: "400px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.2)"
            }}>
              <h3>Add New Episode</h3>
              <input
                type="text"
                value={newEpisodeName}
                onChange={e => setNewEpisodeName(e.target.value)}
                placeholder="Episode Name"
                style={{
                  width: "100%",
                  padding: "8px",
                  marginBottom: "15px",
                  borderRadius: "4px",
                  border: "1px solid #ccc"
                }}
                autoFocus
              />
              <div style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px"
              }}>
                <button
                  onClick={() => {
                    setShowAddEpisodeModal(false);
                    setNewEpisodeName("");
                  }}
                  style={{
                    padding: "8px 12px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    backgroundColor: "white"
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!newEpisodeName.trim()) return;
                    
                    fetch(`${API_BASE_URL}/api/shows/${showId}/episodes`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ title: newEpisodeName })
                    })
                      .then(res => {
                        if (!res.ok) throw new Error("Failed to create episode");
                        return res.json();
                      })
                      .then(newEpisode => {
                        setEpisodes(prev => [...prev, newEpisode]);
                        setSelectedEpisode(newEpisode);
                        setShowAddEpisodeModal(false);
                        setNewEpisodeName("");
                      })
                      .catch(err => {
                        console.error("Error creating episode:", err);
                        alert("Failed to create episode");
                      });
                  }}
                  disabled={!newEpisodeName.trim()}
                  style={{
                    padding: "8px 12px",
                    border: "none",
                    borderRadius: "4px",
                    backgroundColor: "#4CAF50",
                    color: "white",
                    cursor: newEpisodeName.trim() ? "pointer" : "not-allowed"
                  }}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DragDropContext>
  );
}

// Add this helper function at the top of your component:
const makeApiCall = async (url, options) => {
  console.log(`API Call: ${options.method || 'GET'} ${url}`, options.body ? JSON.parse(options.body) : '');
  
  try {
    const response = await fetch(url, options);
    console.log(`API Response: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error: ${errorText}`);
      throw new Error(`${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`API Data:`, data);
    return data;
  } catch (error) {
    console.error(`API Call Failed:`, error);
    throw error;
  }
};