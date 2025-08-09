import React, { useState, useEffect } from "react";
import { API_BASE_URL } from '../../config';

export default function VideoEditor({ selectedItem, itemData, setRefreshKey }) {
  const [localData, setLocalData] = useState({});
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize local data from selectedItem
  useEffect(() => {
    if (selectedItem?.data) {
      setLocalData(selectedItem.data);
    }
  }, [selectedItem]);

  // Fetch available media
  useEffect(() => {
    if (selectedItem?.showId) {
      fetchMedia();
    }
  }, [selectedItem?.showId]);

  const fetchMedia = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/media?showId=${selectedItem.showId}&type=video`);
      if (!res.ok) throw new Error("Failed to fetch media");
      const data = await res.json();
      setMediaList(data);
    } catch (err) {
      console.error("Error fetching media:", err);
      setError("Failed to load media list");
    }
  };

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
      setError("Failed to update title");
    }
  };

  // Handle data field changes
  const handleDataChange = async (field, value) => {
    if (!selectedItem) return;

    const newData = { ...localData, [field]: value };
    setLocalData(newData);

    try {
      const res = await fetch(`${API_BASE_URL}/api/items/${selectedItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: newData }),
      });

      if (!res.ok) throw new Error("Failed to update video data");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Error updating video data:", err);
      setError("Failed to update video data");
    }
  };

  // Handle media selection
  const handleMediaSelect = (mediaId) => {
    const selectedMedia = mediaList.find(m => m.id === parseInt(mediaId));
    if (selectedMedia) {
      handleDataChange('mediaId', parseInt(mediaId));
      handleDataChange('mediaName', selectedMedia.displayName || selectedMedia.name || selectedMedia.originalname);
      handleDataChange('duration', selectedMedia.duration);
    }
  };

  // Format duration helper
  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get selected media details
  const selectedMedia = mediaList.find(m => m.id === localData.mediaId);

  return (
    <div style={{ padding: 15 }}>
      <h3 style={{ marginTop: 0, fontSize: 18, color: "#1976d2" }}>
        Video Item
      </h3>
      
      {/* Title Field */}
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
          placeholder="Enter title for this video item"
        />
      </div>

      {/* Media Selection */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontWeight: 500, display: "block", marginBottom: 4 }}>
          Video File:
        </label>
        <select
          value={localData.mediaId || ""}
          onChange={(e) => handleMediaSelect(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            border: "1px solid #ddd",
            borderRadius: 4,
          }}
        >
          <option value="">Select a video file...</option>
          {mediaList.map((media) => (
            <option key={media.id} value={media.id}>
              {media.displayName || media.name || media.originalname}
              {media.duration && ` (${formatDuration(media.duration)})`}
            </option>
          ))}
        </select>
      </div>

      {/* Selected Media Preview */}
      {selectedMedia && (
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontWeight: 500, display: "block", marginBottom: 4 }}>
            Preview:
          </label>
          <div style={{
            width: "100%",
            aspectRatio: "16/9",
            background: "#000",
            border: "1px solid #ddd",
            borderRadius: 4,
            overflow: "hidden",
          }}>
            <video
              src={`${API_BASE_URL}/media/files/${selectedMedia.filename}`}
              controls
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>
          
          {/* Media Info */}
          <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
            <div><strong>File:</strong> {selectedMedia.originalname}</div>
            {selectedMedia.duration && (
              <div><strong>Duration:</strong> {formatDuration(selectedMedia.duration)}</div>
            )}
            {selectedMedia.size && (
              <div><strong>Size:</strong> {(selectedMedia.size / (1024 * 1024)).toFixed(1)} MB</div>
            )}
          </div>
        </div>
      )}

      {/* Playback Options */}
      <div style={{ marginBottom: 20 }}>
        <h4 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>
          Playback Options
        </h4>
        
        {/* Auto Play */}
        <label style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <input
            type="checkbox"
            checked={localData.autoPlay || false}
            onChange={(e) => handleDataChange('autoPlay', e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Auto-play when selected
        </label>

        {/* Loop */}
        <label style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <input
            type="checkbox"
            checked={localData.loop || false}
            onChange={(e) => handleDataChange('loop', e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Loop video
        </label>

        {/* Start Time */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontWeight: 500, display: "block", marginBottom: 4 }}>
            Start Time (seconds):
          </label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={localData.startTime || ""}
            onChange={(e) => handleDataChange('startTime', parseFloat(e.target.value) || 0)}
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #ddd",
              borderRadius: 4,
            }}
            placeholder="0"
          />
        </div>

        {/* End Time */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontWeight: 500, display: "block", marginBottom: 4 }}>
            End Time (seconds):
          </label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={localData.endTime || ""}
            onChange={(e) => handleDataChange('endTime', parseFloat(e.target.value) || 0)}
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #ddd",
              borderRadius: 4,
            }}
            placeholder="Leave empty for full duration"
          />
        </div>

        {/* Volume */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontWeight: 500, display: "block", marginBottom: 4 }}>
            Volume: {Math.round((localData.volume || 1) * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={localData.volume || 1}
            onChange={(e) => handleDataChange('volume', parseFloat(e.target.value))}
            style={{
              width: "100%",
            }}
          />
        </div>
      </div>

      {/* Notes */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontWeight: 500, display: "block", marginBottom: 4 }}>
          Notes:
        </label>
        <textarea
          value={localData.notes || ""}
          onChange={(e) => handleDataChange('notes', e.target.value)}
          style={{
            width: "100%",
            minHeight: "80px",
            padding: "8px",
            border: "1px solid #ddd",
            borderRadius: 4,
            resize: "vertical",
            fontFamily: "inherit",
          }}
          placeholder="Add any notes about this video..."
        />
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          marginTop: 16,
          padding: "8px 12px",
          background: "#ffebee",
          color: "#c62828",
          borderRadius: 4,
          fontSize: 14,
        }}>
          {error}
        </div>
      )}
    </div>
  );
}