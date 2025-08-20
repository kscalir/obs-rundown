import React, { useState } from 'react';
import { Play, Pause, SkipStartFill, SkipEndFill } from 'react-bootstrap-icons';

/**
 * Enhanced Timeline Component
 * Building up timeline functionality gradually
 */
const SimpleTimeline = ({ elements = [], onTimelineUpdate }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(10); // 10 seconds
  const [selectedTracks, setSelectedTracks] = useState([]);

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
    console.log('Timeline play/pause:', !isPlaying);
    
    // Notify parent of timeline state change
    if (onTimelineUpdate) {
      onTimelineUpdate({
        isPlaying: !isPlaying,
        currentTime,
        duration
      });
    }
  };

  const handleSeekStart = () => {
    setCurrentTime(0);
    console.log('Timeline seek to start');
    
    if (onTimelineUpdate) {
      onTimelineUpdate({
        isPlaying,
        currentTime: 0,
        duration
      });
    }
  };

  const handleSeekEnd = () => {
    setCurrentTime(duration);
    console.log('Timeline seek to end');
    
    if (onTimelineUpdate) {
      onTimelineUpdate({
        isPlaying,
        currentTime: duration,
        duration
      });
    }
  };

  // Create track name for element
  const getElementTrackName = (element) => {
    if (element.name && element.name.trim()) {
      return element.name;
    }
    
    switch (element.type) {
      case 'text':
        return element.text ? `Text: ${element.text.substring(0, 15)}...` : 'Text Element';
      case 'rect':
        return 'Rectangle';
      case 'circle':
        return 'Circle';
      case 'image':
        return 'Image';
      case 'video':
        return 'Video';
      default:
        return `${element.type} Element`;
    }
  };

  // Convert time to pixel position for timeline ruler
  const timeToPixel = (time, width = 400) => {
    return (time / duration) * width;
  };

  return (
    <div style={{
      height: '200px',
      background: '#1a1a1a',
      border: '1px solid #333',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Playback Controls */}
      <div style={{
        height: '40px',
        background: '#2a2a2a',
        borderBottom: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        padding: '0 10px',
        gap: '10px'
      }}>
        <button
          onClick={handleSeekStart}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            padding: '5px'
          }}
        >
          <SkipStartFill size={16} />
        </button>
        
        <button
          onClick={handlePlay}
          style={{
            background: isPlaying ? '#f44336' : '#4caf50',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            padding: '5px 10px',
            borderRadius: '4px'
          }}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        
        <button
          onClick={handleSeekEnd}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            padding: '5px'
          }}
        >
          <SkipEndFill size={16} />
        </button>

        <div style={{
          marginLeft: '20px',
          fontSize: '12px',
          color: '#888'
        }}>
          {currentTime.toFixed(2)}s / {duration}s
        </div>

        <div style={{
          marginLeft: 'auto',
          fontSize: '12px',
          color: '#888'
        }}>
          Timeline System
        </div>
      </div>

      {/* Timeline Ruler */}
      <div style={{
        height: '30px',
        background: '#2a2a2a',
        borderBottom: '1px solid #444',
        position: 'relative',
        marginLeft: '200px'
      }}>
        {/* Time markers */}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(time => (
          <div
            key={time}
            style={{
              position: 'absolute',
              left: timeToPixel(time, 400),
              top: 0,
              height: '20px',
              borderLeft: '1px solid #555',
              fontSize: '10px',
              color: '#888',
              paddingLeft: '2px'
            }}
          >
            {time}s
          </div>
        ))}
        
        {/* Playhead */}
        <div
          style={{
            position: 'absolute',
            left: timeToPixel(currentTime, 400),
            top: 0,
            width: '2px',
            height: '100%',
            background: '#4caf50',
            zIndex: 10
          }}
        >
          <div style={{
            position: 'absolute',
            top: '-5px',
            left: '-8px',
            width: '18px',
            height: '15px',
            background: '#4caf50',
            clipPath: 'polygon(50% 100%, 0 0, 100% 0)'
          }} />
        </div>
      </div>

      {/* Timeline Tracks */}
      <div style={{
        flex: 1,
        overflowY: 'auto'
      }}>
        {elements.length > 0 ? (
          elements.map((element, index) => (
            <div
              key={element.id}
              style={{
                height: '40px',
                background: selectedTracks.includes(element.id) ? '#333' : '#1a1a1a',
                borderBottom: '1px solid #333',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer'
              }}
              onClick={() => {
                setSelectedTracks(prev => 
                  prev.includes(element.id) 
                    ? prev.filter(id => id !== element.id)
                    : [...prev, element.id]
                );
              }}
            >
              {/* Track Name */}
              <div style={{
                width: '200px',
                padding: '0 10px',
                fontSize: '12px',
                color: '#fff',
                borderRight: '1px solid #333',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ 
                  fontSize: '10px',
                  color: '#666'
                }}>
                  ▼
                </span>
                <span>{getElementTrackName(element)}</span>
              </div>
              
              {/* Track Timeline Area */}
              <div style={{
                flex: 1,
                height: '100%',
                position: 'relative',
                background: selectedTracks.includes(element.id) ? '#333' : 'transparent'
              }}>
                {/* Placeholder for future keyframes */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '20px',
                  transform: 'translateY(-50%)',
                  fontSize: '10px',
                  color: '#555',
                  fontStyle: 'italic'
                }}>
                  Click to add keyframes...
                </div>
              </div>
            </div>
          ))
        ) : (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: '#666',
            fontSize: '12px'
          }}>
            Add elements to the canvas to create animation tracks
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleTimeline;