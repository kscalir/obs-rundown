// src/components/graphics/stores/graphicsStore.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// Updated tool types to include all new tools
type Tool = 
  | 'select' 
  | 'hand' 
  | 'text' 
  | 'rect' 
  | 'circle' 
  | 'triangle'
  | 'star'
  | 'hexagon'
  | 'pen'
  | 'image'
  | 'video';

// Updated element types to match tools
type ElementType = 
  | 'rect' 
  | 'circle' 
  | 'triangle'
  | 'star'
  | 'hexagon'
  | 'text' 
  | 'image'
  | 'video'
  | 'path'; // for pen tool

interface Keyframe {
  frame: number;
  value: any;
  easing?: string;
}

interface Element {
  id: string;
  type: ElementType;
  name: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  visible: boolean;
  locked: boolean;
  // For text elements
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  // For image/video elements
  src?: string;
  // For path elements (pen tool)
  points?: { x: number; y: number }[];
  pathData?: string;
  // Animation keyframes
  keyframes?: {
    [property: string]: Keyframe[];
  };
}

interface GraphicsStore {
  // Elements
  elements: Element[];
  selectedElementId: string | null;
  
  // Tools
  activeTool: Tool;
  
  // Timeline
  currentFrame: number;
  isPlaying: boolean;
  fps: number;
  duration: number;
  
  // View
  zoom: number;
  panX: number;
  panY: number;
  
  // History
  history: any[];
  historyIndex: number;
  
  // Clipboard
  clipboard: Element | null;
  
  // Actions
  addElement: (element: Omit<Element, 'id'>) => void;
  updateElement: (id: string, updates: Partial<Element>) => void;
  deleteElement: (id: string) => void;
  selectElement: (id: string | null) => void;
  
  // Tool actions
  setActiveTool: (tool: Tool) => void;
  
  // Timeline actions
  setCurrentFrame: (frame: number) => void;
  setIsPlaying: (playing: boolean) => void;
  
  // View actions
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  
  // History actions
  undo: () => void;
  redo: () => void;
  
  // Clipboard actions
  copy: (id: string) => void;
  paste: () => void;
  
  // Group actions
  groupElements: (ids: string[]) => void;
  ungroupElements: (groupId: string) => void;
  
  // Alignment actions
  alignElements: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  distributeElements: (direction: 'horizontal' | 'vertical') => void;
}

export const useGraphicsStore = create<GraphicsStore>()(
  immer((set, get) => ({
    // Initial state
    elements: [],
    selectedElementId: null,
    activeTool: 'select',
    currentFrame: 0,
    isPlaying: false,
    fps: 30,
    duration: 300,
    zoom: 1,
    panX: 0,
    panY: 0,
    history: [],
    historyIndex: -1,
    clipboard: null,

    // Element actions
    addElement: (element) => set((state) => {
      const id = `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newElement: Element = {
        ...element,
        id,
        name: element.name || `${element.type}_${state.elements.length + 1}`,
      };
      state.elements.push(newElement);
      state.selectedElementId = id;
    }),

    updateElement: (id, updates) => set((state) => {
      const index = state.elements.findIndex(el => el.id === id);
      if (index !== -1) {
        Object.assign(state.elements[index], updates);
      }
    }),

    deleteElement: (id) => set((state) => {
      state.elements = state.elements.filter(el => el.id !== id);
      if (state.selectedElementId === id) {
        state.selectedElementId = null;
      }
    }),

    selectElement: (id) => set((state) => {
      state.selectedElementId = id;
    }),

    // Tool actions
    setActiveTool: (tool) => set((state) => {
      state.activeTool = tool;
      // Deselect when switching to drawing tools
      if (tool !== 'select' && tool !== 'hand') {
        state.selectedElementId = null;
      }
    }),

    // Timeline actions
    setCurrentFrame: (frame) => set((state) => {
      state.currentFrame = Math.max(0, Math.min(frame, state.duration));
    }),

    setIsPlaying: (playing) => set((state) => {
      state.isPlaying = playing;
    }),

    // View actions
    setZoom: (zoom) => set((state) => {
      state.zoom = Math.max(0.1, Math.min(5, zoom));
    }),

    setPan: (x, y) => set((state) => {
      state.panX = x;
      state.panY = y;
    }),

    // History actions
    undo: () => set((state) => {
      if (state.historyIndex > 0) {
        state.historyIndex--;
        // Apply history state
      }
    }),

    redo: () => set((state) => {
      if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        // Apply history state
      }
    }),

    // Clipboard actions
    copy: (id) => set((state) => {
      const element = state.elements.find(el => el.id === id);
      if (element) {
        state.clipboard = { ...element };
      }
    }),

    paste: () => set((state) => {
      if (state.clipboard) {
        const newElement = {
          ...state.clipboard,
          id: `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          x: state.clipboard.x + 20,
          y: state.clipboard.y + 20,
          name: `${state.clipboard.name}_copy`,
        };
        state.elements.push(newElement);
        state.selectedElementId = newElement.id;
      }
    }),

    // Group actions
    groupElements: (ids) => set((state) => {
      // Implementation for grouping elements
      console.log('Grouping elements:', ids);
    }),

    ungroupElements: (groupId) => set((state) => {
      // Implementation for ungrouping elements
      console.log('Ungrouping:', groupId);
    }),

    // Alignment actions
    alignElements: (alignment) => set((state) => {
      // Implementation for aligning selected elements
      console.log('Aligning:', alignment);
    }),

    distributeElements: (direction) => set((state) => {
      // Implementation for distributing selected elements
      console.log('Distributing:', direction);
    }),
  }))
);