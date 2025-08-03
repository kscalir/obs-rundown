import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function MinimalDnDTest() {
  const [items, setItems] = useState([
    { id: "1", name: "Segment 1" },
    { id: "2", name: "Segment 2" },
    { id: "3", name: "Segment 3" }
  ]);

  const handleDragEnd = result => {
    if (!result.destination) return;
    const reordered = Array.from(items);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setItems(reordered);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="segments" type="segment">
        {(provided, snapshot) => (
          <ul
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={{
              background: snapshot.isDraggingOver ? '#e3f2fd' : '#fff',
              padding: 10,
              minHeight: 100,
              border: "1px solid #1976d2",
              listStyle: "none",
              width: "100%"
            }}
          >
            {items.map((segment, idx) => (
              <Draggable draggableId={segment.id} index={idx} key={segment.id}>
                {(provided, snapshot) => (
                  <li
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={{
                      ...provided.draggableProps.style,
                      margin: 8,
                      padding: 16,
                      background: snapshot.isDragging ? '#bbdefb' : '#fafafa',
                      border: "1px solid #1976d2"
                    }}
                  >
                    {segment.name}
                  </li>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </ul>
        )}
      </Droppable>
    </DragDropContext>
  );
}