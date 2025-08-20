import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Text, Circle, Ellipse, Image as KonvaImage, Transformer, Group } from 'react-konva';
import Konva from 'konva';
import TextAnimationComponent from './TextAnimationComponent';

// Create transparency checkerboard pattern
const createTransparencyPattern = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 20;
  canvas.height = 20;
  const ctx = canvas.getContext('2d');
  
  // Light gray squares
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, 10, 10);
  ctx.fillRect(10, 10, 10, 10);
  
  // Darker gray squares
  ctx.fillStyle = '#e0e0e0';
  ctx.fillRect(10, 0, 10, 10);
  ctx.fillRect(0, 10, 10, 10);
  
  return canvas;
};

const transparencyPattern = createTransparencyPattern();

const TemplateCanvas = ({ 
  selectedTool, 
  onElementSelect, 
  elements = [], 
  onElementsChange,
  selectedElementId,
  onGroupElements,
  onUngroupElement,
  onCanvasReady
}) => {
  const [selectedId, setSelectedId] = useState(selectedElementId || null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [startPos, setStartPos] = useState(null);
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const stageRef = useRef();
  const layerRef = useRef();
  const transformerRef = useRef();
  
  // Function to calculate optimal font size for text to fit within bounds
  const calculateOptimalFontSize = (text, fontFamily, width, height, minSize, maxSize, lineHeight = 1.2) => {
    // Create a temporary canvas to measure text
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    let fontSize = maxSize;
    let bestFontSize = minSize;
    
    // Binary search for optimal font size
    let low = minSize;
    let high = maxSize;
    
    while (low <= high) {
      fontSize = Math.floor((low + high) / 2);
      ctx.font = `${fontSize}px ${fontFamily}`;
      
      // Split text into words for wrapping
      const words = text.split(' ');
      const lines = [];
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width <= width) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            // Single word is too long, force it
            lines.push(word);
            currentLine = '';
          }
        }
      }
      
      if (currentLine) {
        lines.push(currentLine);
      }
      
      // Calculate total height
      const totalHeight = lines.length * fontSize * lineHeight;
      
      // Check if text fits within bounds
      const fitsWidth = lines.every(line => {
        ctx.font = `${fontSize}px ${fontFamily}`;
        return ctx.measureText(line).width <= width;
      });
      
      const fitsHeight = totalHeight <= height;
      
      if (fitsWidth && fitsHeight) {
        bestFontSize = fontSize;
        low = fontSize + 1; // Try larger
      } else {
        high = fontSize - 1; // Try smaller
      }
    }
    
    return Math.max(bestFontSize, minSize);
  };
  
  // Group/Ungroup functions
  const groupSelectedElements = () => {
    if (selectedIds.length < 2) return;
    
    const groupId = `group-${Date.now()}`;
    const elementsToGroup = elements.filter(el => selectedIds.includes(el.id));
    const otherElements = elements.filter(el => !selectedIds.includes(el.id));
    
    // Calculate group bounds
    const bounds = elementsToGroup.reduce((acc, el) => {
      const elRight = el.x + (el.width || el.radiusX * 2 || 50);
      const elBottom = el.y + (el.height || el.radiusY * 2 || 50);
      
      return {
        left: Math.min(acc.left, el.x),
        top: Math.min(acc.top, el.y),
        right: Math.max(acc.right, elRight),
        bottom: Math.max(acc.bottom, elBottom)
      };
    }, { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
    
    // Create group element
    const groupElement = {
      id: groupId,
      type: 'group',
      x: bounds.left,
      y: bounds.top,
      width: bounds.right - bounds.left,
      height: bounds.bottom - bounds.top,
      draggable: true,
      children: elementsToGroup.map(el => ({
        ...el,
        x: el.x - bounds.left,
        y: el.y - bounds.top
      }))
    };
    
    const newElements = [...otherElements, groupElement];
    console.log('New elements after grouping:', newElements);
    
    onElementsChange(newElements);
    
    // Select the new group
    setSelectedId(groupId);
    setSelectedIds([]);
    console.log('Group created with ID:', groupId);
    
    const groupElementForCallback = newElements.find(el => el.id === groupId);
    if (onElementSelect) {
      onElementSelect(groupElementForCallback, {
        groupSelected: groupSelectedElements,
        ungroupSelected: ungroupSelectedElement
      });
    }
    console.log('=== END GROUP SELECTED ELEMENTS ===');
    
    // Call parent callback if provided
    if (onGroupElements) {
      onGroupElements(groupId, elementsToGroup);
    }
  };
  
  const ungroupSelectedElement = () => {
    console.log('=== UNGROUP SELECTED ELEMENT ===');
    console.log('selectedId:', selectedId);
    
    if (!selectedId) {
      console.log('No element selected for ungrouping');
      return;
    }
    
    const groupElement = elements.find(el => el.id === selectedId);
    console.log('Found element:', groupElement);
    
    if (!groupElement || groupElement.type !== 'group') {
      console.log('Selected element is not a group');
      return;
    }
    
    // Convert children back to absolute positions
    const ungroupedElements = groupElement.children.map(child => ({
      ...child,
      x: child.x + groupElement.x,
      y: child.y + groupElement.y
    }));
    
    const otherElements = elements.filter(el => el.id !== selectedId);
    const newElements = [...otherElements, ...ungroupedElements];
    
    onElementsChange(newElements);
    
    // Clear all selections after ungrouping - let user select individually
    setSelectedIds([]);
    setSelectedId(null);
    
    console.log('Ungrouped elements:', ungroupedElements);
    console.log('=== END UNGROUP SELECTED ELEMENT ===');
    
    // Call parent callback if provided
    if (onUngroupElement) {
      onUngroupElement(selectedId, ungroupedElements);
    }
  };
  
  // Function to refresh auto-sizing for all text elements
  const refreshAllTextAutoSizing = () => {
    const updatedElements = elements.map(element => {
      if (element.type === 'text' && element.autoSize) {
        const optimalSize = calculateOptimalFontSize(
          element.text || 'Sample Text',
          element.fontFamily || 'Arial',
          element.width || 200,
          element.height || 100,
          element.minFontSize || 8,
          element.maxFontSize || 48,
          element.lineHeight || 1.2
        );
        
        console.log('Refreshing auto-size for element:', element.id, 'from', element.fontSize, 'to', optimalSize);
        return { ...element, fontSize: optimalSize };
      }
      return element;
    });
    
    onElementsChange(updatedElements);
  };

  // Create refs for the grouping functions to access current state
  const stateRef = useRef();
  stateRef.current = { selectedIds, selectedId, elements };
  
  // Expose grouping functions to parent ONLY on mount
  useEffect(() => {
    console.log('Canvas mounted, exposing functions');
    if (onCanvasReady) {
      onCanvasReady({
        setZoom: (zoomLevel) => {
          setScale(zoomLevel);
          // Reset position when zoom changes
          setStagePos({ x: 0, y: 0 });
        },
        groupSelected: () => {
          const { selectedIds: currentSelectedIds, elements: currentElements } = stateRef.current;
          console.log('Group button clicked, current selectedIds:', currentSelectedIds);
          if (currentSelectedIds.length < 2) {
            console.log('Not enough elements selected for grouping');
            return;
          }
          
          const groupId = `group-${Date.now()}`;
          const elementsToGroup = currentElements.filter(el => currentSelectedIds.includes(el.id));
          const otherElements = currentElements.filter(el => !currentSelectedIds.includes(el.id));
          
          // Calculate group bounds
          const bounds = elementsToGroup.reduce((acc, el) => {
            const elRight = el.x + (el.width || el.radiusX * 2 || 50);
            const elBottom = el.y + (el.height || el.radiusY * 2 || 50);
            
            return {
              left: Math.min(acc.left, el.x),
              top: Math.min(acc.top, el.y),
              right: Math.max(acc.right, elRight),
              bottom: Math.max(acc.bottom, elBottom)
            };
          }, { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
          
          // Create group element
          const groupElement = {
            id: groupId,
            type: 'group',
            x: bounds.left,
            y: bounds.top,
            width: bounds.right - bounds.left,
            height: bounds.bottom - bounds.top,
            draggable: true,
            children: elementsToGroup.map(el => ({
              ...el,
              x: el.x - bounds.left,
              y: el.y - bounds.top
            }))
          };
          
          const newElements = [...otherElements, groupElement];
          console.log('New elements after grouping:', newElements);
          
          onElementsChange(newElements);
          
          // Select the new group
          setSelectedId(groupId);
          setSelectedIds([]);
          console.log('Group created with ID:', groupId);
        },
        ungroupSelected: () => {
          const { selectedId: currentSelectedId, elements: currentElements } = stateRef.current;
          console.log('Ungroup button clicked, current selectedId:', currentSelectedId);
          
          if (!currentSelectedId) {
            console.log('No element selected for ungrouping');
            return;
          }
          
          const groupElement = currentElements.find(el => el.id === currentSelectedId);
          console.log('Found element:', groupElement);
          
          if (!groupElement || groupElement.type !== 'group') {
            console.log('Selected element is not a group');
            return;
          }
          
          // Convert children back to absolute positions
          const ungroupedElements = groupElement.children.map(child => ({
            ...child,
            x: child.x + groupElement.x,
            y: child.y + groupElement.y
          }));
          
          const otherElements = currentElements.filter(el => el.id !== currentSelectedId);
          const newElements = [...otherElements, ...ungroupedElements];
          
          onElementsChange(newElements);
          
          // Clear all selections after ungrouping - let user select individually
          setSelectedIds([]);
          setSelectedId(null);
          
          console.log('Ungrouped elements:', ungroupedElements);
          console.log('Cleared selection after ungrouping');
        },
        alignElements: (alignment) => {
          const { selectedIds: currentSelectedIds, elements: currentElements } = stateRef.current;
          
          if (currentSelectedIds.length < 2) {
            console.log('Need at least 2 elements selected for alignment');
            return;
          }
          
          const selectedElements = currentElements.filter(el => currentSelectedIds.includes(el.id));
          console.log('Aligning elements:', alignment, selectedElements.map(el => el.id));
          
          // Calculate bounds for alignment reference
          let referenceValue;
          
          switch (alignment) {
            case 'left':
              referenceValue = Math.min(...selectedElements.map(el => el.x));
              break;
            case 'right':
              referenceValue = Math.max(...selectedElements.map(el => el.x + (el.width || 100)));
              break;
            case 'top':
              referenceValue = Math.min(...selectedElements.map(el => el.y));
              break;
            case 'bottom':
              referenceValue = Math.max(...selectedElements.map(el => el.y + (el.height || 100)));
              break;
            case 'centerH':
              const leftMost = Math.min(...selectedElements.map(el => el.x));
              const rightMost = Math.max(...selectedElements.map(el => el.x + (el.width || 100)));
              referenceValue = leftMost + (rightMost - leftMost) / 2;
              break;
            case 'centerV':
              const topMost = Math.min(...selectedElements.map(el => el.y));
              const bottomMost = Math.max(...selectedElements.map(el => el.y + (el.height || 100)));
              referenceValue = topMost + (bottomMost - topMost) / 2;
              break;
          }
          
          // Apply alignment to each selected element
          const alignedElements = currentElements.map(element => {
            if (!currentSelectedIds.includes(element.id)) return element;
            
            let newX = element.x;
            let newY = element.y;
            
            switch (alignment) {
              case 'left':
                newX = referenceValue;
                break;
              case 'right':
                newX = referenceValue - (element.width || 100);
                break;
              case 'top':
                newY = referenceValue;
                break;
              case 'bottom':
                newY = referenceValue - (element.height || 100);
                break;
              case 'centerH':
                newX = referenceValue - (element.width || 100) / 2;
                break;
              case 'centerV':
                newY = referenceValue - (element.height || 100) / 2;
                break;
            }
            
            return { ...element, x: newX, y: newY };
          });
          
          onElementsChange(alignedElements);
          console.log('Elements aligned:', alignment);
        },
        distributeElements: (direction) => {
          const { selectedIds: currentSelectedIds, elements: currentElements } = stateRef.current;
          
          if (currentSelectedIds.length < 3) {
            console.log('Need at least 3 elements selected for distribution');
            return;
          }
          
          const selectedElements = currentElements.filter(el => currentSelectedIds.includes(el.id));
          console.log('Distributing elements:', direction, selectedElements.map(el => el.id));
          
          // Sort elements by position
          const sortedElements = [...selectedElements].sort((a, b) => {
            if (direction === 'horizontal') {
              return a.x - b.x;
            } else {
              return a.y - b.y;
            }
          });
          
          // Calculate total space and spacing
          const first = sortedElements[0];
          const last = sortedElements[sortedElements.length - 1];
          
          let totalSpace, elementSizes;
          if (direction === 'horizontal') {
            totalSpace = (last.x + (last.width || 100)) - first.x;
            elementSizes = sortedElements.reduce((sum, el) => sum + (el.width || 100), 0);
          } else {
            totalSpace = (last.y + (last.height || 100)) - first.y;
            elementSizes = sortedElements.reduce((sum, el) => sum + (el.height || 100), 0);
          }
          
          const availableSpace = totalSpace - elementSizes;
          const spacing = availableSpace / (sortedElements.length - 1);
          
          // Apply distribution
          let currentPosition = direction === 'horizontal' ? first.x : first.y;
          
          const distributedElements = currentElements.map(element => {
            const sortedIndex = sortedElements.findIndex(el => el.id === element.id);
            if (sortedIndex === -1) return element;
            
            if (sortedIndex === 0) return element; // Keep first element in place
            
            let newX = element.x;
            let newY = element.y;
            
            if (direction === 'horizontal') {
              // Add size of previous element plus spacing
              const prevElement = sortedElements[sortedIndex - 1];
              currentPosition += (prevElement.width || 100) + spacing;
              newX = currentPosition;
            } else {
              // Add size of previous element plus spacing  
              const prevElement = sortedElements[sortedIndex - 1];
              currentPosition += (prevElement.height || 100) + spacing;
              newY = currentPosition;
            }
            
            return { ...element, x: newX, y: newY };
          });
          
          onElementsChange(distributedElements);
          console.log('Elements distributed:', direction);
        },
        refreshTextAutoSizing: refreshAllTextAutoSizing,
        updateElementFromTimeline: (elementId, theatreValues) => {
          console.log('Updating element from Theatre.js:', elementId, theatreValues);
          
          const currentElements = stateRef.current.elements;
          const updatedElements = currentElements.map(element => {
            if (element.id === elementId) {
              return {
                ...element,
                ...theatreValues
              };
            }
            return element;
          });
          
          onElementsChange(updatedElements);
        }
      });
    }
  }, []); // Empty dependency array - only run once on mount
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'g' && selectedIds.length >= 2) {
          e.preventDefault();
          groupSelectedElements();
        } else if (e.key === 'g' && e.shiftKey && selectedId) {
          e.preventDefault();
          ungroupSelectedElement();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, selectedId, elements]);
  
  // Canvas dimensions (16:9 aspect ratio)
  const [stageSize, setStageSize] = useState({ width: 960, height: 540 });
  const containerRef = useRef();
  
  // Update stage size based on container
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const container = containerRef.current;
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;
        
        // Calculate size maintaining 16:9 aspect ratio
        let width = containerWidth;
        let height = (containerWidth * 9) / 16;
        
        if (height > containerHeight) {
          height = containerHeight;
          width = (containerHeight * 16) / 9;
        }
        
        setStageSize({ width, height });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  
  // Update transformer when selection changes
  useEffect(() => {
    if (transformerRef.current && layerRef.current) {
      const nodes = [];
      
      // Handle multi-selection
      if (selectedIds.length > 0) {
        selectedIds.forEach(id => {
          const node = layerRef.current.findOne(`#${id}`);
          if (node) nodes.push(node);
        });
      }
      // Handle single selection
      else if (selectedElementId) {
        const selectedNode = layerRef.current.findOne(`#${selectedElementId}`);
        if (selectedNode) nodes.push(selectedNode);
      }
      
      setTimeout(() => {
        if (transformerRef.current) {
          transformerRef.current.nodes(nodes);
          const layer = transformerRef.current.getLayer();
          if (layer) {
            layer.batchDraw();
          }
        }
      }, 0);
    }
  }, [selectedElementId, selectedIds, elements]);
  
  // Sync internal selectedId with prop
  useEffect(() => {
    setSelectedId(selectedElementId);
  }, [selectedElementId]);
  
  // Handle stage click (for adding elements or deselecting)
  const handleStageClick = (e) => {
    console.log('=== STAGE CLICK ===');
    console.log('Target:', e.target.constructor.name);
    console.log('Selected tool:', selectedTool);
    console.log('Elements array:', elements);
    console.log('onElementsChange function:', onElementsChange);
    
    // Check if clicked on stage background (not on a shape)
    const clickedOnEmpty = e.target === e.target.getStage();
    console.log('Clicked on empty stage:', clickedOnEmpty);
    
    if (clickedOnEmpty) {
      // Add new element based on selected tool
      const stage = stageRef.current;
      const pointerPosition = getTransformedPointerPosition(stage);
      console.log('Pointer position:', pointerPosition);
      
      if (selectedTool && selectedTool !== 'select' && pointerPosition) {
        console.log('Attempting to create element...');
        const newElement = createNewElement(selectedTool, pointerPosition);
        console.log('Created element:', newElement);
        
        if (newElement && onElementsChange) {
          console.log('Calling onElementsChange with:', [...elements, newElement]);
          onElementsChange([...elements, newElement]);
          setSelectedId(newElement.id);
          setSelectedIds([]);
          if (onElementSelect) {
            onElementSelect(newElement, {
              groupSelected: groupSelectedElements,
              ungroupSelected: ungroupSelectedElement
            });
          }
        } else {
          console.log('Failed to create element or no onElementsChange callback');
        }
      } else {
        console.log('Not creating element - tool:', selectedTool, 'position:', pointerPosition);
        
        if (selectedTool === 'select') {
          // Clear all selections if not holding Shift and using select tool
          if (!e.evt.shiftKey) {
            setSelectedId(null);
            setSelectedIds([]);
            if (transformerRef.current) {
              transformerRef.current.nodes([]);
            }
          }
        }
      }
    }
    console.log('=== END STAGE CLICK ===');
  };
  
  // Helper function to get properly transformed pointer position
  const getTransformedPointerPosition = (stage) => {
    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return null;
    
    // Transform the pointer position to account for stage pan and zoom
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    return transform.point(pointerPosition);
  };

  // Handle stage mouse down for selection box
  const handleStageMouseDown = (e) => {
    console.log('Mouse down on:', e.target.constructor.name, 'Selected tool:', selectedTool);
    
    // Check if we're clicking on empty stage
    if (e.target === e.target.getStage()) {
      // If zoomed in and holding space or middle mouse, allow panning
      if (scale > 1 && (e.evt.button === 1 || e.evt.which === 2 || e.evt.spaceKey)) {
        // Let Konva handle stage dragging for panning
        return;
      }
      
      // If using select tool, start drag selection
      if (selectedTool === 'select') {
        console.log('Starting drag selection');
        e.evt.preventDefault();
        const pos = getTransformedPointerPosition(e.target.getStage());
        if (pos) {
          setStartPos(pos);
          setIsSelecting(true);
          setSelectionRect({
            x: pos.x,
            y: pos.y,
            width: 0,
            height: 0
          });
        }
      }
      // For other tools, element creation will be handled in mouse up
    }
  };
  
  // Handle stage mouse move for selection box
  const handleStageMouseMove = (e) => {
    if (!isSelecting || !startPos) return;
    
    e.evt.preventDefault();
    const stage = e.target.getStage();
    const pos = getTransformedPointerPosition(stage);
    
    if (pos) {
      const newRect = {
        x: Math.min(startPos.x, pos.x),
        y: Math.min(startPos.y, pos.y),
        width: Math.abs(pos.x - startPos.x),
        height: Math.abs(pos.y - startPos.y)
      };
      
      setSelectionRect(newRect);
    }
  };
  
  // Handle stage mouse up for selection box
  const handleStageMouseUp = (e) => {
    console.log('Mouse up, isSelecting:', isSelecting, 'selection rect:', selectionRect);
    
    if (isSelecting) {
      const wasActualDrag = selectionRect.width > 5 || selectionRect.height > 5;
      
      if (wasActualDrag) {
        e.evt.preventDefault();
        
        // Find elements within selection rectangle
        const selectedElementIds = elements
          .filter(element => {
            const elementRight = element.x + (element.width || element.radiusX * 2 || 50);
            const elementBottom = element.y + (element.height || element.radiusY * 2 || 50);
            const selectionRight = selectionRect.x + selectionRect.width;
            const selectionBottom = selectionRect.y + selectionRect.height;
            
            return (
              element.x >= selectionRect.x &&
              element.y >= selectionRect.y &&
              elementRight <= selectionRight &&
              elementBottom <= selectionBottom
            );
          })
          .map(element => element.id);
        
        console.log('Found elements in selection:', selectedElementIds);
        if (selectedElementIds.length > 0) {
          if (e.evt && e.evt.shiftKey) {
            // Add to existing selection
            setSelectedIds(prev => [...new Set([...prev, ...selectedElementIds])]);
          } else {
            // Replace selection
            setSelectedIds(selectedElementIds);
            setSelectedId(null);
          }
        }
      } else {
        // Was a click, not a drag - handle as normal click
        handleStageClick(e);
      }
      
      setIsSelecting(false);
      setSelectionRect({ x: 0, y: 0, width: 0, height: 0 });
      setStartPos(null);
    } else {
      // Handle regular click - this includes element creation
      handleStageClick(e);
    }
  };
  
  // Create new element based on tool type
  const createNewElement = (tool, position) => {
    const id = `element-${Date.now()}`;
    const baseProps = {
      id,
      x: position.x,
      y: position.y,
      draggable: true,
    };
    
    switch (tool) {
      case 'text':
        return {
          ...baseProps,
          type: 'text',
          text: 'New Text',
          fontSize: 24,
          fontFamily: 'Arial',
          fill: '#ffffff',
          stroke: undefined, // Text stroke color
          strokeWidth: 0, // Text stroke width
          letterSpacing: 0, // Letter spacing (kerning)
          lineHeight: 1.2, // Line height multiplier for multi-line text
          opacity: 1, // Text opacity
          width: 200,
          height: 100, // Height constraint for text box
          // Auto-sizing properties
          autoSize: false, // Whether to auto-size text to fit bounds
          minFontSize: 8, // Minimum font size when auto-sizing
          maxFontSize: 48, // Maximum font size when auto-sizing
          constrainWidth: false, // Whether to constrain text within width
          constrainHeight: false, // Whether to constrain text within height
          wrap: 'word', // Text wrapping: 'none', 'word', 'char'
          // Text effects
          effects: {
            shadow: {
              enabled: false,
              color: '#000000',
              offsetX: 2,
              offsetY: 2,
              blur: 4,
              opacity: 0.7
            },
            stroke: {
              enabled: false,
              color: '#ffffff',
              width: 2
            },
            glow: {
              enabled: false,
              color: '#ffffff',
              blur: 8,
              opacity: 0.8
            }
          },
          // Text animations
          animation: {
            preset: 'none', // 'none|lower-third|breaking-news|title-card|sports-score|typewriter|slide-up|slide-down|zoom-in|rotate-in|flip-in'
            trigger: 'auto', // 'auto|manual|in|out|stop'
            duration: 1000, // Animation duration in ms
            loop: false, // Whether to loop the animation
            autoStart: true, // Auto-start animation
            minDisplayTime: 2000 // Minimum time to display before allowing out animation
          }
        };
      case 'rect':
        return {
          ...baseProps,
          type: 'rect',
          width: 100,
          height: 100,
          fill: '#4a90e2',
          fillGradient: false, // Whether to use gradient fill
          fillGradientStart: '#4a90e2', // Gradient start color
          fillGradientEnd: '#2c5aa0', // Gradient end color
          fillGradientAngle: 0, // Gradient angle (0-360)
          opacity: 1, // Default to fully opaque
          stroke: '#ffffff',
          strokeWidth: 2,
          cornerRadius: 0, // Corner radius for rounded rectangles
        };
      case 'circle':
        return {
          ...baseProps,
          type: 'circle',
          radiusX: 50,
          radiusY: 50,
          fill: '#e74c3c',
          fillGradient: false, // Whether to use gradient fill
          fillGradientStart: '#e74c3c', // Gradient start color
          fillGradientEnd: '#c0392b', // Gradient end color
          fillGradientAngle: 0, // Gradient angle (0-360) - for linear gradient option
          opacity: 1, // Default to fully opaque
          stroke: '#ffffff',
          strokeWidth: 2,
        };
      case 'image':
        // For image, we'll need to handle file upload
        // For now, create a placeholder
        return {
          ...baseProps,
          type: 'image',
          width: 200,
          height: 150,
          src: null, // Will be set when image is selected
          opacity: 1, // Default to fully opaque
          borderWidth: 0, // Default no border
          borderColor: '#ffffff', // Default border color
          borderGradient: false, // Whether to use gradient
          borderGradientStart: '#ffffff', // Gradient start color
          borderGradientEnd: '#000000', // Gradient end color
          borderGradientAngle: 0, // Gradient angle (0-360)
          // Crop properties (as percentages from each edge)
          cropLeft: 0, // Crop from left edge (0-100%)
          cropRight: 0, // Crop from right edge (0-100%)
          cropTop: 0, // Crop from top edge (0-100%)
          cropBottom: 0, // Crop from bottom edge (0-100%)
          fill: '#333333', // Placeholder background
        };
      case 'video':
        // For video, similar to image but with video-specific properties
        return {
          ...baseProps,
          type: 'video',
          width: 320,
          height: 180,
          src: null, // Will be set when video is selected
          videoElement: null, // The HTML video element
          thumbnail: null, // Video thumbnail/poster
          playing: false, // Whether video is playing
          currentTime: 0,
          duration: 0,
          muted: true, // Default to muted
          volume: 0.5, // Default volume at 50%
          loop: false, // Default to not looping
          opacity: 1, // Default to fully opaque (keyframable)
          borderWidth: 0, // Default no border
          borderColor: '#ffffff', // Default border color
          borderGradient: false, // Whether to use gradient
          borderGradientStart: '#ffffff', // Gradient start color
          borderGradientEnd: '#000000', // Gradient end color
          borderGradientAngle: 0, // Gradient angle (0-360)
          fill: '#222222', // Placeholder background
        };
      default:
        return null;
    }
  };
  
  // Handle element selection
  const handleElementSelect = (id, e) => {
    console.log('=== HANDLE ELEMENT SELECT ===');
    console.log('Element ID:', id);
    console.log('Event:', e);
    console.log('Shift key:', e?.evt?.shiftKey);
    
    const element = elements.find(el => el.id === id);
    console.log('Found element:', element);
    
    // Stop event propagation to prevent stage click
    if (e && e.evt) {
      e.evt.preventDefault();
      e.evt.stopPropagation();
    }
    
    if (e && e.evt && e.evt.shiftKey) {
      console.log('Multi-select mode, current selectedIds:', selectedIds);
      // Multi-select with Shift key
      if (selectedIds.includes(id)) {
        // Remove from multi-selection
        setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
      } else {
        // Add to multi-selection - include current single selection if any
        const newSelection = selectedId && !selectedIds.includes(selectedId) 
          ? [selectedId, ...selectedIds, id]
          : [...selectedIds, id];
        console.log('New selection:', newSelection);
        setSelectedIds([...new Set(newSelection)]);
        setSelectedId(null);
      }
    } else {
      // Single selection
      console.log('Single selection mode');
      setSelectedId(id);
      setSelectedIds([]);
      if (onElementSelect) {
        onElementSelect(element);
      }
    }
    console.log('=== END HANDLE ELEMENT SELECT ===');
  };
  
  // Update element properties
  const updateElement = (id, newProps) => {
    if (onElementsChange) {
      const updatedElements = elements.map(el => {
        if (el.id === id) {
          const updated = { ...el, ...newProps };
          
          // If this is a text element with auto-sizing enabled, calculate optimal font size
          if (updated.type === 'text' && updated.autoSize) {
            // Trigger auto-sizing when text, dimensions, or constraints change
            const shouldAutoSize = newProps.text !== undefined || 
                                  newProps.width !== undefined || 
                                  newProps.height !== undefined ||
                                  newProps.autoSize !== undefined ||
                                  newProps.minFontSize !== undefined ||
                                  newProps.maxFontSize !== undefined ||
                                  newProps.constrainWidth !== undefined ||
                                  newProps.constrainHeight !== undefined;
            
            if (shouldAutoSize) {
              const optimalSize = calculateOptimalFontSize(
                updated.text || 'Sample Text',
                updated.fontFamily || 'Arial',
                updated.width || 200,
                updated.height || 100,
                updated.minFontSize || 8,
                updated.maxFontSize || 48,
                updated.lineHeight || 1.2
              );
              
              console.log('Auto-sizing text:', updated.text, 'from', updated.fontSize, 'to', optimalSize);
              updated.fontSize = optimalSize;
            }
          }
          
          return updated;
        }
        return el;
      });
      
      onElementsChange(updatedElements);
      
      // Also update the selected element if it's the one being changed
      if (id === selectedId) {
        const updatedElement = updatedElements.find(el => el.id === id);
        if (updatedElement && onElementSelect) {
          onElementSelect(updatedElement);
        }
      }
    }
  };
  
  // Render element based on type
  const renderElement = (element) => {
    // Check if this element is currently selected
    const isCurrentlySelected = selectedId === element.id || selectedIds.includes(element.id);
    
    const commonProps = {
      id: element.id,
      x: element.x,
      y: element.y,
      draggable: element.draggable !== undefined ? element.draggable && isCurrentlySelected : isCurrentlySelected,
      listening: element.listening !== undefined ? element.listening : true,
      onClick: (e) => {
        console.log('Element clicked:', element.id, element.type);
        e.evt.preventDefault();
        e.evt.stopPropagation();
        e.cancelBubble = true;
        handleElementSelect(element.id, e);
      },
      onTap: (e) => {
        console.log('Element tapped:', element.id, element.type);
        handleElementSelect(element.id, e);
      },
      onDragStart: (e) => {
        console.log('Drag start for element:', element.id, 'draggable:', isCurrentlySelected);
        // Since draggable is now controlled by selection state, this should only fire for selected elements
      },
      onDragMove: (e) => {
        // Update position in real-time during drag
        const newPos = { x: e.target.x(), y: e.target.y() };
        console.log(`Element ${element.id} drag move:`, newPos, 'Stage pos:', stagePos, 'Scale:', scale);
        updateElement(element.id, newPos);
      },
      onDragEnd: (e) => {
        const newPos = { x: e.target.x(), y: e.target.y() };
        console.log(`Element ${element.id} drag end:`, newPos, 'Stage pos:', stagePos, 'Scale:', scale);
        updateElement(element.id, newPos);
      },
      onTransform: (e) => {
        // Update in real-time during transform
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        
        const updates = {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
        };
        
        // Handle different element types
        if (element.type === 'rect' || element.type === 'text' || element.type === 'image' || element.type === 'video' || element.type === 'group') {
          updates.width = Math.max(5, node.width() * scaleX);
          updates.height = Math.max(5, node.height() * scaleY);
          
          // For groups, scale children proportionally
          if (element.type === 'group' && element.children) {
            const widthRatio = updates.width / element.width;
            const heightRatio = updates.height / element.height;
            
            updates.children = element.children.map(child => ({
              ...child,
              x: child.x * widthRatio,
              y: child.y * heightRatio,
              width: child.width ? child.width * widthRatio : child.width,
              height: child.height ? child.height * heightRatio : child.height,
              radiusX: child.radiusX ? child.radiusX * widthRatio : child.radiusX,
              radiusY: child.radiusY ? child.radiusY * heightRatio : child.radiusY
            }));
          }
          
          // Reset scale immediately to prevent exponential scaling
          node.scaleX(1);
          node.scaleY(1);
        } else if (element.type === 'circle') {
          // For ellipse, update both radiusX and radiusY
          updates.radiusX = Math.max(5, (element.radiusX || element.radius || 50) * scaleX);
          updates.radiusY = Math.max(5, (element.radiusY || element.radius || 50) * scaleY);
          // Reset scale immediately
          node.scaleX(1);
          node.scaleY(1);
        }
        
        updateElement(element.id, updates);
      },
      onTransformEnd: (e) => {
        const node = e.target;
        
        const updates = {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
        };
        
        // Final update with current dimensions
        if (element.type === 'rect' || element.type === 'text' || element.type === 'image' || element.type === 'video' || element.type === 'group') {
          updates.width = node.width();
          updates.height = node.height();
          
          // For groups, ensure children scaling is preserved
          if (element.type === 'group' && element.children && !updates.children) {
            const widthRatio = updates.width / element.width;
            const heightRatio = updates.height / element.height;
            
            updates.children = element.children.map(child => ({
              ...child,
              x: child.x * widthRatio,
              y: child.y * heightRatio,
              width: child.width ? child.width * widthRatio : child.width,
              height: child.height ? child.height * heightRatio : child.height,
              radiusX: child.radiusX ? child.radiusX * widthRatio : child.radiusX,
              radiusY: child.radiusY ? child.radiusY * heightRatio : child.radiusY
            }));
          }
        } else if (element.type === 'circle') {
          updates.radiusX = node.radiusX();
          updates.radiusY = node.radiusY();
        }
        
        updateElement(element.id, updates);
      },
    };
    
    switch (element.type) {
      case 'text':
        // Prepare text effects
        const effects = element.effects || {};
        // Handle gradient fill for text
        let fillValue = element.fill;
        let fillLinearGradientStartPoint = null;
        let fillLinearGradientEndPoint = null;
        let fillLinearGradientColorStops = null;
        
        if (element.fillGradient) {
          const angle = (element.fillGradientAngle || 0) * Math.PI / 180;
          const distance = Math.sqrt(element.width * element.width + element.height * element.height) / 2;
          const centerX = element.width / 2;
          const centerY = element.height / 2;
          
          fillLinearGradientStartPoint = {
            x: centerX - Math.cos(angle) * distance,
            y: centerY - Math.sin(angle) * distance
          };
          fillLinearGradientEndPoint = {
            x: centerX + Math.cos(angle) * distance,
            y: centerY + Math.sin(angle) * distance
          };
          fillLinearGradientColorStops = [
            0, element.fillGradientStart || '#4a90e2',
            1, element.fillGradientEnd || '#2c5aa0'
          ];
          fillValue = undefined; // Don't use solid fill when gradient is active
        }

        const textProps = {
          ...commonProps,
          text: element.text,
          fontSize: element.fontSize,
          fontFamily: element.fontFamily,
          fill: fillValue,
          fillLinearGradientStartPoint: fillLinearGradientStartPoint,
          fillLinearGradientEndPoint: fillLinearGradientEndPoint,
          fillLinearGradientColorStops: fillLinearGradientColorStops,
          letterSpacing: element.letterSpacing || 0,
          lineHeight: element.lineHeight || 1.2,
          opacity: element.opacity !== undefined ? element.opacity : 1,
          width: element.width,
          height: element.height,
          align: element.align || 'left',
          verticalAlign: element.verticalAlign || 'top',
          wrap: element.wrap || 'word',
          ellipsis: element.constrainWidth || element.constrainHeight
        };
        
        // Apply stroke effects
        if (effects.stroke?.enabled) {
          textProps.stroke = effects.stroke.color;
          textProps.strokeWidth = effects.stroke.width;
        } else if (element.strokeWidth > 0) {
          textProps.stroke = element.stroke;
          textProps.strokeWidth = element.strokeWidth;
        }
        
        // Apply shadow effects
        if (effects.shadow?.enabled) {
          textProps.shadowColor = effects.shadow.color;
          textProps.shadowOffset = {
            x: effects.shadow.offsetX,
            y: effects.shadow.offsetY
          };
          textProps.shadowOpacity = effects.shadow.opacity;
          textProps.shadowBlur = effects.shadow.blur;
        }
        
        // Check if text has animation enabled
        const hasAnimation = element.animation?.preset && element.animation.preset !== 'none';
        
        if (hasAnimation) {
          // For animated text, render a placeholder rectangle in Konva and return the animated text separately
          return (
            <React.Fragment>
              {/* Invisible placeholder for selection/transformation */}
              <Rect
                {...commonProps}
                width={element.width}
                height={element.height || 100}
                fill="transparent"
                stroke={selectedId === element.id || selectedIds.includes(element.id) ? "rgba(74, 144, 226, 0.5)" : "transparent"}
                strokeWidth={1}
                dash={[2, 2]}
              />
              {/* Show constraint bounds in debug mode */}
              {(element.constrainWidth || element.constrainHeight) && (
                <Rect
                  x={element.x}
                  y={element.y}
                  width={element.width}
                  height={element.height || 100}
                  stroke="rgba(255, 0, 0, 0.3)"
                  strokeWidth={1}
                  dash={[2, 2]}
                  fill="transparent"
                  listening={false}
                  visible={selectedId === element.id || selectedIds.includes(element.id)}
                />
              )}
            </React.Fragment>
          );
        } else {
          // Render static text in Konva as before
          return (
            <React.Fragment>
              {/* Render glow effect as background if enabled */}
              {effects.glow?.enabled && (
                <Text
                  {...textProps}
                  fill={effects.glow.color}
                  opacity={effects.glow.opacity}
                  filters={[Konva.Filters.Blur]}
                  blurRadius={effects.glow.blur}
                  cache={true}
                  listening={false}
                />
              )}
              
              {/* Main text */}
              <Text
                {...textProps}
              />
              {/* Show constraint bounds in debug mode */}
              {(element.constrainWidth || element.constrainHeight) && (
                <Rect
                  x={element.x}
                  y={element.y}
                  width={element.width}
                  height={element.height || 100}
                  stroke="rgba(255, 0, 0, 0.3)"
                  strokeWidth={1}
                  dash={[2, 2]}
                  fill="transparent"
                  listening={false}
                  visible={selectedId === element.id || selectedIds.includes(element.id)}
                />
              )}
            </React.Fragment>
          );
        }
      case 'rect':
        return (
          <Rect
            {...commonProps}
            width={element.width}
            height={element.height}
            fill={element.fillGradient ? undefined : element.fill}
            fillLinearGradientStartPoint={element.fillGradient ? { x: 0, y: 0 } : undefined}
            fillLinearGradientEndPoint={element.fillGradient ? {
              x: element.width * Math.cos((element.fillGradientAngle || 0) * Math.PI / 180),
              y: element.height * Math.sin((element.fillGradientAngle || 0) * Math.PI / 180)
            } : undefined}
            fillLinearGradientColorStops={element.fillGradient ? [
              0, element.fillGradientStart || '#4a90e2',
              1, element.fillGradientEnd || '#2c5aa0'
            ] : undefined}
            opacity={element.opacity !== undefined ? element.opacity : 1}
            stroke={element.stroke}
            strokeWidth={element.strokeWidth}
            cornerRadius={element.cornerRadius || 0}
          />
        );
      case 'circle':
        return (
          <Ellipse
            {...commonProps}
            radiusX={element.radiusX || element.radius || 50}
            radiusY={element.radiusY || element.radius || 50}
            fill={element.fillGradient ? undefined : element.fill}
            fillLinearGradientStartPoint={element.fillGradient ? { 
              x: -element.radiusX, 
              y: -element.radiusY 
            } : undefined}
            fillLinearGradientEndPoint={element.fillGradient ? {
              x: element.radiusX * Math.cos((element.fillGradientAngle || 0) * Math.PI / 180),
              y: element.radiusY * Math.sin((element.fillGradientAngle || 0) * Math.PI / 180)
            } : undefined}
            fillLinearGradientColorStops={element.fillGradient ? [
              0, element.fillGradientStart || '#e74c3c',
              1, element.fillGradientEnd || '#c0392b'
            ] : undefined}
            opacity={element.opacity !== undefined ? element.opacity : 1}
            stroke={element.stroke}
            strokeWidth={element.strokeWidth}
          />
        );
      case 'image':
        // If we have an image source, render the image with border
        if (element.src && element.imageObj) {
          // Calculate crop values as percentages
          const cropLeft = element.cropLeft || 0;
          const cropRight = element.cropRight || 0;
          const cropTop = element.cropTop || 0;
          const cropBottom = element.cropBottom || 0;
          
          // Calculate the visible area after cropping
          const visibleX = (element.width * cropLeft) / 100;
          const visibleY = (element.height * cropTop) / 100;
          const visibleWidth = element.width * (100 - cropLeft - cropRight) / 100;
          const visibleHeight = element.height * (100 - cropTop - cropBottom) / 100;
          
          // Calculate how to scale the image to fit the element dimensions
          const imageAspect = element.imageObj.width / element.imageObj.height;
          const elementAspect = element.width / element.height;
          
          let imageWidth, imageHeight, imageX, imageY;
          
          // Scale image to fill the element (cover mode)
          if (imageAspect > elementAspect) {
            // Image is wider - fit height
            imageHeight = element.height;
            imageWidth = element.height * imageAspect;
            imageX = -(imageWidth - element.width) / 2;
            imageY = 0;
          } else {
            // Image is taller - fit width
            imageWidth = element.width;
            imageHeight = element.width / imageAspect;
            imageX = 0;
            imageY = -(imageHeight - element.height) / 2;
          }
          
          // If gradient border is enabled, render a gradient rect behind the image
          if (element.borderWidth > 0 && element.borderGradient) {
            return (
              <Group
                {...commonProps}
                clipFunc={(ctx) => {
                  ctx.rect(visibleX, visibleY, visibleWidth, visibleHeight);
                }}
              >
                {/* Gradient border background - drawn behind the clipped image */}
                <Rect
                  width={visibleWidth + element.borderWidth * 2}
                  height={visibleHeight + element.borderWidth * 2}
                  x={visibleX - element.borderWidth}
                  y={visibleY - element.borderWidth}
                  fillLinearGradientStartPoint={{
                    x: 0,
                    y: 0
                  }}
                  fillLinearGradientEndPoint={{
                    x: visibleWidth * Math.cos((element.borderGradientAngle || 0) * Math.PI / 180),
                    y: visibleHeight * Math.sin((element.borderGradientAngle || 0) * Math.PI / 180)
                  }}
                  fillLinearGradientColorStops={[
                    0, element.borderGradientStart || '#ffffff',
                    1, element.borderGradientEnd || '#000000'
                  ]}
                  opacity={element.opacity !== undefined ? element.opacity : 1}
                />
                {/* Image on top */}
                <KonvaImage
                  image={element.imageObj}
                  x={imageX}
                  y={imageY}
                  width={imageWidth}
                  height={imageHeight}
                  opacity={element.opacity !== undefined ? element.opacity : 1}
                />
              </Group>
            );
          } else {
            // Regular border (solid color) - use clipping group
            return (
              <Group
                {...commonProps}
                clipFunc={(ctx) => {
                  ctx.rect(visibleX, visibleY, visibleWidth, visibleHeight);
                }}
              >
                <KonvaImage
                  image={element.imageObj}
                  x={imageX}
                  y={imageY}
                  width={imageWidth}
                  height={imageHeight}
                  opacity={element.opacity !== undefined ? element.opacity : 1}
                />
                {/* Border rect drawn on top of the clipped image */}
                {element.borderWidth > 0 ? (
                  <Rect
                    x={visibleX}
                    y={visibleY}
                    width={visibleWidth}
                    height={visibleHeight}
                    stroke={element.borderColor || '#ffffff'}
                    strokeWidth={element.borderWidth}
                    fill="transparent"
                  />
                ) : null}
              </Group>
            );
          }
        } else {
          // Placeholder for image
          return (
            <Rect
              {...commonProps}
              width={element.width}
              height={element.height}
              fill={element.fill || '#333333'}
              stroke="#666666"
              strokeWidth={2}
              dash={[10, 5]}
              opacity={element.opacity !== undefined ? element.opacity : 1}
            />
          );
        }
      case 'video':
        // For video with border support
        if (element.thumbnail) {
          // If gradient border is enabled
          if (element.borderWidth > 0 && element.borderGradient) {
            return (
              <React.Fragment>
                {/* Gradient border background */}
                <Rect
                  {...commonProps}
                  width={element.width + element.borderWidth * 2}
                  height={element.height + element.borderWidth * 2}
                  x={element.x - element.borderWidth}
                  y={element.y - element.borderWidth}
                  fillLinearGradientStartPoint={{
                    x: 0,
                    y: 0
                  }}
                  fillLinearGradientEndPoint={{
                    x: element.width * Math.cos((element.borderGradientAngle || 0) * Math.PI / 180),
                    y: element.height * Math.sin((element.borderGradientAngle || 0) * Math.PI / 180)
                  }}
                  fillLinearGradientColorStops={[
                    0, element.borderGradientStart || '#ffffff',
                    1, element.borderGradientEnd || '#000000'
                  ]}
                  opacity={element.opacity !== undefined ? element.opacity : 1}
                />
                {/* Video thumbnail on top */}
                <KonvaImage
                  {...commonProps}
                  image={element.thumbnail}
                  width={element.width}
                  height={element.height}
                  opacity={element.opacity !== undefined ? element.opacity : 1}
                />
              </React.Fragment>
            );
          } else {
            // Regular border (solid color) or no border
            return (
              <KonvaImage
                {...commonProps}
                image={element.thumbnail}
                width={element.width}
                height={element.height}
                opacity={element.opacity !== undefined ? element.opacity : 1}
                stroke={element.borderWidth && element.borderWidth > 0 ? (element.borderColor || '#ffffff') : undefined}
                strokeWidth={element.borderWidth || 0}
              />
            );
          }
        } else {
          // Placeholder rectangle for video (before thumbnail is loaded)
          return (
            <Rect
              {...commonProps}
              width={element.width}
              height={element.height}
              fill={element.fill || '#222222'}
              stroke="#4a90e2"
              strokeWidth={2}
              dash={[10, 5]}
              opacity={element.opacity !== undefined ? element.opacity : 1}
            />
          );
        }
      case 'group':
        // For groups, we need to handle the commonProps at the group level
        const groupCommonProps = {
          ...commonProps,
          // Override drag start for groups to work properly
          onDragStart: (e) => {
            const isSelected = selectedId === element.id || selectedIds.includes(element.id);
            if (!isSelected) {
              handleElementSelect(element.id, e);
              e.target.stopDrag();
            }
          }
        };
        
        return (
          <Group
            {...groupCommonProps}
            width={element.width}
            height={element.height}
          >
            {/* Invisible clickable area for the group */}
            <Rect
              x={0}
              y={0}
              width={element.width}
              height={element.height}
              fill="transparent"
              listening={true}
            />
            
            {/* Render children */}
            {element.children && element.children.map(child => {
              const childElement = {
                ...child,
                id: `${element.id}-${child.id}`,
                draggable: false, // Children shouldn't be individually draggable in a group
                listening: false, // Children shouldn't intercept clicks
                // Override any event handlers from children
                onClick: undefined,
                onTap: undefined,
                onDragStart: undefined,
                onDragMove: undefined,
                onDragEnd: undefined
              };
              return (
                <React.Fragment key={child.id}>
                  {renderElement(childElement)}
                </React.Fragment>
              );
            })}
            
            {/* Group border for visual feedback */}
            <Rect
              x={0}
              y={0}
              width={element.width}
              height={element.height}
              stroke={selectedId === element.id || selectedIds.includes(element.id) ? '#4a90e2' : 'transparent'}
              strokeWidth={2}
              dash={[5, 5]}
              fill="transparent"
              listening={false}
            />
          </Group>
        );
      default:
        return null;
    }
  };
  
  return (
    <div 
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
      }}
    >
      <div style={{
        border: '2px solid #333',
        borderRadius: '4px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      }}>
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          x={stagePos.x}
          y={stagePos.y}
          scaleX={scale}
          scaleY={scale}
          draggable={scale > 1} 
          onDragEnd={(e) => {
            // Only update stage position if the stage itself was dragged
            if (e.target === stageRef.current) {
              const newPos = {
                x: e.target.x(),
                y: e.target.y()
              };
              console.log('Stage drag ended, new position:', newPos);
              setStagePos(newPos);
            }
          }}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          style={{ 
            background: '#000',
            cursor: scale > 1 ? 'grab' : 'default'
          }}
        >
          <Layer ref={layerRef}>
            {/* Transparent background with checkerboard pattern */}
            <Rect
              x={0}
              y={0}
              width={stageSize.width}
              height={stageSize.height}
              fillPatternImage={transparencyPattern}
              listening={false}
            />
            
            {/* Safe zone guides (10% margins) */}
            <Rect
              x={stageSize.width * 0.05}
              y={stageSize.height * 0.05}
              width={stageSize.width * 0.9}
              height={stageSize.height * 0.9}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={1}
              dash={[5, 5]}
              listening={false}
            />
            
            {/* Render all elements */}
            {elements.map(element => (
              <React.Fragment key={element.id}>
                {renderElement(element)}
              </React.Fragment>
            ))}
            
            {/* Selection rectangle */}
            {isSelecting && selectionRect.width > 0 && selectionRect.height > 0 && (
              <Rect
                x={selectionRect.x}
                y={selectionRect.y}
                width={selectionRect.width}
                height={selectionRect.height}
                fill="rgba(74, 144, 226, 0.1)"
                stroke="#4a90e2"
                strokeWidth={1}
                dash={[2, 2]}
                listening={false}
              />
            )}
            
            {/* Transformer for selected elements */}
            {(selectedId || selectedIds.length > 0) && (
              <Transformer
                ref={transformerRef}
                rotateEnabled={selectedIds.length === 0}
                keepRatio={false}
                enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']}
                boundBoxFunc={(oldBox, newBox) => {
                  // Limit resize
                  if (newBox.width < 20 || newBox.height < 20) {
                    return oldBox;
                  }
                  return newBox;
                }}
              />
            )}
          </Layer>
        </Stage>
        
        {/* HTML Overlay for Animated Text */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: stageSize.width,
            height: stageSize.height,
            pointerEvents: 'none',
            zIndex: 10
          }}
        >
          {elements
            .filter(element => element.type === 'text' && element.animation?.preset && element.animation.preset !== 'none')
            .map(element => {
              const effects = element.effects || {};
              
              // Build text style based on element properties and effects
              const textStyle = {
                position: 'absolute',
                left: element.x,
                top: element.y,
                width: element.width,
                height: element.height || 100,
                fontSize: element.fontSize,
                fontFamily: element.fontFamily,
                color: element.fill,
                letterSpacing: element.letterSpacing || 0,
                lineHeight: element.lineHeight || 1.2,
                opacity: element.opacity !== undefined ? element.opacity : 1,
                textAlign: element.align || 'left',
                display: 'flex',
                alignItems: element.verticalAlign === 'middle' ? 'center' : 
                           element.verticalAlign === 'bottom' ? 'flex-end' : 'flex-start',
                overflow: 'hidden',
                whiteSpace: element.wrap === 'none' ? 'nowrap' : 'pre-wrap',
                wordWrap: element.wrap === 'word' ? 'break-word' : 'normal',
                // Apply text effects as CSS
                textShadow: effects.shadow?.enabled ? 
                  `${effects.shadow.offsetX}px ${effects.shadow.offsetY}px ${effects.shadow.blur}px rgba(0,0,0,${effects.shadow.opacity})` : 
                  'none',
                WebkitTextStroke: effects.stroke?.enabled ? 
                  `${effects.stroke.width}px ${effects.stroke.color}` : 
                  'none'
              };

              return (
                <TextAnimationComponent
                  key={element.id}
                  animation={element.animation}
                  style={textStyle}
                  timelineControlled={true}
                  animationTrigger={element.animationTrigger || false}
                  animationProgress={element.animationProgress || 0}
                >
                  {element.text}
                </TextAnimationComponent>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default TemplateCanvas;