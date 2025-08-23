import React from 'react';
import type { ImageElement } from '../types';

interface ImagePropertiesProps {
  element: ImageElement;
  onUpdate: (updates: Partial<ImageElement>) => void;
}

export const ImageProperties: React.FC<ImagePropertiesProps> = ({ element, onUpdate }) => {
  const handleReplaceImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const imageUrl = URL.createObjectURL(file);
        onUpdate({ src: imageUrl });
      }
    };
    input.click();
  };

  return (
    <div style={styles.section}>
      <h4 style={styles.sectionTitle}>Image</h4>
      
      <div style={styles.row}>
        <label style={styles.label}>Source</label>
        <div style={styles.inputGroup}>
          <input
            type="text"
            value={element.src}
            readOnly
            style={{ ...styles.input, flex: 1 }}
            placeholder="Image URL"
          />
          <button
            onClick={handleReplaceImage}
            style={styles.button}
          >
            Replace
          </button>
        </div>
      </div>

      <div style={styles.row}>
        <label style={styles.label}>Fit Mode</label>
        <select
          value="contain"
          onChange={(e) => {/* TODO: Implement fit modes */}}
          style={styles.select}
        >
          <option value="contain">Contain</option>
          <option value="cover">Cover</option>
          <option value="stretch">Stretch</option>
          <option value="none">None</option>
        </select>
      </div>

      {/* Image Filters */}
      <h4 style={{ ...styles.sectionTitle, marginTop: '16px' }}>Filters</h4>
      
      <div style={styles.row}>
        <label style={styles.label}>Brightness</label>
        <div style={styles.inputGroup}>
          <input
            type="range"
            min="0"
            max="200"
            value={100}
            onChange={(e) => {/* TODO: Implement filters */}}
            style={styles.slider}
          />
          <span style={styles.value}>100%</span>
        </div>
      </div>

      <div style={styles.row}>
        <label style={styles.label}>Contrast</label>
        <div style={styles.inputGroup}>
          <input
            type="range"
            min="0"
            max="200"
            value={100}
            onChange={(e) => {/* TODO: Implement filters */}}
            style={styles.slider}
          />
          <span style={styles.value}>100%</span>
        </div>
      </div>

      <div style={styles.row}>
        <label style={styles.label}>Saturation</label>
        <div style={styles.inputGroup}>
          <input
            type="range"
            min="0"
            max="200"
            value={100}
            onChange={(e) => {/* TODO: Implement filters */}}
            style={styles.slider}
          />
          <span style={styles.value}>100%</span>
        </div>
      </div>

      <div style={styles.row}>
        <label style={styles.label}>Blur</label>
        <div style={styles.inputGroup}>
          <input
            type="range"
            min="0"
            max="10"
            value={0}
            step="0.5"
            onChange={(e) => {/* TODO: Implement filters */}}
            style={styles.slider}
          />
          <span style={styles.value}>0px</span>
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
  },
  button: {
    padding: '4px 12px',
    background: '#1976d2',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '11px',
    cursor: 'pointer',
    outline: 'none'
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
  }
};