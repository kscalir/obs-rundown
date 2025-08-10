import React, { useState, useEffect } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { API_BASE_URL } from "../config.js";

export default function ModulesPanel({ onModuleSelected }) {
  const [scenes, setScenes] = useState([]);
  const [currentScene, setCurrentScene] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch OBS scenes on component mount
  useEffect(() => {
    fetchOBSScenes();
  }, []);

  async function fetchOBSScenes() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/obs/scenes`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch scenes: ${response.statusText}`);
      }
      
      const data = await response.json();
      setScenes(data.scenes || []);
      setCurrentScene(data.currentProgramSceneName);
    } catch (err) {
      console.error('Error fetching OBS scenes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#666",
        fontSize: "14px"
      }}>
        Loading OBS scenes...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px"
      }}>
        <div style={{ color: "#d32f2f", fontSize: "14px", textAlign: "center", marginBottom: "10px" }}>
          Error connecting to OBS: {error}
        </div>
        <button 
          onClick={fetchOBSScenes}
          style={{
            padding: "6px 12px",
            fontSize: "12px",
            backgroundColor: "#1976d2",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      overflow: "visible"
    }}>
      {/* Header */}
      <div style={{
        padding: "8px 12px",
        borderBottom: "1px solid #eee",
        backgroundColor: "#f8f9fa",
        fontSize: "12px",
        fontWeight: "bold",
        color: "#666",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <span>OBS Scenes</span>
        <button 
          onClick={fetchOBSScenes}
          style={{
            padding: "2px 6px",
            fontSize: "10px",
            backgroundColor: "transparent",
            color: "#666",
            border: "1px solid #ddd",
            borderRadius: "3px",
            cursor: "pointer"
          }}
          title="Refresh scenes"
        >
          ↻
        </button>
      </div>

      {/* Draggable Scenes */}
      <div style={{
        flex: 1,
        overflow: "visible",
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
              {scenes.map((scene, index) => (
                <Draggable
                  key={scene.sceneUuid || scene.sceneName}
                  draggableId={`toolbox-obsscene-${scene.sceneName}`}
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
                        backgroundColor: dragSnapshot.isDragging ? "#e3f2fd" : 
                          scene.sceneName === currentScene ? "#fff3e0" : "#fff",
                        border: scene.sceneName === currentScene ? 
                          "2px solid #ff9800" : "1px solid #ddd",
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
                      <span style={{ fontSize: "16px" }}>
                        {scene.sceneName === currentScene ? "🎬" : "📺"}
                      </span>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span>{scene.sceneName}</span>
                        {scene.sceneName === currentScene && (
                          <span style={{ 
                            fontSize: "10px", 
                            color: "#ff9800",
                            fontWeight: "bold"
                          }}>
                            LIVE
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              
              {scenes.length === 0 && (
                <div style={{
                  margin: "15px 5px 5px 5px",
                  padding: "8px",
                  fontSize: "12px",
                  color: "#999",
                  fontStyle: "italic",
                  textAlign: "center"
                }}>
                  No scenes found in OBS
                </div>
              )}
              
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
                Drag scenes to cues in the rundown
              </div>
            </div>
          )}
        </Droppable>
      </div>
    </div>
  );
}