import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipStartFill, SkipEndFill } from 'react-bootstrap-icons';
import { timelineManager, EASING_PRESETS } from './TimelineSystem';

/**
 * Timeline Component
 * Professional animation timeline interface inspired by After Effects
 */
const Timeline = ({ elements = [], onTimelineUpdate }) => {
  const [timeline, setTimeline] = useState(timelineManager.getState());
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [draggedKeyframe, setDraggedKeyframe] = useState(null);
  const [showProperties, setShowProperties] = useState({});
  
  const timelineRef = useRef();
  const playheadRef = useRef();

  // Early return if timeline not initialized
  if (!timeline) {
    return (
      <div style={{
        height: '200px',
        background: '#1a1a1a',
        border: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#666'
      }}>
        Loading Timeline...
      </div>
    );
  }

  // Subscribe to timeline changes
  useEffect(() => {
    try {
      const unsubscribe = timelineManager.subscribe((newTimeline) => {
        setTimeline(newTimeline);
        if (onTimelineUpdate) {
          onTimelineUpdate(newTimeline);
        }
      });
      return unsubscribe;
    } catch (error) {
      console.error('Timeline subscription error:', error);
    }
  }, [onTimelineUpdate]);

  // Sync tracks with elements
  useEffect(() => {
    if (!elements || !Array.isArray(elements) || !timeline || !timeline.tracks) {
      return;
    }
    
    try {
      elements.forEach(element => {
        const existingTrack = timeline.tracks.find(track => track.elementId === element.id);
        if (!existingTrack) {
          timelineManager.createTrack(element);
        }
      });
      
      // Remove tracks for deleted elements
      timeline.tracks.forEach(track => {
        const elementExists = elements.find(el => el.id === track.elementId);
        if (!elementExists) {
          timelineManager.timeline.tracks = timelineManager.timeline.tracks.filter(t => t.id !== track.id);
          timelineManager.notify();
        }
      });
    } catch (error) {
      console.error('Timeline sync error:', error);
    }
  }, [elements, timeline.tracks]);

  // Convert time to pixel position
  const timeToPixel = (time, width = 800) => {
    if (!timeline || !timeline.duration || timeline.duration <= 0) return 0;
    return (time / timeline.duration) * width;
  };

  // Convert pixel position to time
  const pixelToTime = (pixel, width = 800) => {
    if (!timeline || !timeline.duration || timeline.duration <= 0) return 0;
    return (pixel / width) * timeline.duration;
  };

  // Handle playhead drag
  const handlePlayheadDrag = (e) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - 150; // Account for track names width
    const newTime = pixelToTime(x, rect.width - 150);
    
    timelineManager.seek(Math.max(0, Math.min(newTime, timeline.duration)));
  };

  // Toggle track property visibility
  const toggleProperty = (trackId, propertyName) => {
    const key = `${trackId}-${propertyName}`;
    setShowProperties(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Add keyframe at current time
  const addKeyframe = (trackId, propertyName, value) => {
    timelineManager.addKeyframe(trackId, propertyName, timeline.currentTime, value);
  };

  // Time ruler component
  const TimeRuler = () => {
    const width = 800;
    const ticks = [];
    const step = 1; // 1 second intervals
    
    for (let t = 0; t <= timeline.duration; t += step) {
      const x = timeToPixel(t, width);
      ticks.push(
        <div
          key={t}
          style={{
            position: 'absolute',
            left: x,
            top: 0,
            height: '20px',
            borderLeft: '1px solid #555',
            fontSize: '10px',
            color: '#888',
            paddingLeft: '2px'
          }}
        >
          {t}s
        </div>
      );
    }

    return (
      <div style={{
        height: '30px',
        background: '#2a2a2a',
        borderBottom: '1px solid #444',
        position: 'relative',
        marginLeft: '150px'
      }}>
        {ticks}
        
        {/* Playhead */}
        <div
          ref={playheadRef}
          style={{
            position: 'absolute',
            left: timeToPixel(timeline.currentTime, width),
            top: 0,
            width: '2px',
            height: '100%',
            background: '#4caf50',
            cursor: 'ew-resize',
            zIndex: 10
          }}
          onMouseDown={(e) => {
            const handleMouseMove = (moveEvent) => handlePlayheadDrag(moveEvent);
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        >
          {/* Playhead handle */}
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
    );
  };

  // Keyframe component
  const Keyframe = ({ keyframe, trackId, propertyName, timelineWidth = 800 }) => (
    <div
      style={{
        position: 'absolute',
        left: timeToPixel(keyframe.time, timelineWidth) - 4,
        top: '50%',
        transform: 'translateY(-50%)',
        width: '8px',
        height: '8px',
        background: keyframe.selected ? '#4caf50' : '#4a90e2',
        borderRadius: '2px',
        cursor: 'pointer',
        border: '1px solid #fff'
      }}
      onClick={(e) => {
        e.stopPropagation();
        // Toggle keyframe selection
        keyframe.selected = !keyframe.selected;
        timelineManager.notify();
      }}
      onMouseDown={(e) => {
        // Start keyframe drag
        setDraggedKeyframe({ trackId, propertyName, keyframe });
      }}
    />
  );

  // Property track component
  const PropertyTrack = ({ track, property }) => {
    const key = `${track.id}-${property.name}`;
    const isVisible = showProperties[key];
    
    if (!isVisible) return null;
    
    return (
      <div style={{
        height: '30px',
        background: '#1a1a1a',
        borderBottom: '1px solid #333',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{
          width: '150px',
          padding: '0 10px',
          fontSize: '11px',
          color: '#aaa',
          borderRight: '1px solid #333'
        }}>
          {'  • ' + property.name}
        </div>
        
        <div style={{
          flex: 1,
          position: 'relative',
          height: '100%'
        }}>
          {property.keyframes.map((keyframe, index) => (
            <Keyframe
              key={index}
              keyframe={keyframe}
              trackId={track.id}
              propertyName={property.name}
            />
          ))}
          
          {/* Add keyframe on click */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              cursor: 'pointer'
            }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const time = pixelToTime(x, rect.width);
              
              // Get current property value from element or default
              const element = elements.find(el => el.id === track.elementId);
              const currentValue = element?.[property.name] || 0;
              
              addKeyframe(track.id, property.name, time, currentValue);
            }}
          />
        </div>
      </div>
    );
  };

  // Track component
  const Track = ({ track }) => {
    const element = elements.find(el => el.id === track.elementId);
    if (!element) return null;

    return (
      <div key={track.id}>
        {/* Track header */}
        <div style={{
          height: '40px',
          background: '#2a2a2a',
          borderBottom: '1px solid #333',
          display: 'flex',
          alignItems: 'center'
        }}>
          <div style={{
            width: '150px',
            padding: '0 10px',
            fontSize: '12px',
            color: '#fff',
            borderRight: '1px solid #333',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '10px' }}>▼</span>
            <span>{track.elementName}</span>
          </div>
          
          <div style={{
            flex: 1,
            position: 'relative',
            height: '100%',
            background: selectedTracks.includes(track.id) ? '#333' : 'transparent'
          }}
            onClick={() => {
              setSelectedTracks(prev => 
                prev.includes(track.id) 
                  ? prev.filter(id => id !== track.id)
                  : [...prev, track.id]
              );
            }}
          />
        </div>

        {/* Property controls */}
        <div style={{
          background: '#222',
          borderBottom: '1px solid #333'
        }}>
          <div style={{
            width: '150px',
            padding: '5px 10px',
            fontSize: '10px',
            color: '#888',
            borderRight: '1px solid #333'
          }}>
            {track.properties.map(property => {
              const key = `${track.id}-${property.name}`;
              const isVisible = showProperties[key];
              
              return (
                <div
                  key={property.name}
                  style={{
                    padding: '2px 0',
                    cursor: 'pointer',
                    color: isVisible ? '#4a90e2' : '#888'
                  }}
                  onClick={() => toggleProperty(track.id, property.name)}
                >
                  {property.name}
                </div>
              );
            })}
          </div>
        </div>

        {/* Property tracks */}
        {track.properties.map(property => (
          <PropertyTrack
            key={property.name}
            track={track}
            property={property}
          />
        ))}
      </div>
    );
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
          onClick={() => timelineManager.seek(0)}
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
          onClick={() => timeline.isPlaying ? timelineManager.pause() : timelineManager.play()}
          style={{
            background: timeline.isPlaying ? '#f44336' : '#4caf50',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            padding: '5px 10px',
            borderRadius: '4px'
          }}
        >
          {timeline.isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        
        <button
          onClick={() => timelineManager.seek(timeline.duration)}
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
          {timeline.currentTime.toFixed(2)}s / {timeline.duration}s
        </div>

        <div style={{
          marginLeft: 'auto',
          fontSize: '12px',
          color: '#888'
        }}>
          {timeline.fps} fps
        </div>
      </div>

      {/* Timeline ruler */}
      <TimeRuler />

      {/* Timeline tracks */}
      <div 
        ref={timelineRef}
        style={{
          flex: 1,
          overflowY: 'auto'
        }}
      >
        {timeline.tracks && timeline.tracks.length > 0 ? (
          timeline.tracks.map(track => (
            <Track key={track.id} track={track} />
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

export default Timeline;