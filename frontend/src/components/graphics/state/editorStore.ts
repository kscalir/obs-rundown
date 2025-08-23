import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { 
  EditorState, 
  ToolType, 
  Element, 
  Layer, 
  Template,
  CanvasSettings,
  DataBinding,
  DataSource,
  HistoryEntry,
  KonvaElement
} from '../types';

interface EditorStore extends EditorState {
  // Canvas settings
  canvas: CanvasSettings;
  setCanvasSize: (width: number, height: number) => void;
  setCanvasBackground: (color: string) => void;
  
  // Simplified element access for animation system
  elements: KonvaElement[];
  selectedElements: string[];
  
  // Layers
  layers: Layer[];
  activeLayerId: string | null;
  addLayer: (name?: string) => void;
  deleteLayer: (layerId: string) => void;
  updateLayer: (layerId: string, updates: Partial<Layer>) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;
  setActiveLayer: (layerId: string) => void;
  
  // Elements
  addElement: (element: Element, layerId?: string) => void;
  deleteElement: (elementId: string) => void;
  updateElement: (elementId: string, updates: Partial<Element>) => void;
  duplicateElement: (elementId: string) => void;
  reorderElements: (layerId: string, fromIndex: number, toIndex: number) => void;
  moveElementToLayer: (elementId: string, fromLayerId: string, toLayerId: string, toIndex?: number) => void;
  groupElements: (elementIds: string[]) => void;
  ungroupElement: (groupId: string) => void;
  
  // Selection
  selectElement: (elementId: string, multi?: boolean) => void;
  deselectElement: (elementId: string) => void;
  deselectAll: () => void;
  selectAll: () => void;
  
  // Tool management
  setTool: (tool: ToolType) => void;
  
  // View controls
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  resetView: () => void;
  fitToScreen: () => void;
  
  // UI toggles
  toggleGrid: () => void;
  toggleRulers: () => void;
  toggleTimeline: () => void;
  toggleProperties: () => void;
  toggleLayers: () => void;
  
  
  // Data binding
  dataBindings: DataBinding[];
  dataSources: DataSource[];
  addDataBinding: (binding: DataBinding) => void;
  removeDataBinding: (bindingId: string) => void;
  addDataSource: (source: DataSource) => void;
  removeDataSource: (sourceId: string) => void;
  
  // History (undo/redo)
  history: HistoryEntry[];
  historyIndex: number;
  maxHistorySize: number;
  undo: () => void;
  redo: () => void;
  addToHistory: (entry: HistoryEntry) => void;
  
  // Template management
  currentTemplate: Template | null;
  loadTemplate: (template: Template) => void;
  saveTemplate: () => Template | null;
  clearTemplate: () => void;
}

const defaultCanvas: CanvasSettings = {
  size: { width: 1920, height: 1080 },
  backgroundColor: 'transparent',
  showGrid: true,
  gridSize: 20,
  snapToGrid: true,
  showRulers: true,
  showSafeZones: false
};

const defaultLayer: Layer = {
  id: 'layer-1',
  name: 'Layer 1',
  elements: [],
  visible: true,
  locked: false,
  opacity: 1
};

export const useEditorStore = create<EditorStore>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      selectedElementIds: [],
      selectedLayerId: undefined,
      zoom: 1,
      panX: 0,
      panY: 0,
      tool: 'select',
      showGrid: true,
      showRulers: true,
      showTimeline: true,
      showProperties: true,
      showLayers: true,
      
      // Computed properties for animation system
      get elements(): KonvaElement[] {
        const state = get();
        const allElements: KonvaElement[] = [];
        state.layers.forEach(layer => {
          layer.elements.forEach(element => {
            // Convert Element to KonvaElement format
            const konvaElement: KonvaElement = {
              id: element.id,
              type: element.type,
              name: element.name,
              properties: {
                ...element,
                // Remove non-property fields
                id: undefined,
                type: undefined,
                name: undefined
              }
            };
            // Clean up undefined values
            Object.keys(konvaElement.properties).forEach(key => {
              if (konvaElement.properties[key] === undefined) {
                delete konvaElement.properties[key];
              }
            });
            allElements.push(konvaElement);
          });
        });
        return allElements;
      },
      
      get selectedElements(): string[] {
        const state = get();
        return state.selectedElementIds;
      },
      
      canvas: defaultCanvas,
      layers: [defaultLayer],
      activeLayerId: defaultLayer.id,
      dataBindings: [],
      dataSources: [],
      history: [],
      historyIndex: -1,
      maxHistorySize: 100,
      currentTemplate: null,
      
      // Canvas methods
      setCanvasSize: (width, height) => set((state) => {
        state.canvas.size = { width, height };
      }),
      
      setCanvasBackground: (color) => set((state) => {
        state.canvas.backgroundColor = color;
      }),
      
      // Layer methods
      addLayer: (name) => set((state) => {
        const newLayer: Layer = {
          id: `layer-${Date.now()}`,
          name: name || `Layer ${state.layers.length + 1}`,
          elements: [],
          visible: true,
          locked: false,
          opacity: 1
        };
        state.layers.unshift(newLayer);
        state.activeLayerId = newLayer.id;
      }),
      
      deleteLayer: (layerId) => set((state) => {
        if (state.layers.length <= 1) return; // Keep at least one layer
        
        const index = state.layers.findIndex(l => l.id === layerId);
        if (index !== -1) {
          state.layers.splice(index, 1);
          if (state.activeLayerId === layerId) {
            state.activeLayerId = state.layers[0]?.id || null;
          }
        }
      }),
      
      updateLayer: (layerId, updates) => set((state) => {
        const layer = state.layers.find(l => l.id === layerId);
        if (layer) {
          Object.assign(layer, updates);
        }
      }),
      
      reorderLayers: (fromIndex, toIndex) => set((state) => {
        const [removed] = state.layers.splice(fromIndex, 1);
        state.layers.splice(toIndex, 0, removed);
      }),
      
      setActiveLayer: (layerId) => set((state) => {
        state.activeLayerId = layerId;
      }),
      
      // Element methods
      addElement: (element, layerId) => set((state) => {
        const targetLayerId = layerId || state.activeLayerId;
        const layer = state.layers.find(l => l.id === targetLayerId);
        if (layer) {
          layer.elements.push(element);
          state.selectedElementIds = [element.id];
        }
      }),
      
      deleteElement: (elementId) => set((state) => {
        state.layers.forEach(layer => {
          const index = layer.elements.findIndex(e => e.id === elementId);
          if (index !== -1) {
            layer.elements.splice(index, 1);
          }
        });
        state.selectedElementIds = state.selectedElementIds.filter(id => id !== elementId);
      }),
      
      updateElement: (elementId, updates) => set((state) => {
        for (const layer of state.layers) {
          const element = layer.elements.find(e => e.id === elementId);
          if (element) {
            Object.assign(element, updates);
            break;
          }
        }
      }),
      
      duplicateElement: (elementId) => set((state) => {
        for (const layer of state.layers) {
          const element = layer.elements.find(e => e.id === elementId);
          if (element) {
            const duplicate = {
              ...element,
              id: `${element.type}-${Date.now()}`,
              x: element.x + 20,
              y: element.y + 20,
              name: `${element.name} copy`
            };
            layer.elements.push(duplicate);
            state.selectedElementIds = [duplicate.id];
            break;
          }
        }
      }),

      reorderElements: (layerId, fromIndex, toIndex) => set((state) => {
        const layer = state.layers.find(l => l.id === layerId);
        if (layer && layer.elements[fromIndex]) {
          const element = layer.elements[fromIndex];
          layer.elements.splice(fromIndex, 1);
          layer.elements.splice(toIndex, 0, element);
        }
      }),

      moveElementToLayer: (elementId, fromLayerId, toLayerId, toIndex) => set((state) => {
        const fromLayer = state.layers.find(l => l.id === fromLayerId);
        const toLayer = state.layers.find(l => l.id === toLayerId);
        
        if (fromLayer && toLayer) {
          const elementIndex = fromLayer.elements.findIndex(e => e.id === elementId);
          if (elementIndex !== -1) {
            const element = fromLayer.elements[elementIndex];
            fromLayer.elements.splice(elementIndex, 1);
            
            if (toIndex !== undefined) {
              toLayer.elements.splice(toIndex, 0, element);
            } else {
              toLayer.elements.push(element);
            }
          }
        }
      }),

      groupElements: (elementIds) => set((state) => {
        if (elementIds.length < 2) return;
        
        // Find all selected elements and their layer
        let targetLayer: Layer | undefined;
        const elementsToGroup: Element[] = [];
        
        for (const layer of state.layers) {
          for (const element of layer.elements) {
            if (elementIds.includes(element.id)) {
              elementsToGroup.push(element);
              if (!targetLayer) targetLayer = layer;
            }
          }
        }
        
        if (!targetLayer || elementsToGroup.length < 2) return;
        
        // Calculate group bounds
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        elementsToGroup.forEach(el => {
          minX = Math.min(minX, el.x);
          minY = Math.min(minY, el.y);
          maxX = Math.max(maxX, el.x + el.width);
          maxY = Math.max(maxY, el.y + el.height);
        });
        
        // Create group element
        const group: Element = {
          id: `group-${Date.now()}`,
          type: 'group',
          name: 'Group',
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
          visible: true,
          locked: false,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1,
          zIndex: 0,
          children: elementsToGroup.map(el => ({
            ...el,
            x: el.x - minX,
            y: el.y - minY
          }))
        };
        
        // Remove original elements and add group
        targetLayer.elements = targetLayer.elements.filter(
          el => !elementIds.includes(el.id)
        );
        targetLayer.elements.push(group);
        state.selectedElementIds = [group.id];
      }),

      ungroupElement: (groupId) => set((state) => {
        for (const layer of state.layers) {
          const groupIndex = layer.elements.findIndex(
            el => el.id === groupId && el.type === 'group'
          );
          
          if (groupIndex !== -1) {
            const group = layer.elements[groupIndex] as any;
            if (group.children) {
              // Restore original positions
              const ungroupedElements = group.children.map((child: Element) => ({
                ...child,
                x: child.x + group.x,
                y: child.y + group.y
              }));
              
              // Remove group and add children
              layer.elements.splice(groupIndex, 1);
              layer.elements.push(...ungroupedElements);
              state.selectedElementIds = ungroupedElements.map((el: Element) => el.id);
            }
            break;
          }
        }
      }),
      
      // Selection methods
      selectElement: (elementId, multi = false) => set((state) => {
        if (multi) {
          if (!state.selectedElementIds.includes(elementId)) {
            state.selectedElementIds.push(elementId);
          }
        } else {
          state.selectedElementIds = [elementId];
        }
      }),
      
      deselectElement: (elementId) => set((state) => {
        state.selectedElementIds = state.selectedElementIds.filter(id => id !== elementId);
      }),
      
      deselectAll: () => set((state) => {
        state.selectedElementIds = [];
      }),
      
      selectAll: () => set((state) => {
        const allElementIds: string[] = [];
        state.layers.forEach(layer => {
          if (!layer.locked) {
            layer.elements.forEach(element => {
              if (!element.locked) {
                allElementIds.push(element.id);
              }
            });
          }
        });
        state.selectedElementIds = allElementIds;
      }),
      
      // Tool management
      setTool: (tool) => set((state) => {
        state.tool = tool;
      }),
      
      // View controls
      setZoom: (zoom) => set((state) => {
        state.zoom = Math.max(0.1, Math.min(5, zoom));
      }),
      
      setPan: (x, y) => set((state) => {
        state.panX = x;
        state.panY = y;
      }),
      
      resetView: () => set((state) => {
        state.zoom = 1;
        state.panX = 0;
        state.panY = 0;
      }),
      
      fitToScreen: () => set((state) => {
        // Reset to fit view (will be recalculated by CanvasView)
        state.zoom = 1;
        state.panX = 0;
        state.panY = 0;
      }),
      
      // UI toggles
      toggleGrid: () => set((state) => {
        state.showGrid = !state.showGrid;
        state.canvas.showGrid = !state.canvas.showGrid;
      }),
      
      toggleRulers: () => set((state) => {
        state.showRulers = !state.showRulers;
        state.canvas.showRulers = !state.canvas.showRulers;
      }),
      
      toggleTimeline: () => set((state) => {
        state.showTimeline = !state.showTimeline;
      }),
      
      toggleProperties: () => set((state) => {
        state.showProperties = !state.showProperties;
      }),
      
      toggleLayers: () => set((state) => {
        state.showLayers = !state.showLayers;
      }),
      
      // Data binding methods
      addDataBinding: (binding) => set((state) => {
        state.dataBindings.push(binding);
      }),
      
      removeDataBinding: (bindingId) => set((state) => {
        const index = state.dataBindings.findIndex(b => 
          `${b.elementId}-${b.property}` === bindingId
        );
        if (index !== -1) {
          state.dataBindings.splice(index, 1);
        }
      }),
      
      addDataSource: (source) => set((state) => {
        state.dataSources.push(source);
      }),
      
      removeDataSource: (sourceId) => set((state) => {
        const index = state.dataSources.findIndex(s => s.id === sourceId);
        if (index !== -1) {
          state.dataSources.splice(index, 1);
        }
      }),
      
      // History methods
      undo: () => set((state) => {
        if (state.historyIndex > 0) {
          state.historyIndex--;
          // Apply the undo action
          const entry = state.history[state.historyIndex];
          // Implementation would restore the 'before' state
        }
      }),
      
      redo: () => set((state) => {
        if (state.historyIndex < state.history.length - 1) {
          state.historyIndex++;
          // Apply the redo action
          const entry = state.history[state.historyIndex];
          // Implementation would apply the 'after' state
        }
      }),
      
      addToHistory: (entry) => set((state) => {
        // Remove any history after current index
        state.history = state.history.slice(0, state.historyIndex + 1);
        
        // Add new entry
        state.history.push(entry);
        state.historyIndex++;
        
        // Limit history size
        if (state.history.length > state.maxHistorySize) {
          state.history.shift();
          state.historyIndex--;
        }
      }),
      
      // Template methods
      loadTemplate: (template) => set((state) => {
        state.currentTemplate = template;
        state.canvas = template.canvas;
        state.layers = template.layers;
        state.dataBindings = template.dataBindings;
        state.dataSources = template.dataSources;
        state.activeLayerId = template.layers[0]?.id || null;
        state.selectedElementIds = [];
      }),
      
      saveTemplate: () => {
        const state = get();
        if (!state.currentTemplate) {
          return {
            id: `template-${Date.now()}`,
            name: 'Untitled Template',
            canvas: state.canvas,
            layers: state.layers,
            animations: [], // Scene.js animations will be stored here
            dataBindings: state.dataBindings,
            dataSources: state.dataSources,
            version: '1.0.0',
            createdAt: new Date(),
            updatedAt: new Date()
          };
        }
        
        return {
          ...state.currentTemplate,
          canvas: state.canvas,
          layers: state.layers,
          dataBindings: state.dataBindings,
          dataSources: state.dataSources,
          updatedAt: new Date()
        };
      },
      
      clearTemplate: () => set((state) => {
        state.currentTemplate = null;
        state.canvas = defaultCanvas;
        state.layers = [defaultLayer];
        state.activeLayerId = defaultLayer.id;
        state.dataBindings = [];
        state.dataSources = [];
        state.selectedElementIds = [];
        state.history = [];
        state.historyIndex = -1;
      })
    }))
  )
);