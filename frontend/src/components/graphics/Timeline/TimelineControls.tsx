import React from 'react';

interface TimelineControlsProps {
  playing: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  autoKey: boolean;
  onPlay: () => void;
  onStop: () => void;
  onTimeChange: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onPlaybackRateChange: (rate: number) => void;
  onAutoKeyChange: (enabled: boolean) => void;
}

export const TimelineControls: React.FC<TimelineControlsProps> = ({
  playing,
  currentTime,
  duration,
  playbackRate,
  autoKey,
  onPlay,
  onStop,
  onTimeChange,
  onDurationChange,
  onPlaybackRateChange,
  onAutoKeyChange,
}) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30); // Assuming 30fps
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${frames.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '8px 12px',
      backgroundColor: '#2a2a2a',
      borderBottom: '1px solid #333'
    }}>
      {/* Play/Pause button */}
      <button
        onClick={onPlay}
        style={{
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#444',
          border: 'none',
          borderRadius: '4px',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        {playing ? '⏸' : '▶'}
      </button>

      {/* Stop button */}
      <button
        onClick={onStop}
        style={{
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#444',
          border: 'none',
          borderRadius: '4px',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        ⏹
      </button>

      {/* Frame step buttons */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={() => onTimeChange(Math.max(0, currentTime - 1/30))}
          style={{
            width: '24px',
            height: '24px',
            backgroundColor: '#444',
            border: 'none',
            borderRadius: '3px',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          ◀
        </button>
        <button
          onClick={() => onTimeChange(Math.min(duration, currentTime + 1/30))}
          style={{
            width: '24px',
            height: '24px',
            backgroundColor: '#444',
            border: 'none',
            borderRadius: '3px',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          ▶
        </button>
      </div>

      {/* Time display */}
      <div style={{
        padding: '4px 8px',
        backgroundColor: '#1a1a1a',
        borderRadius: '3px',
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#fff',
        minWidth: '80px',
        textAlign: 'center'
      }}>
        {formatTime(currentTime)}
      </div>

      {/* Time scrubber */}
      <input
        type="range"
        min={0}
        max={duration}
        step={0.01}
        value={currentTime}
        onChange={(e) => onTimeChange(parseFloat(e.target.value))}
        style={{
          flex: 1,
          height: '4px',
          backgroundColor: '#444',
          outline: 'none',
          cursor: 'pointer'
        }}
      />

      {/* Duration input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <label style={{ fontSize: '11px', color: '#999' }}>Duration:</label>
        <input
          type="number"
          min={1}
          max={3600}
          step={1}
          value={duration}
          onChange={(e) => onDurationChange(parseFloat(e.target.value))}
          style={{
            width: '50px',
            padding: '2px 4px',
            backgroundColor: '#1a1a1a',
            border: '1px solid #444',
            borderRadius: '3px',
            color: '#fff',
            fontSize: '11px'
          }}
        />
        <span style={{ fontSize: '11px', color: '#999' }}>s</span>
      </div>

      {/* Playback speed */}
      <select
        value={playbackRate}
        onChange={(e) => onPlaybackRateChange(parseFloat(e.target.value))}
        style={{
          padding: '4px 8px',
          backgroundColor: '#1a1a1a',
          border: '1px solid #444',
          borderRadius: '3px',
          color: '#fff',
          fontSize: '11px',
          cursor: 'pointer'
        }}
      >
        <option value={0.25}>0.25x</option>
        <option value={0.5}>0.5x</option>
        <option value={1}>1x</option>
        <option value={2}>2x</option>
        <option value={4}>4x</option>
      </select>

      {/* Loop button */}
      <button
        style={{
          width: '32px',
          height: '24px',
          backgroundColor: '#444',
          border: 'none',
          borderRadius: '3px',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '12px'
        }}
        title="Loop"
      >
        🔁
      </button>

      {/* Auto-key button */}
      <button
        onClick={() => onAutoKeyChange(!autoKey)}
        style={{
          padding: '4px 12px',
          backgroundColor: autoKey ? '#d44' : '#444',
          border: 'none',
          borderRadius: '3px',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: autoKey ? 'bold' : 'normal'
        }}
        title="Auto-keyframe mode"
      >
        {autoKey ? '🔴 AUTO' : '⭕ AUTO'}
      </button>
    </div>
  );
};