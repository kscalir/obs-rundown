import React, { useMemo } from 'react';
import type { Element } from '../types';
import { debounce } from '../utils/debounce';

interface MoveablePropertiesProps {
  element: Element;
  onUpdate: (updates: Partial<Element>) => void;
}

export const MoveableProperties: React.FC<MoveablePropertiesProps> = ({ element, onUpdate }) => {
  // Debounce updates for performance
  const debouncedUpdate = useMemo(
    () => debounce((updates: Partial<Element>) => {
      onUpdate(updates);
    }, 100),
    [onUpdate, element.id]
  );

  // Advanced properties that Moveable supports
  const skewX = element.skewX || 0;
  const skewY = element.skewY || 0;
  const cornerRadius = element.cornerRadius || 0;
  const clipPath = element.clipPath || '';
  const warpMatrix = element.warpMatrix || null;
  const transformOrigin = element.transformOrigin || '50% 50%';

  return (
    <div style={styles.section}>
      <h4 style={styles.sectionTitle}>Advanced Transform</h4>
      
      {/* Skew */}
      <div style={styles.row}>
        <label style={styles.label}>Skew</label>
        <div style={styles.inputGroup}>
          <input
            type="number"
            value={skewX}
            onChange={(e) => debouncedUpdate({ skewX: parseFloat(e.target.value) || 0 })}
            style={styles.input}
            placeholder="X"
            step="1"
          />
          <input
            type="number"
            value={skewY}
            onChange={(e) => debouncedUpdate({ skewY: parseFloat(e.target.value) || 0 })}
            style={styles.input}
            placeholder="Y"
            step="1"
          />
          <span style={styles.unit}>°</span>
        </div>
      </div>

      {/* Corner Radius (Roundable) */}
      <div style={styles.row}>
        <label style={styles.label}>Corners</label>
        <div style={styles.inputGroup}>
          <input
            type="number"
            value={cornerRadius}
            onChange={(e) => debouncedUpdate({ cornerRadius: parseFloat(e.target.value) || 0 })}
            style={{ ...styles.input, flex: 1 }}
            placeholder="0"
            min="0"
          />
          <span style={styles.unit}>px</span>
        </div>
      </div>

      {/* Transform Origin */}
      <div style={styles.row}>
        <label style={styles.label}>Origin</label>
        <div style={styles.inputGroup}>
          <select
            value={transformOrigin}
            onChange={(e) => debouncedUpdate({ transformOrigin: e.target.value })}
            style={{ ...styles.input, flex: 1 }}
          >
            <option value="0% 0%">Top Left</option>
            <option value="50% 0%">Top Center</option>
            <option value="100% 0%">Top Right</option>
            <option value="0% 50%">Center Left</option>
            <option value="50% 50%">Center</option>
            <option value="100% 50%">Center Right</option>
            <option value="0% 100%">Bottom Left</option>
            <option value="50% 100%">Bottom Center</option>
            <option value="100% 100%">Bottom Right</option>
          </select>
        </div>
      </div>

      {/* Clip Path (Clippable) */}
      <div style={styles.row}>
        <label style={styles.label}>Clip</label>
        <div style={styles.inputGroup}>
          <select
            value={clipPath ? 'custom' : 'none'}
            onChange={(e) => {
              if (e.target.value === 'none') {
                debouncedUpdate({ clipPath: '' });
              } else if (e.target.value === 'circle') {
                debouncedUpdate({ clipPath: 'circle(50%)' });
              } else if (e.target.value === 'ellipse') {
                debouncedUpdate({ clipPath: 'ellipse(50% 30%)' });
              } else if (e.target.value === 'inset') {
                debouncedUpdate({ clipPath: 'inset(10px)' });
              }
            }}
            style={{ ...styles.input, flex: 1 }}
          >
            <option value="none">None</option>
            <option value="circle">Circle</option>
            <option value="ellipse">Ellipse</option>
            <option value="inset">Inset</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>

      {/* Custom Clip Path Input */}
      {clipPath && (
        <div style={styles.row}>
          <label style={styles.label}></label>
          <div style={styles.inputGroup}>
            <input
              type="text"
              value={clipPath}
              onChange={(e) => debouncedUpdate({ clipPath: e.target.value })}
              style={{ ...styles.input, flex: 1 }}
              placeholder="clip-path value"
            />
          </div>
        </div>
      )}

      {/* Warp Status (Warpable) */}
      {warpMatrix && (
        <div style={styles.row}>
          <label style={styles.label}>Warp</label>
          <div style={styles.inputGroup}>
            <span style={styles.status}>Active</span>
            <button
              onClick={() => debouncedUpdate({ warpMatrix: null })}
              style={styles.resetButton}
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Info about Moveable controls */}
      <div style={styles.info}>
        <div style={styles.infoTitle}>Moveable Controls</div>
        <div style={styles.infoItem}>• Drag corners to resize</div>
        <div style={styles.infoItem}>• Drag edges for 1D resize</div>
        <div style={styles.infoItem}>• Top handle to rotate</div>
        <div style={styles.infoItem}>• Hold Shift for aspect ratio</div>
        <div style={styles.infoItem}>• Ctrl+drag to move origin</div>
        <div style={styles.infoItem}>• Double-click corners for round</div>
        <div style={styles.infoItem}>• Alt+drag for warp mode</div>
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
  },
  status: {
    fontSize: '11px',
    color: '#4CAF50',
    flex: 1
  },
  resetButton: {
    padding: '2px 8px',
    background: '#333',
    border: '1px solid #555',
    borderRadius: '3px',
    color: '#e0e0e0',
    fontSize: '11px',
    cursor: 'pointer'
  },
  info: {
    marginTop: '16px',
    padding: '8px',
    background: '#1a1a1a',
    borderRadius: '4px',
    border: '1px solid #333'
  },
  infoTitle: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#999',
    marginBottom: '6px'
  },
  infoItem: {
    fontSize: '10px',
    color: '#666',
    marginBottom: '2px'
  }
};