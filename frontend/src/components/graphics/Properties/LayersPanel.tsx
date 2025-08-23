import React from 'react';
import { Eye, EyeSlash, Lock, Unlock, Trash, Plus, Layers, ChevronUp, ChevronDown } from 'react-bootstrap-icons';
import { useEditorStore } from '../state/editorStore';

export const LayersPanel: React.FC = () => {
  const {
    layers,
    activeLayerId,
    selectedElementIds,
    addLayer,
    deleteLayer,
    updateLayer,
    setActiveLayer,
    selectElement,
    deselectAll,
    deleteElement,
    updateElement,
    reorderLayers,
    reorderElements,
    moveElementToLayer
  } = useEditorStore();

  const [editingLayerId, setEditingLayerId] = React.useState<string | null>(null);
  const [editingElementId, setEditingElementId] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState('');
  const [draggedItem, setDraggedItem] = React.useState<{ type: 'layer' | 'element'; id: string; layerId?: string } | null>(null);
  const [dragOverItem, setDragOverItem] = React.useState<{ type: 'layer' | 'element'; id: string } | null>(null);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>
          <Layers size={14} color="currentColor" style={{ marginRight: '6px' }} />
          Layers
        </h3>
        <button
          style={styles.addButton}
          onClick={() => addLayer()}
          title="Add Layer"
        >
          <Plus size={18} color="currentColor" />
        </button>
      </div>

      <div style={styles.layersList}>
        {layers.map((layer, index) => (
          <div key={layer.id}>
            <div
              style={{
                ...styles.layer,
                ...(activeLayerId === layer.id ? styles.layerActive : {})
              }}
              onClick={() => setActiveLayer(layer.id)}
            >
              <div style={styles.layerHeader}>
                {editingLayerId === layer.id ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => {
                      updateLayer(layer.id, { name: editValue });
                      setEditingLayerId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        updateLayer(layer.id, { name: editValue });
                        setEditingLayerId(null);
                      } else if (e.key === 'Escape') {
                        setEditingLayerId(null);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={styles.nameInput}
                    autoFocus
                  />
                ) : (
                  <span 
                    style={styles.layerName} 
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingLayerId(layer.id);
                      setEditValue(layer.name);
                    }}
                  >
                    {layer.name}
                  </span>
                )}
                <div style={styles.layerActions}>
                  <button
                    style={styles.iconButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateLayer(layer.id, { visible: !layer.visible });
                    }}
                    title={layer.visible ? "Hide Layer" : "Show Layer"}
                  >
                    {layer.visible ? <Eye size={14} color="currentColor" /> : <EyeSlash size={14} color="currentColor" />}
                  </button>
                  <button
                    style={styles.iconButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateLayer(layer.id, { locked: !layer.locked });
                    }}
                    title={layer.locked ? "Unlock Layer" : "Lock Layer"}
                  >
                    {layer.locked ? <Lock size={14} color="currentColor" /> : <Unlock size={14} color="currentColor" />}
                  </button>
                  {layers.length > 1 && (
                    <button
                      style={styles.iconButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteLayer(layer.id);
                      }}
                      title="Delete Layer"
                    >
                      <Trash size={14} color="currentColor" />
                    </button>
                  )}
                </div>
              </div>

              {/* Elements in layer */}
              {layer.elements.length > 0 && (
                <div style={styles.elementsList}>
                  {layer.elements.map((element) => (
                    <div
                      key={element.id}
                      style={{
                        ...styles.element,
                        ...(selectedElementIds.includes(element.id) ? styles.elementSelected : {})
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectElement(element.id, e.shiftKey || e.ctrlKey || e.metaKey);
                      }}
                      onMouseEnter={(e) => {
                        const actions = e.currentTarget.querySelector('.element-actions') as HTMLElement;
                        if (actions) actions.style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        const actions = e.currentTarget.querySelector('.element-actions') as HTMLElement;
                        if (actions) actions.style.opacity = '0';
                      }}
                    >
                      <span style={styles.elementType}>{element.type}</span>
                      {editingElementId === element.id ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => {
                            updateElement(element.id, { name: editValue });
                            setEditingElementId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateElement(element.id, { name: editValue });
                              setEditingElementId(null);
                            } else if (e.key === 'Escape') {
                              setEditingElementId(null);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{ ...styles.nameInput, flex: 1 }}
                          autoFocus
                        />
                      ) : (
                        <span 
                          style={styles.elementName}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingElementId(element.id);
                            setEditValue(element.name);
                          }}
                        >
                          {element.name}
                        </span>
                      )}
                      <div className="element-actions" style={styles.elementActions}>
                        {layer.elements.indexOf(element) > 0 && (
                          <button
                            style={styles.iconButton}
                            onClick={(e) => {
                              e.stopPropagation();
                              const index = layer.elements.indexOf(element);
                              reorderElements(layer.id, index, index - 1);
                            }}
                            title="Move Up"
                          >
                            <ChevronUp size={12} color="currentColor" />
                          </button>
                        )}
                        {layer.elements.indexOf(element) < layer.elements.length - 1 && (
                          <button
                            style={styles.iconButton}
                            onClick={(e) => {
                              e.stopPropagation();
                              const index = layer.elements.indexOf(element);
                              reorderElements(layer.id, index, index + 1);
                            }}
                            title="Move Down"
                          >
                            <ChevronDown size={12} color="currentColor" />
                          </button>
                        )}
                        <button
                          style={styles.iconButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteElement(element.id);
                          }}
                          title="Delete Element"
                        >
                          <Trash size={12} color="currentColor" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={styles.footer}>
        <span style={styles.info}>
          {layers.length} layer{layers.length !== 1 ? 's' : ''}, {
            layers.reduce((acc, layer) => acc + layer.elements.length, 0)
          } element{layers.reduce((acc, layer) => acc + layer.elements.length, 0) !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#252525',
    color: '#e0e0e0'
  },
  header: {
    padding: '12px 16px',
    borderBottom: '1px solid #333',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  title: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center'
  },
  addButton: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#1976d2',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    padding: 0,
    outline: 'none'
  },
  layersList: {
    flex: 1,
    overflow: 'auto'
  },
  layer: {
    borderBottom: '1px solid #333',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  layerActive: {
    background: '#2a2a2a'
  },
  layerHeader: {
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  layerName: {
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    userSelect: 'none'
  },
  nameInput: {
    fontSize: '13px',
    fontWeight: 500,
    background: '#333',
    border: '1px solid #1976d2',
    borderRadius: '3px',
    color: '#e0e0e0',
    padding: '2px 6px',
    outline: 'none'
  },
  layerActions: {
    display: 'flex',
    gap: '4px'
  },
  elementsList: {
    paddingLeft: '24px',
    paddingBottom: '4px'
  },
  element: {
    padding: '4px 12px',
    display: 'flex',
    alignItems: 'center',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  elementSelected: {
    background: '#1976d233'
  },
  elementType: {
    fontSize: '10px',
    textTransform: 'uppercase',
    color: '#666',
    marginRight: '8px',
    minWidth: '40px'
  },
  elementName: {
    flex: 1,
    color: '#b0b0b0',
    cursor: 'pointer',
    userSelect: 'none'
  },
  elementActions: {
    display: 'flex',
    gap: '2px',
    opacity: 0,
    transition: 'opacity 0.2s'
  },
  iconButton: {
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    borderRadius: '3px',
    transition: 'all 0.2s',
    padding: '0',
    outline: 'none'
  },
  footer: {
    padding: '8px 12px',
    borderTop: '1px solid #333',
    background: '#1a1a1a'
  },
  info: {
    fontSize: '11px',
    color: '#666'
  }
};