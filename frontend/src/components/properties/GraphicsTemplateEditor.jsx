import React, { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from '../../config';

export default function GraphicsTemplateEditor({ 
  selectedItem, 
  itemData, 
  setRefreshKey 
}) {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateData, setTemplateData] = useState({});
  const [localTemplateData, setLocalTemplateData] = useState({});
  const [selectedChannel, setSelectedChannel] = useState(1);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPreviewPopup, setShowPreviewPopup] = useState(false);
  const previewRef = useRef(null);

  // Initialize data from selectedItem
  useEffect(() => {
    if (selectedItem?.data) {
      setTemplateData(selectedItem.data);
      setLocalTemplateData(selectedItem.data);
      if (selectedItem.data.templateId) {
        fetchTemplateDetails(selectedItem.data.templateId);
      }
      if (selectedItem.data.channel) {
        setSelectedChannel(selectedItem.data.channel);
      }
    }
  }, [selectedItem]);

  // Fetch available templates
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/templates`)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch templates: ${res.status}`);
        return res.json();
      })
      .then(data => {
        setTemplates(Array.isArray(data) ? data : []);
      })
      .catch(err => {
        console.error("Error loading templates:", err);
        setError("Failed to load templates");
        // Fallback templates
        setTemplates([
          {
            id: "lower-third",
            name: "Lower Third",
            description: "Name and title lower third graphic",
            parameters: [
              { id: "f0", type: "STRING", default: "Name", info: "Name" },
              { id: "f1", type: "STRING", default: "Title", info: "Title" },
              { id: "color", type: "COLOR", default: "#1976d2", info: "Background Color" }
            ]
          }
        ]);
      });
  }, []);

  // Update preview URL when template or data changes
  useEffect(() => {
    if (!selectedTemplate || !templateData.templateId) {
      setPreviewUrl("");
      return;
    }

    const dataParam = encodeURIComponent(JSON.stringify(templateData));
    const url = `${API_BASE_URL}/api/templates/${templateData.templateId}/preview?data=${dataParam}`;
    setPreviewUrl(url);
  }, [selectedTemplate, templateData]);

  // Fetch template details
  const fetchTemplateDetails = (templateId) => {
    if (!templateId) return;

    fetch(`${API_BASE_URL}/api/templates/${templateId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch template details");
        return res.json();
      })
      .then((template) => {
        setSelectedTemplate(template);
      })
      .catch((err) => {
        console.error("Error loading template details:", err);
        const template = templates.find((t) => t.id === templateId);
        if (template) setSelectedTemplate(template);
      });
  };

  // Handle template selection
  const handleTemplateChange = async (e) => {
    const templateId = e.target.value;
    if (!templateId || !selectedItem) return;

    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    setIsLoading(true);

    const newData = {
      ...templateData,
      templateId,
      title: template.name,
      channel: template.defaultChannel || selectedChannel,
    };

    (template.parameters || []).forEach((param) => {
      if (param.default !== undefined && newData[param.id] === undefined) {
        newData[param.id] = param.default;
      }
    });

    setTemplateData(newData);
    setSelectedTemplate(template);

    try {
      const res = await fetch(`${API_BASE_URL}/api/items/${selectedItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: newData }),
      });

      if (!res.ok) throw new Error("Failed to update template");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Error updating template:", err);
      setError("Failed to update template");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle field value changes
  const handleFieldChange = async (paramId, value) => {
    if (!selectedItem) return;

    const newData = { ...templateData, [paramId]: value };
    setTemplateData(newData);

    try {
      const res = await fetch(`${API_BASE_URL}/api/items/${selectedItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: newData }),
      });

      if (!res.ok) throw new Error("Failed to update field");
      setRefreshKey((k) => k + 1);

      if (previewRef.current) {
        previewRef.current.contentWindow.postMessage(newData, "*");
      }
    } catch (err) {
      console.error("Error updating field:", err);
      setError("Failed to update field");
    }
  };

  // Handle channel change
  const handleChannelChange = async (e) => {
    const channel = Number(e.target.value);
    setSelectedChannel(channel);

    if (!selectedItem) return;

    const newData = { ...templateData, channel };
    setTemplateData(newData);

    try {
      const res = await fetch(`${API_BASE_URL}/api/items/${selectedItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: newData }),
      });

      if (!res.ok) throw new Error("Failed to update channel");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Error updating channel:", err);
      setError("Failed to update channel");
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

  // Handle template commands
  const handleCommand = async (command) => {
    if (!selectedItem || !templateData.templateId) return;

    setIsLoading(true);
    setError(null);

    try {
      const amcpCommand = {
        'play': 'cg_add',      // Add and play
        'update': 'cg_update', // Update data
        'stop': 'cg_stop'      // Stop playback
      }[command] || command;

      const res = await fetch(`${API_BASE_URL}/api/graphics/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: amcpCommand,
          channel: selectedChannel,
          layer: 1, // Default to layer 1
          templateId: templateData.templateId,
          data: templateData,
        }),
      });

      if (!res.ok) throw new Error(`Failed to send ${command} command`);

      const result = await res.json();
      console.log('AMCP command result:', result);

      const newData = {
        ...templateData,
        lastCommand: command,
        lastCommandTime: new Date().toISOString(),
      };

      setTemplateData(newData);

      await fetch(`${API_BASE_URL}/api/items/${selectedItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: newData }),
      });

      setRefreshKey((k) => k + 1);

    } catch (err) {
      console.error(`Error sending ${command} command:`, err);
      setError(`Failed to ${command} template`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle preview mouse events
  const handlePreviewMouseDown = (e) => {
    if (previewUrl) {
      e.preventDefault();
      setShowPreviewPopup(true);
    }
  };

  // Global mouse events for preview popup
  useEffect(() => {
    if (!showPreviewPopup) return;

    const handleGlobalMouseUp = () => {
      setShowPreviewPopup(false);
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [showPreviewPopup]);

  // Render parameter input based on type
  const renderParameterInput = (param) => {
    switch (param.type) {
      case "STRING":
        return (
          <input
            type="text"
            value={localTemplateData.hasOwnProperty(param.id) 
              ? localTemplateData[param.id] 
              : (templateData[param.id] || "")}
            onChange={(e) => {
              setLocalTemplateData(prev => ({
                ...prev,
                [param.id]: e.target.value
              }));
            }}
            onBlur={(e) => {
              handleFieldChange(param.id, e.target.value);
            }}
            placeholder={param.info || param.id}
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #ddd",
              borderRadius: 4,
              marginTop: 4,
            }}
          />
        );

      case "NUMBER":
      case "INTEGER":
        return (
          <input
            type="number"
            value={localTemplateData.hasOwnProperty(param.id) 
              ? localTemplateData[param.id] 
              : (templateData[param.id] || 0)}
            onChange={(e) => {
              setLocalTemplateData(prev => ({
                ...prev,
                [param.id]: Number(e.target.value) || 0
              }));
            }}
            onBlur={(e) => {
              handleFieldChange(param.id, Number(e.target.value) || 0);
            }}
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #ddd",
              borderRadius: 4,
              marginTop: 4,
            }}
          />
        );

      case "COLOR":
        return (
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <input
              type="color"
              value={localTemplateData.hasOwnProperty(param.id) 
                ? localTemplateData[param.id] 
                : (templateData[param.id] || param.default || "#000000")}
              onChange={(e) => {
                const newValue = e.target.value;
                setLocalTemplateData(prev => ({
                  ...prev,
                  [param.id]: newValue
                }));
                handleFieldChange(param.id, newValue);
              }}
              style={{ width: 40, height: 40 }}
            />
            <input
              type="text"
              value={localTemplateData.hasOwnProperty(param.id) 
                ? localTemplateData[param.id] 
                : (templateData[param.id] || param.default || "#000000")}
              onChange={(e) => {
                setLocalTemplateData(prev => ({
                  ...prev,
                  [param.id]: e.target.value
                }));
              }}
              onBlur={(e) => {
                handleFieldChange(param.id, e.target.value);
              }}
              style={{
                flex: 1,
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: 4,
              }}
            />
          </div>
        );

      case "BOOL":
      case "BOOLEAN":
        return (
          <label style={{ display: "flex", alignItems: "center", marginTop: 4 }}>
            <input
              type="checkbox"
              checked={!!(localTemplateData.hasOwnProperty(param.id) 
                ? localTemplateData[param.id] 
                : templateData[param.id])}
              onChange={(e) => {
                const newValue = e.target.checked;
                setLocalTemplateData(prev => ({
                  ...prev,
                  [param.id]: newValue
                }));
                handleFieldChange(param.id, newValue);
              }}
              style={{ marginRight: 8 }}
            />
            {param.info || param.id}
          </label>
        );

      default:
        return (
          <input
            type="text"
            value={localTemplateData.hasOwnProperty(param.id) 
              ? localTemplateData[param.id] 
              : (templateData[param.id] || "")}
            onChange={(e) => {
              setLocalTemplateData(prev => ({
                ...prev,
                [param.id]: e.target.value
              }));
            }}
            onBlur={(e) => {
              handleFieldChange(param.id, e.target.value);
            }}
            placeholder={param.info || param.id}
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #ddd",
              borderRadius: 4,
              marginTop: 4,
            }}
          />
        );
    }
  };

  return (
    <div style={{ padding: 15 }}>
      <h3 style={{ marginTop: 0, fontSize: 18, color: "#1976d2" }}>
        Graphics Template
      </h3>

      {/* Title Field */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontWeight: 500, display: "block", marginBottom: 4 }}>
          Title:
        </label>
        <input 
          type="text"
          value={localTemplateData.hasOwnProperty('title') 
            ? localTemplateData.title 
            : (itemData?.title || selectedItem?.title || "")}
          onChange={(e) => {
            setLocalTemplateData(prev => ({
              ...prev,
              title: e.target.value
            }));
          }}
          onBlur={(e) => handleTitleChange(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "14px"
          }}
          placeholder="Enter title for this graphics template"
        />
      </div>

      {/* Template selection */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontWeight: 500, display: "block", marginBottom: 4 }}>
          Template Type
        </label>
        <select
          value={templateData.templateId || ""}
          onChange={handleTemplateChange}
          style={{
            width: "100%",
            padding: "8px",
            border: "1px solid #ddd",
            borderRadius: 4,
          }}
          disabled={isLoading}
        >
          <option value="">Select a template...</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
        {selectedTemplate?.description && (
          <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
            {selectedTemplate.description}
          </div>
        )}
      </div>

      {/* Channel selection */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontWeight: 500, display: "block", marginBottom: 4 }}>
          Output Channel
        </label>
        <select
          value={selectedChannel}
          onChange={handleChannelChange}
          style={{
            width: "100%",
            padding: "8px",
            border: "1px solid #ddd",
            borderRadius: 4,
          }}
          disabled={isLoading}
        >
          {[1, 2, 3, 4].map((channel) => (
            <option key={channel} value={channel}>
              Channel {channel}
            </option>
          ))}
        </select>
      </div>

      {/* Template parameters */}
      {selectedTemplate && (
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>
            Template Parameters
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(selectedTemplate.parameters || []).map((param) => (
              <div key={param.id}>
                <label style={{ fontWeight: 500, display: "block" }}>
                  {param.info || param.id}
                </label>
                {renderParameterInput(param)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      {previewUrl && (
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>
            Preview
          </h4>
          <div
            style={{
              width: "100%",
              aspectRatio: "16/9",
              background: "#000",
              border: "1px solid #ddd",
              borderRadius: 4,
              overflow: "hidden",
              position: "relative",
              height: "auto",
              cursor: "pointer",
              userSelect: "none",
            }}
            onMouseDown={handlePreviewMouseDown}
            title="Hold to preview"
          >
            <iframe
              ref={previewRef}
              src={previewUrl}
              style={{ 
                width: "100%", 
                height: "100%", 
                border: "none",
                display: "block",
                pointerEvents: "none",
              }}
              title="Template Preview"
              onLoad={() => {
                if (previewRef.current && templateData.templateId) {
                  setTimeout(() => {
                    previewRef.current.contentWindow.postMessage(templateData, "*");
                  }, 100);
                }
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                background: "rgba(0,0,0,0.7)",
                color: "white",
                padding: "4px 8px",
                borderRadius: 4,
                fontSize: 12,
                opacity: 0.8,
              }}
            >
              🔍 Hold to preview
            </div>
          </div>
        </div>
      )}

      {/* Playback controls */}
      {selectedTemplate && (
        <div style={{ marginTop: 20 }}>
          <h4 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>
            Playback Controls
          </h4>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => handleCommand("play")}
              style={{
                flex: 1,
                padding: "8px 16px",
                background: "#4caf50",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontWeight: 500,
              }}
              disabled={isLoading || !templateData.templateId}
            >
              Play
            </button>
            <button
              onClick={() => handleCommand("update")}
              style={{
                flex: 1,
                padding: "8px 16px",
                background: "#2196f3",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontWeight: 500,
              }}
              disabled={isLoading || !templateData.templateId}
            >
              Update
            </button>
            <button
              onClick={() => handleCommand("stop")}
              style={{
                flex: 1,
                padding: "8px 16px",
                background: "#f44336",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontWeight: 500,
              }}
              disabled={isLoading || !templateData.templateId}
            >
              Stop
            </button>
          </div>
          {templateData.lastCommand && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
              Last command: {templateData.lastCommand} at{" "}
              {new Date(templateData.lastCommandTime).toLocaleTimeString()}
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          style={{
            marginTop: 16,
            padding: "8px 12px",
            background: "#ffebee",
            color: "#c62828",
            borderRadius: 4,
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {/* Preview Popup */}
      {showPreviewPopup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: 20,
          }}
          onClick={() => setShowPreviewPopup(false)}
        >
          <div
            style={{
              position: "relative",
              width: "90vw",
              maxWidth: "1200px",
              aspectRatio: "16/9",
              background: "#000",
              borderRadius: 8,
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={previewUrl}
              style={{ 
                width: "100%", 
                height: "100%", 
                border: "none",
                display: "block"
              }}
              title="Template Preview - Enlarged"
              onLoad={(e) => {
                if (templateData.templateId) {
                  setTimeout(() => {
                    e.target.contentWindow.postMessage(templateData, "*");
                  }, 100);
                }
              }}
            />
            
            <div
              style={{
                position: "absolute",
                bottom: 10,
                left: 10,
                background: "rgba(0,0,0,0.7)",
                color: "white",
                padding: "8px 12px",
                borderRadius: 4,
                fontSize: 12,
                opacity: 0.9,
              }}
            >
              {selectedTemplate?.name} - Channel {selectedChannel} • Release to close
            </div>
            
            <button
              onClick={() => setShowPreviewPopup(false)}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                background: "rgba(0,0,0,0.7)",
                color: "white",
                border: "none",
                borderRadius: 4,
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: 12,
                zIndex: 10001,
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}