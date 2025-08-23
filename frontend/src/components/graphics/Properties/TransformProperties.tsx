import React, { useMemo } from 'react';
import type { Element } from '../types';
import { debounce } from '../utils/debounce';

interface TransformPropertiesProps {
  element: Element;
  onUpdate: (updates: Partial<Element>) => void;
}

export const TransformProperties: React.FC<TransformPropertiesProps> = ({ element, onUpdate }) => {
  // Debounce updates for performance
  const debouncedUpdate = useMemo(
    () => debounce((updates: Partial<Element>) => {
      onUpdate(updates);
      // Properties will be synced for animation if auto-key is enabled
    }, 100),
    [onUpdate, element.id]
  );

  return (
    <div style={styles.section}>
      <h4 style={styles.sectionTitle}>Transform</h4>
      
      <div style={styles.row}>
        <label style={styles.label}>Position</label>
        <div style={styles.inputGroup}>
          <input
            type="number"
            value={Math.round(element.x)}
            onChange={(e) => debouncedUpdate({ x: parseFloat(e.target.value) || 0 })}
            style={styles.input}
            placeholder="X"
          />
          <input
            type="number"
            value={Math.round(element.y)}
            onChange={(e) => debouncedUpdate({ y: parseFloat(e.target.value) || 0 })}
            style={styles.input}
            placeholder="Y"
          />
        </div>
      </div>

      <div style={styles.row}>
        <label style={styles.label}>Size</label>
        <div style={styles.inputGroup}>
          <input
            type="number"
            value={Math.round(element.width)}
            onChange={(e) => debouncedUpdate({ width: parseFloat(e.target.value) || 1 })}
            style={styles.input}
            placeholder="W"
          />
          <input
            type="number"
            value={Math.round(element.height)}
            onChange={(e) => debouncedUpdate({ height: parseFloat(e.target.value) || 1 })}
            style={styles.input}
            placeholder="H"
          />
        </div>
      </div>

      <div style={styles.row}>
        <label style={styles.label}>Rotation</label>
        <div style={styles.inputGroup}>
          <input
            type="number"
            value={Math.round(element.rotation)}
            onChange={(e) => debouncedUpdate({ rotation: parseFloat(e.target.value) || 0 })}
            style={{ ...styles.input, flex: 1 }}
            placeholder="0"
          />
          <span style={styles.unit}>°</span>
        </div>
      </div>

      <div style={styles.row}>
        <label style={styles.label}>Scale</label>
        <div style={styles.inputGroup}>
          <input
            type="number"
            value={element.scaleX}
            onChange={(e) => debouncedUpdate({ scaleX: parseFloat(e.target.value) || 1 })}
            style={styles.input}
            step="0.1"
            placeholder="X"
          />
          <input
            type="number"
            value={element.scaleY}
            onChange={(e) => debouncedUpdate({ scaleY: parseFloat(e.target.value) || 1 })}
            style={styles.input}
            step="0.1"
            placeholder="Y"
          />
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  section: {
    marginBottom: '20px'
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#999',
    marginBottom: '12px',
    margin: '0 0 12px 0'
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px'
  },
  label: {
    flex: '0 0 70px',
    fontSize: '12px',
    color: '#b0b0b0'
  },
  inputGroup: {
    flex: 1,
    display: 'flex',
    gap: '4px',
    alignItems: 'center'
  },
  input: {
    flex: 1,
    padding: '4px 8px',
    background: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '4px',
    color: '#e0e0e0',
    fontSize: '12px',
    outline: 'none'
  },
  unit: {
    fontSize: '11px',
    color: '#666',
    marginLeft: '4px'
  }
};