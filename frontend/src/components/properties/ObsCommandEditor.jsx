import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";

export default function ObsCommandEditor({ selectedItem, itemData, setRefreshKey }) {
  const [scenes, setScenes] = useState([]);
  const [selectedScene, setSelectedScene] = useState("");
  const [sources, setSources] = useState([]);
  const [loadingScenes, setLoadingScenes] = useState(false);
  const [loadingSources, setLoadingSources] = useState(false);
  const [error, setError] = useState("");
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

  // Fetch scenes on mount
  useEffect(() => {
    setLoadingScenes(true);
    fetch(`${API_BASE_URL}/api/obs/scenes`)
      .then(res => res.json())
      .then(data => {
        if (data.scenes) {
          setScenes(data.scenes);
          // Auto-select current scene if available
          if (data.currentProgramSceneName) {
            setSelectedScene(data.currentProgramSceneName);
          } else if (data.scenes.length > 0) {
            setSelectedScene(data.scenes[0].sceneName);
          }
        } else {
          setError("No scenes found");
        }
      })
      .catch(err => setError("Failed to fetch scenes: " + err.message))
      .finally(() => setLoadingScenes(false));
  }, []);

  // Fetch sources when selectedScene changes
  useEffect(() => {
    if (!selectedScene) return;
    setLoadingSources(true);
    fetch(`${API_BASE_URL}/api/obs/sources/${encodeURIComponent(selectedScene)}`)
      .then(res => res.json())
      .then(data => {
        setSources(data.sources || []);
      })
      .catch(err => setError("Failed to fetch sources: " + err.message))
      .finally(() => setLoadingSources(false));
  }, [selectedScene]);

  return (
    <div style={{ padding: 15 }}>
      <h3 style={{ marginTop: 0, fontSize: 18, color: "#1976d2" }}>
        OBS Command
      </h3>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontWeight: 500, display: "block", marginBottom: 4 }}>
          Title:
        </label>
        <input
          type="text"
          value={itemData?.title || selectedItem?.title || ""}
          onChange={(e) => handleTitleChange(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "14px"
          }}
          placeholder="Enter title for this OBS command"
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontWeight: 500, display: "block", marginBottom: 4 }}>
          Scene:
        </label>
        {loadingScenes ? (
          <div>Loading scenes...</div>
        ) : (
          <select
            value={selectedScene}
            onChange={e => setSelectedScene(e.target.value)}
            style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "14px" }}
          >
            {scenes.map(scene => (
              <option key={scene.sceneName} value={scene.sceneName}>{scene.sceneName}</option>
            ))}
          </select>
        )}
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontWeight: 500, display: "block", marginBottom: 4 }}>
          Sources in Scene:
        </label>
        {loadingSources ? (
          <div>Loading sources...</div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {sources.map(src => (
              <li key={src.sceneItemId}>{src.sourceName}</li>
            ))}
          </ul>
        )}
      </div>

      {error && <div style={{ color: "red", marginBottom: 10 }}>{error}</div>}

      <p style={{ color: "#666", fontStyle: "italic" }}>
        Select a scene to view its sources. More OBS command options coming soon.
      </p>
    </div>
  );
}