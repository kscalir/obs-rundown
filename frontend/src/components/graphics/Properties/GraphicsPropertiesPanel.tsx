import React from 'react';
import { useEditorStore } from '../state/editorStore';
import { TextProperties } from './TextProperties';
import { ShapeProperties } from './ShapeProperties';
import { ImageProperties } from './ImageProperties';
import { VideoProperties } from './VideoProperties';
import { TransformProperties } from './TransformProperties';
import { MoveableProperties } from './MoveableProperties';
import { AppearanceProperties } from './AppearanceProperties';
import type { Element } from '../types';

export const GraphicsPropertiesPanel: React.FC = () => {
  const { selectedElementIds, layers, updateElement } = useEditorStore();

  // Get selected elements
  const selectedElements: Element[] = [];
  layers.forEach(layer => {
    layer.elements.forEach(element => {
      if (selectedElementIds.includes(element.id)) {
        selectedElements.push(element);
      }
    });
  });

  const selectedElement = selectedElements[0]; // For now, show properties for first selected

  if (!selectedElement) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>Properties</h3>
        </div>
        <div style={styles.empty}>
          <p>No element selected</p>
          <p style={styles.hint}>Select an element to view its properties</p>
        </div>
      </div>
    );
  }

  const handleUpdate = (updates: Partial<Element>) => {
    updateElement(selectedElement.id, updates);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Properties</h3>
        <span style={styles.elementType}>{selectedElement.type}</span>
      </div>

      <div style={styles.content}>
        {/* Transform properties (common to all) */}
        <TransformProperties element={selectedElement} onUpdate={handleUpdate} />
        
        {/* Moveable advanced properties */}
        <MoveableProperties element={selectedElement} onUpdate={handleUpdate} />

        {/* Type-specific properties */}
        {selectedElement.type === 'text' && (
          <TextProperties element={selectedElement} onUpdate={handleUpdate} />
        )}
        
        {selectedElement.type === 'shape' && (
          <ShapeProperties element={selectedElement} onUpdate={handleUpdate} />
        )}
        
        {selectedElement.type === 'image' && (
          <ImageProperties element={selectedElement} onUpdate={handleUpdate} />
        )}
        
        {selectedElement.type === 'video' && (
          <VideoProperties element={selectedElement} onUpdate={handleUpdate} />
        )}

        {/* Appearance properties (common to all) */}
        <AppearanceProperties element={selectedElement} onUpdate={handleUpdate} />
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
    fontWeight: 600
  },
  elementType: {
    fontSize: '11px',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '12px'
  },
  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    textAlign: 'center'
  },
  hint: {
    fontSize: '12px',
    color: '#666',
    marginTop: '8px'
  }
};