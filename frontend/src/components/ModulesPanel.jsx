import React from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";

export default function ModulesPanel(props) {
  return (
    <div style={{ width: "100%", minHeight: 0, minWidth: 0 }}>
      <div style={{ fontWeight: 600, color: "#1976d2", fontSize: 16, marginBottom: 10, marginLeft: 2 }}>
        Toolbox (modules panel)
      </div>
      <Droppable droppableId="toolbox" isDropDisabled={false} type="item">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            {[
              { label: "OBS Command", icon: "🎬", id: "toolbox-obscommand" },
              { label: "Graphics Template", icon: "🖼️", id: "toolbox-graphicstemplate" },
              { label: "Presenter Note", icon: "📝", id: "toolbox-presenternote" },
              { label: "Video Placeholder", icon: "🎥", id: "toolbox-video" },
              { label: "Audio Placeholder", icon: "🔊", id: "toolbox-audio" },
            ].map((item, idx) => (
              <Draggable key={item.id} draggableId={item.id} index={idx} type="item">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      border: "1.5px solid #b1c7e7",
                      borderRadius: 8,
                      background: snapshot.isDragging ? "#e4f1fb" : "#fff",
                      padding: "10px 16px",
                      fontSize: 15.5,
                      fontWeight: 500,
                      color: "#223",
                      cursor: "grab",
                      boxShadow: snapshot.isDragging ? "0 4px 16px 0 #1976d233" : "0 2px 8px 0 #e4e8ed11",
                      transition: "box-shadow 0.15s, background 0.15s",
                      userSelect: "none",
                      ...provided.draggableProps.style,
                    }}
                    title={`Drag to add a "${item.label}"`}
                  >
                    <span style={{ fontSize: 22, marginRight: 6, flexShrink: 0 }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}