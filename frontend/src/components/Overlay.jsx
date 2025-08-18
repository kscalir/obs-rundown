import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

// Color palette for manual overlays - maximally distinct colors
const MANUAL_OVERLAY_COLORS = [
  { name: 'Red', hex: '#E53935', index: 0 },        // Bright Red
  { name: 'Blue', hex: '#1E88E5', index: 1 },       // Strong Blue
  { name: 'Green', hex: '#43A047', index: 2 },      // Forest Green
  { name: 'Orange', hex: '#FB8C00', index: 3 },     // Vivid Orange
  { name: 'Purple', hex: '#8E24AA', index: 4 },     // Deep Purple
  { name: 'Teal', hex: '#00ACC1', index: 5 },       // Cyan/Teal
  { name: 'Pink', hex: '#D81B60', index: 6 },       // Hot Pink
  { name: 'Lime', hex: '#7CB342', index: 7 },       // Lime Green
  { name: 'Indigo', hex: '#3949AB', index: 8 },     // Deep Indigo
  { name: 'Amber', hex: '#FFB300', index: 9 },      // Golden Amber
  { name: 'Brown', hex: '#6D4C41', index: 10 },     // Dark Brown
  { name: 'Navy', hex: '#283593', index: 11 },      // Navy Blue
  { name: 'Olive', hex: '#558B2F', index: 12 },     // Olive Green
  { name: 'Maroon', hex: '#AD1457', index: 13 },    // Deep Maroon
  { name: 'Steel', hex: '#546E7A', index: 14 },     // Blue Grey
  { name: 'Coral', hex: '#FF5252', index: 15 }      // Light Coral
];

function Overlay({ 
  item, 
  isManualContext = false,
  colorIndex = null,
  onUpdate 
}) {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(item.data?.template_id || null);
  const [templateData, setTemplateData] = useState(item.data?.template_data || {});
  const [overlayInPoint, setOverlayInPoint] = useState(item.overlay_in_point ?? item.data?.overlay_in_point ?? 0);
  const [overlayDuration, setOverlayDuration] = useState(item.overlay_duration ?? item.data?.overlay_duration ?? 10);
  const [overlayAutomation, setOverlayAutomation] = useState(item.overlay_automation ?? item.data?.overlay_automation ?? 'auto_out');
  
  // Determine overlay type based on context
  const overlayType = isManualContext ? 'manual' : 'auto';
  
  // Get color for manual overlays
  const getManualColor = () => {
    if (!isManualContext || colorIndex === null) return null;
    return MANUAL_OVERLAY_COLORS[colorIndex % MANUAL_OVERLAY_COLORS.length];
  };
  
  const manualColor = getManualColor();
  
  // Load available templates
  useEffect(() => {
    fetchTemplates();
  }, []);
  
  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/templates`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };
  
  const handleTemplateChange = (templateId) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template && template.default_data) {
      setTemplateData(template.default_data);
    }
    updateItem();
  };
  
  const updateItem = () => {
    if (onUpdate) {
      onUpdate({
        ...item,
        overlay_type: overlayType,
        overlay_color_index: colorIndex,
        overlay_in_point: overlayInPoint,
        overlay_duration: overlayDuration,
        overlay_automation: overlayAutomation,
        data: {
          ...item.data,
          template_id: selectedTemplate,
          template_data: templateData,
          overlay_type: overlayType,
          overlay_color_index: colorIndex,
          overlay_in_point: overlayInPoint,
          overlay_duration: overlayDuration,
          overlay_automation: overlayAutomation
        }
      });
    }
  };
  
  // Auto overlay timing settings
  const renderAutoOverlaySettings = () => {
    if (!isManualContext) {
      return (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          background: '#f8f9fa',
          borderRadius: '6px',
          fontSize: '12px'
        }}>
          <div style={{ marginBottom: '8px', fontWeight: '600', color: '#666' }}>
            Overlay Timing
          </div>
          
          <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '4px', color: '#666' }}>
                In Point (seconds)
              </label>
              <input
                type="number"
                min="0"
                value={overlayInPoint}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  setOverlayInPoint(value);
                }}
                onBlur={() => updateItem()}
                style={{
                  width: '100%',
                  padding: '6px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              />
            </div>
            
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '4px', color: '#666' }}>
                Duration (seconds)
              </label>
              <input
                type="number"
                min="0"
                value={overlayDuration}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  setOverlayDuration(value);
                }}
                onBlur={() => updateItem()}
                disabled={overlayAutomation !== 'auto_out'}
                style={{
                  width: '100%',
                  padding: '6px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '12px',
                  opacity: overlayAutomation !== 'auto_out' ? 0.5 : 1
                }}
              />
            </div>
          </div>
          
          <div style={{ marginTop: '8px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: '#666', fontWeight: '600' }}>
              Automation Mode
            </label>
            <select
              value={overlayAutomation}
              onChange={(e) => {
                const newValue = e.target.value;
                setOverlayAutomation(newValue);
                // Need to call onUpdate directly with new value since state update is async
                if (onUpdate) {
                  onUpdate({
                    ...item,
                    overlay_type: overlayType,
                    overlay_color_index: colorIndex,
                    overlay_in_point: overlayInPoint,
                    overlay_duration: overlayDuration,
                    overlay_automation: newValue,
                    data: {
                      ...item.data,
                      template_id: selectedTemplate,
                      template_data: templateData,
                      overlay_type: overlayType,
                      overlay_color_index: colorIndex,
                      overlay_in_point: overlayInPoint,
                      overlay_duration: overlayDuration,
                      overlay_automation: newValue
                    }
                  });
                }
              }}
              style={{
                width: '100%',
                padding: '6px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            >
              <option value="auto_out">Auto Out (after duration)</option>
              <option value="leave_in_local">Leave In (Local - until segment ends)</option>
              <option value="leave_in_global">Leave In (Global - persistent)</option>
            </select>
          </div>
        </div>
      );
    }
    return null;
  };
  
  return (
    <div style={{
      padding: '12px',
      background: isManualContext && manualColor ? `${manualColor.hex}20` : '#fff',
      border: `2px solid ${isManualContext && manualColor ? manualColor.hex : '#9c27b0'}`,
      borderRadius: '6px',
      marginBottom: '8px',
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '8px'
      }}>
        <div style={{
          width: '24px',
          height: '24px',
          background: isManualContext && manualColor ? manualColor.hex : '#9c27b0',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          fontWeight: 'bold',
          color: '#fff'
        }}>
          {isManualContext ? 'M' : 'A'}
        </div>
        
        <input
          type="text"
          value={item.title || ''}
          onChange={(e) => {
            if (onUpdate) {
              onUpdate({ ...item, title: e.target.value });
            }
          }}
          placeholder={isManualContext ? "Manual Overlay" : "Auto Overlay"}
          style={{
            flex: 1,
            padding: '4px 8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: '600'
          }}
        />
        
        {isManualContext && manualColor && (
          <div style={{
            fontSize: '11px',
            fontWeight: '600',
            color: manualColor.hex,
            background: '#fff',
            padding: '2px 8px',
            borderRadius: '12px',
            border: `1px solid ${manualColor.hex}`
          }}>
            {manualColor.name}
          </div>
        )}
      </div>
      
      {/* Template Selection */}
      <div style={{ marginBottom: '8px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '4px', 
          fontSize: '12px',
          fontWeight: '600',
          color: '#666' 
        }}>
          Template
        </label>
        <select
          value={selectedTemplate || ''}
          onChange={(e) => handleTemplateChange(e.target.value)}
          style={{
            width: '100%',
            padding: '6px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '12px'
          }}
        >
          <option value="">Select Template...</option>
          {templates.map(template => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </div>
      
      {/* Template Data Fields */}
      {selectedTemplate && (
        <div style={{
          padding: '8px',
          background: '#f8f9fa',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          <div style={{ marginBottom: '4px', fontWeight: '600', color: '#666' }}>
            Template Data
          </div>
          {Object.keys(templateData).map(key => (
            <div key={key} style={{ marginBottom: '4px' }}>
              <label style={{ display: 'block', marginBottom: '2px', color: '#666' }}>
                {key}
              </label>
              <input
                type="text"
                value={templateData[key] || ''}
                onChange={(e) => {
                  setTemplateData({
                    ...templateData,
                    [key]: e.target.value
                  });
                  updateItem();
                }}
                style={{
                  width: '100%',
                  padding: '4px',
                  border: '1px solid #ddd',
                  borderRadius: '3px',
                  fontSize: '11px'
                }}
              />
            </div>
          ))}
        </div>
      )}
      
      {/* Auto Overlay Settings */}
      {renderAutoOverlaySettings()}
      
      {/* Type Badge */}
      <div style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        fontSize: '9px',
        fontWeight: '700',
        color: isManualContext ? '#9c27b0' : '#2196f3',
        background: 'rgba(255,255,255,0.9)',
        padding: '2px 6px',
        borderRadius: '8px',
        border: `1px solid ${isManualContext ? '#9c27b0' : '#2196f3'}`,
        textTransform: 'uppercase'
      }}>
        {isManualContext ? 'MANUAL OVERLAY' : 'AUTO OVERLAY'}
      </div>
    </div>
  );
}

export default Overlay;