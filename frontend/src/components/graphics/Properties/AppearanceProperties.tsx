import React from 'react';
import type { Element } from '../types';

interface AppearancePropertiesProps {
  element: Element;
  onUpdate: (updates: Partial<Element>) => void;
}

export const AppearanceProperties: React.FC<AppearancePropertiesProps> = ({ element, onUpdate }) => {
  // Handle property update - will be synced for animation if auto-key is enabled
  const handleUpdate = (updates: Partial<Element>) => {
    onUpdate(updates);
  };
  return (
    <div style={styles.section}>
      <h4 style={styles.sectionTitle}>Appearance</h4>
      
      <div style={styles.row}>
        <label style={styles.label}>Opacity</label>
        <div style={styles.inputGroup}>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={element.opacity}
            onChange={(e) => handleUpdate({ opacity: parseFloat(e.target.value) })}
            style={styles.slider}
          />
          <span style={styles.value}>{Math.round(element.opacity * 100)}%</span>
        </div>
      </div>

      <div style={styles.row}>
        <label style={styles.label}>Visible</label>
        <input
          type="checkbox"
          checked={element.visible}
          onChange={(e) => handleUpdate({ visible: e.target.checked })}
          style={styles.checkbox}
        />
      </div>

      <div style={styles.row}>
        <label style={styles.label}>Locked</label>
        <input
          type="checkbox"
          checked={element.locked}
          onChange={(e) => handleUpdate({ locked: e.target.checked })}
          style={styles.checkbox}
        />
      </div>

      {element.blendMode && (
        <div style={styles.row}>
          <label style={styles.label}>Blend</label>
          <select
            value={element.blendMode}
            onChange={(e) => handleUpdate({ blendMode: e.target.value })}
            style={styles.select}
          >
            <option value="normal">Normal</option>
            <option value="multiply">Multiply</option>
            <option value="screen">Screen</option>
            <option value="overlay">Overlay</option>
            <option value="darken">Darken</option>
            <option value="lighten">Lighten</option>
            <option value="color-dodge">Color Dodge</option>
            <option value="color-burn">Color Burn</option>
            <option value="hard-light">Hard Light</option>
            <option value="soft-light">Soft Light</option>
            <option value="difference">Difference</option>
            <option value="exclusion">Exclusion</option>
          </select>
        </div>
      )}
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
    gap: '8px',
    alignItems: 'center'
  },
  slider: {
    flex: 1,
    height: '4px',
    background: '#333',
    outline: 'none',
    cursor: 'pointer'
  },
  value: {
    fontSize: '11px',
    color: '#888',
    minWidth: '35px'
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer'
  },
  select: {
    flex: 1,
    padding: '4px 8px',
    background: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '4px',
    color: '#e0e0e0',
    fontSize: '12px',
    outline: 'none',
    cursor: 'pointer'
  }
};