import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../config";

// File type helper
function getFileType(media) {
  if (media.type === "image") return "image";
  if (media.type === "video") return "video";
  if (media.type === "audio") return "audio";
  if (media.type === "gfx") return "gfx";
  return "other";
}

function getMediaUrl(media) {
  if (!media.filename) return "";
  // Use API_BASE_URL instead of hardcoded URL
  return `${API_BASE_URL}/media/${media.filename}`;
}

const FILTER_OPTIONS = [
  { value: "", label: "All" },
  { value: "image", label: "Images" },
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
  { value: "gfx", label: "Graphics" },
  { value: "other", label: "Other" },
];

export default function MediaTab({ showId, onMediaUploaded }) {
  const [filteredList, setFilteredList] = useState([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newMediaName, setNewMediaName] = useState("");
  const [newMediaFile, setNewMediaFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  // Fetch media list for the selected show
  useEffect(() => {
    if (!showId) {
      setFilteredList([]);
      return;
    }
    // Change this line to use the correct route pattern:
    let url = `${API_BASE_URL}/api/media/show/${showId}`;
    const params = [];
    if (typeFilter) params.push(`type=${encodeURIComponent(typeFilter)}`);
    if (search.trim()) params.push(`search=${encodeURIComponent(search.trim())}`);
    if (params.length) url += "?" + params.join("&");
    fetch(url)
      .then((res) => res.ok ? res.json() : [])
      .then(setFilteredList)
      .catch(() => setFilteredList([]));
  }, [showId, typeFilter, search, uploading, deletingId, editingId]);

  // --- Handlers
  const handleFilterChange = (e) => setTypeFilter(e.target.value);
  const handleSearchChange = (e) => setSearch(e.target.value);

  const openUploadModal = () => {
    setShowUploadModal(true);
    setNewMediaName("");
    setNewMediaFile(null);
    setUploadError(null);
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setNewMediaName("");
    setNewMediaFile(null);
    setUploadError(null);
  };

  const handleUploadFileChange = (e) => setNewMediaFile(e.target.files[0] || null);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!newMediaFile || !showId) {
      setUploadError("Choose a file.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    const formData = new FormData();
    formData.append("file", newMediaFile);
    formData.append("showId", showId);
    formData.append("name", newMediaName || newMediaFile.name);

    try {
      // Use API_BASE_URL instead of hardcoded URL:
      const res = await fetch(`${API_BASE_URL}/api/media`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || `Upload failed: ${res.statusText}`);
      }
      setUploading(false);
      closeUploadModal();
      if (onMediaUploaded) onMediaUploaded();
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError(err.message);
      setUploading(false);
    }
  };

  const handleDelete = async (mediaId) => {
    if (!window.confirm("Delete this media file?")) return;
    setDeletingId(mediaId);
    try {
      // Use API_BASE_URL instead of hardcoded URL:
      const res = await fetch(`${API_BASE_URL}/api/media/${mediaId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setDeletingId(null);
      if (onMediaUploaded) onMediaUploaded();
    } catch (err) {
      alert("Error deleting file: " + err.message);
      setDeletingId(null);
    }
  };

  const handleEditClick = (media) => {
    setEditingId(media.id);
    setEditingName(media.displayName || media.name || media.originalname);
  };
  const handleEditChange = (e) => setEditingName(e.target.value);
  const handleEditSave = async (media) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/media/${media.id}/name`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingName }),
      });
      if (!res.ok) throw new Error("Failed to update name");
      setEditingId(null);
      setEditingName("");
      if (onMediaUploaded) onMediaUploaded();
    } catch (err) {
      alert("Error updating name: " + err.message);
    }
  };
  const handleEditCancel = () => {
    setEditingId(null);
    setEditingName("");
  };

  const [hoverPreview, setHoverPreview] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (media, event) => {
    const type = getFileType(media);
    if (type === 'image' || type === 'video') {
      setHoverPreview(media);
      setHoverPosition({ 
        x: event.clientX, 
        y: event.clientY + 20  // Changed: position below cursor instead of above
      });
    }
  };

  const handleMouseLeave = () => {
    setHoverPreview(null);
  };

  const handleMouseMove = (event) => {
    if (hoverPreview) {
      setHoverPosition({ 
        x: event.clientX, 
        y: event.clientY + 20  // Changed: position below cursor instead of above
      });
    }
  };

  // --- Add a helper function to format duration:
  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Render
  if (!showId) {
    return (
      <div style={{ color: "#888", padding: 24 }}>
        No show selected. Please select a show to manage media.
      </div>
    );
  }
return (
    <div
      style={{
        background: "#fafdff",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        overflow: "hidden"
      }}
    >
      {/* Add Controls Bar */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: 16, 
        marginBottom: 24,
        padding: "18px 32px 0 32px",
        background: "#fafdff"
      }}>
        <button 
          onClick={openUploadModal}
          style={{
            background: "#e3f2fd",
            color: "#1976d2",
            border: "1px solid #b1c7e7",
            borderRadius: 8,
            padding: "4px 14px",
            fontWeight: 500,
            fontSize: 15,
            marginRight: 18,
            marginTop: 2,
            cursor: "pointer",
            boxShadow: "none",
            transition: "background 0.15s, border 0.15s"
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#1565c0'}
          onMouseLeave={e => e.currentTarget.style.background = '#1976d2'}
        >
          + Add Media
        </button>

        <select
          value={typeFilter}
          onChange={handleFilterChange}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: "1.5px solid #e0e0e0"
          }}
        >
          {FILTER_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search media..."
          value={search}
          onChange={handleSearchChange}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: "1.5px solid #e0e0e0",
            minWidth: 200
          }}
        />
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "white",
            padding: 24,
            borderRadius: 8,
            minWidth: 300
          }}>
            <h3 style={{ marginTop: 0 }}>Upload Media</h3>
            <form onSubmit={handleUploadSubmit}>
              <div style={{ marginBottom: 16 }}>
                <input
                  type="file"
                  onChange={handleUploadFileChange}
                  accept="image/*,video/*,audio/*"
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <input
                  type="text"
                  value={newMediaName}
                  onChange={e => setNewMediaName(e.target.value)}
                  placeholder="Optional display name"
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    borderRadius: 4,
                    border: "1px solid #ccc"
                  }}
                />
              </div>
              {uploadError && (
                <div style={{ color: "red", marginBottom: 16 }}>{uploadError}</div>
              )}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" onClick={closeUploadModal}>Cancel</button>
                <button 
                  type="submit" 
                  disabled={uploading}
                  style={{ fontWeight: 600 }}
                >
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

  


      {filteredList.length === 0 ? (
        <div style={{ color: "#aaa", padding: 24 }}>No media found for this show.</div>
      ) : (
        <ul style={{
          listStyle: "none",
          padding: 0,
          display: "flex",
          flexWrap: "wrap",
          gap: 32,
          width: "100%",
          boxSizing: "border-box"
        }}>
          {filteredList.map((media) => {
            const url = getMediaUrl(media);
            const type = getFileType(media);
            const thumbUrl = media.thumb 
              ? `${API_BASE_URL}/media/thumbs/${media.thumb}` 
              : getMediaUrl(media);
            const displayName = media.displayName || media.name || media.originalname || media.filename;

            return (
              <li
                key={media.id}
                style={{
                  width: 176,
                  minHeight: 145,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  border: "1px solid #eee",
                  borderRadius: 12,
                  background: "#fafdff",
                  padding: 8,
                  boxShadow: "0 2px 10px 0 #e4e8ed22",
                  position: "relative",
                  marginBottom: 2,
                }}
              >
                {type !== "gfx" && (
                  <button
                    onClick={() => handleDelete(media.id)}
                    disabled={deletingId === media.id}
                    style={{
                      position: "absolute",
                      bottom: "6px",
                      right: "10px",
                      zIndex: 2,
                      background: "none",
                      border: "none",
                      fontSize: 15,
                      color: "#e53935",
                      cursor: "pointer",
                      padding: 0,
                    }}
                    title="Delete media"
                  >
                    🗑
                  </button>
                )}
                {/* IMAGE THUMBNAIL */}
                {type === "image" && media.thumb && (
                  <>
                    <div 
                      style={{
                        width: 160,
                        height: 90,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 3,
                        background: "#fafdff",
                        borderRadius: 8,
                        border: "1px solid #e0e0e0",
                        overflow: "hidden",
                        aspectRatio: "16 / 9",
                        cursor: "zoom-in"
                      }}
                      onMouseEnter={(e) => handleMouseEnter(media, e)}
                      onMouseLeave={handleMouseLeave}
                      onMouseMove={handleMouseMove}
                    >
                      <img
                        src={thumbUrl}
                        alt={displayName}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                        onError={(e) => {
                          console.error('Image failed to load:', thumbUrl);
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = '(Image load failed)';
                        }}
                      />
                    </div>
                    {editingId === media.id ? (
                      <div style={{ marginTop: 2, width: "100%" }}>
                        <input
                          type="text"
                          value={editingName}
                          onChange={handleEditChange}
                          style={{ width: "85%", fontSize: 12.5, borderRadius: 4, border: "1px solid #ccc" }}
                          autoFocus
                        />
                        <button onClick={() => handleEditSave(media)} style={{ marginLeft: 4 }}>✔️</button>
                        <button onClick={handleEditCancel} style={{ marginLeft: 2 }}>✖️</button>
                      </div>
                    ) : (
                      <span
                        style={{
                          fontWeight: 500,
                          fontSize: 12.5,
                          textAlign: "center",
                          wordBreak: "break-all",
                          marginTop: 2,
                          cursor: "pointer",
                          color: "#1a237e"
                        }}
                        onClick={() => handleEditClick(media)}
                        title="Click to rename"
                        tabIndex={0}
                      >
                        {displayName}
                      </span>
                    )}
                  </>
                )}
                {type === "image" && !media.thumb && (
                  <span
                    style={{
                      fontWeight: 500,
                      fontSize: 13,
                      textAlign: "center",
                      wordBreak: "break-all",
                      marginTop: 60,
                      color: "#bbb"
                    }}
                  >
                    {displayName}
                    <br />
                    <span style={{ fontSize: 11, color: "#ddd" }}>(no thumbnail)</span>
                  </span>
                )}

                {/* VIDEO - 16:9 preview */}
                {type === "video" && (
                  <>
                    <div 
                      style={{
                        width: 160,
                        height: 90,
                        background: "#000",
                        borderRadius: 8,
                        marginBottom: 3,
                        overflow: "hidden",
                        aspectRatio: "16 / 9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "zoom-in"
                      }}
                      onMouseEnter={(e) => handleMouseEnter(media, e)}
                      onMouseLeave={handleMouseLeave}
                      onMouseMove={handleMouseMove}
                    >
                      <video
                        src={url}
                        controls
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                          background: "#000",
                          borderRadius: 8
                        }}
                      />
                    </div>
                    {editingId === media.id ? (
                      <div style={{ marginTop: 2, width: "100%" }}>
                        <input
                          type="text"
                          value={editingName}
                          onChange={handleEditChange}
                          style={{ width: "85%", fontSize: 12.5, borderRadius: 4, border: "1px solid #ccc" }}
                          autoFocus
                        />
                        <button onClick={() => handleEditSave(media)} style={{ marginLeft: 4 }}>✔️</button>
                        <button onClick={handleEditCancel} style={{ marginLeft: 2 }}>✖️</button>
                      </div>
                    ) : (
                      <span
                        style={{
                          fontWeight: 500,
                          fontSize: 12.5,
                          textAlign: "center",
                          wordBreak: "break-all",
                          marginTop: 2,
                          cursor: "pointer",
                          color: "#1a237e"
                        }}
                        onClick={() => handleEditClick(media)}
                        title="Click to rename"
                        tabIndex={0}
                      >
                        {displayName}
                      </span>
                    )}
                  </>
                )}

                {type === "audio" && (
                  <>
                    <div style={{
                      width: 160,
                      height: 90, // Match image/video height
                      background: "#e8eaf6",
                      borderRadius: 8,
                      marginBottom: 3,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid #e0e0e0",
                      position: "relative",
                      overflow: "hidden"
                    }}>
                      {/* Optional: Replace src below with a local SVG or emoji if you want */}
                      <span style={{ fontSize: 30, color: "#1976d2", marginBottom: 6 }}>🔊</span>
                      <audio
                        src={url}
                        controls
                        style={{
                          width: "95%",
                          maxWidth: "95%",
                          background: "#fafdff",
                          borderRadius: 6,
                        }}
                      />
                    </div>
                    {editingId === media.id ? (
                      <div style={{ marginTop: 2, width: "100%" }}>
                        <input
                          type="text"
                          value={editingName}
                          onChange={handleEditChange}
                          style={{ width: "85%", fontSize: 12.5, borderRadius: 4, border: "1px solid #ccc" }}
                          autoFocus
                        />
                        <button onClick={() => handleEditSave(media)} style={{ marginLeft: 4 }}>✔️</button>
                        <button onClick={handleEditCancel} style={{ marginLeft: 2 }}>✖️</button>
                      </div>
                    ) : (
                      <span
                        style={{
                          fontWeight: 500,
                          fontSize: 12.5,
                          textAlign: "center",
                          wordBreak: "break-all",
                          marginTop: 2,
                          cursor: "pointer",
                          color: "#1a237e"
                        }}
                        onClick={() => handleEditClick(media)}
                        title="Click to rename"
                        tabIndex={0}
                      >
                        {displayName}
                      </span>
                    )}
                  </>
                )}
                {/* GFX/other */}
                {type === "gfx" && (
                  <span style={{ fontStyle: "italic", color: "#7c7c7c", marginTop: 40 }}>
                    [Graphics]
                  </span>
                )}
                <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                  {media.type && (
                    <span style={{ 
                      background: "#e3f2fd", 
                      color: "#1976d2", 
                      padding: "2px 6px", 
                      borderRadius: 3,
                      marginRight: 8
                    }}>
                      {media.type}
                    </span>
                  )}
                  {media.duration && (
                    <span>Duration: {formatDuration(media.duration)}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Hover Preview - Image/Video */}
      {hoverPreview && (
        <div style={{
          position: "fixed",
          pointerEvents: "none",
          zIndex: 2000,
          top: hoverPosition.y,
          left: hoverPosition.x,
          transform: "translate(-50%, 0)",  // Changed: only center horizontally, no vertical offset
          fontSize: 14,
          borderRadius: 8,
          overflow: "hidden",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          background: "white",
          padding: 8,
          maxWidth: 500,  // Changed: increased from 300 to 500
          width: "auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center"
        }}>
          {getFileType(hoverPreview) === "image" && hoverPreview.thumb && (
            <img
              src={`${API_BASE_URL}/media/thumbs/${hoverPreview.thumb}`}
              alt={hoverPreview.displayName}
              style={{
                maxWidth: "480px",  // Changed: increased from 100% to specific larger size
                maxHeight: "360px", // Changed: increased height
                width: "auto",
                height: "auto",
                objectFit: "cover",
                borderRadius: 4,
                marginBottom: 8,
                border: "1px solid #e0e0e0"
              }}
            />
          )}
          {getFileType(hoverPreview) === "video" && (
            <video
              src={getMediaUrl(hoverPreview)}
              style={{
                maxWidth: "480px",  // Changed: increased from 100% to specific larger size
                maxHeight: "360px", // Changed: increased height
                width: "auto",
                height: "auto",
                objectFit: "cover",
                borderRadius: 4,
                marginBottom: 8,
                border: "1px solid #e0e0e0"
              }}
              autoPlay    // Added: auto-play for video previews
              muted       // Added: muted so it can autoplay
              loop        // Added: loop the video
            />
          )}
          <div style={{ textAlign: "center" }}>
            <strong>{hoverPreview.displayName || hoverPreview.name}</strong>
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
              {hoverPreview.type && (
                <span style={{ 
                  background: "#e3f2fd", 
                  color: "#1976d2", 
                  padding: "2px 6px", 
                  borderRadius: 3,
                  marginRight: 8
                }}>
                  {hoverPreview.type}
                </span>
              )}
              {hoverPreview.duration && (
                <span>Duration: {formatDuration(hoverPreview.duration)}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}