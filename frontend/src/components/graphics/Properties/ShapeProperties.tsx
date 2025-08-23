import React from 'react';
import { ColorPicker } from '../components/ColorPicker';
import type { ShapeElement } from '../types';

interface ShapePropertiesProps {
  element: ShapeElement;
  onUpdate: (updates: Partial<ShapeElement>) => void;
}

export const ShapeProperties: React.FC<ShapePropertiesProps> = ({ element, onUpdate }) => {
  return (
    <div style={styles.section}>
      <h4 style={styles.sectionTitle}>Shape</h4>
      
      <div style={styles.row}>
        <label style={styles.label}>Type</label>
        <select
          value={element.shapeType}
          onChange={(e) => onUpdate({ shapeType: e.target.value as ShapeElement['shapeType'] })}
          style={styles.select}
        >
          <option value="rectangle">Rectangle</option>
          <option value="circle">Circle</option>
          <option value="ellipse">Ellipse</option>
          <option value="triangle">Triangle</option>
          <option value="pentagon">Pentagon</option>
          <option value="hexagon">Hexagon</option>
          <option value="octagon">Octagon</option>
          <option value="star">Star</option>
          <option value="heart">Heart</option>
          <option value="cross">Cross</option>
          <option value="line">Line</option>
          <option value="arrow">Arrow</option>
        </select>
      </div>

      <div style={styles.row}>
        <label style={styles.label}>Fill</label>
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
        <label style={styles.label}>Stroke</label>
        <div style={styles.inputGroup}>
          {element.stroke ? (
            <ColorPicker
              value={element.stroke}
              onChange={(value) => {
                // Only accept solid colors for stroke
                if (typeof value === 'string') {
                  onUpdate({ stroke: value });
                }
              }}
              showGradient={false}
            />
          ) : (
            <div style={styles.noColor}>None</div>
          )}
          <input
            type="text"
            value={element.stroke || ''}
            onChange={(e) => onUpdate({ stroke: e.target.value || undefined })}
            style={styles.input}
            placeholder="None"
          />
        </div>
      </div>

      {element.stroke && (
        <div style={styles.row}>
          <label style={styles.label}>Stroke Width</label>
          <div style={styles.inputGroup}>
            <input
              type="number"
              value={element.strokeWidth || 1}
              onChange={(e) => onUpdate({ strokeWidth: parseFloat(e.target.value) || 1 })}
              style={{ ...styles.input, flex: 1 }}
              min="0"
              step="0.5"
            />
            <span style={styles.unit}>px</span>
          </div>
        </div>
      )}

      {element.shapeType === 'rectangle' && (
        <div style={styles.row}>
          <label style={styles.label}>Corner Radius</label>
          <div style={styles.inputGroup}>
            <input
              type="number"
              value={typeof element.cornerRadius === 'number' ? element.cornerRadius : 0}
              onChange={(e) => onUpdate({ cornerRadius: parseFloat(e.target.value) || 0 })}
              style={{ ...styles.input, flex: 1 }}
              min="0"
            />
            <span style={styles.unit}>px</span>
          </div>
        </div>
      )}

      {element.strokeDashArray && (
        <div style={styles.row}>
          <label style={styles.label}>Dash Pattern</label>
          <input
            type="text"
            value={element.strokeDashArray?.join(' ') || ''}
            onChange={(e) => {
              const values = e.target.value.split(' ').map(v => parseFloat(v)).filter(v => !isNaN(v));
              onUpdate({ strokeDashArray: values.length > 0 ? values : undefined });
            }}
            style={styles.input}
            placeholder="5 10"
          />
        </div>
      )}

      {/* Shadow properties */}
      <h4 style={{ ...styles.sectionTitle, marginTop: '16px' }}>Shadow</h4>
      
      <div style={styles.row}>
        <label style={styles.label}>Color</label>
        <div style={styles.inputGroup}>
          <input
            type="color"
            value={element.shadow?.color || '#000000'}
            onChange={(e) => onUpdate({ 
              shadow: { 
                ...element.shadow,
                color: e.target.value,
                blur: element.shadow?.blur || 10,
                offsetX: element.shadow?.offsetX || 0,
                offsetY: element.shadow?.offsetY || 0
              }
            })}
            style={styles.colorInput}
          />
          <input
            type="text"
            value={element.shadow?.color || ''}
            onChange={(e) => {
              if (!e.target.value) {
                onUpdate({ shadow: undefined });
              } else {
                onUpdate({ 
                  shadow: { 
                    ...element.shadow,
                    color: e.target.value,
                    blur: element.shadow?.blur || 10,
                    offsetX: element.shadow?.offsetX || 0,
                    offsetY: element.shadow?.offsetY || 0
                  }
                });
              }
            }}
            style={styles.input}
            placeholder="None"
          />
        </div>
      </div>

      {element.shadow && (
        <>
          <div style={styles.row}>
            <label style={styles.label}>Blur</label>
            <input
              type="number"
              value={element.shadow.blur}
              onChange={(e) => onUpdate({ 
                shadow: { ...element.shadow, blur: parseFloat(e.target.value) || 0 }
              })}
              style={styles.input}
              min="0"
            />
          </div>

          <div style={styles.row}>
            <label style={styles.label}>Offset</label>
            <div style={styles.inputGroup}>
              <input
                type="number"
                value={element.shadow.offsetX}
                onChange={(e) => onUpdate({ 
                  shadow: { ...element.shadow, offsetX: parseFloat(e.target.value) || 0 }
                })}
                style={styles.input}
                placeholder="X"
              />
              <input
                type="number"
                value={element.shadow.offsetY}
                onChange={(e) => onUpdate({ 
                  shadow: { ...element.shadow, offsetY: parseFloat(e.target.value) || 0 }
                })}
                style={styles.input}
                placeholder="Y"
              />
            </div>
          </div>
        </>
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
  colorInput: {
    width: '32px',
    height: '24px',
    padding: '0',
    border: '1px solid #333',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  unit: {
    fontSize: '11px',
    color: '#666',
    marginLeft: '4px'
  },
  noColor: {
    width: '32px',
    height: '24px',
    border: '1px solid #333',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    color: '#666',
    background: '#1a1a1a'
  }
};