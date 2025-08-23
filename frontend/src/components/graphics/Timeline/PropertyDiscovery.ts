import { KonvaElement } from '../types';

export interface PropertyDefinition {
  name: string;
  type: 'number' | 'color' | 'boolean' | 'string' | 'array' | 'object';
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: any;
  category?: string;
  animatable: boolean;
}

export class PropertyDiscoverySystem {
  private static instance: PropertyDiscoverySystem;
  private propertyRegistry: Map<string, PropertyDefinition[]> = new Map();

  private constructor() {
    this.initializeCommonProperties();
  }

  static getInstance(): PropertyDiscoverySystem {
    if (!PropertyDiscoverySystem.instance) {
      PropertyDiscoverySystem.instance = new PropertyDiscoverySystem();
    }
    return PropertyDiscoverySystem.instance;
  }

  private initializeCommonProperties() {
    // Transform properties - available for ALL elements
    const transformProps: PropertyDefinition[] = [
      { name: 'x', type: 'number', defaultValue: 0, category: 'Transform', animatable: true },
      { name: 'y', type: 'number', defaultValue: 0, category: 'Transform', animatable: true },
      { name: 'z', type: 'number', defaultValue: 0, category: 'Transform', animatable: true },
      { name: 'rotation', type: 'number', min: -360, max: 360, defaultValue: 0, category: 'Transform', animatable: true },
      { name: 'rotationX', type: 'number', min: -360, max: 360, defaultValue: 0, category: 'Transform', animatable: true },
      { name: 'rotationY', type: 'number', min: -360, max: 360, defaultValue: 0, category: 'Transform', animatable: true },
      { name: 'rotationZ', type: 'number', min: -360, max: 360, defaultValue: 0, category: 'Transform', animatable: true },
      { name: 'scaleX', type: 'number', min: 0, max: 10, step: 0.1, defaultValue: 1, category: 'Transform', animatable: true },
      { name: 'scaleY', type: 'number', min: 0, max: 10, step: 0.1, defaultValue: 1, category: 'Transform', animatable: true },
      { name: 'scaleZ', type: 'number', min: 0, max: 10, step: 0.1, defaultValue: 1, category: 'Transform', animatable: true },
      { name: 'skewX', type: 'number', min: -90, max: 90, defaultValue: 0, category: 'Transform', animatable: true },
      { name: 'skewY', type: 'number', min: -90, max: 90, defaultValue: 0, category: 'Transform', animatable: true },
      { name: 'originX', type: 'number', defaultValue: 0.5, min: 0, max: 1, step: 0.1, category: 'Transform', animatable: true },
      { name: 'originY', type: 'number', defaultValue: 0.5, min: 0, max: 1, step: 0.1, category: 'Transform', animatable: true },
    ];

    // Visual properties - available for ALL elements
    const visualProps: PropertyDefinition[] = [
      { name: 'opacity', type: 'number', min: 0, max: 1, step: 0.01, defaultValue: 1, category: 'Visual', animatable: true },
      { name: 'visible', type: 'boolean', defaultValue: true, category: 'Visual', animatable: true },
      { name: 'zIndex', type: 'number', defaultValue: 0, category: 'Visual', animatable: true },
      { name: 'shadowColor', type: 'color', defaultValue: '#000000', category: 'Shadow', animatable: true },
      { name: 'shadowBlur', type: 'number', min: 0, max: 100, defaultValue: 0, category: 'Shadow', animatable: true },
      { name: 'shadowOffsetX', type: 'number', defaultValue: 0, category: 'Shadow', animatable: true },
      { name: 'shadowOffsetY', type: 'number', defaultValue: 0, category: 'Shadow', animatable: true },
      { name: 'shadowOpacity', type: 'number', min: 0, max: 1, step: 0.01, defaultValue: 1, category: 'Shadow', animatable: true },
    ];

    // Shape properties
    const shapeProps: PropertyDefinition[] = [
      { name: 'width', type: 'number', min: 0, defaultValue: 100, category: 'Size', animatable: true },
      { name: 'height', type: 'number', min: 0, defaultValue: 100, category: 'Size', animatable: true },
      { name: 'fill', type: 'color', defaultValue: '#000000', category: 'Style', animatable: true },
      { name: 'stroke', type: 'color', defaultValue: '#000000', category: 'Style', animatable: true },
      { name: 'strokeWidth', type: 'number', min: 0, max: 100, defaultValue: 1, category: 'Style', animatable: true },
      { name: 'strokeDashArray', type: 'array', defaultValue: [], category: 'Style', animatable: true },
      { name: 'strokeDashOffset', type: 'number', defaultValue: 0, category: 'Style', animatable: true },
      { name: 'cornerRadius', type: 'number', min: 0, defaultValue: 0, category: 'Shape', animatable: true },
      { name: 'topLeftRadius', type: 'number', min: 0, defaultValue: 0, category: 'Shape', animatable: true },
      { name: 'topRightRadius', type: 'number', min: 0, defaultValue: 0, category: 'Shape', animatable: true },
      { name: 'bottomLeftRadius', type: 'number', min: 0, defaultValue: 0, category: 'Shape', animatable: true },
      { name: 'bottomRightRadius', type: 'number', min: 0, defaultValue: 0, category: 'Shape', animatable: true },
    ];

    // Circle/Ellipse specific
    const circleProps: PropertyDefinition[] = [
      { name: 'radius', type: 'number', min: 0, defaultValue: 50, category: 'Shape', animatable: true },
      { name: 'radiusX', type: 'number', min: 0, defaultValue: 50, category: 'Shape', animatable: true },
      { name: 'radiusY', type: 'number', min: 0, defaultValue: 50, category: 'Shape', animatable: true },
    ];

    // Star specific
    const starProps: PropertyDefinition[] = [
      { name: 'innerRadius', type: 'number', min: 0, defaultValue: 25, category: 'Shape', animatable: true },
      { name: 'outerRadius', type: 'number', min: 0, defaultValue: 50, category: 'Shape', animatable: true },
      { name: 'numPoints', type: 'number', min: 3, max: 20, defaultValue: 5, category: 'Shape', animatable: true },
    ];

    // Polygon/Line specific
    const polygonProps: PropertyDefinition[] = [
      { name: 'points', type: 'array', defaultValue: [], category: 'Shape', animatable: true },
      { name: 'tension', type: 'number', min: 0, max: 1, step: 0.1, defaultValue: 0, category: 'Shape', animatable: true },
      { name: 'closed', type: 'boolean', defaultValue: true, category: 'Shape', animatable: true },
      { name: 'bezier', type: 'boolean', defaultValue: false, category: 'Shape', animatable: true },
    ];

    // Text specific properties
    const textProps: PropertyDefinition[] = [
      { name: 'fontSize', type: 'number', min: 1, max: 500, defaultValue: 16, category: 'Text', animatable: true },
      { name: 'fontFamily', type: 'string', defaultValue: 'Arial', category: 'Text', animatable: false },
      { name: 'fontStyle', type: 'string', defaultValue: 'normal', category: 'Text', animatable: false },
      { name: 'fontWeight', type: 'string', defaultValue: 'normal', category: 'Text', animatable: false },
      { name: 'lineHeight', type: 'number', min: 0.5, max: 3, step: 0.1, defaultValue: 1.2, category: 'Text', animatable: true },
      { name: 'letterSpacing', type: 'number', defaultValue: 0, category: 'Text', animatable: true },
      { name: 'wordSpacing', type: 'number', defaultValue: 0, category: 'Text', animatable: true },
      { name: 'textAlign', type: 'string', defaultValue: 'left', category: 'Text', animatable: false },
      { name: 'verticalAlign', type: 'string', defaultValue: 'top', category: 'Text', animatable: false },
      { name: 'textDecoration', type: 'string', defaultValue: 'none', category: 'Text', animatable: false },
      { name: 'textTransform', type: 'string', defaultValue: 'none', category: 'Text', animatable: false },
      { name: 'padding', type: 'number', defaultValue: 0, category: 'Text', animatable: true },
    ];

    // Image/Video specific
    const mediaProps: PropertyDefinition[] = [
      { name: 'cropX', type: 'number', defaultValue: 0, category: 'Crop', animatable: true },
      { name: 'cropY', type: 'number', defaultValue: 0, category: 'Crop', animatable: true },
      { name: 'cropWidth', type: 'number', min: 0, defaultValue: 100, category: 'Crop', animatable: true },
      { name: 'cropHeight', type: 'number', min: 0, defaultValue: 100, category: 'Crop', animatable: true },
      { name: 'brightness', type: 'number', min: -1, max: 1, step: 0.01, defaultValue: 0, category: 'Filters', animatable: true },
      { name: 'contrast', type: 'number', min: -100, max: 100, defaultValue: 0, category: 'Filters', animatable: true },
      { name: 'saturation', type: 'number', min: -100, max: 100, defaultValue: 0, category: 'Filters', animatable: true },
      { name: 'hue', type: 'number', min: -180, max: 180, defaultValue: 0, category: 'Filters', animatable: true },
    ];

    // Video specific
    const videoProps: PropertyDefinition[] = [
      { name: 'playbackRate', type: 'number', min: 0.25, max: 4, step: 0.25, defaultValue: 1, category: 'Video', animatable: true },
      { name: 'currentTime', type: 'number', min: 0, defaultValue: 0, category: 'Video', animatable: true },
      { name: 'volume', type: 'number', min: 0, max: 1, step: 0.01, defaultValue: 1, category: 'Video', animatable: true },
      { name: 'loop', type: 'boolean', defaultValue: false, category: 'Video', animatable: false },
      { name: 'autoplay', type: 'boolean', defaultValue: false, category: 'Video', animatable: false },
    ];

    // Filter properties
    const filterProps: PropertyDefinition[] = [
      { name: 'blur', type: 'number', min: 0, max: 100, defaultValue: 0, category: 'Filters', animatable: true },
      { name: 'grayscale', type: 'number', min: 0, max: 1, step: 0.01, defaultValue: 0, category: 'Filters', animatable: true },
      { name: 'sepia', type: 'number', min: 0, max: 1, step: 0.01, defaultValue: 0, category: 'Filters', animatable: true },
      { name: 'invert', type: 'number', min: 0, max: 1, step: 0.01, defaultValue: 0, category: 'Filters', animatable: true },
      { name: 'pixelSize', type: 'number', min: 1, max: 50, defaultValue: 1, category: 'Filters', animatable: true },
      { name: 'noiseAmount', type: 'number', min: 0, max: 1, step: 0.01, defaultValue: 0, category: 'Filters', animatable: true },
      { name: 'embossStrength', type: 'number', min: 0, max: 10, step: 0.1, defaultValue: 0, category: 'Filters', animatable: true },
      { name: 'embossDirection', type: 'number', min: 0, max: 360, defaultValue: 0, category: 'Filters', animatable: true },
    ];

    // Gradient properties
    const gradientProps: PropertyDefinition[] = [
      { name: 'gradientStartX', type: 'number', defaultValue: 0, category: 'Gradient', animatable: true },
      { name: 'gradientStartY', type: 'number', defaultValue: 0, category: 'Gradient', animatable: true },
      { name: 'gradientEndX', type: 'number', defaultValue: 100, category: 'Gradient', animatable: true },
      { name: 'gradientEndY', type: 'number', defaultValue: 100, category: 'Gradient', animatable: true },
      { name: 'gradientColorStops', type: 'array', defaultValue: [], category: 'Gradient', animatable: true },
      { name: 'gradientType', type: 'string', defaultValue: 'linear', category: 'Gradient', animatable: false },
    ];

    // Register properties by element type
    this.propertyRegistry.set('common', [...transformProps, ...visualProps]);
    this.propertyRegistry.set('rect', [...shapeProps, ...filterProps, ...gradientProps]);
    this.propertyRegistry.set('circle', [...shapeProps, ...circleProps, ...filterProps]);
    this.propertyRegistry.set('ellipse', [...shapeProps, ...circleProps, ...filterProps]);
    this.propertyRegistry.set('star', [...shapeProps, ...starProps, ...filterProps]);
    this.propertyRegistry.set('polygon', [...shapeProps, ...polygonProps, ...filterProps]);
    this.propertyRegistry.set('line', [...polygonProps, ...filterProps]);
    this.propertyRegistry.set('text', [...textProps, ...shapeProps, ...filterProps]);
    this.propertyRegistry.set('image', [...shapeProps, ...mediaProps, ...filterProps]);
    this.propertyRegistry.set('video', [...shapeProps, ...mediaProps, ...videoProps, ...filterProps]);
    this.propertyRegistry.set('group', []);
  }

  discoverProperties(element: KonvaElement): PropertyDefinition[] {
    const commonProps = this.propertyRegistry.get('common') || [];
    const typeProps = this.propertyRegistry.get(element.type) || [];
    
    // Combine common and type-specific properties
    const allProps = [...commonProps, ...typeProps];
    
    // Discover additional properties from the actual element
    const discoveredProps: PropertyDefinition[] = [];
    
    if (element.properties) {
      Object.keys(element.properties).forEach(key => {
        // Check if this property is not already in our registry
        if (!allProps.find(p => p.name === key)) {
          // Auto-detect property type
          const value = element.properties[key];
          let type: PropertyDefinition['type'] = 'string';
          
          if (typeof value === 'number') {
            type = 'number';
          } else if (typeof value === 'boolean') {
            type = 'boolean';
          } else if (Array.isArray(value)) {
            type = 'array';
          } else if (typeof value === 'object' && value !== null) {
            type = 'object';
          } else if (typeof value === 'string' && value.match(/^#[0-9A-Fa-f]{6}$/)) {
            type = 'color';
          }
          
          discoveredProps.push({
            name: key,
            type,
            defaultValue: value,
            category: 'Custom',
            animatable: type !== 'object' // Objects are harder to animate
          });
        }
      });
    }
    
    return [...allProps, ...discoveredProps];
  }

  getAllAnimatableProperties(element: KonvaElement): PropertyDefinition[] {
    return this.discoverProperties(element).filter(p => p.animatable);
  }

  getPropertyByName(element: KonvaElement, propertyName: string): PropertyDefinition | undefined {
    const props = this.discoverProperties(element);
    return props.find(p => p.name === propertyName);
  }

  addCustomProperty(elementType: string, property: PropertyDefinition) {
    const existing = this.propertyRegistry.get(elementType) || [];
    existing.push(property);
    this.propertyRegistry.set(elementType, existing);
  }

  getPropertyValue(element: KonvaElement, propertyName: string): any {
    // First check direct properties
    if (element.properties && propertyName in element.properties) {
      return element.properties[propertyName];
    }
    
    // Check nested properties (e.g., transform.scale.x)
    const parts = propertyName.split('.');
    let value: any = element.properties;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  setPropertyValue(element: KonvaElement, propertyName: string, value: any): KonvaElement {
    const newElement = { ...element };
    
    // Handle nested properties
    const parts = propertyName.split('.');
    
    if (parts.length === 1) {
      // Direct property
      newElement.properties = {
        ...newElement.properties,
        [propertyName]: value
      };
    } else {
      // Nested property
      newElement.properties = { ...newElement.properties };
      let target: any = newElement.properties;
      
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!(part in target)) {
          target[part] = {};
        } else {
          target[part] = { ...target[part] };
        }
        target = target[part];
      }
      
      target[parts[parts.length - 1]] = value;
    }
    
    return newElement;
  }
}