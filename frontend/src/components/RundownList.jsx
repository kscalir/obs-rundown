import React from 'react';
import { Droppable, Draggable } from "@hello-pangea/dnd";

// --- Styles ---
const STYLES = {
  container: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    overflowX: "hidden",
    width: "100%",
    boxSizing: "border-box"
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
  }
};

export default function RundownList({
  segments,
  onToggleSegment,
  onToggleGroup,
  onAddGroup,
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
  inputRef
}) {
  // --- Render Methods ---
  const renderItem = (item, dragProvided) => (
    <li
      ref={dragProvided.innerRef}
      {...dragProvided.draggableProps}
      {...dragProvided.dragHandleProps}
      style={{
        ...STYLES.itemContainer,
        ...dragProvided.draggableProps.style
      }}
    >
      <span style={{ flex: 1 }}>
        {editingType === "item" && editingId === item.id ? (
          <input
            ref={inputRef}
            type="text"
            value={editingValue}
            onChange={e => setEditingValue(e.target.value)}
            onBlur={() => onEditItem(item.id, editingValue)}
            onKeyDown={e => {
              if (e.key === "Enter") onEditItem(item.id, editingValue);
              if (e.key === "Escape") onEditItem(item.id, null);
            }}
            style={STYLES.editInput}
            autoFocus
          />
        ) : (
          <span 
            onClick={() => onEditItem(item.id, (item.data?.title || item.name || ""))}
            style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
          >
            <span style={{ marginRight: 6 }}>{item.data?.icon || ""}</span>
            <span>{item.data?.title || "Untitled Item"}</span>
          </span>
        )}
      </span>
      <button
        onClick={() => onDeleteItem(item.id)}
        style={STYLES.deleteButton}
      >
        🗑
      </button>
    </li>
  );

  const renderGroup = (segment, group, groupIdx) => (
    <Draggable 
      key={group.id} 
      draggableId={`group-${group.id}`} 
      index={groupIdx}
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
            style={STYLES.header}
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
    <div style={STYLES.container}>
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
                    <div style={STYLES.header}>
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
                      <ul style={STYLES.groupList}>
                        {(segment.groups || []).map((group, groupIdx) => 
                          renderGroup(segment, group, groupIdx)
                        )}
                      </ul>
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