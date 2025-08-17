import React, { useState, useEffect } from "react";
import { API_BASE_URL } from '../../config';

// Small preview that opens a modal zoom while mouse/touch is held
function HoldToZoomModalPreview({ url, containerWidth = 128, containerHeight = 72, baseWidth = 1920, baseHeight = 1080 }) {
  const [zooming, setZooming] = React.useState(false);

  // Scale used for the inline thumbnail
  const thumbScale = containerWidth / baseWidth;

  const start = (e) => { e.preventDefault(); setZooming(true); };
  const stop = () => setZooming(false);

  // Compute modal scale to fit up to 90vw x 85vh without exceeding 1:1
  const modalScale = React.useMemo(() => {
    const vw = (typeof window !== 'undefined' ? window.innerWidth : 1280) * 0.9;
    const vh = (typeof window !== 'undefined' ? window.innerHeight : 800) * 0.85;
    const sx = vw / baseWidth;
    const sy = vh / baseHeight;
    return Math.min(1, Math.min(sx, sy));
  }, [baseWidth, baseHeight]);

  return (
    <div
      style={{ position: 'relative', width: containerWidth, height: containerHeight, overflow: 'hidden', cursor: 'zoom-in' }}
      onMouseDown={start}
      onMouseUp={stop}
      onMouseLeave={stop}
      onTouchStart={start}
      onTouchEnd={stop}
    >
      {/* Thumbnail (always visible) */}
      <iframe
        title={`gfx-thumb-${Math.random().toString(36).slice(2)}`}
        src={url}
        style={{
          width: baseWidth,
          height: baseHeight,
          border: 0,
          display: 'block',
          transform: `scale(${thumbScale})`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
          borderRadius: 4
        }}
        sandbox="allow-scripts allow-same-origin"
      />

      {/* Modal zoom (shows while mouse/touch is held) */}
      {zooming && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100000 }}
          onMouseUp={stop}
          onMouseLeave={stop}
          onTouchEnd={stop}
          onClick={stop}
        >
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              maxWidth: '90vw',
              maxHeight: '85vh',
              overflow: 'hidden',
              background: '#111',
              borderRadius: 8,
              boxShadow: '0 12px 28px rgba(0,0,0,0.35)'
            }}
          >
            <iframe
              title={`gfx-zoom-${Math.random().toString(36).slice(2)}`}
              src={url}
              style={{
                width: baseWidth,
                height: baseHeight,
                border: 0,
                display: 'block',
                transform: `scale(${modalScale})`,
                transformOrigin: 'top left',
                pointerEvents: 'none'
              }}
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function GraphicsTemplateEditor({ graphicId, setRefreshKey, onClose, onSaved }) {
  const [graphic, setGraphic] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [placeholders, setPlaceholders] = useState([]);
  const [previewUrl, setPreviewUrl] = useState('');
  const [title, setTitle] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [templateData, setTemplateData] = useState({});
  const [titleTouched, setTitleTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load graphic data
  useEffect(() => {
    const loadGraphic = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/api/graphics/${graphicId}`);
        if (!response.ok) {
          throw new Error(`Failed to load graphic: ${response.statusText}`);
        }
        const data = await response.json();
        setGraphic(data);
        setTitle(data.title || '');
        setTemplateId(data.template_id || '');
        setTemplateData(data.template_data || {});
        setTitleTouched(false);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadGraphic();
  }, [graphicId]);

  // Load templates on mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/templates`);
        if (response.ok) {
          const templatesData = await response.json();
          setTemplates(templatesData);
        }
      } catch (error) {
        // Error loading templates
      }
    };
    loadTemplates();
  }, []);

  // Load placeholders when template changes
  useEffect(() => {
    if (!templateId) {
      setPlaceholders([]);
      return;
    }

    const loadPlaceholders = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/templates/${templateId}/placeholders`);
        if (response.ok) {
          const placeholdersData = await response.json();
          setPlaceholders(placeholdersData);
        }
      } catch (error) {
        setPlaceholders([]);
      }
    };
    loadPlaceholders();
  }, [templateId]);

  useEffect(() => {
    if (titleTouched) return;
    
    // Get the template to derive type from
    const template = templates.find(t => t.id === templateId);
    const templateType = template?.type || template?.name || templateId || '';
    
    // Get first field value from template data
    const firstFieldValue = placeholders.length > 0 
      ? (templateData[placeholders[0].id] || '') 
      : '';
    
    // Generate title as: type-{first field value}
    if (templateType && firstFieldValue) {
      const suggested = `${templateType}-${firstFieldValue}`;
      if (suggested !== title) setTitle(suggested);
    }
  }, [templateData, templateId, title, titleTouched, templates, placeholders]);

  // Update preview URL when template or data changes
  useEffect(() => {
    if (!templateId) {
      setPreviewUrl('');
      return;
    }

    const template = templates.find(t => t.id === templateId);
    if (!template) {
      setPreviewUrl('');
      return;
    }

    const dataParam = encodeURIComponent(JSON.stringify(templateData));
    const url = `${API_BASE_URL}/api/templates/${templateId}/preview?data=${dataParam}`;
    setPreviewUrl(url);
  }, [templateId, templateData, templates]);

  const patchGraphicPartial = async (patch) => {
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/api/graphics/${graphicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });
      if (!response.ok) {
        throw new Error(`Failed to save graphic: ${response.statusText}`);
      }
      const updated = await response.json();
      setGraphic(updated);
      
      // Notify parent component that graphic was saved
      if (onSaved) {
        onSaved(updated);
      }
      
      return updated;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  // Handle template selection change
  const handleTemplateChange = (e) => {
    const newTemplateId = e.target.value || '';
    setTemplateId(newTemplateId);
    setTemplateData({}); // Reset template data when changing templates
  };

  const handleBlurTitle = async () => {
    await patchGraphicPartial({ title });
  };

  const handleBlurTemplateOrData = async () => {
    // Also update type based on template when saving
    const template = templates.find(t => t.id === templateId);
    const templateType = template?.type || template?.name || templateId || '';
    await patchGraphicPartial({ 
      template_id: templateId, 
      template_data: templateData,
      type: templateType
    });
  };

  // Handle template data changes
  const handleDataChange = (fieldId, value) => {
    setTemplateData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };


  // Backwards-compat: no graphicId provided
  if (!graphicId) {
    return (
      <div style={{ textAlign: 'center', padding: '1rem', fontStyle: 'italic' }}>
        No graphic selected.
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (!graphic) {
    return null; // or loading state handled above
  }

  return (
    <div style={{ 
      background: "#fafdff", 
      borderRadius: 12, 
      padding: 20, 
      border: "1px solid #e1e6ec",
      maxHeight: "85vh",
      overflow: "auto"
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: 20,
        paddingBottom: 12,
        borderBottom: "2px solid #e1e6ec"
      }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: 18, 
          fontWeight: 600, 
          color: "#1976d2" 
        }}>
          Graphics Editor
        </h3>
        {saving && (
          <span style={{ 
            fontSize: 12, 
            color: "#1976d2",
            fontStyle: "italic"
          }}>
            saving…
          </span>
        )}
      </div>

      <div style={{ 
        display: 'flex', 
        gap: 20, 
        alignItems: 'flex-start' 
      }}>
        {/* LEFT: form fields */}
        <div style={{ 
          flex: '1 1 auto', 
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}>
          {/* Title */}
          <div>
            <label 
              htmlFor="title-input"
              style={{ 
                display: 'block',
                fontSize: 14, 
                color: '#222', 
                fontWeight: 600,
                marginBottom: 6
              }}
            >
              Title:
            </label>
            <input
              id="title-input"
              type="text"
              value={title}
              onChange={e => {
                if (!titleTouched) setTitleTouched(true);
                setTitle(e.target.value);
              }}
              onBlur={handleBlurTitle}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #b1c7e7",
                borderRadius: 6,
                background: "#fff",
                color: "#222",
                fontSize: 14,
                boxSizing: "border-box"
              }}
              placeholder="Enter title"
            />
          </div>


          {/* Template Selection */}
          <div>
            <label 
              htmlFor="template-select"
              style={{ 
                display: 'block',
                fontSize: 14, 
                color: '#222', 
                fontWeight: 600,
                marginBottom: 6
              }}
            >
              Template:
            </label>
            <select
              id="template-select"
              value={templateId}
              onChange={handleTemplateChange}
              onBlur={handleBlurTemplateOrData}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #b1c7e7",
                borderRadius: 6,
                background: "#fff",
                color: "#222",
                fontSize: 14,
                boxSizing: "border-box"
              }}
            >
              <option value="">Select a template...</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name || template.id}
                </option>
              ))}
            </select>
          </div>

          {/* Template Data Fields */}
          {templateId && placeholders.length > 0 && (
            <div style={{
              background: "#f8fbff",
              border: "1px solid #e1e6ec",
              borderRadius: 8,
              padding: 16
            }}>
              <h4 style={{ 
                margin: "0 0 16px 0",
                fontSize: 16,
                fontWeight: 600,
                color: "#1976d2"
              }}>
                Template Fields
              </h4>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                {placeholders.map(placeholder => (
                  <div key={placeholder.id}>
                    <label 
                      htmlFor={`field-${placeholder.id}`}
                      style={{ 
                        display: 'block',
                        fontSize: 14, 
                        color: '#222', 
                        fontWeight: 600,
                        marginBottom: 6
                      }}
                    >
                      {placeholder.label}:
                    </label>
                    {placeholder.type === 'color' ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: "8px 12px",
                        border: "1px solid #b1c7e7",
                        borderRadius: 6,
                        background: "#fff",
                        boxSizing: "border-box"
                      }}>
                        <input
                          id={`field-${placeholder.id}`}
                          type="color"
                          value={templateData[placeholder.id] || placeholder.defaultValue || '#000000'}
                          onChange={(e) => handleDataChange(placeholder.id, e.target.value)}
                          onBlur={handleBlurTemplateOrData}
                          style={{
                            width: 40,
                            height: 32,
                            border: "1px solid #b1c7e7",
                            borderRadius: 4,
                            cursor: "pointer",
                            padding: 0,
                            background: "transparent"
                          }}
                        />
                        <input
                          type="text"
                          value={templateData[placeholder.id] || placeholder.defaultValue || ''}
                          onChange={(e) => handleDataChange(placeholder.id, e.target.value)}
                          onBlur={handleBlurTemplateOrData}
                          style={{
                            flex: 1,
                            padding: "4px 8px",
                            border: "1px solid #ddd",
                            borderRadius: 4,
                            background: "#f9f9f9",
                            color: "#222",
                            fontSize: 13,
                            fontFamily: "monospace"
                          }}
                          placeholder={placeholder.defaultValue || '#000000'}
                        />
                      </div>
                    ) : (
                      <input
                        id={`field-${placeholder.id}`}
                        type={placeholder.type}
                        value={templateData[placeholder.id] || placeholder.defaultValue || ''}
                        onChange={(e) => handleDataChange(placeholder.id, e.target.value)}
                        onBlur={handleBlurTemplateOrData}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid #b1c7e7",
                          borderRadius: 6,
                          background: "#fff",
                          color: "#222",
                          fontSize: 14,
                          boxSizing: "border-box"
                        }}
                        placeholder={placeholder.defaultValue}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: sticky live preview */}
        <div style={{ 
          flex: '0 0 440px', 
          position: 'sticky', 
          top: 0 
        }}>
          <div style={{ 
            border: '1px solid #e1e6ec', 
            borderRadius: 8, 
            padding: 16, 
            background: '#f8fbff' 
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              marginBottom: 12 
            }}>
              <h4 style={{ 
                margin: 0,
                fontSize: 16,
                fontWeight: 600,
                color: "#1976d2"
              }}>
                Preview
              </h4>
            </div>
            {previewUrl ? (
              <div style={{
                border: "1px solid #b1c7e7",
                borderRadius: 6,
                overflow: "hidden",
                background: "#000",
                display: "flex",
                justifyContent: "center",
                alignItems: "center"
              }}>
                <HoldToZoomModalPreview 
                  url={previewUrl}
                  containerWidth={440}
                  containerHeight={Math.round(440 * 9 / 16)}
                  baseWidth={1920}
                  baseHeight={1080}
                />
              </div>
            ) : (
              <div style={{ 
                height: Math.round(440 * 9 / 16), 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: '#777',
                fontStyle: 'italic',
                background: '#f0f0f0',
                border: "1px solid #b1c7e7",
                borderRadius: 6
              }}>
                No template selected
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}