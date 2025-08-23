import React from 'react';
import { 
  AlignStart, 
  AlignCenter, 
  AlignEnd, 
  AlignTop,
  AlignMiddle,
  AlignBottom,
  DistributeHorizontal,
  DistributeVertical,
  BoundingBoxCircles,
  BoundingBox
} from 'react-bootstrap-icons';
import { useEditorStore } from './state/editorStore';

export const AlignmentTools: React.FC = () => {
  const { 
    selectedElementIds, 
    layers, 
    updateElement, 
    canvas,
    groupElements,
    ungroupElement
  } = useEditorStore();

  // Get selected elements
  const getSelectedElements = () => {
    const elements: any[] = [];
    layers.forEach(layer => {
      layer.elements.forEach(element => {
        if (selectedElementIds.includes(element.id)) {
          elements.push(element);
        }
      });
    });
    return elements;
  };

  // Alignment functions
  const alignLeft = () => {
    const elements = getSelectedElements();
    if (elements.length === 0) return;
    
    const minX = Math.min(...elements.map(e => e.x));
    elements.forEach(element => {
      updateElement(element.id, { x: minX });
    });
  };

  const alignCenter = () => {
    const elements = getSelectedElements();
    if (elements.length === 0) return;
    
    if (elements.length === 1) {
      // Center on canvas
      const element = elements[0];
      updateElement(element.id, { 
        x: (canvas.size.width - element.width) / 2 
      });
    } else {
      // Align to selection center
      const minX = Math.min(...elements.map(e => e.x));
      const maxX = Math.max(...elements.map(e => e.x + e.width));
      const centerX = (minX + maxX) / 2;
      
      elements.forEach(element => {
        updateElement(element.id, { 
          x: centerX - element.width / 2 
        });
      });
    }
  };

  const alignRight = () => {
    const elements = getSelectedElements();
    if (elements.length === 0) return;
    
    const maxX = Math.max(...elements.map(e => e.x + e.width));
    elements.forEach(element => {
      updateElement(element.id, { x: maxX - element.width });
    });
  };

  const alignTop = () => {
    const elements = getSelectedElements();
    if (elements.length === 0) return;
    
    const minY = Math.min(...elements.map(e => e.y));
    elements.forEach(element => {
      updateElement(element.id, { y: minY });
    });
  };

  const alignMiddle = () => {
    const elements = getSelectedElements();
    if (elements.length === 0) return;
    
    if (elements.length === 1) {
      // Center on canvas
      const element = elements[0];
      updateElement(element.id, { 
        y: (canvas.size.height - element.height) / 2 
      });
    } else {
      // Align to selection center
      const minY = Math.min(...elements.map(e => e.y));
      const maxY = Math.max(...elements.map(e => e.y + e.height));
      const centerY = (minY + maxY) / 2;
      
      elements.forEach(element => {
        updateElement(element.id, { 
          y: centerY - element.height / 2 
        });
      });
    }
  };

  const alignBottom = () => {
    const elements = getSelectedElements();
    if (elements.length === 0) return;
    
    const maxY = Math.max(...elements.map(e => e.y + e.height));
    elements.forEach(element => {
      updateElement(element.id, { y: maxY - element.height });
    });
  };

  const distributeHorizontal = () => {
    const elements = getSelectedElements();
    if (elements.length < 3) return;
    
    // Sort by x position
    elements.sort((a, b) => a.x - b.x);
    
    const firstElement = elements[0];
    const lastElement = elements[elements.length - 1];
    const totalWidth = elements.reduce((sum, e) => sum + e.width, 0);
    const totalSpace = (lastElement.x + lastElement.width) - firstElement.x;
    const spacing = (totalSpace - totalWidth) / (elements.length - 1);
    
    let currentX = firstElement.x;
    elements.forEach((element) => {
      updateElement(element.id, { x: currentX });
      currentX += element.width + spacing;
    });
  };

  const distributeVertical = () => {
    const elements = getSelectedElements();
    if (elements.length < 3) return;
    
    // Sort by y position
    elements.sort((a, b) => a.y - b.y);
    
    const firstElement = elements[0];
    const lastElement = elements[elements.length - 1];
    const totalHeight = elements.reduce((sum, e) => sum + e.height, 0);
    const totalSpace = (lastElement.y + lastElement.height) - firstElement.y;
    const spacing = (totalSpace - totalHeight) / (elements.length - 1);
    
    let currentY = firstElement.y;
    elements.forEach((element) => {
      updateElement(element.id, { y: currentY });
      currentY += element.height + spacing;
    });
  };

  const hasSelection = selectedElementIds.length > 0;
  const hasMultipleSelection = selectedElementIds.length > 1;
  const canDistribute = selectedElementIds.length >= 3;

  return (
    <div style={styles.container}>
      <div style={styles.group}>
        <span style={styles.label}>Align:</span>
        <button
          style={{
            ...styles.button,
            ...(hasSelection ? {} : styles.buttonDisabled)
          }}
          onClick={alignLeft}
          disabled={!hasSelection}
          title="Align Left"
        >
          <AlignStart size={16} color="currentColor" />
        </button>
        <button
          style={{
            ...styles.button,
            ...(hasSelection ? {} : styles.buttonDisabled)
          }}
          onClick={alignCenter}
          disabled={!hasSelection}
          title="Align Center"
        >
          <AlignCenter size={16} color="currentColor" />
        </button>
        <button
          style={{
            ...styles.button,
            ...(hasSelection ? {} : styles.buttonDisabled)
          }}
          onClick={alignRight}
          disabled={!hasSelection}
          title="Align Right"
        >
          <AlignEnd size={16} color="currentColor" />
        </button>
        
        <div style={styles.separator} />
        
        <button
          style={{
            ...styles.button,
            ...(hasSelection ? {} : styles.buttonDisabled)
          }}
          onClick={alignTop}
          disabled={!hasSelection}
          title="Align Top"
        >
          <AlignTop size={16} color="currentColor" />
        </button>
        <button
          style={{
            ...styles.button,
            ...(hasSelection ? {} : styles.buttonDisabled)
          }}
          onClick={alignMiddle}
          disabled={!hasSelection}
          title="Align Middle"
        >
          <AlignMiddle size={16} color="currentColor" />
        </button>
        <button
          style={{
            ...styles.button,
            ...(hasSelection ? {} : styles.buttonDisabled)
          }}
          onClick={alignBottom}
          disabled={!hasSelection}
          title="Align Bottom"
        >
          <AlignBottom size={16} color="currentColor" />
        </button>
      </div>
      
      {canDistribute && (
        <div style={styles.group}>
          <span style={styles.label}>Distribute:</span>
          <button
            style={styles.button}
            onClick={distributeHorizontal}
            title="Distribute Horizontal"
          >
            <DistributeHorizontal size={16} color="currentColor" />
          </button>
          <button
            style={styles.button}
            onClick={distributeVertical}
            title="Distribute Vertical"
          >
            <DistributeVertical size={16} color="currentColor" />
          </button>
        </div>
      )}

      <div style={styles.group}>
        <span style={styles.label}>Group:</span>
        <button
          style={{
            ...styles.button,
            ...(selectedElementIds.length > 1 ? {} : styles.buttonDisabled)
          }}
          onClick={() => groupElements(selectedElementIds)}
          disabled={selectedElementIds.length < 2}
          title="Group (Ctrl+G)"
        >
          <BoundingBox size={16} color="currentColor" />
        </button>
        <button
          style={{
            ...styles.button,
            ...(selectedElementIds.length === 1 ? {} : styles.buttonDisabled)
          }}
          onClick={() => {
            if (selectedElementIds.length === 1) {
              // Check if selected element is a group
              const elements = getSelectedElements();
              if (elements[0]?.type === 'group') {
                ungroupElement(selectedElementIds[0]);
              }
            }
          }}
          disabled={selectedElementIds.length !== 1}
          title="Ungroup (Ctrl+Shift+G)"
        >
          <BoundingBoxCircles size={16} color="currentColor" />
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    padding: '8px 12px',
    background: '#2a2a2a',
    borderTop: '1px solid #333',
    borderBottom: '1px solid #333'
  },
  group: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  label: {
    fontSize: '11px',
    color: '#888',
    marginRight: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  button: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: '3px',
    color: '#b0b0b0',
    cursor: 'pointer',
    transition: 'all 0.2s',
    padding: 0,
    outline: 'none'
  },
  buttonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed'
  },
  separator: {
    width: '1px',
    height: '20px',
    background: '#444',
    margin: '0 4px'
  }
};