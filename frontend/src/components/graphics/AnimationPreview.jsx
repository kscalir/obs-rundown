import React, { useEffect, useRef, useState } from 'react';
import { PlayFill, ArrowRepeat } from 'react-bootstrap-icons';
import { TextEffectController } from './TextEffectEngine';
import { getEffect } from './GWDEffects';

const AnimationPreview = ({ 
  effect = 'none',
  parameters = {},
  previewText = 'Preview Text'
}) => {
  // Generate appropriate preview text
  const getPreviewText = () => {
    if (previewText && previewText !== 'Sample Text' && previewText !== 'TEXT EFFECTS') {
      // Use actual element text if available
      return previewText.length > 20 ? previewText.substring(0, 20) + '...' : previewText;
    }
    
    // Generate sample text based on sequence type
    const sequence = parameters.sequence || 'char';
    switch (sequence) {
      case 'word':
        return 'Word by word';
      case 'line':
        return 'Line animation\nSecond line';
      case 'block':
        return 'Block animation';
      case 'char':
      default:
        return 'Character split';
    }
  };

  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const previewRef = useRef(null);
  const textElementRef = useRef(null);
  const loopIntervalRef = useRef(null);
  const effectControllerRef = useRef(null);


  // Initialize TextEffectController when parameters change
  useEffect(() => {
    if (!textElementRef.current || effect === 'none') {
      // Clean up existing controller
      if (effectControllerRef.current) {
        effectControllerRef.current.destroy();
        effectControllerRef.current = null;
      }
      // Ensure text is visible when no effect
      if (textElementRef.current) {
        textElementRef.current.style.opacity = '1';
        textElementRef.current.style.transform = '';
        textElementRef.current.style.filter = '';
      }
      return;
    }
    
    // Get the effect specification
    const effectSpec = getEffect(effect);
    if (!effectSpec) {
      console.warn(`Effect not found: ${effect}`);
      return;
    }
    
    console.log('AnimationPreview: Initializing effect controller with:', { 
      effect, 
      parameters 
    });
    
    // Clean up previous controller
    if (effectControllerRef.current) {
      effectControllerRef.current.destroy();
    }
    
    // Create new controller
    try {
      effectControllerRef.current = new TextEffectController(
        textElementRef.current,
        effectSpec,
        parameters
      );
      
      // Ensure text is visible initially (set progress to 1 to show final state)
      effectControllerRef.current.setProgress(1);
    } catch (error) {
      console.error('Error creating TextEffectController:', error);
    }
    
  }, [effect, parameters]);

  const playPreview = () => {
    if (isPlaying || !effectControllerRef.current || effect === 'none') {
      console.log('AnimationPreview: Cannot play - already playing or not initialized');
      return;
    }
    
    console.log('AnimationPreview: Starting effect animation');
    setIsPlaying(true);
    
    try {
      // Reset and play the effect
      effectControllerRef.current.reset();
      effectControllerRef.current.play();
      
      // Set up completion handler
      const duration = parameters.duration || 2;
      setTimeout(() => {
        setIsPlaying(false);
      }, duration * 1000 + 500); // Add small buffer
      
    } catch (error) {
      console.error('Error playing effect animation:', error);
      setIsPlaying(false);
    }
  };

  const handlePreviewClick = () => {
    playPreview();
  };

  const handleLoopToggle = () => {
    setIsLooping(!isLooping);
    if (!isLooping) {
      // Start looping - calculate interval based on effect duration
      const duration = parameters.duration || 2;
      const speed = parameters.speed || 0.5;
      const loopInterval = Math.max((duration * 1000) + 1000, 2500); // duration + 1s buffer, minimum 2.5s
      
      console.log(`Starting loop with interval: ${loopInterval}ms`);
      loopIntervalRef.current = setInterval(() => {
        if (!isPlaying) {
          playPreview();
        }
      }, loopInterval);
    } else {
      // Stop looping
      console.log('Stopping loop');
      if (loopIntervalRef.current) {
        clearInterval(loopIntervalRef.current);
        loopIntervalRef.current = null;
      }
    }
  };

  // Cleanup loop on unmount or effect change
  useEffect(() => {
    return () => {
      if (loopIntervalRef.current) {
        clearInterval(loopIntervalRef.current);
        loopIntervalRef.current = null;
      }
    };
  }, [effect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (effectControllerRef.current) {
        effectControllerRef.current.destroy();
      }
      if (loopIntervalRef.current) {
        clearInterval(loopIntervalRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={previewRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        borderRadius: '8px',
        overflow: 'hidden'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {effect === 'none' ? (
        <span style={{
          fontSize: '16px',
          color: '#666',
          fontStyle: 'italic'
        }}>
          Select an effect to preview
        </span>
      ) : (
        <>
          <div
            ref={textElementRef}
            className="tlt"
            style={{
              fontSize: '18px',
              fontWeight: '500',
              color: '#fff',
              textAlign: 'center',
              whiteSpace: (parameters.sequence === 'line') ? 'pre-line' : 'normal',
              zIndex: 1
            }}
          >
            {getPreviewText()}
          </div>

          {/* Control Buttons */}
          {(isHovered || isPlaying || isLooping) && (
            <div style={{
              position: 'absolute',
              bottom: '12px',
              right: '12px',
              display: 'flex',
              gap: '8px'
            }}>
              {/* Play Button */}
              <button
                onClick={handlePreviewClick}
                disabled={isPlaying}
                style={{
                  width: '32px',
                  height: '32px',
                  minWidth: '32px',
                  minHeight: '32px',
                  borderRadius: '50%',
                  backgroundColor: isPlaying ? '#555' : '#4caf50',
                  border: 'none',
                  color: '#fff',
                  cursor: isPlaying ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isPlaying ? '0 0 15px rgba(76, 175, 80, 0.7)' : '0 0 10px rgba(76, 175, 80, 0.5)',
                  transition: 'all 0.2s ease',
                  opacity: isPlaying ? 0.8 : 0.9,
                  flexShrink: 0,
                  padding: 0,
                  overflow: 'visible'
                }}
                onMouseEnter={(e) => {
                  if (!isPlaying) {
                    e.target.style.backgroundColor = '#5cbf60';
                    e.target.style.transform = 'scale(1.1)';
                    e.target.style.boxShadow = '0 0 20px rgba(76, 175, 80, 0.8)';
                    e.target.style.opacity = '1';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isPlaying) {
                    e.target.style.backgroundColor = '#4caf50';
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = '0 0 10px rgba(76, 175, 80, 0.5)';
                    e.target.style.opacity = '0.9';
                  }
                }}
              >
                <PlayFill size={16} style={{ color: '#fff', pointerEvents: 'none' }} />
              </button>

              {/* Loop Button */}
              <button
                onClick={handleLoopToggle}
                style={{
                  width: '32px',
                  height: '32px',
                  minWidth: '32px',
                  minHeight: '32px',
                  borderRadius: '50%',
                  backgroundColor: isLooping ? '#2196F3' : '#555',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isLooping ? '0 0 10px rgba(33, 150, 243, 0.6)' : '0 0 8px rgba(85, 85, 85, 0.4)',
                  transition: 'all 0.2s ease',
                  opacity: 0.9,
                  flexShrink: 0,
                  padding: 0,
                  overflow: 'visible'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = isLooping ? '#42A5F5' : '#888';
                  e.target.style.transform = 'scale(1.1)';
                  e.target.style.boxShadow = isLooping ? '0 0 20px rgba(33, 150, 243, 0.8)' : '0 0 15px rgba(136,136,136,0.6)';
                  e.target.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = isLooping ? '#2196F3' : '#666';
                  e.target.style.transform = 'scale(1)';
                  e.target.style.boxShadow = isLooping ? '0 0 10px rgba(33, 150, 243, 0.6)' : '0 0 8px rgba(85, 85, 85, 0.4)';
                  e.target.style.opacity = '0.9';
                }}
              >
                <ArrowRepeat size={16} style={{ color: '#fff', pointerEvents: 'none' }} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AnimationPreview;