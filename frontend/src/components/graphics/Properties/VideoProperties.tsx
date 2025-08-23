import React from 'react';
import { PlayFill, PauseFill, StopFill, ArrowRepeat, VolumeUpFill, VolumeMuteFill } from 'react-bootstrap-icons';
import type { VideoElement } from '../types';

interface VideoPropertiesProps {
  element: VideoElement;
  onUpdate: (updates: Partial<VideoElement>) => void;
}

export const VideoProperties: React.FC<VideoPropertiesProps> = ({ element, onUpdate }) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Video Controls</h4>
        
        <div style={styles.row}>
          <button
            style={{
              ...styles.button,
              ...(element.playing ? styles.buttonActive : {})
            }}
            onClick={() => onUpdate({ playing: !element.playing })}
            title={element.playing ? 'Pause' : 'Play'}
          >
            {element.playing ? <PauseFill size={14} /> : <PlayFill size={14} />}
          </button>
          
          <button
            style={styles.button}
            onClick={() => onUpdate({ currentTime: 0, playing: false })}
            title="Stop"
          >
            <StopFill size={14} />
          </button>
        </div>
        
        <div style={styles.row}>
          <label style={styles.label}>
            <input
              type="checkbox"
              checked={element.loop || false}
              onChange={(e) => onUpdate({ loop: e.target.checked })}
              style={styles.checkbox}
            />
            Loop
          </label>
          
          <label style={styles.label}>
            <input
              type="checkbox"
              checked={element.muted || false}
              onChange={(e) => onUpdate({ muted: e.target.checked })}
              style={styles.checkbox}
            />
            Muted
          </label>
        </div>
        
        <div style={styles.row}>
          <label style={styles.label}>Volume</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={element.volume || 1}
            onChange={(e) => onUpdate({ volume: parseFloat(e.target.value) })}
            style={styles.slider}
          />
          <span style={styles.value}>{Math.round((element.volume || 1) * 100)}%</span>
        </div>
        
        <div style={styles.row}>
          <label style={styles.label}>Time</label>
          <input
            type="range"
            min="0"
            max={element.duration || 0}
            step="0.1"
            value={element.currentTime || 0}
            onChange={(e) => onUpdate({ currentTime: parseFloat(e.target.value) })}
            style={styles.slider}
          />
          <span style={styles.value}>
            {formatTime(element.currentTime || 0)} / {formatTime(element.duration || 0)}
          </span>
        </div>
      </div>
      
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Video Info</h4>
        <div style={styles.info}>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>File:</span>
            <span style={styles.infoValue}>{element.name}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Duration:</span>
            <span style={styles.infoValue}>{formatTime(element.duration || 0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginTop: '16px'
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: '0 0 8px 0'
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  label: {
    fontSize: '12px',
    color: '#aaa',
    minWidth: '60px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  button: {
    padding: '4px 12px',
    fontSize: '12px',
    background: '#333',
    border: '1px solid #444',
    borderRadius: '3px',
    color: '#ddd',
    cursor: 'pointer',
    transition: 'all 0.2s',
    flex: 1
  },
  buttonActive: {
    background: '#1976d2',
    borderColor: '#1976d2',
    color: '#fff'
  },
  checkbox: {
    marginRight: '4px'
  },
  slider: {
    flex: 1,
    height: '20px',
    background: 'transparent'
  },
  value: {
    fontSize: '11px',
    color: '#888',
    minWidth: '60px',
    textAlign: 'right'
  },
  info: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px'
  },
  infoLabel: {
    color: '#888'
  },
  infoValue: {
    color: '#aaa',
    fontFamily: 'monospace'
  }
};