import React, { useState, useMemo } from 'react';
import { useAnimation } from '../animation/AnimationContext';
import { useEditorStore } from '../state/editorStore';
import { PropertyDiscoverySystem } from './PropertyDiscovery';
import { TimelineControls } from './TimelineControls';
import { PropertyTrack } from './PropertyTrack';

export const IntegratedTimeline: React.FC = () => {
  const {
    engine,
    currentTime,
    duration,
    isPlaying,
    autoKey,
    playbackRate,
    play,
    pause,
    stop,
    setCurrentTime,
    setDuration,
    setAutoKey,
    setPlaybackRate,
    addKeyframe,
    removeKeyframe,
    hasKeyframes
  } = useAnimation();

  const { layers, selectedElementIds } = useEditorStore();
  const propertyDiscovery = PropertyDiscoverySystem.getInstance();
  const [expandedElements, setExpandedElements] = useState<Set<string>>(new Set());
  const [selectedProperty, setSelectedProperty] = useState<{ elementId: string; property: string } | null>(null);

  // Get all elements from layers
  const elements = useMemo(() => {
    const allElements: any[] = [];
    layers.forEach(layer => {
      if (layer.visible) {
        layer.elements.forEach(element => {
          if (element.visible) {
            allElements.push(element);
          }
        });
      }
    });
    return allElements;
  }, [layers]);

  const toggleElementExpanded = (elementId: string) => {
    setExpandedElements(prev => {
      const newSet = new Set(prev);
      if (newSet.has(elementId)) {
        newSet.delete(elementId);
      } else {
        newSet.add(elementId);
      }
      return newSet;
    });
  };

  const handleAddProperty = (elementId: string) => {
    const element = elements.find(el => el.id === elementId);
    if (!element) return;

    // Get all animatable properties for this element
    const properties = propertyDiscovery.getAllAnimatableProperties({
      id: element.id,
      type: element.type,
      name: element.name,
      properties: element
    });

    // For now, just add a keyframe for the first property that doesn't have one
    if (engine) {
      for (const prop of properties) {
        const tracks = engine.getKeyframes(elementId, prop.name);
        if (tracks.length === 0) {
          const currentValue = element[prop.name] ?? prop.defaultValue;
          addKeyframe(elementId, prop.name, currentValue);
          break;
        }
      }
    }
  };

  return (
    <div className="integrated-timeline" style={styles.container}>
      <TimelineControls
        playing={isPlaying}
        currentTime={currentTime}
        duration={duration}
        playbackRate={playbackRate}
        autoKey={autoKey}
        onPlay={isPlaying ? pause : play}
        onStop={stop}
        onTimeChange={setCurrentTime}
        onDurationChange={setDuration}
        onPlaybackRateChange={setPlaybackRate}
        onAutoKeyChange={setAutoKey}
      />
      
      <div style={styles.timeline}>
        {/* Time ruler */}
        <div style={styles.ruler}>
          <div style={styles.rulerTrack}>
            {Array.from({ length: Math.ceil(duration) + 1 }, (_, i) => (
              <div key={i} style={{ ...styles.rulerMark, left: `${(i / duration) * 100}%` }}>
                <span style={styles.rulerLabel}>{i}s</span>
              </div>
            ))}
            {/* Playhead */}
            <div style={{ ...styles.playhead, left: `${(currentTime / duration) * 100}%` }} />
          </div>
        </div>

        {/* Element tracks */}
        <div style={styles.tracks}>
          {elements.length === 0 ? (
            <div style={styles.emptyState}>
              No elements in the canvas. Add elements to start animating.
            </div>
          ) : (
            elements.map(element => {
              const isExpanded = expandedElements.has(element.id);
              const isSelected = selectedElementIds.includes(element.id);
              const elementHasKeyframes = hasKeyframes(element.id);
              const elementTracks = engine ? engine.getKeyframes(element.id) : [];

              return (
                <div key={element.id} style={styles.elementTrack}>
                  <div 
                    style={{
                      ...styles.elementHeader,
                      backgroundColor: isSelected ? '#2a3f5f' : 'transparent'
                    }}
                    onClick={() => toggleElementExpanded(element.id)}
                  >
                    <span style={styles.expandIcon}>
                      {isExpanded ? '▼' : '▶'}
                    </span>
                    <span style={styles.elementName}>
                      {element.name || `${element.type}-${element.id.slice(-4)}`}
                    </span>
                    {elementHasKeyframes && (
                      <span style={styles.keyframeCount}>
                        {elementTracks.length} tracks
                      </span>
                    )}
                    <button
                      style={styles.addButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddProperty(element.id);
                      }}
                    >
                      + Property
                    </button>
                  </div>

                  {isExpanded && (
                    <div style={styles.propertyTracks}>
                      {elementTracks.length === 0 ? (
                        <div style={styles.noTracks}>
                          No animated properties. Click "+ Property" to add.
                        </div>
                      ) : (
                        elementTracks.map(track => (
                          <PropertyTrack
                            key={`${element.id}-${track.propertyName}`}
                            elementId={element.id}
                            propertyName={track.propertyName}
                            keyframes={track.keyframes}
                            currentTime={currentTime}
                            duration={duration}
                            onAddKeyframe={(value) => addKeyframe(element.id, track.propertyName, value)}
                            onDeleteKeyframe={(time) => removeKeyframe(element.id, track.propertyName, time)}
                            onUpdateKeyframe={(time, value) => {
                              removeKeyframe(element.id, track.propertyName, time);
                              addKeyframe(element.id, track.propertyName, value, time);
                            }}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '250px',
    backgroundColor: '#1a1a1a',
    borderTop: '2px solid #333',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100
  },
  timeline: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  ruler: {
    height: '30px',
    backgroundColor: '#222',
    borderBottom: '1px solid #333',
    position: 'relative'
  },
  rulerTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  rulerMark: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '1px',
    backgroundColor: '#444',
    display: 'flex',
    alignItems: 'flex-end'
  },
  rulerLabel: {
    fontSize: '10px',
    color: '#888',
    marginLeft: '2px',
    marginBottom: '2px'
  },
  playhead: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '2px',
    backgroundColor: '#ff4444',
    pointerEvents: 'none',
    zIndex: 10
  },
  tracks: {
    flex: 1,
    overflowY: 'auto',
    backgroundColor: '#0f0f0f'
  },
  emptyState: {
    padding: '40px',
    textAlign: 'center',
    color: '#666',
    fontSize: '14px'
  },
  elementTrack: {
    borderBottom: '1px solid #222'
  },
  elementHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#252525'
    }
  },
  expandIcon: {
    marginRight: '8px',
    fontSize: '10px',
    color: '#888'
  },
  elementName: {
    flex: 1,
    fontSize: '12px',
    color: '#e0e0e0'
  },
  keyframeCount: {
    fontSize: '10px',
    color: '#666',
    marginRight: '12px'
  },
  addButton: {
    padding: '2px 8px',
    fontSize: '10px',
    backgroundColor: '#333',
    color: '#fff',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  propertyTracks: {
    backgroundColor: '#0a0a0a'
  },
  noTracks: {
    padding: '12px 24px',
    fontSize: '11px',
    color: '#555'
  }
};