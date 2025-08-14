import React, { useState, useEffect } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { API_BASE_URL } from "../config.js";

// Define toolbox items for the new full-screen components
const TOOLBOX_ITEMS = [
  {
    id: 'fullscreen-graphic',
    type: 'FullScreenGraphic',
    title: 'Full Screen Graphic',
    description: 'Graphics template with transitions',
    icon: 'GFX'
  },
  {
    id: 'fullscreen-video',
    type: 'FullScreenVideo', 
    title: 'Full Screen Video',
    description: 'Video player with controls',
    icon: 'VID'
  },
  {
    id: 'fullscreen-youtube',
    type: 'FullScreenYouTube',
    title: 'Full Screen YouTube',
    description: 'YouTube video with URL input',
    icon: 'YT'
  },
  {
    id: 'fullscreen-pdfimage',
    type: 'FullScreenPdfImage',
    title: 'Full Screen PDF/Image',
    description: 'Images and PDFs with transforms',
    icon: 'IMG'
  }
];

export default function ModulesPanel({ onModuleSelected }) {
  const [scenes, setScenes] = useState([]);
  const [currentScene, setCurrentScene] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('toolbox'); // 'toolbox' or 'scenes'
  const [refreshKey, setRefreshKey] = useState(0); // Force re-render after successful drops

  // Fetch OBS scenes on component mount
  useEffect(() => {
    fetchOBSScenes();
  }, []);

  // Listen for successful toolbox drops to clear drag state
  useEffect(() => {
    const handleDragComplete = () => {
      setRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener('toolbox:drag-complete', handleDragComplete);
    return () => window.removeEventListener('toolbox:drag-complete', handleDragComplete);
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
      {/* Tabs Header */}
      <div style={{
        display: "flex",
        borderBottom: "2px solid #e1e6ec",
        backgroundColor: "#f8fbff"
      }}>
        <button
          onClick={() => setActiveTab('toolbox')}
          style={{
            flex: 1,
            padding: "12px 16px",
            fontSize: "14px",
            fontWeight: 600,
            color: activeTab === 'toolbox' ? "#1976d2" : "#666",
            backgroundColor: activeTab === 'toolbox' ? "#fff" : "transparent",
            border: "none",
            borderBottom: activeTab === 'toolbox' ? "2px solid #1976d2" : "2px solid transparent",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          Toolbox
        </button>
        <button
          onClick={() => setActiveTab('scenes')}
          style={{
            flex: 1,
            padding: "12px 16px",
            fontSize: "14px",
            fontWeight: 600,
            color: activeTab === 'scenes' ? "#1976d2" : "#666",
            backgroundColor: activeTab === 'scenes' ? "#fff" : "transparent",
            border: "none",
            borderBottom: activeTab === 'scenes' ? "2px solid #1976d2" : "2px solid transparent",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          OBS Scenes
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: "visible" }}>
        {activeTab === 'toolbox' ? (
          // Toolbox Tab Content
          <div style={{
            height: "100%",
            padding: "16px 12px",
            overflow: "visible"
          }}>
            <Droppable droppableId="toolbox" type="item" isDropDisabled={true}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    minHeight: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px"
                  }}
                >
                  {TOOLBOX_ITEMS.map((item, index) => (
                    <Draggable
                      key={item.id}
                      draggableId={`toolbox:item:${item.id}`}
                      index={index}
                    >
                      {(dragProvided, dragSnapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          style={{
                            ...dragProvided.draggableProps.style,
                            padding: "12px 16px",
                            backgroundColor: dragSnapshot.isDragging ? "#e3f2fd" : "#fff",
                            border: "1px solid #e1e6ec",
                            borderRadius: "8px",
                            cursor: "grab",
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            boxShadow: dragSnapshot.isDragging
                              ? "0 8px 24px rgba(0,0,0,0.15)"
                              : "0 2px 4px rgba(0,0,0,0.05)",
                            transform: dragSnapshot.isDragging
                              ? dragProvided.draggableProps.style?.transform
                              : "none",
                            transition: dragSnapshot.isDragging ? "none" : "all 0.2s"
                          }}
                        >
                          {/* Icon */}
                          <div style={{
                            width: 32,
                            height: 32,
                            backgroundColor: "#e3f2fd",
                            borderRadius: "6px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "10px",
                            fontWeight: 700,
                            color: "#1976d2",
                            flexShrink: 0
                          }}>
                            {item.icon}
                          </div>
                          
                          {/* Content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: "14px",
                              fontWeight: 600,
                              color: "#333",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap"
                            }}>
                              {item.title}
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  
                  {/* Instructions */}
                  <div style={{
                    marginTop: "16px",
                    padding: "12px",
                    fontSize: "12px",
                    color: "#666",
                    fontStyle: "italic",
                    textAlign: "center",
                    borderTop: "1px solid #e1e6ec",
                    backgroundColor: "#f8fbff",
                    borderRadius: "6px"
                  }}>
                    Drag toolbox items to create rundown cues
                  </div>
                </div>
              )}
            </Droppable>
          </div>
        ) : (
          // OBS Scenes Tab Content
          <div style={{
            height: "100%",
            display: "flex",
            flexDirection: "column"
          }}>
            {/* Scenes Header */}
            <div style={{
              padding: "12px 16px",
              borderBottom: "1px solid #e1e6ec",
              backgroundColor: "#f8fbff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <span style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#1976d2"
              }}>
                Available Scenes
              </span>
              <button 
                onClick={fetchOBSScenes}
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  backgroundColor: "#e3f2fd",
                  color: "#1976d2",
                  border: "1px solid #b1c7e7",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: 600
                }}
                title="Refresh scenes"
              >
                Refresh
              </button>
            </div>

            {/* Scenes Content */}
            <div style={{
              flex: 1,
              overflow: "visible",
              padding: "16px 12px"
            }}>
              {loading ? (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "40px",
                  color: "#666",
                  fontSize: "14px"
                }}>
                  Loading OBS scenes...
                </div>
              ) : error ? (
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "40px 20px",
                  gap: "12px"
                }}>
                  <div style={{ 
                    color: "#d32f2f", 
                    fontSize: "14px", 
                    textAlign: "center"
                  }}>
                    Error: {error}
                  </div>
                  <button 
                    onClick={fetchOBSScenes}
                    style={{
                      padding: "8px 16px",
                      fontSize: "12px",
                      backgroundColor: "#1976d2",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: 600
                    }}
                  >
                    Retry Connection
                  </button>
                </div>
              ) : (
                <Droppable droppableId="obs-scenes" type="item" isDropDisabled={true}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{
                        minHeight: "100%",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px"
                      }}
                    >
                      {scenes.map((scene, index) => {
                        const sceneKey = scene.sceneUuid || `name:${scene.sceneName}`;
                        return (
                          <Draggable
                            key={sceneKey}
                            draggableId={`toolbox:scene:${sceneKey}`}
                            index={index}
                          >
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                style={{
                                  ...dragProvided.draggableProps.style,
                                  padding: "12px 16px",
                                  backgroundColor: dragSnapshot.isDragging ? "#e3f2fd" : "#fff",
                                  border: "1px solid #e1e6ec",
                                  borderRadius: "8px",
                                  cursor: "grab",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "12px",
                                  fontSize: "14px",
                                  boxShadow: dragSnapshot.isDragging
                                    ? "0 8px 24px rgba(0,0,0,0.15)"
                                    : "0 2px 4px rgba(0,0,0,0.05)",
                                  transform: dragSnapshot.isDragging
                                    ? dragProvided.draggableProps.style?.transform
                                    : "none",
                                  transition: dragSnapshot.isDragging ? "none" : "all 0.2s"
                                }}
                              >
                                {/* Scene Icon */}
                                <div style={{
                                  width: 32,
                                  height: 32,
                                  backgroundColor: "#e3f2fd",
                                  borderRadius: "6px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  color: "#1976d2",
                                  flexShrink: 0
                                }}>
                                  SCN
                                </div>
                                
                                {/* Scene Info */}
                                <div style={{ 
                                  flex: 1,
                                  display: "flex", 
                                  flexDirection: "column", 
                                  gap: "2px",
                                  minWidth: 0
                                }}>
                                  <span style={{
                                    fontWeight: 600,
                                    color: "#333",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap"
                                  }}>
                                    {scene.sceneName}
                                  </span>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                      
                      {scenes.length === 0 && (
                        <div style={{
                          padding: "24px",
                          fontSize: "14px",
                          color: "#666",
                          fontStyle: "italic",
                          textAlign: "center",
                          backgroundColor: "#f8fbff",
                          borderRadius: "8px",
                          border: "1px dashed #b1c7e7"
                        }}>
                          No scenes found in OBS
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              )}
              
              {/* Instructions */}
              {!loading && !error && scenes.length > 0 && (
                <div style={{
                  marginTop: "16px",
                  padding: "12px",
                  fontSize: "12px",
                  color: "#666",
                  fontStyle: "italic",
                  textAlign: "center",
                  borderTop: "1px solid #e1e6ec",
                  backgroundColor: "#f8fbff",
                  borderRadius: "6px"
                }}>
                  Drag scenes to create rundown cues
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}