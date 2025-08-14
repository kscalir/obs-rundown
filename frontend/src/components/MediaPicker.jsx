import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../config";

// File type helper
function getFileType(media) {
  if (media.type === "image") return "image";
  if (media.type === "video") return "video";
  if (media.type === "audio") return "audio";
  if (media.type === "gfx") return "gfx";
  if (media.type === "application") {
    // Check if it's a PDF by file extension
    const filename = media.filename || media.originalname || "";
    if (filename.toLowerCase().endsWith('.pdf')) return "pdf";
  }
  return "other";
}

function getMediaUrl(media) {
  if (!media.filename) return "";
  return `${API_BASE_URL}/media/${media.filename}`;
}

const FILTER_OPTIONS = [
  { value: "", label: "All" },
  { value: "image", label: "Images" },
  { value: "video", label: "Video" },
];

export default function MediaPicker({ 
  showId, 
  isOpen, 
  onClose, 
  onMediaSelected,
  title = "Select Media",
  typeFilter: propTypeFilter = null // Optional type filter from parent
}) {
  const [filteredList, setFilteredList] = useState([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");

  // Hover preview state
  const [hoverPreview, setHoverPreview] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });

  // Fetch media list for the selected show
  useEffect(() => {
    console.log('MediaPicker: showId =', showId, 'isOpen =', isOpen);
    if (!showId || !isOpen) {
      console.log('MediaPicker: No showId or not open, clearing list');
      setFilteredList([]);
      return;
    }
    
    let url = `${API_BASE_URL}/api/media/show/${showId}`;
    const params = [];
    if (typeFilter) params.push(`type=${encodeURIComponent(typeFilter)}`);
    if (search.trim()) params.push(`search=${encodeURIComponent(search.trim())}`);
    if (params.length) url += "?" + params.join("&");
    
    console.log('MediaPicker: Fetching from URL:', url);
    
    fetch(url)
      .then((res) => {
        console.log('MediaPicker: Response status:', res.status, res.ok);
        return res.ok ? res.json() : [];
      })
      .then((data) => {
        console.log('MediaPicker: Received data:', data);
        let filteredData = data;
        
        // Apply type filtering based on propTypeFilter
        if (propTypeFilter && Array.isArray(propTypeFilter)) {
          filteredData = data.filter(media => {
            // For PDF/Image filtering: 'image' type for images, 'application' type for PDFs
            return propTypeFilter.includes(media.type);
          });
          console.log('MediaPicker: Applied propTypeFilter:', propTypeFilter, 'Result count:', filteredData.length);
        } else {
          // Default behavior: Filter out audio files since this picker is for video/images only
          filteredData = data.filter(media => media.type !== 'audio');
        }
        
        setFilteredList(filteredData);
      })
      .catch((error) => {
        console.error('MediaPicker: Fetch error:', error);
        setFilteredList([]);
      });
  }, [showId, typeFilter, search, isOpen]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setTypeFilter("");
    }
  }, [isOpen]);

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFilterChange = (e) => setTypeFilter(e.target.value);
  const handleSearchChange = (e) => setSearch(e.target.value);

  const handleMediaSelect = (media) => {
    // Directly select media and close modal
    if (onMediaSelected) {
      onMediaSelected(media);
    }
    onClose();
  };

  const handleMouseEnter = (media, event) => {
    const type = getFileType(media);
    if (type === 'image' || type === 'video' || type === 'pdf') {
      setHoverPreview(media);
      setHoverPosition({ 
        x: event.clientX, 
        y: event.clientY + 20
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
        y: event.clientY + 20
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        width: '90vw',
        maxWidth: 1200,
        height: '90vh',
        background: '#fafdff',
        borderRadius: 12,
        boxShadow: '0 12px 28px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '2px solid #e1e6ec',
          flexShrink: 0
        }}>
          <h3 style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 600,
            color: '#1976d2'
          }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "#fff2e0",
              border: "1px solid #ff9800",
              color: "#e65100",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Close
          </button>
        </div>

        {/* Controls */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "16px 24px",
          borderBottom: "1px solid #e1e6ec",
          flexShrink: 0,
          background: "#f8fbff"
        }}>
          <select
            value={typeFilter}
            onChange={handleFilterChange}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #b1c7e7",
              background: "#fff"
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
              border: "1px solid #b1c7e7",
              background: "#fff",
              minWidth: 200,
              flex: 1
            }}
          />
        </div>

        {/* Content Area */}
        <div style={{
          flex: 1,
          padding: '20px',
          overflow: 'auto',
          background: '#fafdff'
        }}>
            {filteredList.length === 0 ? (
              <div style={{ color: "#aaa", padding: 24, textAlign: 'center' }}>
                No media found for this show.
              </div>
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 16
              }}>
                {filteredList.map((media) => {
                  const url = getMediaUrl(media);
                  const type = getFileType(media);
                  const thumbUrl = media.thumb 
                    ? `${API_BASE_URL}/media/thumbs/${media.thumb}` 
                    : getMediaUrl(media);
                  const displayName = media.displayName || media.name || media.originalname || media.filename;

                  return (
                    <div
                      key={media.id}
                      onClick={() => handleMediaSelect(media)}
                      style={{
                        border: "1px solid #eee",
                        borderRadius: 8,
                        background: "#fff",
                        padding: 8,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
                      }}
                      onMouseEnter={(e) => handleMouseEnter(media, e)}
                      onMouseLeave={handleMouseLeave}
                      onMouseMove={handleMouseMove}
                    >
                      {/* Media Preview */}
                      <div style={{
                        width: "100%",
                        height: 90,
                        marginBottom: 8,
                        borderRadius: 4,
                        overflow: "hidden",
                        background: type === "video" ? "#000" : "#f5f5f5",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        {type === "image" && media.thumb && (
                          <img
                            src={thumbUrl}
                            alt={displayName}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover"
                            }}
                          />
                        )}
                        {type === "video" && (
                          <video
                            src={url}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover"
                            }}
                            muted
                          />
                        )}
                        {type === "audio" && (
                          <span style={{ fontSize: 24, color: "#1976d2" }}>🔊</span>
                        )}
                        {type === "pdf" && (
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
                            <span style={{ fontSize: 24, color: "#d32f2f", marginBottom: 4 }}>📄</span>
                            <span style={{ fontSize: 10, color: "#666" }}>PDF</span>
                          </div>
                        )}
                        {(type === "gfx" || type === "other") && (
                          <span style={{ fontSize: 12, color: "#999" }}>
                            {type === "gfx" ? "Graphics" : "File"}
                          </span>
                        )}
                      </div>

                      {/* Media Info */}
                      <div style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "#333",
                        marginBottom: 4,
                        textAlign: "center",
                        wordBreak: "break-word"
                      }}>
                        {displayName}
                      </div>

                      <div style={{
                        fontSize: 10,
                        color: "#666",
                        textAlign: "center"
                      }}>
                        {media.type && (
                          <span style={{
                            background: "#e3f2fd",
                            color: "#1976d2",
                            padding: "1px 4px",
                            borderRadius: 2,
                            marginRight: 4
                          }}>
                            {media.type}
                          </span>
                        )}
                        {media.duration && (
                          <span>{formatDuration(media.duration)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      </div>

      {/* Hover Preview */}
      {hoverPreview && (
        <div style={{
          position: "fixed",
          pointerEvents: "none",
          zIndex: 11000,
          top: hoverPosition.y,
          left: hoverPosition.x,
          transform: "translate(-50%, 0)",
          borderRadius: 8,
          overflow: "hidden",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
          background: "white",
          padding: 8,
          maxWidth: 400,
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}>
          {getFileType(hoverPreview) === "image" && hoverPreview.thumb && (
            <img
              src={`${API_BASE_URL}/media/thumbs/${hoverPreview.thumb}`}
              alt={hoverPreview.displayName}
              style={{
                maxWidth: "380px",
                maxHeight: "280px",
                width: "auto",
                height: "auto",
                objectFit: "cover",
                borderRadius: 4,
                marginBottom: 8
              }}
            />
          )}
          {getFileType(hoverPreview) === "video" && (
            <video
              src={getMediaUrl(hoverPreview)}
              style={{
                maxWidth: "380px",
                maxHeight: "280px",
                width: "auto",
                height: "auto",
                objectFit: "cover",
                borderRadius: 4,
                marginBottom: 8
              }}
              autoPlay
              muted
              loop
            />
          )}
          {getFileType(hoverPreview) === "pdf" && (
            <div style={{
              width: "200px",
              height: "120px",
              background: "#f5f5f5",
              border: "2px solid #d32f2f",
              borderRadius: 4,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 8
            }}>
              <span style={{ fontSize: 32, color: "#d32f2f", marginBottom: 8 }}>📄</span>
              <span style={{ fontSize: 12, color: "#666", fontWeight: 600 }}>PDF Document</span>
            </div>
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