import React, { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from '../config';


export default function PropertiesPanel({
  showId,
  selectedEpisode,
  segments,
  loading,
  mediaError,
  editingType,
  editingId,
  editingValue,
  inputRef,
  toggleSegment,
  toggleGroup,
  addSegment,
  addGroup,
  setEditingType,
  setEditingId,
  setEditingValue,
  setRefreshKey,
  selectedTab,
  setSelectedTab,
  show,
  itemId,
  onClose
}) {
  const [item, setItem] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateData, setTemplateData] = useState({});
  const [selectedChannel, setSelectedChannel] = useState(1);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isloading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const previewRef = useRef(null);
  const [itemLoading, setItemLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Fetch item data when itemId changes
  useEffect(() => {
    if (!itemId) {
      setItem(null);
      return;
    }
    
    setItemLoading(true);
    fetch(`${API_BASE_URL}/api/items/${itemId}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch item");
        return res.json();
      })
      .then(data => {
        setItem(data);
        setItemLoading(false);
      })
      .catch(err => {
        console.error("Error fetching item:", err);
        setItemLoading(false);
      });
  }, [itemId]);

  // Find selected item
  useEffect(() => {
    if (!segments || !editingId) {
      setSelectedItem(null);
      return;
    }

    let found = null;
    segments.forEach((segment) => {
      if (found) return;
      (segment.groups || []).forEach((group) => {
        if (found) return;
        const item = (group.items || []).find((item) => item.id === editingId);
        if (item) found = item;
      });
    });

    setSelectedItem(found);
    if (found?.data) {
      setTemplateData(found.data);
      if (found.data.templateId) {
        fetchTemplateDetails(found.data.templateId);
      }
      if (found.data.channel) {
        setSelectedChannel(found.data.channel);
      }
    }
  }, [segments, editingId]);

  // Alternative approach: use item directly instead of selectedItem
  useEffect(() => {
    if (!itemId) return;
    
    // If we already loaded the item from the API call, use that
    if (item && item.id === itemId) return;
    
    // Otherwise find it in segments if possible
    if (segments) {
      let found = null;
      segments.forEach((segment) => {
        if (found) return;
        (segment.groups || []).forEach((group) => {
          if (found) return;
          const groupItem = (group.items || []).find((i) => i.id === itemId);
          if (groupItem) found = groupItem;
        });
      });
      
      if (found) {
        setSelectedItem(found);
        setItem(found); // Update the API-loaded item too
      }
    }
  }, [itemId, segments, item]);

  // Fetch available templates
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    
    console.log("Fetching templates...");
    fetch(`${API_BASE_URL}/api/templates`)
      .then(res => {
        console.log("Templates API response status:", res.status);
        if (!res.ok) {
          return res.text().then(text => {
            throw new Error(`Failed to fetch templates: ${res.status} ${text}`);
          });
        }
        return res.json();
      })
      .then(data => {
        console.log("Templates loaded:", data);
        setTemplates(Array.isArray(data) ? data : []);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Error loading templates:", err);
        setError("Failed to load templates");
        setLoading(false);
        // Provide fallback templates for development
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

  // Fetch template details
  const fetchTemplateDetails = (templateId) => {
    if (!templateId) return;

    setIsLoading(true);
    fetch(`/api/templates/${templateId}`)
      .then((res) =>
        res.ok
          ? res.json()
          : Promise.reject(new Error("Failed to fetch template details"))
      )
      .then((template) => {
        setSelectedTemplate(template);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error loading template details:", err);
        setLoading(false);

        // Try to find template in local cache
        const template = templates.find((t) => t.id === templateId);
        if (template) {
          setSelectedTemplate(template);
        }
      });
  };

  // Handle template selection
  const handleTemplateChange = async (e) => {
    const templateId = e.target.value;
    if (!templateId || !selectedItem) return;

    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    setIsLoading(true);

    // Initialize default values
    const newData = {
      ...templateData,
      templateId,
      title: template.name,
      channel: template.defaultChannel || selectedChannel,
    };

    // Initialize default parameter values
    (template.parameters || []).forEach((param) => {
      if (param.default !== undefined && newData[param.id] === undefined) {
        newData[param.id] = param.default;
      }
    });

    setTemplateData(newData);
    setSelectedTemplate(template);

    try {
      // Update item data in database
      const res = await fetch(`/api/items/${selectedItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedItem.type,
          data: newData,
          group_id: selectedItem.group_id,
          position: selectedItem.position,
        }),
      });

      if (!res.ok) throw new Error("Failed to update template");

      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Error updating template:", err);
      setError("Failed to update template");
    } finally {
      setLoading(false);
    }
  };

  // Handle field value changes
  const handleFieldChange = async (paramId, value) => {
    if (!selectedItem) return;

    const newData = { ...templateData, [paramId]: value };
    setTemplateData(newData);

    try {
      const res = await fetch(`/api/items/${selectedItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedItem.type,
          data: newData,
          group_id: selectedItem.group_id,
          position: selectedItem.position,
        }),
      });

      if (!res.ok) throw new Error("Failed to update field");

      setRefreshKey((k) => k + 1);

      // Also update preview if it exists
      if (previewRef.current) {
        previewRef.current.contentWindow.postMessage(
          {
            command: "update",
            data: newData,
          },
          "*"
        );
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
      const res = await fetch(`/api/items/${selectedItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedItem.type,
          data: newData,
          group_id: selectedItem.group_id,
          position: selectedItem.position,
        }),
      });

      if (!res.ok) throw new Error("Failed to update channel");

      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Error updating channel:", err);
      setError("Failed to update channel");
    }
  };

  // Handle template commands (play, update, stop)
  const handleCommand = async (command) => {
    if (!selectedItem || !templateData.templateId) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/graphics/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command,
          channel: selectedChannel,
          templateId: templateData.templateId,
          data: templateData,
        }),
      });

      if (!res.ok) throw new Error(`Failed to send ${command} command`);

      // Update last command status in item data
      const newData = {
        ...templateData,
        lastCommand: command,
        lastCommandTime: new Date().toISOString(),
      };

      setTemplateData(newData);

      // Update in database
      await fetch(`/api/items/${selectedItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedItem.type,
          data: newData,
          group_id: selectedItem.group_id,
          position: selectedItem.position,
        }),
      });

      setRefreshKey((k) => k + 1);

      // Also update preview
      if (previewRef.current) {
        previewRef.current.contentWindow.postMessage(
          {
            command,
            data: templateData,
          },
          "*"
        );
      }
    } catch (err) {
      console.error(`Error sending ${command} command:`, err);
      setError(`Failed to ${command} template`);
    } finally {
      setIsLoading(false);
    }
  };

  // Update preview URL when template or data changes
  useEffect(() => {
    if (!selectedTemplate || !templateData.templateId) {
      setPreviewUrl("");
      return;
    }

    const dataParam = encodeURIComponent(JSON.stringify(templateData));
    const url = `/api/templates/${templateData.templateId}/preview?data=${dataParam}`;
    setPreviewUrl(url);
  }, [selectedTemplate, templateData]);

  // Render parameter input based on type
  const renderParameterInput = (param) => {
    switch (param.type) {
      case "STRING":
        return (
          <input
            type="text"
            value={templateData[param.id] || ""}
            onChange={(e) => handleFieldChange(param.id, e.target.value)}
            placeholder={param.info || param.id}
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #ddd",
              borderRadius: 4,
              marginTop: 4,
            }}
          />);

      case "NUMBER":
      case "INTEGER":
        return (
          <input
            type="number"
            value={templateData[param.id] || 0}
            onChange={(e) =>
              handleFieldChange(param.id, Number(e.target.value))
            }
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #ddd",
              borderRadius: 4,
              marginTop: 4,
            }}
          />);

      case "COLOR":
        return (
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <input
              type="color"
              value={templateData[param.id] || param.default || "#000000"}
              onChange={(e) => handleFieldChange(param.id, e.target.value)}
              style={{ width: 40, height: 40 }}
            />
            <input
              type="text"
              value={templateData[param.id] || param.default || "#000000"}
              onChange={(e) => handleFieldChange(param.id, e.target.value)}
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
          <label
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 4,
            }}
          >
            <input
              type="checkbox"
              checked={!!templateData[param.id]}
              onChange={(e) => handleFieldChange(param.id, e.target.checked)}
              style={{ marginRight: 8 }}
            />
            {param.info || param.id}
          </label>
        );

      default:
        return (
          <input
            type="text"
            value={templateData[param.id] || ""}
            onChange={(e) => handleFieldChange(param.id, e.target.value)}
            placeholder={param.info || param.id}
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #ddd",
              borderRadius: 4,
              marginTop: 4,
            }}
          />);
    }
  };

  // Render graphics template editor
  const renderGraphicsTemplateEditor = () => {
    if (!selectedItem || (selectedItem.type !== "toolbox-graphicstemplate" && selectedItem.type !== "graphics")) {
      return null;
    }

    return (
      <div style={{ padding: 15 }}>
        <h3
          style={{
            marginTop: 0,
            fontSize: 18,
            color: "#1976d2",
          }}
        >
          Graphics Template
        </h3>

        {/* Template selection */}
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              fontWeight: 500,
              display: "block",
              marginBottom: 4,
            }}
          >
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
            <div
              style={{
                fontSize: 13,
                color: "#666",
                marginTop: 4,
              }}
            >
              {selectedTemplate.description}
            </div>
          )}
        </div>

        {/* Channel selection */}
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              fontWeight: 500,
              display: "block",
              marginBottom: 4,
            }}
          >
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
            <h4
              style={{
                marginTop: 0,
                marginBottom: 12,
                fontSize: 16,
              }}
            >
              Template Parameters
            </h4>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {(selectedTemplate.parameters || []).map((param) => (
                <div key={param.id}>
                  <label
                    style={{
                      fontWeight: 500,
                      display: "block",
                    }}
                  >
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
            <h4
              style={{
                marginTop: 0,
                marginBottom: 12,
                fontSize: 16,
              }}
            >
              Preview
            </h4>

            <div
              style={{
                width: "100%",
                aspectRatio: "16/9",
                background: "#333",
                border: "1px solid #ddd",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <iframe
                ref={previewRef}
                src={previewUrl}
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                }}
                title="Template Preview"
              />
            </div>
          </div>
        )}

        {/* Template controls */}
        {selectedTemplate && (
          <div style={{ marginTop: 20 }}>
            <h4
              style={{
                marginTop: 0,
                marginBottom: 12,
                fontSize: 16,
              }}
            >
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
                disabled={isloading || !templateData.templateId}
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
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: "#666",
                }}
              >
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
      </div>
    );
  };

  // Render OBS Command editor (placeholder for now)
  const renderObsCommandEditor = () => {
    if (!selectedItem || selectedItem.type !== "toolbox-obscommand") {
      return null;
    }

    return (
      <div style={{ padding: 15 }}>
        <h3
          style={{
            marginTop: 0,
            fontSize: 18,
            color: "#1976d2",
          }}
        >
          OBS Command
        </h3>
        <p>OBS command editor will go here.</p>
      </div>
    );
  };

  // Render Presenter Note editor (placeholder for now)
  const renderPresenterNoteEditor = () => {
    if (!selectedItem || selectedItem.type !== "toolbox-presenternote") {
      return null;
    }

    return (
      <div style={{ padding: 15 }}>
        <h3
          style={{
            marginTop: 0,
            fontSize: 18,
            color: "#1976d2",
          }}
        >
          Presenter Note
        </h3>
        <p>Presenter note editor will go here.</p>
      </div>
    );
  };

  // Main render
  if (!selectedItem) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          minHeight: 0,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          border: "1.5px dashed #b1c7e7",
          borderRadius: 10,
          color: "#7c7c7c",
          background: "#fafdff",
          fontSize: 17,
          fontWeight: 500,
          padding: 24,
          textAlign: "center",
          opacity: 0.88,
          boxSizing: "border-box",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        Properties panel (select a rundown item)
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        background: "#f8fafd",
        height: "100%",
      }}
    >
      <div
        style={{
          padding: "15px",
          borderBottom: "1px solid #e1e6ec",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 18,
          }}
        >
          Properties
        </h2>
      </div>

      <div
        style={{
          height: "calc(100% - 50px)",
          overflow: "auto",
        }}
      >
        {loading && (
          <div
            style={{
              padding: 15,
              color: "#666",
              fontSize: 14,
              textAlign: "center",
            }}
          >
            Loading...
          </div>
        )}

        {selectedItem.type === "toolbox-graphicstemplate" &&
          renderGraphicsTemplateEditor()}
        {selectedItem.type === "toolbox-obscommand" && renderObsCommandEditor()}
        {selectedItem.type === "toolbox-presenternote" && renderPresenterNoteEditor()}
      </div>
    </div>
  );
}