import React, { useState } from "react";

// Helper to extract YouTube video ID from various URL formats
function extractYouTubeId(url) {
  if (!url) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

// Helper to create YouTube embed URL
function getYouTubeEmbedUrl(videoId, autoplay = false) {
  if (!videoId) return "";
  return `https://www.youtube.com/embed/${videoId}?${autoplay ? 'autoplay=1&' : ''}mute=1&rel=0&controls=1`;
}

// Helper to get YouTube thumbnail
function getYouTubeThumbnail(videoId) {
  if (!videoId) return "";
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export default function YouTubePicker({ 
  isOpen, 
  onClose, 
  onYouTubeSelected,
  title = "Add YouTube Video"
}) {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoId, setVideoId] = useState(null);
  const [isValidUrl, setIsValidUrl] = useState(false);

  // Handle URL input changes
  const handleUrlChange = (e) => {
    const url = e.target.value;
    setYoutubeUrl(url);
    
    const extractedId = extractYouTubeId(url);
    if (extractedId) {
      setVideoId(extractedId);
      setIsValidUrl(true);
    } else {
      setVideoId(null);
      setIsValidUrl(false);
    }
  };

  // Handle YouTube selection
  const handleSelect = () => {
    if (videoId && isValidUrl) {
      const youtubeData = {
        videoId,
        url: youtubeUrl,
        embedUrl: getYouTubeEmbedUrl(videoId),
        thumbnail: getYouTubeThumbnail(videoId),
        title: `YouTube Video (${videoId})`
      };
      
      if (onYouTubeSelected) {
        onYouTubeSelected(youtubeData);
      }
      
      // Reset form
      setYoutubeUrl("");
      setVideoId(null);
      setIsValidUrl(false);
    }
  };

  // Reset form when modal closes
  const handleClose = () => {
    setYoutubeUrl("");
    setVideoId(null);
    setIsValidUrl(false);
    onClose();
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
        maxWidth: 800,
        height: '80vh',
        maxHeight: 600,
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
            onClick={handleClose}
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

        {/* URL Input */}
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid #e1e6ec",
          flexShrink: 0,
          background: "#f8fbff"
        }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ 
              display: 'block',
              fontSize: 14,
              fontWeight: 600,
              color: '#333',
              marginBottom: 8
            }}>
              YouTube URL
            </label>
            <input
              type="text"
              placeholder="Paste YouTube URL here (e.g., https://www.youtube.com/watch?v=...)"
              value={youtubeUrl}
              onChange={handleUrlChange}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 8,
                border: `2px solid ${isValidUrl ? '#4caf50' : youtubeUrl && !isValidUrl ? '#f44336' : '#b1c7e7'}`,
                background: "#fff",
                fontSize: 14,
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          {youtubeUrl && !isValidUrl && (
            <div style={{ 
              color: '#f44336', 
              fontSize: 12,
              marginTop: 4
            }}>
              Please enter a valid YouTube URL
            </div>
          )}
          
          {isValidUrl && (
            <div style={{ 
              color: '#4caf50', 
              fontSize: 12,
              marginTop: 4
            }}>
              ✓ Valid YouTube URL detected (Video ID: {videoId})
            </div>
          )}
        </div>

        {/* Preview Area */}
        <div style={{
          flex: 1,
          padding: '20px',
          overflow: 'auto',
          background: '#fafdff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {!videoId ? (
            <div style={{ 
              color: "#aaa", 
              textAlign: 'center',
              fontSize: 16
            }}>
              Enter a YouTube URL above to see preview
            </div>
          ) : (
            <div style={{
              width: '100%',
              maxWidth: 640,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16
            }}>
              {/* YouTube Embed Preview */}
              <div style={{
                width: '100%',
                aspectRatio: '16/9',
                background: '#000',
                borderRadius: 8,
                overflow: 'hidden',
                border: '1px solid #e0e0e0'
              }}>
                <iframe
                  width="100%"
                  height="100%"
                  src={getYouTubeEmbedUrl(videoId, false)}
                  frameBorder="0"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ display: 'block' }}
                />
              </div>
              
              {/* Video Info */}
              <div style={{
                textAlign: 'center',
                fontSize: 14,
                color: '#666'
              }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  YouTube Video Preview
                </div>
                <div style={{ fontSize: 12 }}>
                  Video ID: {videoId}
                </div>
              </div>
              
              {/* Select Button */}
              <button
                onClick={handleSelect}
                disabled={!isValidUrl}
                style={{
                  background: isValidUrl ? "#1976d2" : "#ccc",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  padding: "12px 24px",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: isValidUrl ? "pointer" : "not-allowed",
                  transition: "background 0.2s"
                }}
                onMouseEnter={(e) => {
                  if (isValidUrl) e.currentTarget.style.background = '#1565c0';
                }}
                onMouseLeave={(e) => {
                  if (isValidUrl) e.currentTarget.style.background = '#1976d2';
                }}
              >
                Select This Video
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}