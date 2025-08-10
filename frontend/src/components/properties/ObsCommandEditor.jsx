import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";

export default function ObsCommandEditor({ selectedItem, itemData, setRefreshKey }) {
  const [scenes, setScenes] = useState([]);
  const [currentScene, setCurrentScene] = useState("");
  const [sources, setSources] = useState([]);
  const [loadingScenes, setLoadingScenes] = useState(false);
  const [loadingSources, setLoadingSources] = useState(false);
  const [error, setError] = useState("");
  
  // State for scene configuration
  const [selectedSource, setSelectedSource] = useState("Box 1");
  const [selectedInput, setSelectedInput] = useState("Camera 1");
  const [transitionType, setTransitionType] = useState("fade");
  const [transitionDuration, setTransitionDuration] = useState(0.5);
  
  // Graphics properties for CG-1
  const [graphicsType, setGraphicsType] = useState("Lower Third");
  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [accentColor, setAccentColor] = useState("#1976d2");
  const [showLogo, setShowLogo] = useState(false);
  const [animationStyle, setAnimationStyle] = useState("Slide In");
  const [duration, setDuration] = useState(8);
  
  // Video properties
  const [videoType, setVideoType] = useState("File");
  const [videoSettings, setVideoSettings] = useState("");

  // Scene box data for preview
  const sceneBoxes = [
    {
      id: 1,
      label: "Box 1",
      color: "#ffcc80",
      border: "#ffa726",
      left: 18, top: 24, width: 90, height: 54,
      source: selectedSource === "Box 1" && selectedInput ? selectedInput : "Box 1"
    },
    {
      id: 2,
      label: "Box 2", 
      color: "#90caf9",
      border: "#42a5f5",
      left: 130, top: 24, width: 70, height: 54,
      source: selectedSource === "Box 2" && selectedInput ? selectedInput : "Box 2"
    },
    {
      id: 3,
      label: "Camera 5",
      color: "#a5d6a7",
      border: "#66bb6a", 
      left: 60, top: 100, width: 120, height: 40,
      source: "Camera 5"
    }
  ];

  // Handle title change
  const handleTitleChange = async (newTitle) => {
    if (!selectedItem) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/items/${selectedItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      if (!res.ok) throw new Error("Failed to update title");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Error updating title:", err);
    }
  };

  // Save data to item
  const saveItemData = async (newData) => {
    if (!selectedItem) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/items/${selectedItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: newData }),
      });
      if (!res.ok) throw new Error("Failed to update item data");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Error updating item data:", err);
    }
  };

  // Initialize data from itemData
  useEffect(() => {
    if (itemData) {
      setSelectedSource(itemData.selectedSource || "Box 1");
      setSelectedInput(itemData.selectedInput || "Camera 1");
      setTransitionType(itemData.transitionType || "fade");
      setTransitionDuration(itemData.transitionDuration || 0.5);
      setGraphicsType(itemData.graphicsType || "Lower Third");
      setHeadline(itemData.headline || "");
      setSubheadline(itemData.subheadline || "");
      setAccentColor(itemData.accentColor || "#1976d2");
      setShowLogo(itemData.showLogo || false);
      setAnimationStyle(itemData.animationStyle || "Slide In");
      setDuration(itemData.duration || 8);
      setVideoType(itemData.videoType || "File");
      setVideoSettings(itemData.videoSettings || "");
    }
  }, [itemData]);

  // Fetch scenes on mount
  useEffect(() => {
    setLoadingScenes(true);
    fetch(`${API_BASE_URL}/api/obs/scenes`)
      .then(res => res.json())
      .then(data => {
        if (data.scenes) {
          setScenes(data.scenes);
          setCurrentScene(data.currentProgramSceneName || "");
        } else {
          setError("No scenes found");
        }
      })
      .catch(err => setError("Failed to fetch scenes: " + err.message))
      .finally(() => setLoadingScenes(false));
  }, []);

  // Get the scene name from item data
  const getSceneName = () => {
    if (itemData?.parameters?.sceneName) {
      return itemData.parameters.sceneName;
    }
    if (itemData?.sceneName) {
      return itemData.sceneName;
    }
    return currentScene || "Show Open";
  };

  // Update item data when settings change
  const updateSettings = () => {
    const newData = {
      ...itemData,
      selectedSource,
      selectedInput,
      transitionType,
      transitionDuration,
      graphicsType,
      headline,
      subheadline,
      accentColor,
      showLogo,
      animationStyle,
      duration,
      videoType,
      videoSettings
    };
    saveItemData(newData);
  };

  // Render scene preview
  const renderScenePreview = () => {
    return (
      <div style={{
        position: "relative",
        width: "100%",
        maxWidth: "320px",
        height: "180px",
        background: "#e3f2fd",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(25,118,210,0.10)",
        border: "1.5px solid #b1c7e7",
        overflow: "hidden",
        marginBottom: "8px"
      }}>
        {sceneBoxes.map(box => (
          <div
            key={box.id}
            style={{
              position: "absolute",
              left: box.left + "px",
              top: box.top + "px",
              width: box.width + "px", 
              height: box.height + "px",
              background: box.color,
              borderRadius: "8px",
              border: `2px solid ${box.border}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-start",
              fontWeight: "700",
              fontSize: "1.1rem",
              color: "#222",
              cursor: "pointer",
              boxShadow: selectedSource === box.label || selectedSource === box.source ? "0 0 0 4px #1976d2" : ""
            }}
            onClick={() => setSelectedSource(box.label)}
          >
            <div style={{ fontSize: "1.5rem", fontWeight: "700", marginTop: "6px" }}>
              {box.id}
            </div>
            <div style={{ fontSize: "1rem", fontWeight: "600", marginTop: "8px" }}>
              {box.source}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      {/* Scene Title */}
      <div style={{
        fontWeight: 600,
        color: "#1976d2",
        marginBottom: "10px",
        padding: "0 24px",
        marginTop: "24px"
      }}>
        OBS Scene: <span style={{ color: "#1565c0" }}>{getSceneName()}</span>
      </div>

      {/* Scene Preview */}
      <div style={{
        background: "#fff",
        padding: "18px 18px 12px 18px",
        margin: "0 24px 10px 24px",
        borderRadius: "8px",
        boxShadow: "0 1px 4px rgba(25,118,210,0.07)"
      }}>
        <div style={{
          fontWeight: 600,
          color: "#1976d2",
          marginBottom: "8px"
        }}>
          Scene Screenshot Preview
        </div>
        {renderScenePreview()}
        <div style={{
          color: "#888",
          fontSize: "0.98rem",
          textAlign: "center"
        }}>
          Live preview of scene layout. Source boxes are auto-labeled.
        </div>
      </div>

      {/* Transition Settings */}
      <div style={{
        background: "#e3f2fd",
        padding: "10px 18px",
        margin: "0 24px 10px 24px",
        borderRadius: "8px",
        boxShadow: "0 1px 4px rgba(25,118,210,0.07)"
      }}>
        <label style={{ fontWeight: "bold" }}>Transition</label>
        <select
          value={transitionType}
          onChange={(e) => {
            setTransitionType(e.target.value);
            updateSettings();
          }}
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1.5px solid #b1c7e7",
            marginTop: "6px"
          }}
        >
          <option value="cut">Cut</option>
          <option value="fade">Fade</option>
          <option value="stinger1">Stinger 1</option>
          <option value="stinger2">Stinger 2</option>
          <option value="stinger3">Stinger 3</option>
        </select>
        
        {transitionType !== "cut" && (
          <div>
            <label style={{ marginTop: "12px", display: "block", fontWeight: "bold" }}>
              Transition Duration (sec)
            </label>
            <input
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={transitionDuration}
              onChange={(e) => {
                setTransitionDuration(parseFloat(e.target.value));
                updateSettings();
              }}
              style={{
                width: "100px",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1.5px solid #b1c7e7",
                marginTop: "6px"
              }}
            />
          </div>
        )}
      </div>

      {/* Sources Selection */}
      <div style={{
        background: "#fff",
        padding: "10px 18px",
        margin: "0 24px 10px 24px",
        borderRadius: "8px",
        boxShadow: "0 1px 4px rgba(25,118,210,0.07)"
      }}>
        <label style={{ fontWeight: "bold" }}>Sources</label>
        <select
          value={selectedSource}
          onChange={(e) => {
            setSelectedSource(e.target.value);
            setSelectedInput("Camera 1"); // Reset input when changing source
            updateSettings();
          }}
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1.5px solid #b1c7e7",
            marginTop: "6px"
          }}
        >
          <option value="Box 1">Box 1</option>
          <option value="Box 2">Box 2</option>
          <option value="Camera 5">Camera 5</option>
        </select>
      </div>

      {/* Input Selection (only for Box 1/2) */}
      {(selectedSource === "Box 1" || selectedSource === "Box 2") && (
        <div style={{
          background: "#e3f2fd",
          padding: "10px 18px",
          margin: "0 24px 10px 24px",
          borderRadius: "8px",
          boxShadow: "0 1px 4px rgba(25,118,210,0.07)"
        }}>
          <label style={{ fontWeight: "bold" }}>Input</label>
          <select
            value={selectedInput}
            onChange={(e) => {
              setSelectedInput(e.target.value);
              updateSettings();
            }}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1.5px solid #b1c7e7",
              marginTop: "6px"
            }}
          >
            <option value="Camera 1">Camera 1</option>
            <option value="CG-1">CG-1</option>
            <option value="Video">Video</option>
          </select>
        </div>
      )}

      {/* Graphics Properties for CG-1 */}
      {selectedInput === "CG-1" && (
        <div style={{
          background: "#e3f2fd",
          padding: "10px 18px",
          margin: "0 24px 10px 24px",
          borderRadius: "8px",
          boxShadow: "0 1px 4px rgba(25,118,210,0.07)"
        }}>
          <div style={{ fontWeight: 600, color: "#1976d2", marginBottom: "8px" }}>
            Graphics Properties
          </div>
          
          <label style={{ fontWeight: "bold" }}>Graphics Type</label>
          <select
            value={graphicsType}
            onChange={(e) => {
              setGraphicsType(e.target.value);
              updateSettings();
            }}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1.5px solid #b1c7e7",
              marginTop: "6px"
            }}
          >
            <option>Lower Third</option>
            <option>Full Screen</option>
            <option>Bug</option>
            <option>Ticker</option>
          </select>

          <label style={{ marginTop: "12px", display: "block", fontWeight: "bold" }}>
            Headline
          </label>
          <input
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            onBlur={updateSettings}
            placeholder="Enter headline..."
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1.5px solid #b1c7e7",
              marginTop: "6px"
            }}
          />

          <label style={{ marginTop: "12px", display: "block", fontWeight: "bold" }}>
            Subheadline
          </label>
          <input
            type="text"
            value={subheadline}
            onChange={(e) => setSubheadline(e.target.value)}
            onBlur={updateSettings}
            placeholder="Enter subheadline..."
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1.5px solid #b1c7e7",
              marginTop: "6px"
            }}
          />

          <label style={{ marginTop: "12px", display: "block", fontWeight: "bold" }}>
            Accent Color
          </label>
          <input
            type="color"
            value={accentColor}
            onChange={(e) => {
              setAccentColor(e.target.value);
              updateSettings();
            }}
            style={{
              width: "48px",
              height: "32px",
              padding: "0",
              borderRadius: "6px",
              border: "1.5px solid #b1c7e7",
              marginTop: "6px",
              verticalAlign: "middle"
            }}
          />

          <div style={{ marginTop: "12px" }}>
            <label style={{ fontWeight: "bold" }}>Show Logo</label>
            <input
              type="checkbox"
              checked={showLogo}
              onChange={(e) => {
                setShowLogo(e.target.checked);
                updateSettings();
              }}
              style={{ marginLeft: "12px" }}
            />
          </div>

          <label style={{ marginTop: "12px", display: "block", fontWeight: "bold" }}>
            Animation Style
          </label>
          <select
            value={animationStyle}
            onChange={(e) => {
              setAnimationStyle(e.target.value);
              updateSettings();
            }}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1.5px solid #b1c7e7",
              marginTop: "6px"
            }}
          >
            <option>Slide In</option>
            <option>Fade In</option>
            <option>Pop</option>
          </select>

          <label style={{ marginTop: "12px", display: "block", fontWeight: "bold" }}>
            Duration (sec)
          </label>
          <input
            type="number"
            min="1"
            max="60"
            value={duration}
            onChange={(e) => {
              setDuration(parseInt(e.target.value));
              updateSettings();
            }}
            style={{
              width: "80px",
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1.5px solid #b1c7e7",
              marginTop: "6px"
            }}
          />

          <div style={{ textAlign: "right", marginTop: "16px" }}>
            <button
              onClick={updateSettings}
              style={{
                background: "#1976d2",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "8px 22px",
                fontWeight: "600",
                fontSize: "1.08rem",
                boxShadow: "0 1px 4px rgba(25,118,210,0.10)",
                marginTop: "12px",
                cursor: "pointer"
              }}
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Video Properties */}
      {selectedInput === "Video" && (
        <div style={{
          background: "#e3f2fd",
          padding: "10px 18px",
          margin: "0 24px 10px 24px",
          borderRadius: "8px",
          boxShadow: "0 1px 4px rgba(25,118,210,0.07)"
        }}>
          <div style={{ fontWeight: 600, color: "#1976d2", marginBottom: "8px" }}>
            Video Properties
          </div>
          
          <label style={{ fontWeight: "bold" }}>Video Type</label>
          <select
            value={videoType}
            onChange={(e) => {
              setVideoType(e.target.value);
              updateSettings();
            }}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1.5px solid #b1c7e7",
              marginTop: "6px"
            }}
          >
            <option>File</option>
            <option>NDI</option>
            <option>Camera</option>
          </select>

          <label style={{ marginTop: "12px", display: "block", fontWeight: "bold" }}>
            Settings
          </label>
          <input
            type="text"
            value={videoSettings}
            onChange={(e) => setVideoSettings(e.target.value)}
            onBlur={updateSettings}
            placeholder="Resolution, FPS, etc..."
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1.5px solid #b1c7e7",
              marginTop: "6px"
            }}
          />

          <div style={{ textAlign: "right", marginTop: "16px" }}>
            <button
              onClick={updateSettings}
              style={{
                background: "#1976d2",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "8px 22px",
                fontWeight: "600",
                fontSize: "1.08rem",
                boxShadow: "0 1px 4px rgba(25,118,210,0.10)",
                marginTop: "12px",
                cursor: "pointer"
              }}
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={{
          color: "#d32f2f",
          fontSize: "14px",
          textAlign: "center",
          margin: "20px",
          padding: "10px",
          background: "#ffebee",
          borderRadius: "4px"
        }}>
          {error}
        </div>
      )}
    </div>
  );
}