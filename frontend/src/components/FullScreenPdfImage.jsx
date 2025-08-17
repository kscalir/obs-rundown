import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import MediaPicker from './MediaPicker.jsx';
import { useSelection } from '../selection/SelectionContext.jsx';

// Helper to get media URL
function getMediaUrl(media) {
  if (!media?.filename) return '';
  return `${API_BASE_URL}/media/${media.filename}`;
}

// Helper to get file type
function getFileType(media) {
  if (media.type === "image") return "image";
  if (media.type === "application") {
    // Check if it's a PDF by file extension
    const filename = media.filename || media.originalname || "";
    if (filename.toLowerCase().endsWith('.pdf')) return "pdf";
  }
  return "other";
}

export default function FullScreenPdfImage({ item, onSave }) {
  // Use centralized selection state
  const { showId } = useSelection();
  
  // Data state (matches ObsSceneEditor structure minus slots)
  const [data, setData] = useState({
    transition: { type: "cut", durationSec: 0 },
    selectedMedia: null,
    mediaProperties: {
      fit: 'cover',
      opacity: 100,
      rotation: 0,
      zoom: 1.0,
      offsetX: 0,
      offsetY: 0,
      pdfPage: 1
    },
    notes: ""
  });

  // Modal states
  const [mediaPickerModal, setMediaPickerModal] = useState({ open: false });

  // Load data from item
  useEffect(() => {
    if (!item?.data) return;
    
    const itemData = item.data;
    
    setData({
      transition: itemData.transition || { type: "cut", durationSec: 0 },
      selectedMedia: itemData.selectedMedia || null,
      mediaProperties: {
        fit: itemData.mediaProperties?.fit ?? 'cover',
        opacity: itemData.mediaProperties?.opacity ?? 100,
        rotation: itemData.mediaProperties?.rotation ?? 0,
        zoom: itemData.mediaProperties?.zoom ?? 1.0,
        offsetX: itemData.mediaProperties?.offsetX ?? 0,
        offsetY: itemData.mediaProperties?.offsetY ?? 0,
        pdfPage: itemData.mediaProperties?.pdfPage ?? 1
      },
      notes: itemData.notes || ""
    });
  }, [item]);

  // Save data helper
  const saveData = (newData) => {
    if (onSave) {
      onSave({ ...newData });
    }
  };

  // Field update helper
  const setField = (path, value) => {
    setData(prev => {
      const newData = { ...prev };
      const keys = path.split('.');
      let current = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      
      // Save to database
      saveData(newData);
      
      return newData;
    });
  };

  const transitionNeedsDuration = (t) => t && t.toLowerCase() !== "cut";

  // Media picker handlers
  const openMediaPicker = () => {
    setMediaPickerModal({ open: true });
  };

  const closeMediaPicker = () => {
    setMediaPickerModal({ open: false });
  };

  const handleMediaSelected = (media) => {
    setField('selectedMedia', media);
    closeMediaPicker();
  };

  // Simplified show ID resolution - prioritize centralized state
  const getShowIdFromAnywhere = (item) => {
    // Centralized showId takes priority
    if (showId != null) return showId;
    
    // Simple fallback to item data
    const fallbackId = item?.show_id ?? item?.showId ?? item?.group?.show_id ?? item?.group?.showId ?? null;
    return fallbackId;
  };

  const isPdf = data.selectedMedia && getFileType(data.selectedMedia) === 'pdf';

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: '#f8fbff',
      overflow: 'hidden'
    }}>
      {/* Header with Transition Controls */}
      <div style={{
        background: '#fff',
        borderBottom: '2px solid #e1e6ec',
        padding: '16px 20px',
        flexShrink: 0
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 12
        }}>
          <h3 style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 600,
            color: '#1976d2'
          }}>
            Full Screen PDF/Image
          </h3>
        </div>

        {/* Transition Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <label style={{ fontSize: 14, fontWeight: 600, color: '#222' }}>Transition</label>
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={data.transition?.type || "cut"}
              onChange={(e) => setField("transition.type", e.target.value)}
              style={{ 
                padding: "6px 10px", 
                borderRadius: 6, 
                border: "1px solid #b1c7e7",
                background: "#fff"
              }}
            >
              <option value="cut">Cut</option>
              <option value="fade">Fade</option>
              <option value="slide">Slide</option>
              <option value="stinger">Stinger</option>
            </select>
            {transitionNeedsDuration(data.transition?.type) && (
              <>
                <label style={{ alignSelf: "center", fontWeight: 600, color: "#222", fontSize: 14 }}>Duration (s)</label>
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={data.transition?.durationSec ?? 0}
                  onChange={(e) => setField("transition.durationSec", Number(e.target.value))}
                  style={{ 
                    width: 90,
                    padding: "6px 8px", 
                    borderRadius: 6, 
                    border: "1px solid #b1c7e7"
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        gap: 20, 
        padding: 20,
        overflow: 'hidden'
      }}>
        {/* Left: Preview Area */}
        <div style={{ 
          flex: 2, 
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #e1e6ec',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e1e6ec',
            background: '#f8fbff',
            flexShrink: 0
          }}>
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1976d2' }}>
              Preview
            </h4>
          </div>
          
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            background: '#fafdff'
          }}>
            {data.selectedMedia ? (
              <div style={{
                width: '100%',
                height: '100%',
                maxWidth: 800,
                maxHeight: 450,
                background: '#f5f5f5',
                borderRadius: 8,
                overflow: 'hidden',
                border: '2px solid #e1e6ec',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}>
                {isPdf ? (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 16,
                    opacity: data.mediaProperties.opacity / 100,
                    transform: `rotate(${data.mediaProperties.rotation}deg) scale(${data.mediaProperties.zoom}) translate(${data.mediaProperties.offsetX}px, ${data.mediaProperties.offsetY}px)`
                  }}>
                    <div style={{
                      fontSize: 48,
                      color: '#d32f2f',
                      marginBottom: 8
                    }}>
                      📄
                    </div>
                    <div style={{
                      fontSize: 18,
                      fontWeight: 600,
                      color: '#333',
                      textAlign: 'center'
                    }}>
                      PDF Document
                    </div>
                    <div style={{
                      fontSize: 14,
                      color: '#666',
                      textAlign: 'center'
                    }}>
                      {data.selectedMedia.name || data.selectedMedia.originalname}
                    </div>
                    <div style={{
                      fontSize: 12,
                      color: '#999',
                      textAlign: 'center'
                    }}>
                      Page: {data.mediaProperties.pdfPage}
                    </div>
                  </div>
                ) : (
                  <img
                    src={getMediaUrl(data.selectedMedia)}
                    alt={data.selectedMedia.name || data.selectedMedia.originalname}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: data.mediaProperties.fit,
                      opacity: data.mediaProperties.opacity / 100,
                      transform: `rotate(${data.mediaProperties.rotation}deg) scale(${data.mediaProperties.zoom}) translate(${data.mediaProperties.offsetX}px, ${data.mediaProperties.offsetY}px)`
                    }}
                  />
                )}
              </div>
            ) : (
              <div style={{
                color: '#aaa',
                fontSize: 18,
                textAlign: 'center',
                padding: 40
              }}>
                No image or PDF selected
                <br />
                <button
                  onClick={openMediaPicker}
                  style={{
                    marginTop: 16,
                    background: '#1976d2',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    padding: '12px 24px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Select Image/PDF
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Properties Panel */}
        <div style={{ 
          flex: 1, 
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #e1e6ec',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e1e6ec',
            background: '#f8fbff',
            flexShrink: 0
          }}>
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1976d2' }}>
              Image/PDF Properties
            </h4>
          </div>

          <div style={{
            flex: 1,
            padding: 20,
            overflow: 'auto'
          }}>
            {/* Media Selection */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ 
                display: 'block',
                fontSize: 14, 
                color: '#222', 
                fontWeight: 600,
                marginBottom: 8
              }}>
                Selected {isPdf ? 'PDF' : 'Image'}
              </label>
              
              {data.selectedMedia ? (
                <div style={{
                  background: '#f8fbff',
                  border: '1px solid #b1c7e7',
                  borderRadius: 8,
                  padding: 12
                }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 80,
                      height: 45,
                      background: isPdf ? '#f5f5f5' : '#000',
                      borderRadius: 4,
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #b1c7e7',
                      flexShrink: 0
                    }}>
                      {isPdf ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontSize: 16, color: '#d32f2f' }}>📄</span>
                          <span style={{ fontSize: 8, color: '#666' }}>PDF</span>
                        </div>
                      ) : (
                        <img
                          src={getMediaUrl(data.selectedMedia)}
                          alt="Preview"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontSize: 14, 
                        fontWeight: 600, 
                        color: '#1976d2',
                        marginBottom: 4
                      }}>
                        {data.selectedMedia.name || data.selectedMedia.originalname}
                      </div>
                      <div style={{ 
                        fontSize: 12, 
                        color: '#666',
                        marginBottom: 6
                      }}>
                        {data.selectedMedia.type} {isPdf ? '• PDF Document' : '• Image File'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                      onClick={openMediaPicker}
                      style={{
                        background: "#e3f2fd",
                        border: "1px solid #1976d2",
                        color: "#1976d2",
                        borderRadius: 6,
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      Change
                    </button>
                    <button
                      onClick={() => setField('selectedMedia', null)}
                      style={{
                        background: "#fff2e0",
                        border: "1px solid #ff9800",
                        color: "#e65100",
                        borderRadius: 6,
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={openMediaPicker}
                  style={{
                    width: '100%',
                    background: '#e3f2fd',
                    border: '2px dashed #1976d2',
                    color: '#1976d2',
                    borderRadius: 8,
                    padding: '20px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  + Select Image/PDF
                </button>
              )}
            </div>

            {/* Display Properties */}
            {data.selectedMedia && (
              <div style={{ marginBottom: 24 }}>
                <label style={{ 
                  display: 'block',
                  fontSize: 14, 
                  color: '#222', 
                  fontWeight: 600,
                  marginBottom: 12
                }}>
                  Display Properties
                </label>

                {/* Fit Mode */}
                {!isPdf && (
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ 
                      display: 'block',
                      fontSize: 14, 
                      color: '#333',
                      marginBottom: 4
                    }}>
                      Fit Mode
                    </label>
                    <select
                      value={data.mediaProperties.fit}
                      onChange={(e) => setField('mediaProperties.fit', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: 6,
                        border: '1px solid #b1c7e7',
                        background: '#fff'
                      }}
                    >
                      <option value="cover">Cover</option>
                      <option value="contain">Contain</option>
                      <option value="fill">Fill</option>
                      <option value="scale-down">Scale Down</option>
                    </select>
                  </div>
                )}

                {/* PDF Page Selection */}
                {isPdf && (
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ 
                      display: 'block',
                      fontSize: 14, 
                      color: '#333',
                      marginBottom: 4
                    }}>
                      PDF Page
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={data.mediaProperties.pdfPage}
                      onChange={(e) => setField('mediaProperties.pdfPage', Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: 6,
                        border: '1px solid #b1c7e7',
                        background: '#fff',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                )}

                {/* Opacity */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ 
                    display: 'block',
                    fontSize: 14, 
                    color: '#333',
                    marginBottom: 4
                  }}>
                    Opacity: {data.mediaProperties.opacity}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={data.mediaProperties.opacity}
                    onChange={(e) => setField('mediaProperties.opacity', Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Rotation */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ 
                    display: 'block',
                    fontSize: 14, 
                    color: '#333',
                    marginBottom: 4
                  }}>
                    Rotation: {data.mediaProperties.rotation}°
                  </label>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={data.mediaProperties.rotation}
                    onChange={(e) => setField('mediaProperties.rotation', Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Zoom */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ 
                    display: 'block',
                    fontSize: 14, 
                    color: '#333',
                    marginBottom: 4
                  }}>
                    Zoom: {data.mediaProperties.zoom}x
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="5"
                    step="0.1"
                    value={data.mediaProperties.zoom}
                    onChange={(e) => setField('mediaProperties.zoom', Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Offset X */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ 
                    display: 'block',
                    fontSize: 14, 
                    color: '#333',
                    marginBottom: 4
                  }}>
                    Offset X: {data.mediaProperties.offsetX}px
                  </label>
                  <input
                    type="range"
                    min="-200"
                    max="200"
                    value={data.mediaProperties.offsetX}
                    onChange={(e) => setField('mediaProperties.offsetX', Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Offset Y */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ 
                    display: 'block',
                    fontSize: 14, 
                    color: '#333',
                    marginBottom: 4
                  }}>
                    Offset Y: {data.mediaProperties.offsetY}px
                  </label>
                  <input
                    type="range"
                    min="-200"
                    max="200"
                    value={data.mediaProperties.offsetY}
                    onChange={(e) => setField('mediaProperties.offsetY', Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            )}

            {/* Notes Section */}
            <div>
              <label style={{ 
                display: 'block',
                fontSize: 14, 
                color: '#222', 
                fontWeight: 600,
                marginBottom: 8
              }}>
                Notes
              </label>
              <textarea
                value={data.notes}
                onChange={(e) => setField('notes', e.target.value)}
                placeholder="Add notes..."
                style={{
                  width: '100%',
                  height: 80,
                  padding: 12,
                  borderRadius: 6,
                  border: '1px solid #b1c7e7',
                  background: '#fff',
                  fontSize: 14,
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Media Picker Modal */}
      <MediaPicker
        showId={getShowIdFromAnywhere(item)}
        isOpen={mediaPickerModal.open}
        onClose={closeMediaPicker}
        onMediaSelected={handleMediaSelected}
        title="Select Image/PDF for Full Screen"
        typeFilter={['image', 'application']} // Only show images and PDFs
      />
    </div>
  );
}