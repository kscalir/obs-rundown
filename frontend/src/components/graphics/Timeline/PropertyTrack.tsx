import React, { useState } from 'react';

interface Keyframe {
  time: number;
  value: any;
  easing?: string;
}

interface PropertyTrackProps {
  elementId: string;
  propertyName: string;
  keyframes: Keyframe[];
  currentTime: number;
  duration: number;
  onAddKeyframe: (value: any) => void;
  onDeleteKeyframe: (time: number) => void;
  onUpdateKeyframe: (time: number, value: any) => void;
}

export const PropertyTrack: React.FC<PropertyTrackProps> = ({
  elementId,
  propertyName,
  keyframes,
  currentTime,
  duration,
  onAddKeyframe,
  onDeleteKeyframe,
  onUpdateKeyframe,
}) => {
  const [selectedKeyframe, setSelectedKeyframe] = useState<number | null>(null);
  const [draggingKeyframe, setDraggingKeyframe] = useState<number | null>(null);

  const getKeyframePosition = (time: number): number => {
    return (time / duration) * 100;
  };

  const getKeyframeShape = (value: any): 'diamond' | 'square' | 'circle' => {
    if (typeof value === 'number') return 'diamond';
    if (typeof value === 'boolean') return 'square';
    if (typeof value === 'string' && value.match(/^#[0-9A-Fa-f]{6}$/)) return 'circle';
    return 'diamond';
  };

  const getKeyframeColor = (value: any): string => {
    if (typeof value === 'number') return '#4CAF50';
    if (typeof value === 'boolean') return value ? '#2196F3' : '#607D8B';
    if (typeof value === 'string' && value.match(/^#[0-9A-Fa-f]{6}$/)) return value;
    return '#FF9800';
  };

  const handleKeyframeClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedKeyframe(index);
    
    if (e.shiftKey && selectedKeyframe !== null) {
      // Multi-select with shift
      // This would be expanded for multi-selection logic
    }
  };

  const handleKeyframeContextMenu = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Show context menu
    const kf = keyframes[index];
    if (window.confirm(`Delete keyframe at ${kf.time.toFixed(2)}s?`)) {
      onDeleteKeyframe(kf.time);
    }
  };

  const handleKeyframeDoubleClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const kf = keyframes[index];
    
    // Show value editor based on type
    let newValue = kf.value;
    if (typeof kf.value === 'number') {
      const input = window.prompt(`Enter value for ${propertyName}:`, kf.value.toString());
      if (input !== null) {
        newValue = parseFloat(input);
        if (!isNaN(newValue)) {
          onUpdateKeyframe(kf.time, newValue);
        }
      }
    } else if (typeof kf.value === 'boolean') {
      newValue = !kf.value;
      onUpdateKeyframe(kf.time, newValue);
    } else if (typeof kf.value === 'string') {
      const input = window.prompt(`Enter value for ${propertyName}:`, kf.value);
      if (input !== null) {
        onUpdateKeyframe(kf.time, input);
      }
    }
  };

  const handleTrackClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / rect.width) * duration;
    
    // Get current value at this time or use default
    let value = 0;
    if (keyframes.length > 0) {
      // Find interpolated value
      const before = keyframes.filter(kf => kf.time <= time).pop();
      const after = keyframes.find(kf => kf.time > time);
      
      if (before && !after) {
        value = before.value;
      } else if (!before && after) {
        value = after.value;
      } else if (before && after) {
        // Interpolate
        const t = (time - before.time) / (after.time - before.time);
        if (typeof before.value === 'number' && typeof after.value === 'number') {
          value = before.value + (after.value - before.value) * t;
        } else {
          value = t < 0.5 ? before.value : after.value;
        }
      }
    }
    
    // Add keyframe at clicked position
    onAddKeyframe(value);
  };

  const handleKeyframeMouseDown = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggingKeyframe(index);
    
    const startX = e.clientX;
    const startTime = keyframes[index].time;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const trackWidth = (e.currentTarget.parentElement as HTMLElement).offsetWidth;
      const deltaTime = (deltaX / trackWidth) * duration;
      const newTime = Math.max(0, Math.min(duration, startTime + deltaTime));
      
      // Update keyframe time (would need to implement this)
      // For now, just visual feedback
    };
    
    const handleMouseUp = () => {
      setDraggingKeyframe(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      height: '24px',
      borderBottom: '1px solid #1a1a1a'
    }}>
      <div style={{
        width: '120px',
        padding: '0 8px',
        fontSize: '11px',
        color: '#999',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {propertyName}
      </div>
      
      <div 
        onClick={handleTrackClick}
        style={{
          flex: 1,
          height: '100%',
          position: 'relative',
          backgroundColor: '#1a1a1a',
          cursor: 'crosshair'
        }}
      >
        {/* Current time indicator */}
        <div style={{
          position: 'absolute',
          left: `${getKeyframePosition(currentTime)}%`,
          top: 0,
          bottom: 0,
          width: '1px',
          backgroundColor: '#ff4444',
          pointerEvents: 'none',
          zIndex: 10
        }} />
        
        {/* Keyframes */}
        {keyframes.map((kf, index) => {
          const shape = getKeyframeShape(kf.value);
          const color = getKeyframeColor(kf.value);
          const isSelected = selectedKeyframe === index;
          const isDragging = draggingKeyframe === index;
          
          return (
            <div
              key={`${elementId}-${propertyName}-${index}`}
              onClick={(e) => handleKeyframeClick(index, e)}
              onContextMenu={(e) => handleKeyframeContextMenu(index, e)}
              onDoubleClick={(e) => handleKeyframeDoubleClick(index, e)}
              onMouseDown={(e) => handleKeyframeMouseDown(index, e)}
              style={{
                position: 'absolute',
                left: `${getKeyframePosition(kf.time)}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: shape === 'diamond' ? '10px' : '8px',
                height: shape === 'diamond' ? '10px' : '8px',
                backgroundColor: color,
                border: `2px solid ${isSelected ? '#fff' : 'transparent'}`,
                borderRadius: shape === 'circle' ? '50%' : shape === 'square' ? '0' : '0',
                cursor: isDragging ? 'grabbing' : 'grab',
                zIndex: isSelected ? 20 : 5,
                transition: isDragging ? 'none' : 'all 0.1s ease'
              }}
              title={`${propertyName}: ${kf.value} at ${kf.time.toFixed(2)}s`}
            />
          );
        })}
        
        {/* Grid lines */}
        {Array.from({ length: 11 }, (_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${i * 10}%`,
              top: 0,
              bottom: 0,
              width: '1px',
              backgroundColor: i % 5 === 0 ? '#333' : '#222',
              pointerEvents: 'none'
            }}
          />
        ))}
      </div>
    </div>
  );
};