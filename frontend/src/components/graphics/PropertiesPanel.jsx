import React, { useState, useRef, useEffect } from 'react';
import { Trash, ChevronDown } from 'react-bootstrap-icons';
import TextEffectsPanel from './TextEffectsPanel';

const PropertiesPanel = ({ selectedElement, onUpdateElement, onDeleteElement, layers, onElementsChange }) => {
  const [fontDropdownOpen, setFontDropdownOpen] = useState(false);
  const [systemFonts, setSystemFonts] = useState([]);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const fontDropdownRef = useRef();
  
  // Tab state for text elements
  const [activeTab, setActiveTab] = useState('text');
  
  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [editingLayerId, setEditingLayerId] = useState(null);
  const [editingName, setEditingName] = useState('');
  
  // Debug layers prop
  console.log('PropertiesPanel layers prop:', layers);
  console.log('PropertiesPanel layers length:', layers?.length);
  
  // Helper function to get layer display name
  const getLayerDisplayName = (layer) => {
    if (layer.name && layer.name.trim()) {
      return layer.name;
    }
    // Default naming based on type
    switch (layer.type) {
      case 'text':
        return layer.text ? `Text: ${layer.text.substring(0, 15)}...` : 'Text Element';
      case 'rect':
        return 'Rectangle';
      case 'circle':
        return 'Circle';
      case 'ellipse':
        return 'Ellipse';
      case 'image':
        return 'Image';
      case 'video':
        return 'Video';
      case 'group':
        return `Group (${layer.children?.length || 0} items)`;
      default:
        return layer.type || 'Element';
    }
  };
  
  // Handle layer name editing
  const handleLayerDoubleClick = (layer, e) => {
    e.stopPropagation();
    setEditingLayerId(layer.id);
    setEditingName(layer.name || getLayerDisplayName(layer));
  };
  
  const handleNameSave = (layerId) => {
    const trimmedName = editingName.trim();
    if (onUpdateElement && trimmedName) {
      console.log('Updating layer name:', layerId, 'to:', trimmedName);
      onUpdateElement(layerId, { name: trimmedName });
    } else if (onUpdateElement && !trimmedName) {
      // If empty, remove the custom name to use default naming
      onUpdateElement(layerId, { name: null });
    }
    setEditingLayerId(null);
    setEditingName('');
  };
  
  const handleNameCancel = () => {
    setEditingLayerId(null);
    setEditingName('');
  };
  
  const handleNameKeyDown = (e, layerId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNameSave(layerId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleNameCancel();
    }
  };
  
  // Handle layer reordering
  const handleLayerDragStart = (e, index) => {
    console.log('=== DRAG START ===');
    console.log('Dragging layer at index:', index);
    console.log('Layer:', layers[index]);
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    setDraggedIndex(index);
  };
  
  const handleLayerDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedIndex !== index) {
      setDragOverIndex(index);
      console.log('Drag over index:', index);
    }
  };
  
  const handleLayerDragLeave = () => {
    setDragOverIndex(null);
  };
  
  const handleLayerDrop = (e, dropIndex) => {
    console.log('=== DRAG DROP ===');
    e.preventDefault();
    
    console.log('Drop index:', dropIndex);
    console.log('Dragged index:', draggedIndex);
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      console.log('Invalid drop - same index or no drag started');
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    
    console.log('Dropping layer from index', draggedIndex, 'to index', dropIndex);
    console.log('Original layers:', layers.map((l, i) => `${i}: ${l.id}`));
    
    // Create new array with reordered elements
    const newLayers = [...layers];
    const draggedElement = newLayers[draggedIndex];
    
    console.log('Dragged element:', draggedElement.id);
    
    // Remove the dragged element
    newLayers.splice(draggedIndex, 1);
    
    // Insert at new position
    newLayers.splice(dropIndex, 0, draggedElement);
    
    console.log('New layer order:', newLayers.map((l, i) => `${i}: ${l.id}`));
    
    // Update the elements array
    if (onElementsChange) {
      console.log('Calling onElementsChange with new order');
      onElementsChange(newLayers);
    } else {
      console.log('No onElementsChange callback available');
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };
  
  const handleLayerDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Default font options organized by category (fallback)
  const defaultFontOptions = [
    {
      category: "Web Safe Fonts",
      fonts: [
        "Arial", "Helvetica", "Times New Roman", "Georgia", "Verdana", "Tahoma", 
        "Trebuchet MS", "Impact", "Comic Sans MS", "Courier New", "Lucida Console", "Monaco"
      ]
    },
    {
      category: "macOS System Fonts", 
      fonts: [
        "-apple-system", "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Avenir", "Avenir Next",
        "Menlo", "American Typewriter", "Baskerville", "Big Caslon", "Brush Script MT", "Chalkduster",
        "Copperplate", "Futura", "Gill Sans", "Hoefler Text", "Marker Felt", "Optima", "Palatino",
        "Papyrus", "Rockwell", "SignPainter", "Zapfino"
      ]
    },
    {
      category: "Windows System Fonts",
      fonts: [
        "Segoe UI", "Calibri", "Cambria", "Candara", "Consolas", "Constantia", "Corbel",
        "Franklin Gothic Medium", "Gabriola", "Garamond", "Lucida Sans Unicode", 
        "Microsoft Sans Serif", "MS Gothic", "Trebuchet MS"
      ]
    },
    {
      category: "Google Fonts", 
      fonts: [
        "Roboto", "Open Sans", "Lato", "Montserrat", "Source Sans Pro", "Oswald", "Raleway",
        "PT Sans", "Ubuntu", "Nunito", "Playfair Display", "Merriweather", "Poppins", "Inter", "Fira Sans"
      ]
    },
    {
      category: "Additional Fonts",
      fonts: [
        "Book Antiqua", "Century Gothic", "Century Schoolbook", "Garamond", "Goudy Old Style",
        "Lucida Bright", "Lucida Calligraphy", "Lucida Fax", "Lucida Handwriting", "Lucida Sans",
        "MS Reference Sans Serif", "MS Reference Specialty", "Symbol", "Webdings", "Wingdings",
        "Arial Black", "Arial Narrow", "Arial Rounded MT Bold", "Bookman Old Style", "Bradley Hand ITC",
        "Brush Script Std", "Century", "Chiller", "Colonna MT", "Cooper Black", "Footlight MT Light",
        "Freestyle Script", "French Script MT", "Harrington", "Informal Roman", "Jokerman",
        "Kristen ITC", "Kunstler Script", "Old English Text MT", "Onyx", "Palace Script MT",
        "Pristina", "Rage Italic", "Ravie", "Script MT Bold", "Showcard Gothic", "Snap ITC",
        "Stencil", "Tempus Sans ITC", "Vivaldi", "Vladimir Script", "Wide Latin"
      ]
    },
    {
      category: "Generic Families",
      fonts: ["serif", "sans-serif", "monospace", "cursive", "fantasy"]
    }
  ];

  // Load system fonts using Font Access API
  useEffect(() => {
    const loadSystemFonts = async () => {
      try {
        // Check if Font Access API is available
        if ('queryLocalFonts' in window) {
          // Request permission to access local fonts
          const permission = await navigator.permissions.query({ name: 'local-fonts' });
          
          if (permission.state === 'granted' || permission.state === 'prompt') {
            try {
              const availableFonts = await window.queryLocalFonts();
              
              // Extract unique font families
              const uniqueFamilies = [...new Set(availableFonts.map(font => font.family))];
              const sortedFonts = uniqueFamilies.sort();
              
              // Group fonts into system fonts category
              const systemFontGroup = {
                category: "System Fonts",
                fonts: sortedFonts
              };
              
              setSystemFonts([systemFontGroup, ...defaultFontOptions]);
              setFontsLoaded(true);
              console.log(`Loaded ${sortedFonts.length} system fonts`);
            } catch (error) {
              console.log('Font Access API available but permission denied or error:', error);
              setSystemFonts(defaultFontOptions);
              setFontsLoaded(true);
            }
          } else {
            console.log('Font Access API permission denied');
            setSystemFonts(defaultFontOptions);
            setFontsLoaded(true);
          }
        } else {
          // Fallback: Use alternative method to detect some system fonts
          console.log('Font Access API not available, using fallback detection');
          const detectedFonts = await detectAvailableFonts();
          if (detectedFonts.length > 0) {
            const systemFontGroup = {
              category: "Detected System Fonts",
              fonts: detectedFonts
            };
            setSystemFonts([systemFontGroup, ...defaultFontOptions]);
          } else {
            setSystemFonts(defaultFontOptions);
          }
          setFontsLoaded(true);
        }
      } catch (error) {
        console.log('Error loading system fonts:', error);
        setSystemFonts(defaultFontOptions);
        setFontsLoaded(true);
      }
    };

    loadSystemFonts();
  }, []);

  // Alternative font detection method for browsers without Font Access API
  const detectAvailableFonts = async () => {
    return new Promise((resolve) => {
      const testFonts = [
        // Common system fonts to test
        'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 'Tahoma',
        'Impact', 'Trebuchet MS', 'Comic Sans MS', 'Courier New', 'Lucida Console',
        // macOS fonts
        'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'Avenir', 'Avenir Next',
        'Menlo', 'American Typewriter', 'Baskerville', 'Futura', 'Gill Sans',
        'Optima', 'Palatino', 'Zapfino', 'Marker Felt', 'Chalkduster',
        // Windows fonts  
        'Segoe UI', 'Calibri', 'Cambria', 'Candara', 'Consolas', 'Constantia',
        'Corbel', 'Franklin Gothic Medium', 'Gabriola', 'Garamond',
        // Additional common fonts
        'Book Antiqua', 'Century Gothic', 'Arial Black', 'Arial Narrow',
        'Bradley Hand ITC', 'Brush Script MT', 'Century Schoolbook',
        'Cooper Black', 'Goudy Old Style', 'Lucida Bright', 'Lucida Sans',
        'MS Reference Sans Serif', 'Rockwell', 'Symbol', 'Webdings', 'Wingdings'
      ];

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      const testString = 'abcdefghijklmnopqrstuvwxyz0123456789';
      const testSize = '72px';
      const baselineFont = 'Arial';
      
      // Get baseline measurements
      context.font = testSize + ' ' + baselineFont;
      const baselineWidth = context.measureText(testString).width;
      
      const availableFonts = [];
      
      testFonts.forEach(font => {
        context.font = testSize + ' "' + font + '", ' + baselineFont;
        const width = context.measureText(testString).width;
        
        // If width is different from baseline, font is likely available
        if (width !== baselineWidth) {
          availableFonts.push(font);
        }
      });
      
      resolve(availableFonts.sort());
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(event.target)) {
        setFontDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debug: Log selected element type
  if (selectedElement) {
    console.log('Selected element type:', selectedElement.type, selectedElement);
    if (selectedElement.type === 'video') {
      console.log('Video element has src?', !!selectedElement.src, 'has thumbnail?', !!selectedElement.thumbnail);
    }
  }
  
  if (false) { // Always show properties panel with layers
    return (
      <div style={{
        width: '250px',
        background: '#2a2a2a',
        borderLeft: '1px solid #333',
        padding: '15px',
        overflowY: 'auto'
      }}>
        <h3 style={{ fontSize: '14px', margin: '0 0 15px 0' }}>Properties</h3>
        
        {/* Layers Panel */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ fontSize: '12px', color: '#888', margin: '0 0 10px 0' }}>
            LAYERS
          </h4>
          <div style={{
            background: '#1a1a1a',
            borderRadius: '4px',
            padding: '10px',
            minHeight: '100px'
          }}>
            {(() => {
              console.log('Rendering layers section, layers:', layers);
              return layers && layers.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {layers.map((layer, index) => {
                    console.log('Rendering layer:', layer.id, layer.type);
                    return (
                      <div key={layer.id} style={{
                        padding: '5px',
                        background: '#333',
                        borderRadius: '3px',
                        fontSize: '11px',
                        color: '#fff'
                      }}>
                        {layer.type} - {layer.id.substring(0, 8)}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#666' }}>
                  No layers yet (layers: {JSON.stringify(layers)})
                </div>
              );
            })()}
          </div>
        </div>
        
        <div>
          <h4 style={{ fontSize: '12px', color: '#888', margin: '0 0 10px 0' }}>
            ELEMENT PROPERTIES
          </h4>
          <div style={{
            background: '#1a1a1a',
            borderRadius: '4px',
            padding: '10px'
          }}>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Select an element to edit
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  const handlePropertyChange = (property, value) => {
    if (onUpdateElement) {
      onUpdateElement(selectedElement.id, { [property]: value });
    }
  };
  
  return (
    <div style={{
      width: '250px',
      background: '#2a2a2a',
      borderLeft: '1px solid #333',
      padding: '15px',
      overflowY: 'auto'
    }}>
      <h3 style={{ fontSize: '14px', margin: '0 0 15px 0' }}>Properties</h3>
      
      {/* Layers Panel - Always visible */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ fontSize: '12px', color: '#888', margin: '0 0 10px 0' }}>
          LAYERS
        </h4>
        <div style={{
          background: '#1a1a1a',
          borderRadius: '4px',
          padding: '10px',
          minHeight: '100px'
        }}>
          {(() => {
            console.log('Rendering layers section (always visible), layers:', layers);
            return layers && layers.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {layers.map((layer, index) => {
                  const isSelected = selectedElement && selectedElement.id === layer.id;
                  const isDragging = draggedIndex === index;
                  const isDragOver = dragOverIndex === index;
                  const layerNumber = layers.length - index; // Bottom layer = 1, top layer = highest number
                  
                  console.log('Rendering layer:', layer.id, layer.type, 'z-index:', layerNumber);
                  
                  return (
                    <div 
                      key={layer.id}
                      draggable
                      onDragStart={(e) => handleLayerDragStart(e, index)}
                      onDragOver={(e) => handleLayerDragOver(e, index)}
                      onDragLeave={handleLayerDragLeave}
                      onDrop={(e) => handleLayerDrop(e, index)}
                      onDragEnd={handleLayerDragEnd}
                      style={{
                        padding: '8px',
                        background: isSelected 
                          ? '#4a90e2'
                          : isDragOver 
                            ? '#555' 
                            : '#333',
                        borderRadius: '3px',
                        fontSize: '11px',
                        color: '#fff',
                        cursor: 'grab',
                        opacity: isDragging ? 0.5 : 1,
                        border: isDragOver ? '2px dashed #4a90e2' : '2px solid transparent',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        userSelect: 'none'
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Layer clicked:', layer.id);
                        // TODO: Add layer selection functionality
                      }}
                      onDoubleClick={(e) => handleLayerDoubleClick(layer, e)}
                      onMouseDown={(e) => {
                        console.log('Layer mouse down:', layer.id);
                      }}
                      title="Double-click to rename layer"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                        <span style={{ 
                          fontSize: '9px', 
                          color: '#999',
                          minWidth: '12px',
                          textAlign: 'center'
                        }}>
                          {layerNumber}
                        </span>
                        {editingLayerId === layer.id ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => handleNameKeyDown(e, layer.id)}
                            onBlur={() => handleNameSave(layer.id)}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                            style={{
                              background: '#555',
                              border: '1px solid #4a90e2',
                              borderRadius: '2px',
                              color: '#fff',
                              fontSize: '11px',
                              padding: '2px 4px',
                              flex: 1,
                              minWidth: 0
                            }}
                          />
                        ) : (
                          <span style={{ 
                            flex: 1,
                            minWidth: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {getLayerDisplayName(layer)}
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: '9px',
                        color: '#666',
                        fontStyle: 'italic',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {editingLayerId === layer.id ? (
                          <span style={{ fontSize: '8px', color: '#4a90e2' }}>✓</span>
                        ) : (
                          <>
                            <span style={{ fontSize: '8px', opacity: 0.5 }}>✎</span>
                            <span>⋮⋮</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: '#666' }}>
                No layers yet
              </div>
            );
          })()} 
        </div>
      </div>
      
      {/* Element Properties - Conditional */}
      {!selectedElement ? (
        <div>
          <h4 style={{ fontSize: '12px', color: '#888', margin: '0 0 10px 0' }}>
            ELEMENT PROPERTIES
          </h4>
          <div style={{
            background: '#1a1a1a',
            borderRadius: '4px',
            padding: '10px'
          }}>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Select an element to edit
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* Element Type */}
          <div style={{ marginBottom: '15px' }}>
        <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '5px' }}>
          TYPE
        </label>
        <div style={{
          background: '#1a1a1a',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#4a90e2',
          textTransform: 'uppercase'
        }}>
          {selectedElement.type}
        </div>
      </div>
      
      {/* Position */}
      <div style={{ marginBottom: '15px' }}>
        <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '5px' }}>
          POSITION
        </label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <input
              type="number"
              value={Math.round(selectedElement.x)}
              onChange={(e) => handlePropertyChange('x', parseFloat(e.target.value))}
              style={{
                width: '100%',
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '4px',
                padding: '5px',
                color: '#fff',
                fontSize: '12px'
              }}
              placeholder="X"
            />
          </div>
          <div style={{ flex: 1 }}>
            <input
              type="number"
              value={Math.round(selectedElement.y)}
              onChange={(e) => handlePropertyChange('y', parseFloat(e.target.value))}
              style={{
                width: '100%',
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '4px',
                padding: '5px',
                color: '#fff',
                fontSize: '12px'
              }}
              placeholder="Y"
            />
          </div>
        </div>
      </div>
      
      {/* Size (for rect, text, image, and video) */}
      {(selectedElement.type === 'rect' || selectedElement.type === 'text' || selectedElement.type === 'image' || selectedElement.type === 'video') && (
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '5px' }}>
            SIZE
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <input
                type="number"
                value={Math.round(selectedElement.width)}
                onChange={(e) => handlePropertyChange('width', parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '4px',
                  padding: '5px',
                  color: '#fff',
                  fontSize: '12px'
                }}
                placeholder="Width"
              />
            </div>
            {(selectedElement.type === 'rect' || selectedElement.type === 'image' || selectedElement.type === 'video') && (
              <div style={{ flex: 1 }}>
                <input
                  type="number"
                  value={Math.round(selectedElement.height)}
                  onChange={(e) => handlePropertyChange('height', parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '4px',
                    padding: '5px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                  placeholder="Height"
                />
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Corner Radius (for rect) */}
      {selectedElement.type === 'rect' && (
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '5px' }}>
            CORNER RADIUS: {selectedElement.cornerRadius || 0}px
          </label>
          <input
            type="range"
            min="0"
            max="50"
            step="1"
            value={selectedElement.cornerRadius || 0}
            onChange={(e) => handlePropertyChange('cornerRadius', parseInt(e.target.value))}
            style={{
              width: '100%',
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          />
        </div>
      )}
      
      {/* Opacity (for all visual elements - keyframable) */}
      {(selectedElement.type === 'video' || selectedElement.type === 'image' || selectedElement.type === 'rect' || selectedElement.type === 'circle' || selectedElement.type === 'text') && (
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '5px' }}>
            OPACITY: {Math.round((selectedElement.opacity !== undefined ? selectedElement.opacity : 1) * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={selectedElement.opacity !== undefined ? selectedElement.opacity : 1}
            onChange={(e) => {
              const opacity = parseFloat(e.target.value);
              handlePropertyChange('opacity', opacity);
            }}
            style={{
              width: '100%',
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          />
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginTop: '5px',
            fontSize: '10px',
            color: '#666'
          }}>
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      )}
      
      {/* Crop (for image elements) */}
      {selectedElement.type === 'image' && (
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '10px' }}>
            CROP
          </label>
          
          {/* Top & Bottom Crop */}
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '10px', color: '#666', display: 'block', marginBottom: '5px' }}>
              Top & Bottom
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={selectedElement.cropTop || 0}
                  onChange={(e) => handlePropertyChange('cropTop', parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                />
                <div style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>
                  Top: {Math.round(selectedElement.cropTop || 0)}%
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={selectedElement.cropBottom || 0}
                  onChange={(e) => handlePropertyChange('cropBottom', parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                />
                <div style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>
                  Bottom: {Math.round(selectedElement.cropBottom || 0)}%
                </div>
              </div>
            </div>
          </div>
          
          {/* Left & Right Crop */}
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '10px', color: '#666', display: 'block', marginBottom: '5px' }}>
              Left & Right
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={selectedElement.cropLeft || 0}
                  onChange={(e) => handlePropertyChange('cropLeft', parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                />
                <div style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>
                  Left: {Math.round(selectedElement.cropLeft || 0)}%
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={selectedElement.cropRight || 0}
                  onChange={(e) => handlePropertyChange('cropRight', parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                />
                <div style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>
                  Right: {Math.round(selectedElement.cropRight || 0)}%
                </div>
              </div>
            </div>
          </div>
          
          {/* Reset Crop Button */}
          <button
            onClick={() => {
              onUpdateElement(selectedElement.id, {
                cropLeft: 0,
                cropRight: 0,
                cropTop: 0,
                cropBottom: 0
              });
            }}
            style={{
              width: '100%',
              padding: '5px',
              background: '#333',
              border: '1px solid #444',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            Reset Crop
          </button>
        </div>
      )}
      
      {/* Border (for image and video elements) */}
      {(selectedElement.type === 'image' || selectedElement.type === 'video') && (
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '5px' }}>
            BORDER
          </label>
          
          {/* Border Width */}
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '10px', color: '#666', display: 'block', marginBottom: '5px' }}>
              Width: {selectedElement.borderWidth || 0}px
            </label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={Math.min(selectedElement.borderWidth || 0, 20)}
                onChange={(e) => {
                  const width = parseInt(e.target.value);
                  handlePropertyChange('borderWidth', width);
                }}
                style={{
                  flex: 1,
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              />
              <input
                type="number"
                min="0"
                max="100"
                value={selectedElement.borderWidth || 0}
                onChange={(e) => {
                  const width = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                  handlePropertyChange('borderWidth', width);
                }}
                style={{
                  width: '60px',
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '4px',
                  padding: '5px',
                  color: '#fff',
                  fontSize: '11px'
                }}
                placeholder="px"
              />
            </div>
          </div>
          
          {/* Show color options only if border width > 0 */}
          {(selectedElement.borderWidth > 0) && (
            <>
              {/* Gradient Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <input
                  type="checkbox"
                  id="border-gradient-toggle"
                  checked={selectedElement.borderGradient || false}
                  onChange={(e) => {
                    handlePropertyChange('borderGradient', e.target.checked);
                  }}
                  style={{ marginRight: '8px' }}
                />
                <label htmlFor="border-gradient-toggle" style={{ fontSize: '11px', color: '#fff', cursor: 'pointer' }}>
                  Use Gradient
                </label>
              </div>
              
              {!selectedElement.borderGradient ? (
                // Solid Color
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={selectedElement.borderColor || '#ffffff'}
                    onChange={(e) => handlePropertyChange('borderColor', e.target.value)}
                    style={{
                      width: '40px',
                      height: '30px',
                      background: 'transparent',
                      border: '1px solid #333',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  />
                  <input
                    type="text"
                    value={selectedElement.borderColor || '#ffffff'}
                    onChange={(e) => handlePropertyChange('borderColor', e.target.value)}
                    style={{
                      flex: 1,
                      background: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '4px',
                      padding: '5px',
                      color: '#fff',
                      fontSize: '11px'
                    }}
                  />
                </div>
              ) : (
                // Gradient Colors
                <>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '10px', color: '#666', display: 'block', marginBottom: '5px' }}>
                      Start Color
                    </label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="color"
                        value={selectedElement.borderGradientStart || '#ffffff'}
                        onChange={(e) => handlePropertyChange('borderGradientStart', e.target.value)}
                        style={{
                          width: '40px',
                          height: '30px',
                          background: 'transparent',
                          border: '1px solid #333',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      />
                      <input
                        type="text"
                        value={selectedElement.borderGradientStart || '#ffffff'}
                        onChange={(e) => handlePropertyChange('borderGradientStart', e.target.value)}
                        style={{
                          flex: 1,
                          background: '#1a1a1a',
                          border: '1px solid #333',
                          borderRadius: '4px',
                          padding: '5px',
                          color: '#fff',
                          fontSize: '11px'
                        }}
                      />
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '10px', color: '#666', display: 'block', marginBottom: '5px' }}>
                      End Color
                    </label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="color"
                        value={selectedElement.borderGradientEnd || '#000000'}
                        onChange={(e) => handlePropertyChange('borderGradientEnd', e.target.value)}
                        style={{
                          width: '40px',
                          height: '30px',
                          background: 'transparent',
                          border: '1px solid #333',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      />
                      <input
                        type="text"
                        value={selectedElement.borderGradientEnd || '#000000'}
                        onChange={(e) => handlePropertyChange('borderGradientEnd', e.target.value)}
                        style={{
                          flex: 1,
                          background: '#1a1a1a',
                          border: '1px solid #333',
                          borderRadius: '4px',
                          padding: '5px',
                          color: '#fff',
                          fontSize: '11px'
                        }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '10px', color: '#666', display: 'block', marginBottom: '5px' }}>
                      Angle: {selectedElement.borderGradientAngle || 0}°
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="15"
                      value={selectedElement.borderGradientAngle || 0}
                      onChange={(e) => {
                        handlePropertyChange('borderGradientAngle', parseInt(e.target.value));
                      }}
                      style={{
                        width: '100%',
                        background: '#1a1a1a',
                        border: '1px solid #333',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
      
      {/* Radius (for circle/ellipse) */}
      {selectedElement.type === 'circle' && (
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '5px' }}>
            RADIUS
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <input
                type="number"
                value={Math.round(selectedElement.radiusX || selectedElement.radius || 50)}
                onChange={(e) => handlePropertyChange('radiusX', parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '4px',
                  padding: '5px',
                  color: '#fff',
                  fontSize: '12px'
                }}
                placeholder="Width"
              />
              <div style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>
                Horizontal
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <input
                type="number"
                value={Math.round(selectedElement.radiusY || selectedElement.radius || 50)}
                onChange={(e) => handlePropertyChange('radiusY', parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '4px',
                  padding: '5px',
                  color: '#fff',
                  fontSize: '12px'
                }}
                placeholder="Height"
              />
              <div style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>
                Vertical
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Video Upload */}
      {selectedElement.type === 'video' && (
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '5px' }}>
            VIDEO SOURCE
          </label>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => {
              const file = e.target.files[0];
              console.log('Video file selected:', file);
              if (file) {
                const url = URL.createObjectURL(file);
                console.log('Video URL created:', url);
                const video = document.createElement('video');
                video.src = url;
                video.muted = true;
                
                video.onloadedmetadata = () => {
                  console.log('Video metadata loaded:', video.videoWidth, video.videoHeight, video.duration);
                  // Create a canvas to capture the first frame as thumbnail
                  const canvas = document.createElement('canvas');
                  canvas.width = video.videoWidth;
                  canvas.height = video.videoHeight;
                  const ctx = canvas.getContext('2d');
                  
                  video.currentTime = 0.1; // Seek to 0.1 seconds to get a frame
                  video.onseeked = () => {
                    console.log('Video seeked, capturing frame');
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const img = new Image();
                    img.onload = () => {
                      console.log('Thumbnail created, updating properties');
                      
                      // Batch all updates into a single call
                      const updates = {
                        thumbnail: img,
                        src: url,
                        videoElement: video,
                        duration: video.duration,
                        currentTime: 0.1,
                        muted: true,  // Default to muted
                        volume: 0.5,  // Default volume at 50%
                        loop: false,  // Default to not looping
                        opacity: 1,   // Default to fully opaque
                        borderWidth: selectedElement.borderWidth || 0,
                        borderColor: selectedElement.borderColor || '#ffffff'
                      };
                      
                      // Adjust size to maintain aspect ratio
                      const aspectRatio = video.videoWidth / video.videoHeight;
                      if (selectedElement.width && selectedElement.height) {
                        const currentAspectRatio = selectedElement.width / selectedElement.height;
                        if (Math.abs(aspectRatio - currentAspectRatio) > 0.1) {
                          updates.height = selectedElement.width / aspectRatio;
                        }
                      }
                      
                      // Send all updates at once
                      console.log('Sending video updates:', updates);
                      onUpdateElement(selectedElement.id, updates);
                    };
                    img.src = canvas.toDataURL();
                  };
                };
              }
            }}
            style={{
              width: '100%',
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '4px',
              padding: '5px',
              color: '#fff',
              fontSize: '12px'
            }}
          />
          {selectedElement.src && (
            <div style={{ marginTop: '10px' }}>
              <video 
                ref={(el) => {
                  if (el && selectedElement.videoElement) {
                    // Keep video element reference updated
                    selectedElement.videoRef = el;
                  }
                }}
                src={selectedElement.src} 
                style={{ 
                  width: '100%', 
                  borderRadius: '4px',
                  border: '1px solid #333'
                }}
                controls
                muted
              />
              <div style={{ marginTop: '10px' }}>
                <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '5px' }}>
                  PREVIEW FRAME ({selectedElement.currentTime ? selectedElement.currentTime.toFixed(1) : '0'}s)
                </label>
                <div style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
                  {[
                    { label: 'Start', time: 0 },
                    { label: '25%', time: (selectedElement.duration || 0) * 0.25 },
                    { label: '50%', time: (selectedElement.duration || 0) * 0.5 },
                    { label: '75%', time: (selectedElement.duration || 0) * 0.75 },
                    { label: 'End', time: (selectedElement.duration || 0) * 0.95 }
                  ].map(preset => (
                    <button
                      key={preset.label}
                      onClick={() => {
                        const time = preset.time;
                        console.log('Frame preset clicked:', preset.label, time);
                        
                        // Create a new video element to seek and capture frame
                        if (selectedElement.src) {
                          const video = document.createElement('video');
                          video.src = selectedElement.src;
                          video.muted = true;
                          
                          video.onloadedmetadata = () => {
                            video.currentTime = time;
                            
                            video.onseeked = () => {
                              const canvas = document.createElement('canvas');
                              canvas.width = video.videoWidth;
                              canvas.height = video.videoHeight;
                              const ctx = canvas.getContext('2d');
                              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                              
                              const img = new Image();
                              img.onload = () => {
                                console.log('Frame captured at time:', time);
                                onUpdateElement(selectedElement.id, {
                                  thumbnail: img,
                                  currentTime: time
                                });
                              };
                              img.src = canvas.toDataURL();
                            };
                          };
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '3px',
                        background: '#333',
                        border: '1px solid #444',
                        borderRadius: '3px',
                        color: '#fff',
                        fontSize: '10px',
                        cursor: 'pointer'
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min="0"
                  max={selectedElement.duration || 1}
                  step="0.1"
                  value={selectedElement.currentTime || 0}
                  onChange={(e) => {
                    const time = parseFloat(e.target.value);
                    console.log('Slider changed to time:', time);
                    
                    // Create a new video element to seek and capture frame
                    if (selectedElement.src) {
                      const video = document.createElement('video');
                      video.src = selectedElement.src;
                      video.muted = true;
                      
                      video.onloadedmetadata = () => {
                        video.currentTime = time;
                        
                        video.onseeked = () => {
                          const canvas = document.createElement('canvas');
                          canvas.width = video.videoWidth;
                          canvas.height = video.videoHeight;
                          const ctx = canvas.getContext('2d');
                          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                          
                          const img = new Image();
                          img.onload = () => {
                            console.log('Frame captured from slider at time:', time);
                            onUpdateElement(selectedElement.id, {
                              thumbnail: img,
                              currentTime: time
                            });
                          };
                          img.src = canvas.toDataURL();
                        };
                      };
                    }
                  }}
                  style={{
                    width: '100%',
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '4px',
                    padding: '5px',
                    cursor: 'pointer'
                  }}
                />
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  marginTop: '5px',
                  fontSize: '10px',
                  color: '#666'
                }}>
                  <span>0s</span>
                  <span>{selectedElement.duration ? selectedElement.duration.toFixed(1) + 's' : '0s'}</span>
                </div>
              </div>
              <div style={{ marginTop: '5px', fontSize: '11px', color: '#888' }}>
                Duration: {selectedElement.duration ? selectedElement.duration.toFixed(1) : '0'}s
              </div>
              
              {/* Playback Controls */}
              <div style={{ marginTop: '15px', padding: '10px', background: '#1a1a1a', borderRadius: '4px' }}>
                <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '10px' }}>
                  PLAYBACK SETTINGS
                </label>
                
                {/* Loop Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                  <input
                    type="checkbox"
                    id="video-loop-toggle"
                    checked={selectedElement.loop || false}
                    onChange={(e) => {
                      const shouldLoop = e.target.checked;
                      console.log('Loop enabled:', shouldLoop);
                      onUpdateElement(selectedElement.id, {
                        loop: shouldLoop
                      });
                    }}
                    style={{ marginRight: '8px' }}
                  />
                  <label htmlFor="video-loop-toggle" style={{ fontSize: '12px', color: '#fff', cursor: 'pointer' }}>
                    Loop Video
                  </label>
                </div>
                
                {/* Mute/Unmute Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                  <input
                    type="checkbox"
                    id="video-audio-toggle"
                    checked={!selectedElement.muted}
                    onChange={(e) => {
                      const audioEnabled = e.target.checked;
                      console.log('Audio enabled:', audioEnabled);
                      onUpdateElement(selectedElement.id, {
                        muted: !audioEnabled
                      });
                    }}
                    style={{ marginRight: '8px' }}
                  />
                  <label htmlFor="video-audio-toggle" style={{ fontSize: '12px', color: '#fff', cursor: 'pointer' }}>
                    Enable Audio
                  </label>
                </div>
                
                {/* Volume Slider (only show if audio is enabled) */}
                {!selectedElement.muted && (
                  <div>
                    <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '5px' }}>
                      VOLUME: {Math.round((selectedElement.volume || 0.5) * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={selectedElement.volume || 0.5}
                      onChange={(e) => {
                        const volume = parseFloat(e.target.value);
                        console.log('Volume changed to:', volume);
                        onUpdateElement(selectedElement.id, {
                          volume: volume
                        });
                      }}
                      style={{
                        width: '100%',
                        background: '#1a1a1a',
                        border: '1px solid #333',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    />
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      marginTop: '5px',
                      fontSize: '10px',
                      color: '#666'
                    }}>
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                    
                    {/* Quick Volume Presets */}
                    <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                      {[0, 0.25, 0.5, 0.75, 1].map(vol => (
                        <button
                          key={vol}
                          onClick={() => {
                            console.log('Volume preset:', vol);
                            onUpdateElement(selectedElement.id, {
                              volume: vol
                            });
                          }}
                          style={{
                            flex: 1,
                            padding: '3px',
                            background: (selectedElement.volume || 0.5) === vol ? '#4a90e2' : '#333',
                            border: '1px solid #444',
                            borderRadius: '3px',
                            color: '#fff',
                            fontSize: '10px',
                            cursor: 'pointer'
                          }}
                        >
                          {Math.round(vol * 100)}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Image Upload */}
      {selectedElement.type === 'image' && (
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '5px' }}>
            IMAGE SOURCE
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                  const img = new Image();
                  img.onload = () => {
                    // Update all image properties at once
                    onUpdateElement(selectedElement.id, {
                      src: event.target.result,
                      imageObj: img,
                      opacity: selectedElement.opacity !== undefined ? selectedElement.opacity : 1,
                      borderWidth: selectedElement.borderWidth || 0,
                      borderColor: selectedElement.borderColor || '#ffffff'
                    });
                    // Optionally adjust size to maintain aspect ratio
                    const aspectRatio = img.width / img.height;
                    if (selectedElement.width && selectedElement.height) {
                      const currentAspectRatio = selectedElement.width / selectedElement.height;
                      if (Math.abs(aspectRatio - currentAspectRatio) > 0.1) {
                        // Adjust height to maintain aspect ratio
                        onUpdateElement(selectedElement.id, {
                          height: selectedElement.width / aspectRatio
                        });
                      }
                    }
                  };
                  img.src = event.target.result;
                };
                reader.readAsDataURL(file);
              }
            }}
            style={{
              width: '100%',
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '4px',
              padding: '5px',
              color: '#fff',
              fontSize: '12px'
            }}
          />
          {selectedElement.src && (
            <div style={{ marginTop: '10px' }}>
              <img 
                src={selectedElement.src} 
                alt="Preview" 
                style={{ 
                  width: '100%', 
                  borderRadius: '4px',
                  border: '1px solid #333'
                }} 
              />
            </div>
          )}
        </div>
      )}
      
      {/* Text Content */}
      {selectedElement.type === 'text' && (
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '5px' }}>
            TEXT
          </label>
          <textarea
            value={selectedElement.text}
            onChange={(e) => handlePropertyChange('text', e.target.value)}
            style={{
              width: '100%',
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '4px',
              padding: '5px',
              color: '#fff',
              fontSize: '12px',
              resize: 'vertical',
              minHeight: '60px'
            }}
          />
        </div>
      )}
      
      {/* Text Element Tabs */}
      {selectedElement.type === 'text' && (
        <div style={{ marginBottom: '20px' }}>
          {/* Tab Headers */}
          <div style={{
            display: 'flex',
            borderBottom: '2px solid #333',
            marginBottom: '20px'
          }}>
            {[
              { id: 'color', label: 'Color' },
              { id: 'text', label: 'Text' },
              { id: 'effects', label: 'Text Effects' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: activeTab === tab.id ? '#4caf50' : 'transparent',
                  color: activeTab === tab.id ? '#fff' : '#888',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid #4caf50' : '2px solid transparent',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  transition: 'all 0.2s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          {/* Tab Content */}
          {activeTab === 'effects' && (
            <TextEffectsPanel
              selectedElement={selectedElement}
              onUpdateElement={onUpdateElement}
            />
          )}
          
          {activeTab === 'text' && (
            <div>
              <h4 style={{ fontSize: '12px', color: '#888', margin: '0 0 15px 0' }}>
                TEXT PROPERTIES
              </h4>
            </div>
          )}
          
          {activeTab === 'color' && (
            <div>
              <h4 style={{ fontSize: '12px', color: '#888', margin: '0 0 15px 0' }}>
                COLOR PROPERTIES  
              </h4>
              
              {/* Gradient Toggle for text */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                <input
                  type="checkbox"
                  id="text-gradient-toggle"
                  checked={selectedElement.fillGradient || false}
                  onChange={(e) => {
                    handlePropertyChange('fillGradient', e.target.checked);
                  }}
                  style={{ marginRight: '8px' }}
                />
                <label htmlFor="text-gradient-toggle" style={{ fontSize: '11px', color: '#fff', cursor: 'pointer' }}>
                  Use Gradient Fill
                </label>
              </div>
              
              {/* Text Fill Color */}
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '8px' }}>
                  FILL COLOR
                </label>
                
                {!selectedElement.fillGradient ? (
                  // Solid Color
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={selectedElement.fill || '#ffffff'}
                      onChange={(e) => handlePropertyChange('fill', e.target.value)}
                      style={{
                        width: '40px',
                        height: '30px',
                        background: 'transparent',
                        border: '1px solid #333',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    />
                    <input
                      type="text"
                      value={selectedElement.fill || '#ffffff'}
                      onChange={(e) => handlePropertyChange('fill', e.target.value)}
                      style={{
                        flex: 1,
                        background: '#1a1a1a',
                        border: '1px solid #333',
                        borderRadius: '4px',
                        padding: '5px',
                        color: '#fff',
                        fontSize: '11px'
                      }}
                    />
                  </div>
                ) : (
                  // Gradient Colors
                  <>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ fontSize: '10px', color: '#666', display: 'block', marginBottom: '5px' }}>
                        Start Color
                      </label>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input
                          type="color"
                          value={selectedElement.fillGradientStart || '#4a90e2'}
                          onChange={(e) => handlePropertyChange('fillGradientStart', e.target.value)}
                          style={{
                            width: '40px',
                            height: '30px',
                            background: 'transparent',
                            border: '1px solid #333',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        />
                        <input
                          type="text"
                          value={selectedElement.fillGradientStart || '#4a90e2'}
                          onChange={(e) => handlePropertyChange('fillGradientStart', e.target.value)}
                          style={{
                            flex: 1,
                            background: '#1a1a1a',
                            border: '1px solid #333',
                            borderRadius: '4px',
                            padding: '5px',
                            color: '#fff',
                            fontSize: '11px'
                          }}
                        />
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ fontSize: '10px', color: '#666', display: 'block', marginBottom: '5px' }}>
                        End Color
                      </label>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input
                          type="color"
                          value={selectedElement.fillGradientEnd || '#2c5aa0'}
                          onChange={(e) => handlePropertyChange('fillGradientEnd', e.target.value)}
                          style={{
                            width: '40px',
                            height: '30px',
                            background: 'transparent',
                            border: '1px solid #333',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        />
                        <input
                          type="text"
                          value={selectedElement.fillGradientEnd || '#2c5aa0'}
                          onChange={(e) => handlePropertyChange('fillGradientEnd', e.target.value)}
                          style={{
                            flex: 1,
                            background: '#1a1a1a',
                            border: '1px solid #333',
                            borderRadius: '4px',
                            padding: '5px',
                            color: '#fff',
                            fontSize: '11px'
                          }}
                        />
                      </div>
                    </div>
                    
                    {/* Gradient Angle Control */}
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ fontSize: '10px', color: '#666', display: 'block', marginBottom: '5px' }}>
                        Angle: {selectedElement.fillGradientAngle || 0}°
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        step="15"
                        value={selectedElement.fillGradientAngle || 0}
                        onChange={(e) => {
                          handlePropertyChange('fillGradientAngle', parseInt(e.target.value));
                        }}
                        style={{
                          width: '100%',
                          background: '#1a1a1a',
                          border: '1px solid #333',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Text Properties */}
      {selectedElement.type === 'text' && activeTab === 'text' && (
        <>
          {/* Font Family */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '5px' }}>
              FONT FAMILY
            </label>
            
            {/* Custom Font Dropdown */}
            <div ref={fontDropdownRef} style={{ position: 'relative' }}>
              <div
                onClick={() => setFontDropdownOpen(!fontDropdownOpen)}
                style={{
                  width: '100%',
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '4px',
                  padding: '8px',
                  color: '#fff',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontFamily: selectedElement.fontFamily || 'Arial'
                }}
              >
                <span>{selectedElement.fontFamily || 'Arial'}</span>
                <ChevronDown size={14} style={{ transform: fontDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
              </div>
              
              {fontDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '4px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  zIndex: 1000,
                  marginTop: '2px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                }}>
                  {!fontsLoaded && (
                    <div style={{
                      padding: '12px',
                      fontSize: '12px',
                      color: '#888',
                      textAlign: 'center'
                    }}>
                      Loading system fonts...
                    </div>
                  )}
                  {fontsLoaded && systemFonts.map((group, groupIndex) => (
                    <div key={groupIndex}>
                      <div style={{
                        padding: '8px 12px',
                        fontSize: '10px',
                        color: '#888',
                        borderBottom: '1px solid #333',
                        textTransform: 'uppercase',
                        fontWeight: 'bold'
                      }}>
                        {group.category}
                      </div>
                      {group.fonts.map((font, fontIndex) => (
                        <div
                          key={`${groupIndex}-${fontIndex}`}
                          onClick={() => {
                            handlePropertyChange('fontFamily', font);
                            setFontDropdownOpen(false);
                          }}
                          style={{
                            padding: '8px 12px',
                            fontSize: '14px',
                            color: '#fff',
                            cursor: 'pointer',
                            fontFamily: font,
                            borderBottom: fontIndex === group.fonts.length - 1 ? 'none' : '1px solid #2a2a2a',
                            backgroundColor: selectedElement.fontFamily === font ? '#4a90e2' : 'transparent',
                            transition: 'background-color 0.1s'
                          }}
                          onMouseEnter={(e) => {
                            if (selectedElement.fontFamily !== font) {
                              e.target.style.backgroundColor = '#333';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedElement.fontFamily !== font) {
                              e.target.style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          {font === '-apple-system' ? 'San Francisco (System)' : 
                           font === 'serif' ? 'Serif (System Default)' :
                           font === 'sans-serif' ? 'Sans-serif (System Default)' :
                           font === 'monospace' ? 'Monospace (System Default)' :
                           font === 'cursive' ? 'Cursive (System Default)' :
                           font === 'fantasy' ? 'Fantasy (System Default)' :
                           font}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* System Font Access */}
            {fontsLoaded && systemFonts[0]?.category !== "System Fonts" && 'queryLocalFonts' in window && (
              <div style={{ marginTop: '10px', padding: '8px', background: '#2a2a2a', borderRadius: '4px' }}>
                <div style={{ fontSize: '10px', color: '#888', marginBottom: '5px' }}>
                  Enable access to all system fonts:
                </div>
                <button
                  onClick={async () => {
                    try {
                      const availableFonts = await window.queryLocalFonts();
                      const uniqueFamilies = [...new Set(availableFonts.map(font => font.family))];
                      const sortedFonts = uniqueFamilies.sort();
                      
                      const systemFontGroup = {
                        category: "System Fonts",
                        fonts: sortedFonts
                      };
                      
                      setSystemFonts([systemFontGroup, ...defaultFontOptions]);
                      console.log(`Loaded ${sortedFonts.length} system fonts`);
                    } catch (error) {
                      console.log('Permission denied or error:', error);
                    }
                  }}
                  style={{
                    padding: '4px 8px',
                    background: '#4a90e2',
                    border: 'none',
                    borderRadius: '3px',
                    color: '#fff',
                    fontSize: '10px',
                    cursor: 'pointer'
                  }}
                >
                  Grant Font Access
                </button>
              </div>
            )}
            
            {/* Custom Font Input */}
            <div style={{ marginTop: '10px' }}>
              <label style={{ fontSize: '10px', color: '#666', display: 'block', marginBottom: '5px' }}>
                Or enter custom font name:
              </label>
              <input
                type="text"
                placeholder="e.g., MyCustomFont, Custom Font Name"
                onChange={(e) => {
                  if (e.target.value.trim()) {
                    handlePropertyChange('fontFamily', e.target.value.trim());
                    setFontDropdownOpen(false);
                  }
                }}
                style={{
                  width: '100%',
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '4px',
                  padding: '5px',
                  color: '#fff',
                  fontSize: '11px'
                }}
              />
              <div style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>
                Enter any font installed on your system
              </div>
            </div>
          </div>

          {/* Font Size */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '5px' }}>
              FONT SIZE
            </label>
            <input
              type="number"
              value={selectedElement.fontSize}
              onChange={(e) => handlePropertyChange('fontSize', parseInt(e.target.value))}
              style={{
                width: '100%',
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '4px',
                padding: '5px',
                color: '#fff',
                fontSize: '12px'
              }}
            />
          </div>

          {/* Letter Spacing (Kerning) */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '5px' }}>
              LETTER SPACING: {selectedElement.letterSpacing || 0}px
            </label>
            <input
              type="range"
              min="-5"
              max="20"
              step="0.5"
              value={selectedElement.letterSpacing || 0}
              onChange={(e) => handlePropertyChange('letterSpacing', parseFloat(e.target.value))}
              style={{
                width: '100%',
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            />
          </div>

          {/* Line Height (Line Spacing) */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '5px' }}>
              LINE HEIGHT: {(selectedElement.lineHeight || 1.2).toFixed(1)}
            </label>
            <input
              type="range"
              min="0.8"
              max="3.0"
              step="0.1"
              value={selectedElement.lineHeight || 1.2}
              onChange={(e) => handlePropertyChange('lineHeight', parseFloat(e.target.value))}
              style={{
                width: '100%',
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            />
          </div>
          
          {/* Text Box Height */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '5px' }}>
              TEXT BOX HEIGHT: {selectedElement.height || 100}px
            </label>
            <input
              type="range"
              min="20"
              max="300"
              step="5"
              value={selectedElement.height || 100}
              onChange={(e) => handlePropertyChange('height', parseInt(e.target.value))}
              style={{
                width: '100%',
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            />
          </div>
          
          {/* Auto-sizing Toggle */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '10px' }}>
              AUTO-SIZE TEXT TO FIT
            </label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px' }}>
                <input
                  type="checkbox"
                  checked={selectedElement.autoSize || false}
                  onChange={(e) => handlePropertyChange('autoSize', e.target.checked)}
                  style={{ margin: 0 }}
                />
                Enable Auto-sizing
              </label>
            </div>
          </div>
          
          {/* Auto-sizing constraints - only show when auto-sizing is enabled */}
          {selectedElement.autoSize && (
            <>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '5px' }}>
                  MIN FONT SIZE: {selectedElement.minFontSize || 8}px
                </label>
                <input
                  type="range"
                  min="6"
                  max="24"
                  step="1"
                  value={selectedElement.minFontSize || 8}
                  onChange={(e) => handlePropertyChange('minFontSize', parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '5px' }}>
                  MAX FONT SIZE: {selectedElement.maxFontSize || 48}px
                </label>
                <input
                  type="range"
                  min="12"
                  max="72"
                  step="1"
                  value={selectedElement.maxFontSize || 48}
                  onChange={(e) => handlePropertyChange('maxFontSize', parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '10px' }}>
                  CONSTRAINTS
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px' }}>
                    <input
                      type="checkbox"
                      checked={selectedElement.constrainWidth || false}
                      onChange={(e) => handlePropertyChange('constrainWidth', e.target.checked)}
                      style={{ margin: 0 }}
                    />
                    Constrain to width
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px' }}>
                    <input
                      type="checkbox"
                      checked={selectedElement.constrainHeight || false}
                      onChange={(e) => handlePropertyChange('constrainHeight', e.target.checked)}
                      style={{ margin: 0 }}
                    />
                    Constrain to height
                  </label>
                </div>
              </div>
            </>
          )}
          
          {/* Text Effects Section */}
          <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #333' }}>
            <h4 style={{ fontSize: '12px', color: '#888', margin: '0 0 15px 0' }}>
              TEXT EFFECTS
            </h4>
            
            {/* Shadow Effect */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '10px' }}>
                DROP SHADOW
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <input
                  type="checkbox"
                  checked={selectedElement.effects?.shadow?.enabled || false}
                  onChange={(e) => handlePropertyChange('effects', {
                    ...selectedElement.effects,
                    shadow: {
                      ...selectedElement.effects?.shadow,
                      enabled: e.target.checked
                    }
                  })}
                  style={{ margin: 0 }}
                />
                <span style={{ fontSize: '11px' }}>Enable Shadow</span>
              </div>
              
              {selectedElement.effects?.shadow?.enabled && (
                <div style={{ marginLeft: '20px' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '10px', color: '#aaa', display: 'block', marginBottom: '3px' }}>
                      Shadow Color
                    </label>
                    <input
                      type="color"
                      value={selectedElement.effects?.shadow?.color || '#000000'}
                      onChange={(e) => handlePropertyChange('effects', {
                        ...selectedElement.effects,
                        shadow: {
                          ...selectedElement.effects?.shadow,
                          color: e.target.value
                        }
                      })}
                      style={{
                        width: '40px',
                        height: '20px',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                  
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '10px', color: '#aaa' }}>
                      X Offset: {selectedElement.effects?.shadow?.offsetX || 2}px
                    </label>
                    <input
                      type="range"
                      min="-20"
                      max="20"
                      value={selectedElement.effects?.shadow?.offsetX || 2}
                      onChange={(e) => handlePropertyChange('effects', {
                        ...selectedElement.effects,
                        shadow: {
                          ...selectedElement.effects?.shadow,
                          offsetX: parseInt(e.target.value)
                        }
                      })}
                      style={{ width: '100%', fontSize: '10px' }}
                    />
                  </div>
                  
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '10px', color: '#aaa' }}>
                      Y Offset: {selectedElement.effects?.shadow?.offsetY || 2}px
                    </label>
                    <input
                      type="range"
                      min="-20"
                      max="20"
                      value={selectedElement.effects?.shadow?.offsetY || 2}
                      onChange={(e) => handlePropertyChange('effects', {
                        ...selectedElement.effects,
                        shadow: {
                          ...selectedElement.effects?.shadow,
                          offsetY: parseInt(e.target.value)
                        }
                      })}
                      style={{ width: '100%', fontSize: '10px' }}
                    />
                  </div>
                  
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '10px', color: '#aaa' }}>
                      Blur: {selectedElement.effects?.shadow?.blur || 4}px
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={selectedElement.effects?.shadow?.blur || 4}
                      onChange={(e) => handlePropertyChange('effects', {
                        ...selectedElement.effects,
                        shadow: {
                          ...selectedElement.effects?.shadow,
                          blur: parseInt(e.target.value)
                        }
                      })}
                      style={{ width: '100%', fontSize: '10px' }}
                    />
                  </div>
                  
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '10px', color: '#aaa' }}>
                      Opacity: {Math.round((selectedElement.effects?.shadow?.opacity || 0.7) * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={selectedElement.effects?.shadow?.opacity || 0.7}
                      onChange={(e) => handlePropertyChange('effects', {
                        ...selectedElement.effects,
                        shadow: {
                          ...selectedElement.effects?.shadow,
                          opacity: parseFloat(e.target.value)
                        }
                      })}
                      style={{ width: '100%', fontSize: '10px' }}
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Stroke Effect */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '10px' }}>
                OUTLINE/STROKE
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <input
                  type="checkbox"
                  checked={selectedElement.effects?.stroke?.enabled || false}
                  onChange={(e) => handlePropertyChange('effects', {
                    ...selectedElement.effects,
                    stroke: {
                      ...selectedElement.effects?.stroke,
                      enabled: e.target.checked
                    }
                  })}
                  style={{ margin: 0 }}
                />
                <span style={{ fontSize: '11px' }}>Enable Outline</span>
              </div>
              
              {selectedElement.effects?.stroke?.enabled && (
                <div style={{ marginLeft: '20px' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '10px', color: '#aaa', display: 'block', marginBottom: '3px' }}>
                      Stroke Color
                    </label>
                    <input
                      type="color"
                      value={selectedElement.effects?.stroke?.color || '#ffffff'}
                      onChange={(e) => handlePropertyChange('effects', {
                        ...selectedElement.effects,
                        stroke: {
                          ...selectedElement.effects?.stroke,
                          color: e.target.value
                        }
                      })}
                      style={{
                        width: '40px',
                        height: '20px',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                  
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '10px', color: '#aaa' }}>
                      Width: {selectedElement.effects?.stroke?.width || 2}px
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={selectedElement.effects?.stroke?.width || 2}
                      onChange={(e) => handlePropertyChange('effects', {
                        ...selectedElement.effects,
                        stroke: {
                          ...selectedElement.effects?.stroke,
                          width: parseInt(e.target.value)
                        }
                      })}
                      style={{ width: '100%', fontSize: '10px' }}
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Glow Effect */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '10px' }}>
                GLOW
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <input
                  type="checkbox"
                  checked={selectedElement.effects?.glow?.enabled || false}
                  onChange={(e) => handlePropertyChange('effects', {
                    ...selectedElement.effects,
                    glow: {
                      ...selectedElement.effects?.glow,
                      enabled: e.target.checked
                    }
                  })}
                  style={{ margin: 0 }}
                />
                <span style={{ fontSize: '11px' }}>Enable Glow</span>
              </div>
              
              {selectedElement.effects?.glow?.enabled && (
                <div style={{ marginLeft: '20px' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '10px', color: '#aaa', display: 'block', marginBottom: '3px' }}>
                      Glow Color
                    </label>
                    <input
                      type="color"
                      value={selectedElement.effects?.glow?.color || '#ffffff'}
                      onChange={(e) => handlePropertyChange('effects', {
                        ...selectedElement.effects,
                        glow: {
                          ...selectedElement.effects?.glow,
                          color: e.target.value
                        }
                      })}
                      style={{
                        width: '40px',
                        height: '20px',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                  
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '10px', color: '#aaa' }}>
                      Blur: {selectedElement.effects?.glow?.blur || 8}px
                    </label>
                    <input
                      type="range"
                      min="2"
                      max="20"
                      value={selectedElement.effects?.glow?.blur || 8}
                      onChange={(e) => handlePropertyChange('effects', {
                        ...selectedElement.effects,
                        glow: {
                          ...selectedElement.effects?.glow,
                          blur: parseInt(e.target.value)
                        }
                      })}
                      style={{ width: '100%', fontSize: '10px' }}
                    />
                  </div>
                  
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '10px', color: '#aaa' }}>
                      Opacity: {Math.round((selectedElement.effects?.glow?.opacity || 0.8) * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={selectedElement.effects?.glow?.opacity || 0.8}
                      onChange={(e) => handlePropertyChange('effects', {
                        ...selectedElement.effects,
                        glow: {
                          ...selectedElement.effects?.glow,
                          opacity: parseFloat(e.target.value)
                        }
                      })}
                      style={{ width: '100%', fontSize: '10px' }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

        </>
      )}
      
      {/* Fill Color - for shapes */}
      {(selectedElement.type === 'rect' || selectedElement.type === 'circle') && (
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '5px' }}>
            FILL
          </label>
          
          {/* Gradient Toggle for rect and circle */}
          {(selectedElement.type === 'rect' || selectedElement.type === 'circle') && (
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <input
                type="checkbox"
                id="fill-gradient-toggle"
                checked={selectedElement.fillGradient || false}
                onChange={(e) => {
                  handlePropertyChange('fillGradient', e.target.checked);
                }}
                style={{ marginRight: '8px' }}
              />
              <label htmlFor="fill-gradient-toggle" style={{ fontSize: '11px', color: '#fff', cursor: 'pointer' }}>
                Use Gradient Fill
              </label>
            </div>
          )}
          
          {!selectedElement.fillGradient ? (
            // Solid Color
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="color"
                value={selectedElement.fill || '#ffffff'}
                onChange={(e) => handlePropertyChange('fill', e.target.value)}
                style={{
                  width: '40px',
                  height: '30px',
                  background: 'transparent',
                  border: '1px solid #333',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              />
              <input
                type="text"
                value={selectedElement.fill || '#ffffff'}
                onChange={(e) => handlePropertyChange('fill', e.target.value)}
                style={{
                  flex: 1,
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '4px',
                  padding: '5px',
                  color: '#fff',
                  fontSize: '12px'
                }}
              />
            </div>
          ) : (
            // Gradient Colors
            <>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '10px', color: '#666', display: 'block', marginBottom: '5px' }}>
                  Start Color
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={selectedElement.fillGradientStart || '#4a90e2'}
                    onChange={(e) => handlePropertyChange('fillGradientStart', e.target.value)}
                    style={{
                      width: '40px',
                      height: '30px',
                      background: 'transparent',
                      border: '1px solid #333',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  />
                  <input
                    type="text"
                    value={selectedElement.fillGradientStart || '#4a90e2'}
                    onChange={(e) => handlePropertyChange('fillGradientStart', e.target.value)}
                    style={{
                      flex: 1,
                      background: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '4px',
                      padding: '5px',
                      color: '#fff',
                      fontSize: '11px'
                    }}
                  />
                </div>
              </div>
              
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '10px', color: '#666', display: 'block', marginBottom: '5px' }}>
                  End Color
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={selectedElement.fillGradientEnd || '#2c5aa0'}
                    onChange={(e) => handlePropertyChange('fillGradientEnd', e.target.value)}
                    style={{
                      width: '40px',
                      height: '30px',
                      background: 'transparent',
                      border: '1px solid #333',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  />
                  <input
                    type="text"
                    value={selectedElement.fillGradientEnd || '#2c5aa0'}
                    onChange={(e) => handlePropertyChange('fillGradientEnd', e.target.value)}
                    style={{
                      flex: 1,
                      background: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '4px',
                      padding: '5px',
                      color: '#fff',
                      fontSize: '11px'
                    }}
                  />
                </div>
              </div>
              
              {/* Angle control for both rectangles and circles */}
              {(selectedElement.type === 'rect' || selectedElement.type === 'circle') && (
                <div>
                  <label style={{ fontSize: '10px', color: '#666', display: 'block', marginBottom: '5px' }}>
                    Angle: {selectedElement.fillGradientAngle || 0}°
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="15"
                    value={selectedElement.fillGradientAngle || 0}
                    onChange={(e) => {
                      handlePropertyChange('fillGradientAngle', parseInt(e.target.value));
                    }}
                    style={{
                      width: '100%',
                      background: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
      
      {/* Stroke */}
      {(selectedElement.type === 'rect' || selectedElement.type === 'circle') && (
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '5px' }}>
            STROKE
          </label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="color"
              value={selectedElement.stroke || '#ffffff'}
              onChange={(e) => handlePropertyChange('stroke', e.target.value)}
              style={{
                width: '40px',
                height: '30px',
                background: 'transparent',
                border: '1px solid #333',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            />
            <input
              type="number"
              value={selectedElement.strokeWidth || 0}
              onChange={(e) => handlePropertyChange('strokeWidth', parseInt(e.target.value))}
              style={{
                width: '60px',
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '4px',
                padding: '5px',
                color: '#fff',
                fontSize: '12px'
              }}
              placeholder="Width"
            />
          </div>
        </div>
      )}
      
      {/* Delete Button */}
          <button
            onClick={() => onDeleteElement && onDeleteElement(selectedElement.id)}
            style={{
              width: '100%',
              padding: '8px',
              background: '#e74c3c',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              fontSize: '12px',
              marginTop: '20px'
            }}
          >
            <Trash size={14} />
            Delete Element
          </button>
        </div>
      )}
    </div>
  );
};

export default PropertiesPanel;