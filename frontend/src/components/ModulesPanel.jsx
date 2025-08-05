import React from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";

export default function ModulesPanel({ onModuleSelected }) {
  const modules = [
    { 
      label: "OBS Command", 
      icon: "🎬", 
      id: "obscommand",
      type: "obscommand"
    },
    { 
      label: "Graphics Template", 
      icon: "🖼️", 
      id: "graphicstemplate",
      type: "graphicstemplate"
    },
    { 
      label: "Presenter Note", 
      icon: "📝", 
      id: "presenternote",
      type: "presenternote"
    },
    { 
      label: "Video Placeholder", 
      icon: "🎥", 
      id: "video",
      type: "video"
    },
    { 
      label: "Audio Placeholder", 
      icon: "🔊", 
      id: "audio",
      type: "audio"
    }
  ];

  return (
    <div style={{ 
      height: "100%", 
      display: "flex", 
      flexDirection: "column",
      overflow: "hidden"
    }}>
      {/* Header */}
      <div style={{
        padding: "10px",
        borderBottom: "1px solid #ddd",
        backgroundColor: "#f5f5f5",
        fontWeight: 600,
        fontSize: "14px",
        flexShrink: 0
      }}>
        Modules Toolbox
      </div>
      
      {/* Draggable Modules */}
      <div style={{ 
        flex: 1,
        overflow: "auto",
        padding: "5px"
      }}>
        <Droppable droppableId="toolbox" type="item" isDropDisabled={true}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              style={{
                minHeight: "100%"
              }}
            >
              {modules.map((module, index) => (
                <Draggable
                  key={module.id}
                  draggableId={`toolbox-${module.type}`}
                  index={index}
                >
                  {(dragProvided, dragSnapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      {...dragProvided.dragHandleProps}
                      style={{
                        ...dragProvided.draggableProps.style,
                        margin: "5px 0",
                        padding: "8px 12px",
                        backgroundColor: dragSnapshot.isDragging ? "#e3f2fd" : "#fff",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        cursor: "grab",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "14px",
                        boxShadow: dragSnapshot.isDragging 
                          ? "0 4px 8px rgba(0,0,0,0.2)" 
                          : "0 1px 3px rgba(0,0,0,0.1)",
                        transform: dragSnapshot.isDragging 
                          ? dragProvided.draggableProps.style?.transform 
                          : "none"
                      }}
                    >
                      <span style={{ fontSize: "16px" }}>{module.icon}</span>
                      <span>{module.label}</span>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              
              {/* Instructions */}
              <div style={{
                margin: "15px 5px 5px 5px",
                padding: "8px",
                fontSize: "12px",
                color: "#666",
                fontStyle: "italic",
                textAlign: "center",
                borderTop: "1px solid #eee",
                paddingTop: "10px"
              }}>
                Drag modules to groups in the rundown
              </div>
            </div>
          )}
        </Droppable>
      </div>
    </div>
  );
}