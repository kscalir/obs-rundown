import React, { useState, useRef } from 'react';
import { 
  Palette, Folder2Open, Save, Plus, Fonts, Square, Circle,
  Cursor, CursorText, FileEarmarkImage, FileEarmarkPlay, Collection, GridFill,
  Search, DashLg, PlusLg, AlignStart, AlignEnd, AlignCenter, AlignTop, AlignBottom,
  AlignMiddle, DistributeHorizontal, DistributeVertical
} from 'react-bootstrap-icons';
import TemplateCanvas from './graphics/TemplateCanvas';
import PropertiesPanel from './graphics/PropertiesPanel';
import BroadcastTimeline from './graphics/BroadcastTimeline';


const GraphicsTab = ({ showId }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [activePanel, setActivePanel] = useState('templates'); // templates, editor, preview
  const [selectedTool, setSelectedTool] = useState('select');
  const [selectedElement, setSelectedElement] = useState(null);
  const [canvasElements, setCanvasElements] = useState([]);
  const canvasRef = useRef();
  const [canvasInstance, setCanvasInstance] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [timelineState, setTimelineState] = useState(null);
  
  // Load templates for this show
  React.useEffect(() => {
    if (showId) {
      // TODO: Fetch templates for this show
      // api.get(`/api/shows/${showId}/templates`)
    }
  }, [showId]);

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#1a1a1a',
      color: '#fff'
    }}>
      {/* Header Toolbar */}
      <div style={{
        height: '48px',
        background: '#2a2a2a',
        borderBottom: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        padding: '0 10px',
        gap: '10px'
      }}>
        <Palette size={20} style={{ color: '#4a90e2' }} />
        <span style={{ fontWeight: 600, marginRight: 'auto' }}>
          {activePanel === 'editor' && selectedTemplate 
            ? `Editing: ${selectedTemplate.name}` 
            : 'Graphics Templates'}
        </span>
        
        {activePanel === 'editor' ? (
          <>
            <button
              onClick={() => {
                setActivePanel('templates');
                setSelectedTemplate(null);
              }}
              style={{
                padding: '6px 12px',
                background: '#333',
                border: 'none',
                borderRadius: '4px',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Folder2Open size={16} />
              Back to Library
            </button>
            
            <button
              style={{
                padding: '6px 12px',
                background: '#4a90e2',
                border: 'none',
                borderRadius: '4px',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Save size={16} />
              Save Template
            </button>
          </>
        ) : (
          <button
            onClick={() => {
              setSelectedTemplate({ name: 'New Template', isNew: true });
              setActivePanel('editor');
            }}
            style={{
              padding: '6px 12px',
              background: '#4caf50',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Plus size={16} />
            New Template
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {activePanel === 'templates' ? (
          // Template Library View
          <div style={{ 
            flex: 1, 
            padding: '20px',
            overflowY: 'auto'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '20px'
            }}>
              {/* Template Cards */}
              <div 
                onClick={() => {
                  setSelectedTemplate({ 
                    id: 'lower-third-1', 
                    name: 'Lower Third',
                    type: 'lower-third'
                  });
                  setActivePanel('editor');
                }}
                style={{
                  background: '#2a2a2a',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  height: '120px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Fonts size={40} color="#fff" />
                </div>
                <div style={{ padding: '10px' }}>
                  <h4 style={{ margin: '0 0 5px 0', fontSize: '14px' }}>Lower Third</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>
                    Standard lower third with title and subtitle
                  </p>
                </div>
              </div>

              <div 
                onClick={() => {
                  setSelectedTemplate({ 
                    id: 'full-screen-1', 
                    name: 'Full Screen',
                    type: 'full-screen'
                  });
                  setActivePanel('editor');
                }}
                style={{
                  background: '#2a2a2a',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  height: '120px',
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Square size={40} color="#fff" />
                </div>
                <div style={{ padding: '10px' }}>
                  <h4 style={{ margin: '0 0 5px 0', fontSize: '14px' }}>Full Screen</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>
                    Full screen graphic overlay
                  </p>
                </div>
              </div>

              <div 
                onClick={() => {
                  setSelectedTemplate({ 
                    id: 'bug-logo-1', 
                    name: 'Bug/Logo',
                    type: 'bug'
                  });
                  setActivePanel('editor');
                }}
                style={{
                  background: '#2a2a2a',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  height: '120px',
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Circle size={40} color="#fff" />
                </div>
                <div style={{ padding: '10px' }}>
                  <h4 style={{ margin: '0 0 5px 0', fontSize: '14px' }}>Bug/Logo</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>
                    Corner bug or logo overlay
                  </p>
                </div>
              </div>

              {/* Add New Template Card */}
              <div 
                style={{
                  background: '#2a2a2a',
                  borderRadius: '8px',
                  border: '2px dashed #444',
                  height: '170px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  gap: '10px'
                }}
                onClick={() => setActivePanel('editor')}
              >
                <Plus size={30} color="#666" />
                <span style={{ color: '#666', fontSize: '14px' }}>Create New Template</span>
              </div>
            </div>
          </div>
        ) : (
          // Template Editor View
          
          <div style={{ flex: 1, display: 'flex' }}>
            {/* Left Sidebar - Tools */}
            <div style={{
              width: '60px',
              background: '#2a2a2a',
              borderRight: '1px solid #333',
              padding: '10px 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div 
                onClick={() => setSelectedTool('select')}
                style={{
                  width: '40px',
                  height: '40px',
                  background: selectedTool === 'select' ? '#4a90e2' : '#333',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Select"
              >
                <Cursor size={18} color="#fff" />
              </div>
              
              <div 
                onClick={() => setSelectedTool('text')}
                style={{
                  width: '40px',
                  height: '40px',
                  background: selectedTool === 'text' ? '#4a90e2' : '#333',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Text"
              >
                <CursorText size={18} color="#fff" />
              </div>
              
              <div 
                onClick={() => setSelectedTool('rect')}
                style={{
                  width: '40px',
                  height: '40px',
                  background: selectedTool === 'rect' ? '#4a90e2' : '#333',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Rectangle"
              >
                <Square size={18} color="#fff" />
              </div>
              
              <div 
                onClick={() => setSelectedTool('circle')}
                style={{
                  width: '40px',
                  height: '40px',
                  background: selectedTool === 'circle' ? '#4a90e2' : '#333',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Circle"
              >
                <Circle size={18} color="#fff" />
              </div>
              
              <div 
                onClick={() => setSelectedTool('image')}
                style={{
                  width: '40px',
                  height: '40px',
                  background: selectedTool === 'image' ? '#4a90e2' : '#333',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Image"
              >
                <FileEarmarkImage size={18} color="#fff" />
              </div>
              
              <div 
                onClick={() => setSelectedTool('video')}
                style={{
                  width: '40px',
                  height: '40px',
                  background: selectedTool === 'video' ? '#4a90e2' : '#333',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Video"
              >
                <FileEarmarkPlay size={18} color="#fff" />
              </div>
              
              {/* Separator */}
              <div style={{ height: '1px', backgroundColor: '#444', margin: '5px 0' }}></div>
              
              {/* Group/Ungroup buttons */}
              <div 
                onClick={() => {
                  console.log('Group button clicked!');
                  console.log('canvasInstance:', canvasInstance);
                  if (canvasInstance && canvasInstance.groupSelected) {
                    console.log('Calling groupSelected function');
                    canvasInstance.groupSelected();
                  } else {
                    console.log('No groupSelected function available');
                  }
                }}
                style={{
                  width: '40px',
                  height: '40px',
                  background: '#333',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Group (Ctrl+G)"
              >
                <Collection size={16} color="#fff" />
              </div>
              
              <div 
                onClick={() => {
                  console.log('Ungroup button clicked!');
                  console.log('canvasInstance:', canvasInstance);
                  if (canvasInstance && canvasInstance.ungroupSelected) {
                    console.log('Calling ungroupSelected function');
                    canvasInstance.ungroupSelected();
                  } else {
                    console.log('No ungroupSelected function available');
                  }
                }}
                style={{
                  width: '40px',
                  height: '40px',
                  background: '#333',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Ungroup (Ctrl+Shift+G)"
              >
                <GridFill size={16} color="#fff" />
              </div>
              
            </div>

            {/* Center - Canvas */}
            <div style={{
              flex: 1,
              background: '#1a1a1a',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Zoom Controls */}
              <div style={{
                height: '40px',
                background: '#2a2a2a',
                borderBottom: '1px solid #333',
                display: 'flex',
                alignItems: 'center',
                padding: '0 15px',
                gap: '10px'
              }}>
                {/* Search Icon */}
                <Search size={16} color="#666" />
                
                {/* Zoom Percentage */}
                <span style={{
                  fontSize: '13px',
                  color: '#fff',
                  minWidth: '35px',
                  textAlign: 'center'
                }}>
                  {zoomLevel}%
                </span>
                
                {/* Fit Canvas Button */}
                <button
                  onClick={() => {
                    setZoomLevel(100);
                    if (canvasInstance && canvasInstance.setZoom) {
                      canvasInstance.setZoom(1);
                    }
                  }}
                  style={{
                    padding: '4px 8px',
                    background: '#444',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  Fit Canvas
                </button>
                
                {/* 100% Button */}
                <button
                  onClick={() => {
                    setZoomLevel(100);
                    if (canvasInstance && canvasInstance.setZoom) {
                      canvasInstance.setZoom(1);
                    }
                  }}
                  style={{
                    padding: '4px 8px',
                    background: zoomLevel === 100 ? '#4a90e2' : '#444',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  100%
                </button>
                
                {/* Zoom Out Button */}
                <div
                  onClick={() => {
                    const newZoom = Math.max(25, zoomLevel - 25);
                    setZoomLevel(newZoom);
                    if (canvasInstance && canvasInstance.setZoom) {
                      canvasInstance.setZoom(newZoom / 100);
                    }
                  }}
                  style={{
                    width: '24px',
                    height: '24px',
                    background: '#444',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <DashLg size={12} color="#fff" />
                </div>
                
                {/* Zoom In Button */}
                <div
                  onClick={() => {
                    const newZoom = Math.min(400, zoomLevel + 25);
                    setZoomLevel(newZoom);
                    if (canvasInstance && canvasInstance.setZoom) {
                      canvasInstance.setZoom(newZoom / 100);
                    }
                  }}
                  style={{
                    width: '24px',
                    height: '24px',
                    background: '#444',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <PlusLg size={12} color="#fff" />
                </div>
              </div>

              {/* Alignment Controls Toolbar */}
              <div style={{
                height: '50px',
                background: '#2a2a2a',
                borderBottom: '1px solid #333',
                display: 'flex',
                alignItems: 'center',
                padding: '0 15px',
                gap: '8px'
              }}>
                <span style={{ fontSize: '12px', color: '#888', marginRight: '10px' }}>
                  Align:
                </span>
                
                {/* Alignment Controls */}
                <div 
                  onClick={() => {
                    console.log('Align left clicked, canvasInstance:', canvasInstance);
                    if (canvasInstance && canvasInstance.alignElements) {
                      canvasInstance.alignElements('left');
                    } else {
                      console.log('alignElements function not found');
                    }
                  }}
                  style={{
                    width: '32px',
                    height: '32px',
                    background: '#333',
                    borderRadius: '4px',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Align Left Edges"
                >
                  <AlignStart size={14} color="#fff" />
                </div>
                
                <div 
                  onClick={() => {
                    if (canvasInstance && canvasInstance.alignElements) {
                      canvasInstance.alignElements('centerH');
                    }
                  }}
                  style={{
                    width: '32px',
                    height: '32px',
                    background: '#333',
                    borderRadius: '4px',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Align Center Horizontally"
                >
                  <AlignCenter size={14} color="#fff" />
                </div>
                
                <div 
                  onClick={() => {
                    if (canvasInstance && canvasInstance.alignElements) {
                      canvasInstance.alignElements('right');
                    }
                  }}
                  style={{
                    width: '32px',
                    height: '32px',
                    background: '#333',
                    borderRadius: '4px',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Align Right Edges"
                >
                  <AlignEnd size={14} color="#fff" />
                </div>
                
                {/* Separator */}
                <div style={{ width: '1px', height: '20px', backgroundColor: '#444', margin: '0 5px' }}></div>
                
                <div 
                  onClick={() => {
                    if (canvasInstance && canvasInstance.alignElements) {
                      canvasInstance.alignElements('top');
                    }
                  }}
                  style={{
                    width: '32px',
                    height: '32px',
                    background: '#333',
                    borderRadius: '4px',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Align Top Edges"
                >
                  <AlignTop size={14} color="#fff" />
                </div>
                
                <div 
                  onClick={() => {
                    if (canvasInstance && canvasInstance.alignElements) {
                      canvasInstance.alignElements('centerV');
                    }
                  }}
                  style={{
                    width: '32px',
                    height: '32px',
                    background: '#333',
                    borderRadius: '4px',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Align Center Vertically"
                >
                  <AlignMiddle size={14} color="#fff" />
                </div>
                
                <div 
                  onClick={() => {
                    if (canvasInstance && canvasInstance.alignElements) {
                      canvasInstance.alignElements('bottom');
                    }
                  }}
                  style={{
                    width: '32px',
                    height: '32px',
                    background: '#333',
                    borderRadius: '4px',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Align Bottom Edges"
                >
                  <AlignBottom size={14} color="#fff" />
                </div>
                
                {/* Separator */}
                <div style={{ width: '1px', height: '20px', backgroundColor: '#444', margin: '0 5px' }}></div>
                
                <span style={{ fontSize: '12px', color: '#888', marginRight: '5px' }}>
                  Distribute:
                </span>
                
                {/* Distribution Controls */}
                <div 
                  onClick={() => {
                    if (canvasInstance && canvasInstance.distributeElements) {
                      canvasInstance.distributeElements('horizontal');
                    }
                  }}
                  style={{
                    width: '32px',
                    height: '32px',
                    background: '#333',
                    borderRadius: '4px',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Distribute Horizontally"
                >
                  <DistributeHorizontal size={14} color="#fff" />
                </div>
                
                <div 
                  onClick={() => {
                    if (canvasInstance && canvasInstance.distributeElements) {
                      canvasInstance.distributeElements('vertical');
                    }
                  }}
                  style={{
                    width: '32px',
                    height: '32px',
                    background: '#333',
                    borderRadius: '4px',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Distribute Vertically"
                >
                  <DistributeVertical size={14} color="#fff" />
                </div>
              </div>

              {/* Canvas Area */}
              <div style={{
                flex: 1,
                padding: '20px'
              }}>
                <TemplateCanvas 
                  ref={canvasRef}
                  selectedTool={selectedTool}
                  onElementSelect={(element) => {
                    console.log('onElementSelect called with:', element);
                    setSelectedElement(element);
                  }}
                  onCanvasReady={(functions) => {
                    console.log('Canvas ready with functions:', functions);
                    setCanvasInstance(functions);
                  }}
                  elements={canvasElements}
                  onElementsChange={(newElements) => {
                    setCanvasElements(newElements);
                    // Update selected element if it exists in the new elements
                    if (selectedElement) {
                      const updated = newElements.find(el => el.id === selectedElement.id);
                      if (updated) {
                        setSelectedElement(updated);
                      }
                    }
                  }}
                  selectedElementId={selectedElement?.id}
                />
              </div>

              {/* Timeline Area */}
              <BroadcastTimeline 
                elements={canvasElements}
                onTimelineUpdate={(update) => {
                  setTimelineState(update);
                  
                  // Apply timeline animation values to canvas elements
                  if (canvasInstance && canvasInstance.updateElementFromTimeline && update.elementId) {
                    canvasInstance.updateElementFromTimeline(update.elementId, update.values);
                  }
                  
                  console.log('Timeline update:', update);
                }}
              />
            </div>

            {/* Right Sidebar - Properties */}
            <div style={{
              width: '420px',
              minWidth: '420px',
              background: '#2a2a2a',
              borderLeft: '1px solid #333',
              overflowY: 'auto'
            }}>
              <PropertiesPanel 
                selectedElement={selectedElement}
                layers={canvasElements}
                onElementsChange={(newElements) => {
                  console.log('PropertiesPanel requesting element reorder:', newElements.map(el => el.id));
                  setCanvasElements(newElements);
                }}
                onUpdateElement={(id, updates) => {
                  console.log('Updating element:', id, updates);
                  
                  // Handle image updates specially to load the image object
                  if (updates.src && !updates.imageObj && !updates.videoElement) {
                    const img = new Image();
                    img.onload = () => {
                      const updatedElement = { ...canvasElements.find(el => el.id === id), ...updates, imageObj: img };
                      setCanvasElements(canvasElements.map(el => 
                        el.id === id ? updatedElement : el
                      ));
                      if (selectedElement && selectedElement.id === id) {
                        setSelectedElement(updatedElement);
                      }
                    };
                    img.src = updates.src;
                  } else {
                    // For video and other updates, apply them directly
                    const currentElement = canvasElements.find(el => el.id === id);
                    const updatedElement = { ...currentElement, ...updates };
                    
                    // Update element in canvas
                    setCanvasElements(prevElements => 
                      prevElements.map(el => el.id === id ? updatedElement : el)
                    );
                    
                    // Update selected element if it's the one being updated
                    if (selectedElement && selectedElement.id === id) {
                      console.log('Updating selected element to:', updatedElement);
                      setSelectedElement(updatedElement);
                    }
                  }
                }}
                onDeleteElement={(id) => {
                  setCanvasElements(canvasElements.filter(el => el.id !== id));
                  setSelectedElement(null);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GraphicsTab;