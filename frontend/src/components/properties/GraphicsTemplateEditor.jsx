import React, { useState, useEffect, useMemo } from "react";
import { API_BASE_URL } from '../../config';

export default function GraphicsTemplateEditor({ graphicId, setRefreshKey, onClose, onSaved }) {
  const [graphic, setGraphic] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [placeholders, setPlaceholders] = useState([]);
  const [previewUrl, setPreviewUrl] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [templateData, setTemplateData] = useState({});
  const [titleTouched, setTitleTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  // Backwards-compat: no graphicId provided
  if (!graphicId) {
    return (
      <div style={{ textAlign: 'center', padding: '1rem', fontStyle: 'italic' }}>
        No graphic selected.
      </div>
    );
  }

  // Load graphic data
  useEffect(() => {
    const loadGraphic = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('[GFX-Editor] Loading graphic:', graphicId);
        const response = await fetch(`${API_BASE_URL}/api/graphics/${graphicId}`);
        if (!response.ok) {
          throw new Error(`Failed to load graphic: ${response.statusText}`);
        }
        const data = await response.json();
        setGraphic(data);
        setTitle(data.title || '');
        setType(data.type || '');
        setTemplateId(data.template_id || '');
        setTemplateData(data.template_data || {});
        setTitleTouched(false);
      } catch (err) {
        console.error('[GFX-Editor] Error loading graphic:', err);
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
        console.log('[GFX-Editor] Loading templates');
        const response = await fetch(`${API_BASE_URL}/api/templates`);
        if (response.ok) {
          const templatesData = await response.json();
          setTemplates(templatesData);
        }
      } catch (error) {
        console.error('[GFX-Editor] Error loading templates:', error);
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
        console.log('[GFX-Editor] Loading placeholders for template:', templateId);
        const response = await fetch(`${API_BASE_URL}/api/templates/${templateId}/placeholders`);
        if (response.ok) {
          const placeholdersData = await response.json();
          setPlaceholders(placeholdersData);
        }
      } catch (error) {
        console.error('[GFX-Editor] Error loading placeholders:', error);
        setPlaceholders([]);
      }
    };
    loadPlaceholders();
  }, [templateId]);

  useEffect(() => {
    if (titleTouched) return;
    // derive a human title from fields
    const name = templateData.name || '';
    const affil = templateData.affil || templateData.title || '';
    const isLower = type === 'lower-third' || (templateId || '').toLowerCase().includes('lower');
    const tail = isLower ? 'Lower Third' : (type || templateId || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const parts = [name, affil, tail].filter(Boolean);
    const suggested = parts.join(' - ');
    if (suggested && suggested !== title) setTitle(suggested);
  }, [templateData, type, templateId, title, titleTouched]);

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
      return updated;
    } catch (err) {
      console.error('[GFX-Editor] Error saving (partial) graphic:', err);
      setError(err.message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  // Handle template selection change
  const handleTemplateChange = (e) => {
    const newTemplateId = e.target.value || '';
    console.log('[GFX-Editor] Template changed:', newTemplateId);
    setTemplateId(newTemplateId);
    setTemplateData({}); // Reset template data when changing templates
  };

  const handleBlurTitle = async () => {
    await patchGraphicPartial({ title });
  };

  const handleBlurType = async () => {
    await patchGraphicPartial({ type });
  };

  const handleBlurTemplateOrData = async () => {
    await patchGraphicPartial({ template_id: templateId, template_data: templateData });
  };

  // Handle template data changes
  const handleDataChange = (fieldId, value) => {
    setTemplateData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  // Handle cancel
  const handleCancel = () => {
    console.log('[GFX-Editor] Cancel editing');
    if (onClose) {
      onClose();
    }
  };

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
    <div className="graphics-template-editor">
      <h3>Graphics Pool Row Editor</h3>

      {/* Title */}
      <div className="form-group">
        <label htmlFor="title-input">Title:</label>
        <input
          id="title-input"
          type="text"
          value={title}
          onChange={e => {
            if (!titleTouched) setTitleTouched(true);
            setTitle(e.target.value);
          }}
          onBlur={handleBlurTitle}
          className="form-control"
          placeholder="Enter title"
        />
      </div>

      {/* Type */}
      <div className="form-group">
        <label htmlFor="type-input">Type:</label>
        <input
          id="type-input"
          type="text"
          value={type}
          onChange={e => setType(e.target.value)}
          onBlur={handleBlurType}
          className="form-control"
          placeholder="Enter type"
        />
      </div>

      {/* Template Selection */}
      <div className="form-group">
        <label htmlFor="template-select">Template:</label>
        <select
          id="template-select"
          value={templateId}
          onChange={handleTemplateChange}
          onBlur={handleBlurTemplateOrData}
          className="form-control"
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
        <div className="template-fields">
          <h4>Template Fields</h4>
          {placeholders.map(placeholder => (
            <div key={placeholder.id} className="form-group">
              <label htmlFor={`field-${placeholder.id}`}>
                {placeholder.label}:
              </label>
              <input
                id={`field-${placeholder.id}`}
                type={placeholder.type}
                value={templateData[placeholder.id] || placeholder.defaultValue || ''}
                onChange={(e) => handleDataChange(placeholder.id, e.target.value)}
                onBlur={handleBlurTemplateOrData}
                className="form-control"
                placeholder={placeholder.defaultValue}
              />
            </div>
          ))}
        </div>
      )}

      {/* Preview */}
      {previewUrl && (
        <div className="template-preview">
          <h4>Preview</h4>
          <iframe
            src={previewUrl}
            width="400"
            height="225"
            style={{ border: '1px solid #ccc', borderRadius: '4px' }}
            title="Template Preview"
          />
        </div>
      )}

      
    </div>
  );
}