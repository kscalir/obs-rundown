import React, { useEffect } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { API_BASE_URL } from "../config";

// Make a specific key for expanded state storage
const STORAGE_KEYS = {
  RUNDOWN: "obsRundownExpandedState"
};

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

// --- Styles ---
const STYLES = {
  container: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    overflowX: "hidden",
    width: "100%",
    boxSizing: "border-box",
    padding: "0 10px"
  },
  segmentList: {
    listStyle: "none",
    padding: 0,
    width: "100%"
  },
  segment: {
    marginBottom: 18,
    padding: "8px",
    background: "#dbe7f7",
    border: "1px solid #d1d9e6",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    minHeight: 80,
    borderRadius: 8,
    width: "100%"
  },
  groupList: {
    listStyle: "none",
    padding: "6px 12px",
    margin: 0,
    minHeight: 48,
    borderRadius: 8
  },
  group: {
    marginBottom: 10,
    border: "1px solid #e0e5f0",
    borderRadius: 6,
    background: "#f0f4f8",
    width: "100%"
  },
  itemList: {
    listStyle: "none",
    padding: "0 0 0 16px",
    margin: 0,
    minHeight: 80,
    borderRadius: 7,
    transition: "background 0.15s"
  },
  itemContainer: {
    padding: 8,
    borderBottom: "1px solid #d9e2f3",
    background: "#fff",
    borderRadius: 5,
    marginBottom: 4,
    display: "flex",
    alignItems: "center"
  },
  editInput: {
    fontWeight: 500,
    fontSize: 15,
    minWidth: 100,
    border: "1.5px solid #b1c7e7",
    borderRadius: 5,
    padding: "2px 7px"
  },
  header: {
    display: "flex",
    alignItems: "center",
    padding: "8px 14px",
    gap: 10
  },
  expandButton: {
    background: "none",
    border: "none",
    fontSize: 14,
    cursor: "pointer",
    color: "#1976d2",
    userSelect: "none"
  },
  deleteButton: {
    marginLeft: "auto",
    color: "#e53935",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px 8px"
  },
  addButton: {
    marginBottom: 16,
    fontWeight: 600,
    padding: "8px 16px",
    borderRadius: 6,
    background: "#1976d2",
    color: "white",
    border: "none",
    cursor: "pointer"
  },
  segmentHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8
  },
  groupHeader: {
    display: "flex",
    alignItems: "center",
    padding: "8px 14px",
    gap: 10
  }
};

export default function RundownList({
  segments,
  onToggleSegment: parentToggleSegment,
  onToggleGroup: parentToggleGroup,
  onAddGroup,
  onAddSegment,
  onEditSegment,
  onEditGroup,
  onEditItem,
  onDeleteSegment,
  onDeleteGroup,
  onDeleteItem,
  editingType,
  editingId,
  editingValue,
  setEditingValue,
  inputRef,
  style,
  onItemClick,  // Add this prop
  selectedItem  // Add this prop
}) {
  // Local toggle handlers that update localStorage
  const onToggleSegment = (segId) => {
    // Update localStorage with current expand states
    const savedState = getLocalStorageJSON(STORAGE_KEYS.RUNDOWN, {
      segments: {},
      groups: {}
    });
    
    // Find segment to toggle in current segments prop
    const seg = segments.find(s => s.id === segId);
    if (seg) {
      // Store the opposite of current expanded state
      savedState.segments[segId] = !seg.expanded;
      setLocalStorageJSON(STORAGE_KEYS.RUNDOWN, savedState);
    }
    
    // Call parent handler
    parentToggleSegment(segId);
  };

  const onToggleGroup = (segId, groupId) => {
    // Update localStorage with current expand states
    const savedState = getLocalStorageJSON(STORAGE_KEYS.RUNDOWN, {
      segments: {},
      groups: {}
    });
    
    // Find group to toggle in current segments prop
    const seg = segments.find(s => s.id === segId);
    const group = seg?.groups?.find(g => g.id === groupId);
    if (group) {
      // Store the opposite of current expanded state
      savedState.groups[groupId] = !group.expanded;
      setLocalStorageJSON(STORAGE_KEYS.RUNDOWN, savedState);
    }
    
    // Call parent handler
    parentToggleGroup(segId, groupId);
  };

  // Log the received segments prop whenever it changes
  useEffect(() => {
    console.log('RundownList received segments:', segments);
  }, [segments]);

  // --- Render Methods ---
  const renderItem = (item, dragProvided) => {
    // Function to get icon based on item type
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
        onClick={() => onItemClick?.(item)}
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
            onBlur={() => onEditItem(item.id, editingValue)}
            onKeyDown={e => {
              if (e.key === "Enter") onEditItem(item.id, editingValue);
              if (e.key === "Escape") onEditItem(item.id, null);
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
                onEditItem(item.id, item.title || "");
              }}
            >
              {item.title || item.data?.title || "Untitled Item"}
            </span>
          </div>
        )}
        <button
          onClick={e => {
            e.stopPropagation(); // Prevent item selection when deleting
            onDeleteItem(item.id);
          }}
          style={STYLES.deleteButton}
        >
          🗑
        </button>
      </li>
    );
  };

  const renderGroup = (segment, group, groupIdx) => (
    <Draggable 
      key={group.id} 
      draggableId={`group-${group.id}`} 
      index={groupIdx}
      type="group" // Add this line
    >
      {(dragProvided) => (
        <li
          ref={dragProvided.innerRef}
          {...dragProvided.draggableProps}
          style={{
            ...STYLES.group,
            ...dragProvided.draggableProps.style
          }}
        >
          <div 
            style={STYLES.groupHeader}
            {...dragProvided.dragHandleProps}
          >
            <button
              onClick={() => onToggleGroup(segment.id, group.id)}
              style={STYLES.expandButton}
            >
              {group.expanded ? "▼" : "▶"}
            </button>
            <span style={{ cursor: "grab" }}>≡</span>
            
            {editingType === "group" && editingId === group.id ? (
              <input
                ref={inputRef}
                value={editingValue}
                onChange={e => setEditingValue(e.target.value)}
                onBlur={() => onEditGroup(group.id, editingValue)}
                onKeyDown={e => {
                  if (e.key === "Enter") onEditGroup(group.id, editingValue);
                  if (e.key === "Escape") onEditGroup(group.id, null);
                }}
                style={STYLES.editInput}
                autoFocus
              />
            ) : (
              <span
                onClick={() => onEditGroup(group.id, group.name)}
                style={{ cursor: "pointer" }}
              >
                {group.name || "Untitled Group"}
              </span>
            )}
            
            <button
              onClick={() => onDeleteGroup(group.id)}
              style={STYLES.deleteButton}
            >
              🗑
            </button>
          </div>

          {group.expanded && (
            <Droppable
              droppableId={`items-${segment.id}-${group.id}`}
              type="item"
            >
              {(provided, snapshot) => (
                <ul
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    ...STYLES.itemList,
                    background: snapshot.isDraggingOver ? "#f8f9fa" : "transparent"
                  }}
                >
                  {(group.items || []).map((item, itemIdx) => (
                    <Draggable
                      key={item.id}
                      draggableId={`item-${item.id}`}
                      index={itemIdx}
                    >
                      {(dragProvided) => renderItem(item, dragProvided)}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </ul>
              )}
            </Droppable>
          )}
        </li>
      )}
    </Draggable>
  );


  
  // --- Main Render ---
  return (
    <div style={{ ...STYLES.container, ...style }}>
      {/* Add Segment Button */}
      <button 
        onClick={onAddSegment}
        style={STYLES.addButton}
      >
        + Add Segment
      </button>

      <Droppable droppableId="segments" type="segment">
        {(provided) => (
          <ul
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={STYLES.segmentList}
          >
            {segments.map((segment, segIdx) => (
              <Draggable
                key={segment.id}
                draggableId={`segment-${segment.id}`}
                index={segIdx}
              >
                {(dragProvided, snapshot) => (
                  <li
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    style={{
                      ...STYLES.segment,
                      ...dragProvided.draggableProps.style,
                      background: snapshot.isDragging ? "#e3f2fd" : "#dbe7f7"
                    }}
                  >
                    <div style={STYLES.segmentHeader}>
                      <button
                        onClick={() => onToggleSegment(segment.id)}
                        style={STYLES.expandButton}
                      >
                        {segment.expanded ? "▼" : "▶"}
                      </button>
                      <span {...dragProvided.dragHandleProps}>☰</span>
                      
                      {editingType === "segment" && editingId === segment.id ? (
                        <input
                          ref={inputRef}
                          value={editingValue}
                          onChange={e => setEditingValue(e.target.value)}
                          onBlur={() => onEditSegment(segment.id, editingValue)}
                          onKeyDown={e => {
                            if (e.key === "Enter") onEditSegment(segment.id, editingValue);
                            if (e.key === "Escape") onEditSegment(segment.id, null);
                          }}
                          style={STYLES.editInput}
                          autoFocus
                        />
                      ) : (
                        <span
                          onClick={() => onEditSegment(segment.id, segment.name)}
                          style={{ cursor: "pointer" }}
                        >
                          {segment.name || "Untitled Segment"}
                        </span>
                      )}
                      
                      <button
                        onClick={() => onAddGroup(segment.id)}
                        style={{ marginLeft: "auto" }}
                      >
                        + Add Group
                      </button>
                      <button
                        onClick={() => onDeleteSegment(segment.id)}
                        style={STYLES.deleteButton}
                      >
                        🗑
                      </button>
                    </div>

                    {segment.expanded && (
                      <Droppable droppableId={`groups-${segment.id}`} type="group">
                        {(provided) => (
                          <ul 
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            style={STYLES.groupList}
                          >
                            {(segment.groups || []).map((group, groupIdx) => 
                              renderGroup(segment, group, groupIdx)
                            )}
                            {provided.placeholder}
                          </ul>
                        )}
                      </Droppable>
                    )}
                  </li>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </ul>
        )}
      </Droppable>
    </div>
  );
}

