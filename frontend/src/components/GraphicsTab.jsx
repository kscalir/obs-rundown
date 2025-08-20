import React, { useState, useRef, useEffect, useCallback, Suspense, lazy } from 'react';
import { 
  Palette, Folder2Open, Save, Plus, Fonts, Square, Circle,
  Cursor, CursorText, FileEarmarkImage, FileEarmarkPlay, Collection, GridFill,
  Search, DashLg, PlusLg, AlignStart, AlignEnd, AlignCenter, AlignTop, AlignBottom,
  AlignMiddle, DistributeHorizontal, DistributeVertical
} from 'react-bootstrap-icons';
import TemplateCanvas from './graphics/TemplateCanvas';
import PropertiesPanel from './graphics/PropertiesPanel';

const BroadcastTimeline = lazy(() => import('./graphics/BroadcastTimeline'));

const ToolButton = ({ active, title, onClick, children }) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    title={title}
    style={{
      width: '40px',
      height: '40px',
      background: active ? '#4a90e2' : '#333',
      borderRadius: '4px',
      color: '#fff',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: 'none',
      position: 'relative',   // ensure stacking context
      overflow: 'hidden',
    }}
  >
    <span style={{ display: 'inline-flex', pointerEvents: 'none', position: 'relative', zIndex: 1 }}>
      {children}
    </span>
  </button>
);


const GraphicsTab = ({ showId }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [activePanel, setActivePanel] = useState('templates'); // templates, editor, preview
  const [selectedTool, setSelectedTool] = useState('select');
  const [selectedElement, setSelectedElement] = useState(null);
  const [canvasElements, setCanvasElements] = useState([]);
  const canvasRef = useRef();
  const canvasFnsRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [timelineState, setTimelineState] = useState(null);
  
  useEffect(() => {
    if (canvasFnsRef.current?.setZoom) {
      canvasFnsRef.current.setZoom(zoomLevel / 100);
    }
  }, [zoomLevel]);

  const handleTimelineUpdate = useCallback((update) => {
    if (!update?.elementId) return;
    if (canvasFnsRef.current?.updateElementFromTimeline) {
      canvasFnsRef.current.updateElementFromTimeline(update.elementId, update.values);
    }
    setTimelineState(update);
  }, []);
  
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
              {[
                { id: 'select', icon: Cursor, title: 'Select' },
                { id: 'text', icon: CursorText, title: 'Text' },
                { id: 'rect', icon: Square, title: 'Rectangle' },
                { id: 'circle', icon: Circle, title: 'Circle' },
                { id: 'image', icon: FileEarmarkImage, title: 'Image' },
                { id: 'video', icon: FileEarmarkPlay, title: 'Video' },
              ].map(tool => (
                <ToolButton
                  key={tool.id}
                  active={selectedTool === tool.id}
                  title={tool.title}
                  onClick={() => setSelectedTool(tool.id)}
                >
                  <span style={{ pointerEvents: 'none' }}>
                    <tool.icon size={18} />
                  </span>
                </ToolButton>
              ))}
              
              {/* Separator */}
              <div style={{ height: '1px', backgroundColor: '#444', margin: '5px 0' }}></div>
              
              {/* Group/Ungroup buttons */}
              <ToolButton
                title="Group (Ctrl+G)"
                onClick={() => {
                  if (canvasFnsRef.current?.groupSelected) {
                    canvasFnsRef.current.groupSelected();
                  }
                }}
              >
                <Collection size={16} />
              </ToolButton>
              
              <ToolButton
                title="Ungroup (Ctrl+Shift+G)"
                onClick={() => {
                  if (canvasFnsRef.current?.ungroupSelected) {
                    canvasFnsRef.current.ungroupSelected();
                  }
                }}
              >
                <GridFill size={16} />
              </ToolButton>
              
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
                    if (canvasFnsRef.current?.alignElements) {
                      canvasFnsRef.current.alignElements('left');
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
                  <span style={{ pointerEvents: 'none' }}><AlignStart size={14} /></span>
                </div>
                
                <div 
                  onClick={() => {
                    if (canvasFnsRef.current?.alignElements) {
                      canvasFnsRef.current.alignElements('centerH');
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
                  <span style={{ pointerEvents: 'none' }}><AlignCenter size={14} /></span>
                </div>
                
                <div 
                  onClick={() => {
                    if (canvasFnsRef.current?.alignElements) {
                      canvasFnsRef.current.alignElements('right');
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
                  <span style={{ pointerEvents: 'none' }}><AlignEnd size={14} /></span>
                </div>
                
                {/* Separator */}
                <div style={{ width: '1px', height: '20px', backgroundColor: '#444', margin: '0 5px' }}></div>
                
                <div 
                  onClick={() => {
                    if (canvasFnsRef.current?.alignElements) {
                      canvasFnsRef.current.alignElements('top');
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
                  <span style={{ pointerEvents: 'none' }}><AlignTop size={14} /></span>
                </div>
                
                <div 
                  onClick={() => {
                    if (canvasFnsRef.current?.alignElements) {
                      canvasFnsRef.current.alignElements('centerV');
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
                  <span style={{ pointerEvents: 'none' }}><AlignMiddle size={14} /></span>
                </div>
                
                <div 
                  onClick={() => {
                    if (canvasFnsRef.current?.alignElements) {
                      canvasFnsRef.current.alignElements('bottom');
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
                  <span style={{ pointerEvents: 'none' }}><AlignBottom size={14} /></span>
                </div>
                
                {/* Separator */}
                <div style={{ width: '1px', height: '20px', backgroundColor: '#444', margin: '0 5px' }}></div>
                
                <span style={{ fontSize: '12px', color: '#888', marginRight: '5px' }}>
                  Distribute:
                </span>
                
                {/* Distribution Controls */}
                <div 
                  onClick={() => {
                    if (canvasFnsRef.current?.distributeElements) {
                      canvasFnsRef.current.distributeElements('horizontal');
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
                  <span style={{ pointerEvents: 'none' }}><DistributeHorizontal size={14} /></span>
                </div>
                
                <div 
                  onClick={() => {
                    if (canvasFnsRef.current?.distributeElements) {
                      canvasFnsRef.current.distributeElements('vertical');
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
                  <span style={{ pointerEvents: 'none' }}><DistributeVertical size={14} /></span>
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
                    if (process.env.NODE_ENV !== 'production') console.log('onElementSelect called with:', element);
                    setSelectedElement(element);
                  }}
                onCanvasReady={(functions) => {
                    if (process.env.NODE_ENV !== 'production') console.log('Canvas ready with functions:', functions);
                    canvasFnsRef.current = functions;
                }}
                  elements={canvasElements}
                onElementsChange={(newElements) => {
                  setCanvasElements(newElements);
                  setSelectedElement(prev => (prev ? newElements.find(el => el.id === prev.id) ?? null : null));
                }}
                  selectedElementId={selectedElement?.id}
                />
              </div>

              {/* Timeline Area */}
              <Suspense fallback={<div style={{height: 200, background: '#111', borderTop: '1px solid #333', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>Loading timeline…</div>}>
                <BroadcastTimeline 
                  elements={canvasElements}
                  onTimelineUpdate={handleTimelineUpdate}
                />
              </Suspense>
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