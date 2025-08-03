import React, { useState, useEffect } from "react";

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
  if (/\.\w+$/.test(media.filename)) return `/media/${media.filename}`;
  if (media.originalname && /\.\w+$/.test(media.originalname)) {
    const ext = media.originalname.split('.').pop();
    return `/media/${media.filename}.${ext}`;
  }
  return `/media/${media.filename}`;
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
    let url = `http://localhost:5050/api/shows/${showId}/media`;
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
    formData.append("show_id", showId);
    formData.append("name", newMediaName || newMediaFile.name);

    try {
      const res = await fetch("http://localhost:5050/api/media", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
      setUploading(false);
      closeUploadModal();
      if (onMediaUploaded) onMediaUploaded();
    } catch (err) {
      setUploadError(err.message);
      setUploading(false);
    }
  };

  const handleDelete = async (mediaId) => {
    if (!window.confirm("Delete this media file?")) return;
    setDeletingId(mediaId);
    try {
      const res = await fetch(`http://localhost:5050/api/media/${mediaId}`, { method: "DELETE" });
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
    if (!editingName.trim()) return;
    try {
      const res = await fetch(`http://localhost:5050/api/media/${media.id}/name`, {
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

  // --- Render
  if (!showId) {
    return (
      <div style={{ color: "#888", padding: 24 }}>
        No show selected. Please select a show to manage media.
      </div>
    );
  }

  return (
    // ... [rest of your render code, unchanged, as in your existing MediaTab.jsx]
    // For brevity, your render code (filter/search, grid, upload modal) remains unchanged
    // Just copy everything from the return ( ... ) in your current file
    <div
      style={{
        background: "#fff",
        padding: "32px 0",
        overflow: "auto",
        boxSizing: "border-box",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "auto"
      }}
    >
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
            const thumbUrl = media.thumb ? `/media/thumbs/${media.thumb}` : url;
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
                  background: "#fafaff",
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
                    <div style={{
                      width: 160,
                      height: 90,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 3,
                      background: "#fff",
                      borderRadius: 8,
                      border: "1px solid #e0e0e0",
                      overflow: "hidden",
                      aspectRatio: "16 / 9"
                    }}>
                      <img
                        src={thumbUrl}
                        alt={displayName}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
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
                    <div style={{
                      width: 160,
                      height: 90,
                      background: "#000",
                      borderRadius: 8,
                      marginBottom: 3,
                      overflow: "hidden",
                      aspectRatio: "16 / 9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
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
                          background: "#fafaff",
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
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}