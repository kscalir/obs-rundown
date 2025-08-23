import { useEffect, useRef } from 'react';
import Moveable from 'moveable';
import { useEditorStore } from '../state/editorStore';

/**
 * RealtimeMoveableController - Provides real-time transform updates
 * Updates elements during drag/resize/rotate, not just at the end
 */
export const DirectMoveableController: React.FC = () => {
  const moveableRef = useRef<Moveable | null>(null);
  const proxyRef = useRef<HTMLDivElement | null>(null);
  const { selectedElementIds, layers, updateElement, zoom, panX, panY, canvas } = useEditorStore();

  // Store initial values for transformations
  const initialState = useRef<{
    positions: Map<string, { x: number; y: number }>;
    rotations: Map<string, number>;
    sizes: Map<string, { width: number; height: number }>;
    scaleX: Map<string, number>;
    scaleY: Map<string, number>;
  }>({
    positions: new Map(),
    rotations: new Map(),
    sizes: new Map(),
    scaleX: new Map(),
    scaleY: new Map(),
  });

  useEffect(() => {
    // Cleanup previous instance
    if (moveableRef.current) {
      moveableRef.current.destroy();
      moveableRef.current = null;
    }
    
    if (proxyRef.current && proxyRef.current.parentNode) {
      proxyRef.current.remove();
      proxyRef.current = null;
    }

    if (selectedElementIds.length === 0) {
      return;
    }

    // Find the canvas container - more robust selector
    const stage = document.querySelector('.konvajs-content') as HTMLElement;
    if (!stage) {
      console.warn('Konva stage not found');
      return;
    }
    
    // Get the actual canvas container (parent of konvajs-content)
    const canvasContainer = stage.parentElement;
    if (!canvasContainer) {
      console.warn('Canvas container not found');
      return;
    }

    // Get selected element data
    const selectedElements: any[] = [];
    selectedElementIds.forEach(id => {
      layers.forEach(layer => {
        const element = layer.elements.find(el => el.id === id);
        if (element) {
          selectedElements.push(element);
          // Store initial values
          initialState.current.positions.set(id, { x: element.x || 0, y: element.y || 0 });
          initialState.current.rotations.set(id, element.rotation || 0);
          initialState.current.sizes.set(id, { 
            width: element.width || 100, 
            height: element.height || 100 
          });
          initialState.current.scaleX.set(id, element.scaleX || 1);
          initialState.current.scaleY.set(id, element.scaleY || 1);
        }
      });
    });

    if (selectedElements.length === 0) {
      return;
    }

    // Calculate bounding box for all selected elements
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    selectedElements.forEach(element => {
      const x = element.x || 0;
      const y = element.y || 0;
      const width = element.width || 100;
      const height = element.height || 100;
      const rotation = element.rotation || 0;
      const scaleX = element.scaleX || 1;
      const scaleY = element.scaleY || 1;
      
      // For rotated elements, we need to calculate the actual bounding box
      // For simplicity, using the non-rotated bounds for now
      const actualWidth = width * scaleX;
      const actualHeight = height * scaleY;
      
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + actualWidth);
      maxY = Math.max(maxY, y + actualHeight);
    });

    // Create proxy div that represents the selection
    const proxy = document.createElement('div');
    proxy.id = 'moveable-proxy';
    proxy.style.position = 'absolute';
    proxyRef.current = proxy;
    
    // Get canvas position relative to viewport
    const canvasRect = canvasContainer.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    
    // Calculate the actual canvas offset (accounting for centering)
    const offsetX = stageRect.left - canvasRect.left;
    const offsetY = stageRect.top - canvasRect.top;
    
    // Apply zoom and pan to proxy position
    const proxyX = minX * zoom + offsetX + panX * zoom;
    const proxyY = minY * zoom + offsetY + panY * zoom;
    const proxyWidth = (maxX - minX) * zoom;
    const proxyHeight = (maxY - minY) * zoom;
    
    proxy.style.left = `${proxyX}px`;
    proxy.style.top = `${proxyY}px`;
    proxy.style.width = `${proxyWidth}px`;
    proxy.style.height = `${proxyHeight}px`;
    proxy.style.zIndex = '10000';
    
    // Debug visualization (remove in production)
    proxy.style.border = '1px solid rgba(74, 144, 226, 0.5)';
    proxy.style.backgroundColor = 'rgba(74, 144, 226, 0.05)';
    
    canvasContainer.appendChild(proxy);
    
    // Store original bounds for group transformations
    const originalBounds = { 
      minX, 
      minY, 
      width: maxX - minX, 
      height: maxY - minY 
    };
    
    // Collect guidelines from other elements
    const verticalGuidelines: number[] = [];
    const horizontalGuidelines: number[] = [];
    
    layers.forEach(layer => {
      layer.elements.forEach(element => {
        if (!selectedElementIds.includes(element.id)) {
          // Vertical guidelines (x positions)
          verticalGuidelines.push(element.x || 0);
          verticalGuidelines.push((element.x || 0) + (element.width || 100) / 2); // center
          verticalGuidelines.push((element.x || 0) + (element.width || 100));
          
          // Horizontal guidelines (y positions)
          horizontalGuidelines.push(element.y || 0);
          horizontalGuidelines.push((element.y || 0) + (element.height || 100) / 2); // center
          horizontalGuidelines.push((element.y || 0) + (element.height || 100));
        }
      });
    });
    
    // Initialize Moveable with all features
    moveableRef.current = new Moveable(canvasContainer, {
      target: proxy,
      
      // Core features
      draggable: true,
      resizable: true,
      rotatable: true,
      scalable: false, // Using resize instead
      
      // Additional features
      snappable: true,
      snapThreshold: 5,
      snapGridWidth: 10,
      snapGridHeight: 10,
      
      // Guidelines - set in constructor
      verticalGuidelines: verticalGuidelines,
      horizontalGuidelines: horizontalGuidelines,
      elementGuidelines: [], // Auto-detect from elements
      
      // Bounds
      bounds: {
        left: 0,
        top: 0,
        right: canvasRect.width,
        bottom: canvasRect.height
      },
      
      // Options
      keepRatio: false,
      throttleDrag: 0,
      throttleResize: 0,
      throttleRotate: 0,
      
      // UI
      renderDirections: ["nw", "n", "ne", "w", "e", "sw", "s", "se"],
      edge: false,
      origin: true,
      padding: { left: 0, top: 0, right: 0, bottom: 0 },
      
      // Rotation
      rotationPosition: "top",
      rotateAroundControls: true,
    });

    // DRAG HANDLERS
    let dragStartPositions: Map<string, { x: number; y: number }> = new Map();
    
    moveableRef.current
      .on('dragStart', () => {
        // Store starting positions
        selectedElements.forEach(element => {
          dragStartPositions.set(element.id, {
            x: element.x || 0,
            y: element.y || 0
          });
        });
      })
      .on('drag', ({ target, translate }) => {
        // Apply visual transform to proxy
        target.style.transform = `translate(${translate[0]}px, ${translate[1]}px)`;
        
        // Calculate delta in canvas space (accounting for zoom)
        const deltaX = translate[0] / zoom;
        const deltaY = translate[1] / zoom;
        
        // Update all selected elements
        selectedElements.forEach(element => {
          const startPos = dragStartPositions.get(element.id);
          if (startPos) {
            updateElement(element.id, {
              x: startPos.x + deltaX,
              y: startPos.y + deltaY
            });
          }
        });
      })
      .on('dragEnd', ({ target }) => {
        // Clear the transform
        target.style.transform = '';
        
        // Update proxy position to final position
        const currentTransform = new DOMMatrix(target.style.transform);
        const currentLeft = parseFloat(target.style.left) + currentTransform.m41;
        const currentTop = parseFloat(target.style.top) + currentTransform.m42;
        
        target.style.left = `${currentLeft}px`;
        target.style.top = `${currentTop}px`;
        
        dragStartPositions.clear();
      });

    // RESIZE HANDLERS
    let resizeStartState: any = null;
    
    moveableRef.current
      .on('resizeStart', ({ setOrigin, dragStart }) => {
        setOrigin(["%", "%"]);
        
        // Store initial state for all elements
        resizeStartState = {
          bounds: { ...originalBounds },
          elements: selectedElements.map(el => ({
            id: el.id,
            x: el.x || 0,
            y: el.y || 0,
            width: el.width || 100,
            height: el.height || 100,
            scaleX: el.scaleX || 1,
            scaleY: el.scaleY || 1,
          }))
        };
        
        if (dragStart) {
          dragStart.set([0, 0]); // Start with no translation
        }
      })
      .on('resize', ({ target, width, height, drag, direction }) => {
        // Update proxy visual
        target.style.width = `${width}px`;
        target.style.height = `${height}px`;
        
        if (drag) {
          target.style.transform = `translate(${drag.translate[0]}px, ${drag.translate[1]}px)`;
        }
        
        if (!resizeStartState) return;
        
        // Calculate scale factors
        const scaleX = width / zoom / resizeStartState.bounds.width;
        const scaleY = height / zoom / resizeStartState.bounds.height;
        
        // Calculate position offset
        const offsetX = (drag?.translate[0] || 0) / zoom;
        const offsetY = (drag?.translate[1] || 0) / zoom;
        
        // Update all selected elements proportionally
        resizeStartState.elements.forEach((startEl: any) => {
          // Calculate relative position within group
          const relX = startEl.x - resizeStartState.bounds.minX;
          const relY = startEl.y - resizeStartState.bounds.minY;
          
          // Apply scale and reposition
          updateElement(startEl.id, {
            x: resizeStartState.bounds.minX + offsetX + relX * scaleX,
            y: resizeStartState.bounds.minY + offsetY + relY * scaleY,
            width: startEl.width * scaleX,
            height: startEl.height * scaleY,
          });
        });
      })
      .on('resizeEnd', ({ target }) => {
        // Clear transform
        target.style.transform = '';
        resizeStartState = null;
      });

    // ROTATE HANDLERS
    let rotateStartRotations: Map<string, number> = new Map();
    let groupCenterX = 0;
    let groupCenterY = 0;
    
    moveableRef.current
      .on('rotateStart', ({ set }) => {
        // Store starting rotations
        selectedElements.forEach(element => {
          rotateStartRotations.set(element.id, element.rotation || 0);
        });
        
        // Calculate group center
        groupCenterX = originalBounds.minX + originalBounds.width / 2;
        groupCenterY = originalBounds.minY + originalBounds.height / 2;
        
        set(0); // Start from 0 rotation delta
      })
      .on('rotate', ({ target, beforeRotate, absoluteRotate }) => {
        // Apply visual rotation to proxy
        target.style.transform = `rotate(${beforeRotate}deg)`;
        
        // For single selection, just rotate the element
        if (selectedElements.length === 1) {
          const element = selectedElements[0];
          const startRotation = rotateStartRotations.get(element.id) || 0;
          updateElement(element.id, {
            rotation: startRotation + beforeRotate
          });
        } else {
          // For multiple selections, rotate around group center
          selectedElements.forEach(element => {
            const startRotation = rotateStartRotations.get(element.id) || 0;
            
            // Calculate element center
            const elCenterX = (element.x || 0) + (element.width || 100) / 2;
            const elCenterY = (element.y || 0) + (element.height || 100) / 2;
            
            // Rotate position around group center
            const angle = beforeRotate * Math.PI / 180;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            
            const relX = elCenterX - groupCenterX;
            const relY = elCenterY - groupCenterY;
            
            const newRelX = relX * cos - relY * sin;
            const newRelY = relX * sin + relY * cos;
            
            const newX = groupCenterX + newRelX - (element.width || 100) / 2;
            const newY = groupCenterY + newRelY - (element.height || 100) / 2;
            
            updateElement(element.id, {
              x: newX,
              y: newY,
              rotation: startRotation + beforeRotate
            });
          });
        }
      })
      .on('rotateEnd', ({ target }) => {
        // Clear transform
        target.style.transform = '';
        rotateStartRotations.clear();
      });

    // Cleanup
    return () => {
      if (proxyRef.current && proxyRef.current.parentNode) {
        proxyRef.current.remove();
        proxyRef.current = null;
      }
      if (moveableRef.current) {
        moveableRef.current.destroy();
        moveableRef.current = null;
      }
      initialState.current.positions.clear();
      initialState.current.rotations.clear();
      initialState.current.sizes.clear();
      initialState.current.scaleX.clear();
      initialState.current.scaleY.clear();
    };
  }, [selectedElementIds, layers, updateElement, zoom, panX, panY, canvas.size.width, canvas.size.height]);

  return null;
};