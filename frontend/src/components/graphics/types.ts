/**
 * Type definitions for the Graphics Template Editor
 */

// Canvas and workspace types
export interface CanvasSize {
  width: number;
  height: number;
}

export interface CanvasSettings {
  size: CanvasSize;
  backgroundColor: string;
  showGrid: boolean;
  gridSize: number;
  snapToGrid: boolean;
  showRulers: boolean;
  showSafeZones: boolean;
}

// Element types
export type ElementType = 
  | 'text' 
  | 'shape' 
  | 'image' 
  | 'video' 
  | 'group'
  | 'chart' 
  | 'qrcode' 
  | 'countdown'
  | 'social';

export type ShapeType = 
  | 'rectangle' 
  | 'circle' 
  | 'ellipse'
  | 'triangle' 
  | 'polygon' 
  | 'pentagon'
  | 'hexagon'
  | 'octagon'
  | 'star' 
  | 'heart'
  | 'cross'
  | 'line' 
  | 'arrow'
  | 'path';

// Base element interface
export interface BaseElement {
  id: string;
  type: ElementType;
  name: string;
  visible: boolean;
  locked: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  zIndex: number;
  blendMode?: string;
  // Advanced Moveable properties
  skewX?: number;
  skewY?: number;
  cornerRadius?: number;
  clipPath?: string;
  warpMatrix?: number[] | null;
  transformOrigin?: string;
}

// Text element
export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: 'normal' | 'italic' | 'oblique';
  textAlign: 'left' | 'center' | 'right' | 'justify';
  lineHeight: number;
  letterSpacing: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textDecoration?: string;
  fill: string | Gradient;
  stroke?: string;
  strokeWidth?: number;
  shadow?: Shadow;
  // New properties
  sizingMode?: 'fixed' | 'auto';  // Fixed: manual width/height, Auto: size based on content
  autoSqueeze?: boolean;  // Compress text to fit boundaries (single-line only)
  textWrap?: boolean;  // Enable/disable text wrapping
  dropShadow?: {
    enabled: boolean;
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
    opacity: number;
  };
  filters?: {
    blur?: number;  // 0-100
    brightness?: number;  // 0-200, 100 is normal
    contrast?: number;  // 0-200, 100 is normal
    grayscale?: number;  // 0-100
    hueRotate?: number;  // 0-360 degrees
    invert?: number;  // 0-100
    saturate?: number;  // 0-200, 100 is normal
    sepia?: number;  // 0-100
  };
}

// Shape element
export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: ShapeType;
  fill: string | Gradient;
  stroke?: string;
  strokeWidth?: number;
  strokeDashArray?: number[];
  shadow?: Shadow;
}

// Image element
export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  filters?: ImageFilter[];
}

// Video element
export interface VideoElement extends BaseElement {
  type: 'video';
  src: string;
  currentTime: number;
  duration: number;
  playing: boolean;
  loop: boolean;
  muted: boolean;
  volume: number;
}

// Group element
export interface GroupElement extends BaseElement {
  type: 'group';
  children: Element[];
}

// Union type for all elements
export type Element = TextElement | ShapeElement | ImageElement | VideoElement | GroupElement;

// Layer management
export interface Layer {
  id: string;
  name: string;
  elements: Element[];
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode?: string;
}

// Animation types
export interface Keyframe {
  time: number;
  value: any;
  easing?: string;
}

// Animation now handled by Scene.js
export interface Animation {
  id: string;
  name: string;
  duration: number;
  keyframes: Record<string, Keyframe[]>;
}

// Unified Konva element for property discovery
export interface KonvaElement {
  id: string;
  type: string;
  name?: string;
  properties: Record<string, any>;
}

// Data binding types
export interface DataBinding {
  elementId: string;
  property: string;
  dataPath: string;
  formatter?: (value: any) => any;
  fallback?: any;
}

export interface DataSource {
  id: string;
  name: string;
  type: 'json' | 'csv' | 'xml' | 'api' | 'websocket';
  url?: string;
  data?: any;
  refreshInterval?: number;
}

// Template types
export interface Template {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  canvas: CanvasSettings;
  layers: Layer[];
  animations: Animation[];
  dataBindings: DataBinding[];
  dataSources: DataSource[];
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

// Project types
export interface Project {
  id: string;
  name: string;
  templates: Template[];
  assets: Asset[];
  settings: ProjectSettings;
}

export interface ProjectSettings {
  defaultCanvas: CanvasSettings;
  exportSettings: ExportSettings;
  autoSave: boolean;
  autoSaveInterval: number;
}

// Asset management
export interface Asset {
  id: string;
  name: string;
  type: 'image' | 'video' | 'font' | 'audio';
  url: string;
  size: number;
  metadata?: Record<string, any>;
  tags?: string[];
}

// Export types
export interface ExportSettings {
  format: 'json' | 'html' | 'png' | 'mp4' | 'gif' | 'svg' | 'pdf';
  resolution: CanvasSize;
  frameRate?: number;
  quality?: number;
  transparency?: boolean;
}

// UI State types
export interface EditorState {
  selectedElementIds: string[];
  selectedLayerId?: string;
  zoom: number;
  panX: number;
  panY: number;
  tool: ToolType;
  showGrid: boolean;
  showRulers: boolean;
  showTimeline: boolean;
  showProperties: boolean;
  showLayers: boolean;
}

export type ToolType = 
  | 'select'
  | 'text'
  | 'shape'
  | 'pen'
  | 'image'
  | 'video'
  | 'hand'
  | 'zoom';

// Helper types
export interface Shadow {
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

export interface Gradient {
  type: 'linear' | 'radial';
  colorStops: ColorStop[];
  angle?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  r1?: number;
  r2?: number;
}

export interface ColorStop {
  offset: number;
  color: string;
}

export interface ImageFilter {
  type: 'brightness' | 'contrast' | 'saturation' | 'blur' | 'hue' | 'sepia' | 'grayscale';
  value: number;
}

// Event types
export interface EditorEvent {
  type: string;
  payload?: any;
  timestamp: number;
}

// History types for undo/redo
export interface HistoryEntry {
  action: string;
  before: any;
  after: any;
  timestamp: number;
}