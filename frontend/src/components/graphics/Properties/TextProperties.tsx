import React from 'react';
import { ColorPicker } from '../components/ColorPicker';
import { FontSelector } from '../components/FontSelector';
import type { TextElement } from '../types';

interface TextPropertiesProps {
  element: TextElement;
  onUpdate: (updates: Partial<TextElement>) => void;
}

export const TextProperties: React.FC<TextPropertiesProps> = ({ element, onUpdate }) => {
  // Helper to safely update filters
  const updateFilter = (filterName: string, value: number) => {
    const currentFilters = element.filters || {};
    onUpdate({ 
      filters: { 
        ...currentFilters, 
        [filterName]: value 
      } 
    });
  };

  return (
    <div style={styles.section}>
      <h4 style={styles.sectionTitle}>Text</h4>
      
      <div style={styles.row}>
        <label style={styles.label}>Content</label>
        <textarea
          value={element.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          style={styles.textarea}
          rows={3}
        />
      </div>

      <div style={styles.row}>
        <label style={styles.label}>Font</label>
        <FontSelector
          value={element.fontFamily}
          onChange={(value) => onUpdate({ fontFamily: value })}
        />
      </div>

      <div style={styles.row}>
        <label style={styles.label}>Size</label>
        <div style={styles.inputGroup}>
          <input
            type="number"
            value={element.fontSize}
            onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) || 16 })}
            style={{ ...styles.input, flex: 1 }}
            min="8"
            max="999"
          />
          <span style={styles.unit}>px</span>
        </div>
      </div>

      <div style={styles.row}>
        <label style={styles.label}>Weight</label>
        <select
          value={element.fontWeight}
          onChange={(e) => onUpdate({ fontWeight: parseInt(e.target.value) })}
          style={styles.select}
        >
          <option value="100">Thin</option>
          <option value="300">Light</option>
          <option value="400">Regular</option>
          <option value="500">Medium</option>
          <option value="600">Semi Bold</option>
          <option value="700">Bold</option>
          <option value="900">Black</option>
        </select>
      </div>

      <div style={styles.row}>
        <label style={styles.label}>Style</label>
        <select
          value={element.fontStyle}
          onChange={(e) => onUpdate({ fontStyle: e.target.value as TextElement['fontStyle'] })}
          style={styles.select}
        >
          <option value="normal">Normal</option>
          <option value="italic">Italic</option>
          <option value="oblique">Oblique</option>
        </select>
      </div>

      <div style={styles.row}>
        <label style={styles.label}>Align</label>
        <div style={styles.buttonGroup}>
          {(['left', 'center', 'right', 'justify'] as const).map(align => (
            <button
              key={align}
              style={{
                ...styles.alignButton,
                ...(element.textAlign === align ? styles.alignButtonActive : {})
              }}
              onClick={() => onUpdate({ textAlign: align })}
            >
              {align[0].toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.row}>
        <label style={styles.label}>Color</label>
        <div style={styles.inputGroup}>
          <ColorPicker
            value={element.fill}
            onChange={(value) => onUpdate({ fill: value })}
          />
          <input
            type="text"
            value={typeof element.fill === 'string' ? element.fill : 'gradient'}
            onChange={(e) => onUpdate({ fill: e.target.value })}
            style={styles.input}
            disabled={typeof element.fill !== 'string'}
          />
        </div>
      </div>

      <div style={styles.row}>
        <label style={styles.label}>Line Height</label>
        <input
          type="number"
          value={element.lineHeight}
          onChange={(e) => onUpdate({ lineHeight: parseFloat(e.target.value) || 1 })}
          style={styles.input}
          step="0.1"
          min="0.5"
          max="3"
        />
      </div>

      {/* Sizing Mode */}
      <div style={styles.row}>
        <label style={styles.label}>Sizing</label>
        <select
          value={element.sizingMode || 'fixed'}
          onChange={(e) => onUpdate({ sizingMode: e.target.value as 'fixed' | 'auto' })}
          style={styles.select}
        >
          <option value="fixed">Fixed</option>
          <option value="auto">Auto</option>
        </select>
      </div>

      {/* Auto Squeeze */}
      <div style={styles.row}>
        <label style={styles.label}>Auto Squeeze</label>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={element.autoSqueeze || false}
            onChange={(e) => onUpdate({ autoSqueeze: e.target.checked })}
            style={styles.checkbox}
          />
          <span>Compress text to fit</span>
        </label>
      </div>

      {/* Text Wrap */}
      <div style={styles.row}>
        <label style={styles.label}>Text Wrap</label>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={element.textWrap !== false}
            onChange={(e) => onUpdate({ textWrap: e.target.checked })}
            style={styles.checkbox}
          />
          <span>Enable wrapping</span>
        </label>
      </div>

      <div style={styles.row}>
        <label style={styles.label}>Letter Spacing</label>
        <div style={styles.inputGroup}>
          <input
            type="number"
            value={element.letterSpacing}
            onChange={(e) => onUpdate({ letterSpacing: parseFloat(e.target.value) || 0 })}
            style={{ ...styles.input, flex: 1 }}
            step="0.5"
          />
          <span style={styles.unit}>px</span>
        </div>
      </div>

      {/* Drop Shadow */}
      <h4 style={{ ...styles.sectionTitle, marginTop: '16px' }}>Drop Shadow</h4>
      
      <div style={styles.row}>
        <label style={styles.label}>Enable</label>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={element.dropShadow?.enabled || false}
            onChange={(e) => onUpdate({ 
              dropShadow: {
                ...element.dropShadow,
                enabled: e.target.checked,
                color: element.dropShadow?.color || '#000000',
                blur: element.dropShadow?.blur || 4,
                offsetX: element.dropShadow?.offsetX || 2,
                offsetY: element.dropShadow?.offsetY || 2,
                opacity: element.dropShadow?.opacity || 0.5
              }
            })}
            style={styles.checkbox}
          />
          <span>Add drop shadow</span>
        </label>
      </div>

      {element.dropShadow?.enabled && (
        <>
          <div style={styles.row}>
            <label style={styles.label}>Color</label>
            <div style={styles.inputGroup}>
              <input
                type="color"
                value={element.dropShadow.color || '#000000'}
                onChange={(e) => onUpdate({ 
                  dropShadow: { ...element.dropShadow, color: e.target.value }
                })}
                style={styles.colorInput}
              />
              <input
                type="text"
                value={element.dropShadow.color || '#000000'}
                onChange={(e) => onUpdate({ 
                  dropShadow: { ...element.dropShadow, color: e.target.value }
                })}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.row}>
            <label style={styles.label}>Blur</label>
            <input
              type="range"
              min="0"
              max="20"
              value={element.dropShadow.blur || 4}
              onChange={(e) => onUpdate({ 
                dropShadow: { ...element.dropShadow, blur: parseFloat(e.target.value) }
              })}
              style={styles.slider}
            />
            <span style={styles.sliderValue}>{element.dropShadow.blur || 4}</span>
          </div>

          <div style={styles.row}>
            <label style={styles.label}>Offset</label>
            <div style={styles.inputGroup}>
              <input
                type="number"
                value={element.dropShadow.offsetX || 0}
                onChange={(e) => onUpdate({ 
                  dropShadow: { ...element.dropShadow, offsetX: parseFloat(e.target.value) }
                })}
                style={styles.input}
                placeholder="X"
              />
              <input
                type="number"
                value={element.dropShadow.offsetY || 0}
                onChange={(e) => onUpdate({ 
                  dropShadow: { ...element.dropShadow, offsetY: parseFloat(e.target.value) }
                })}
                style={styles.input}
                placeholder="Y"
              />
            </div>
          </div>

          <div style={styles.row}>
            <label style={styles.label}>Opacity</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={element.dropShadow.opacity || 0.5}
              onChange={(e) => onUpdate({ 
                dropShadow: { ...element.dropShadow, opacity: parseFloat(e.target.value) }
              })}
              style={styles.slider}
            />
            <span style={styles.sliderValue}>{(element.dropShadow.opacity || 0.5).toFixed(1)}</span>
          </div>
        </>
      )}

      {/* Filters */}
      <h4 style={{ ...styles.sectionTitle, marginTop: '16px' }}>Filters</h4>
      
      <div style={styles.row}>
        <label style={styles.label}>Blur</label>
        <input
          type="range"
          min="0"
          max="20"
          value={element.filters?.blur || 0}
          onChange={(e) => updateFilter('blur', parseFloat(e.target.value))}
          style={styles.slider}
        />
        <span style={styles.sliderValue}>{element.filters?.blur || 0}</span>
        {(element.filters?.blur || 0) !== 0 && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              updateFilter('blur', 0);
            }}
            style={styles.resetButton}
            title="Reset to default"
            type="button"
          >
            ↺
          </button>
        )}
      </div>

      <div style={styles.row}>
        <label style={styles.label}>Brightness</label>
        <input
          type="range"
          min="0"
          max="200"
          value={element.filters?.brightness || 100}
          onChange={(e) => updateFilter('brightness', parseFloat(e.target.value))}
          style={styles.slider}
        />
        <span style={styles.sliderValue}>{element.filters?.brightness || 100}%</span>
        {(element.filters?.brightness || 100) !== 100 && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              updateFilter('brightness', 100);
            }}
            style={styles.resetButton}
            title="Reset to default"
            type="button"
          >
            ↺
          </button>
        )}
      </div>

      <div style={styles.row}>
        <label style={styles.label}>Contrast</label>
        <input
          type="range"
          min="0"
          max="200"
          value={element.filters?.contrast || 100}
          onChange={(e) => updateFilter('contrast', parseFloat(e.target.value))}
          style={styles.slider}
        />
        <span style={styles.sliderValue}>{element.filters?.contrast || 100}%</span>
        {(element.filters?.contrast || 100) !== 100 && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              updateFilter('contrast', 100);
            }}
            style={styles.resetButton}
            title="Reset to default"
            type="button"
          >
            ↺
          </button>
        )}
      </div>

      <div style={styles.row}>
        <label style={styles.label}>Grayscale</label>
        <input
          type="range"
          min="0"
          max="100"
          value={element.filters?.grayscale || 0}
          onChange={(e) => updateFilter('grayscale', parseFloat(e.target.value))}
          style={styles.slider}
        />
        <span style={styles.sliderValue}>{element.filters?.grayscale || 0}%</span>
        {(element.filters?.grayscale || 0) !== 0 && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              updateFilter('grayscale', 0);
            }}
            style={styles.resetButton}
            title="Reset to default"
            type="button"
          >
            ↺
          </button>
        )}
      </div>

      <div style={styles.row}>
        <label style={styles.label}>Hue Rotate</label>
        <input
          type="range"
          min="0"
          max="360"
          value={element.filters?.hueRotate || 0}
          onChange={(e) => updateFilter('hueRotate', parseFloat(e.target.value))}
          style={styles.slider}
        />
        <span style={styles.sliderValue}>{element.filters?.hueRotate || 0}°</span>
        {(element.filters?.hueRotate || 0) !== 0 && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              updateFilter('hueRotate', 0);
            }}
            style={styles.resetButton}
            title="Reset to default"
            type="button"
          >
            ↺
          </button>
        )}
      </div>

      <div style={styles.row}>
        <label style={styles.label}>Invert</label>
        <input
          type="range"
          min="0"
          max="100"
          value={element.filters?.invert || 0}
          onChange={(e) => updateFilter('invert', parseFloat(e.target.value))}
          style={styles.slider}
        />
        <span style={styles.sliderValue}>{element.filters?.invert || 0}%</span>
        {(element.filters?.invert || 0) !== 0 && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              updateFilter('invert', 0);
            }}
            style={styles.resetButton}
            title="Reset to default"
            type="button"
          >
            ↺
          </button>
        )}
      </div>

      <div style={styles.row}>
        <label style={styles.label}>Saturate</label>
        <input
          type="range"
          min="0"
          max="200"
          value={element.filters?.saturate || 100}
          onChange={(e) => updateFilter('saturate', parseFloat(e.target.value))}
          style={styles.slider}
        />
        <span style={styles.sliderValue}>{element.filters?.saturate || 100}%</span>
        {(element.filters?.saturate || 100) !== 100 && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              updateFilter('saturate', 100);
            }}
            style={styles.resetButton}
            title="Reset to default"
            type="button"
          >
            ↺
          </button>
        )}
      </div>

      <div style={styles.row}>
        <label style={styles.label}>Sepia</label>
        <input
          type="range"
          min="0"
          max="100"
          value={element.filters?.sepia || 0}
          onChange={(e) => updateFilter('sepia', parseFloat(e.target.value))}
          style={styles.slider}
        />
        <span style={styles.sliderValue}>{element.filters?.sepia || 0}%</span>
        {(element.filters?.sepia || 0) !== 0 && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              updateFilter('sepia', 0);
            }}
            style={styles.resetButton}
            title="Reset to default"
            type="button"
          >
            ↺
          </button>
        )}
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
    alignItems: 'flex-start',
    marginBottom: '8px'
  },
  label: {
    flex: '0 0 70px',
    fontSize: '12px',
    color: '#b0b0b0',
    paddingTop: '4px'
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
  textarea: {
    flex: 1,
    padding: '4px 8px',
    background: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '4px',
    color: '#e0e0e0',
    fontSize: '12px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit'
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
  colorInput: {
    width: '32px',
    height: '24px',
    padding: '0',
    border: '1px solid #333',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  buttonGroup: {
    flex: 1,
    display: 'flex',
    gap: '2px'
  },
  alignButton: {
    flex: 1,
    padding: '4px',
    background: '#1a1a1a',
    border: '1px solid #333',
    color: '#888',
    fontSize: '11px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  alignButtonActive: {
    background: '#1976d2',
    border: '1px solid #1976d2',
    color: '#fff'
  },
  unit: {
    fontSize: '11px',
    color: '#666',
    marginLeft: '4px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flex: 1,
    fontSize: '12px',
    color: '#b0b0b0',
    cursor: 'pointer'
  },
  checkbox: {
    cursor: 'pointer'
  },
  slider: {
    flex: 1,
    marginRight: '8px'
  },
  sliderValue: {
    minWidth: '40px',
    fontSize: '11px',
    color: '#888',
    textAlign: 'right'
  },
  resetButton: {
    padding: '2px 6px',
    marginLeft: '8px',
    background: '#333',
    border: '1px solid #444',
    borderRadius: '4px',
    color: '#888',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      background: '#444',
      color: '#bbb'
    }
  }
};