import React, { useEffect, useRef, useState } from 'react';
import SplitType from 'split-type';
import 'animate.css/animate.min.css';

const SimpleBroadcastText = ({ 
  children,
  animation = {},
  style = {},
  className = "",
  trigger = 'auto'
}) => {
  const textRef = useRef(null);
  const splitInstanceRef = useRef(null);
  const [animationState, setAnimationState] = useState('hidden');

  // Simplified broadcast presets using CSS classes
  const presets = {
    'lower-third': {
      in: 'animate__fadeInLeft',
      out: 'animate__fadeOutRight'
    },
    'breaking-news': {
      in: 'animate__flash',
      out: 'animate__fadeOut'
    },
    'title-card': {
      in: 'animate__fadeInUp',
      out: 'animate__fadeOutDown'
    },
    'slide-up': {
      in: 'animate__fadeInUp',
      out: 'animate__fadeOutUp'
    },
    'zoom-in': {
      in: 'animate__zoomIn',
      out: 'animate__zoomOut'
    }
  };

  // Initialize SplitType
  useEffect(() => {
    if (!textRef.current || !children) {
      console.log('SimpleBroadcastText: No textRef or children');
      return;
    }

    try {
      console.log('SimpleBroadcastText: Initializing SplitType');

      // Clean up previous split
      if (splitInstanceRef.current) {
        splitInstanceRef.current.revert();
      }

      // Split the text for character-level animation
      const splitInstance = new SplitType(textRef.current, {
        types: 'chars',
        absolute: false
      });

      splitInstanceRef.current = splitInstance;
      console.log('SimpleBroadcastText: Split instance created with', splitInstance.chars?.length || 0, 'characters');

      // Auto-start animation if enabled
      if (trigger === 'auto' && animation.preset && animation.preset !== 'none') {
        setTimeout(() => animateIn(), 100);
      }
    } catch (error) {
      console.error('SimpleBroadcastText: Error initializing SplitType:', error);
    }

    return () => {
      try {
        if (splitInstanceRef.current) {
          splitInstanceRef.current.revert();
        }
      } catch (error) {
        console.error('SimpleBroadcastText: Error cleaning up SplitType:', error);
      }
    };
  }, [children, animation.preset]);

  // Animation control methods
  const animateIn = () => {
    if (!splitInstanceRef.current || animationState !== 'hidden') {
      console.log('SimpleBroadcastText: Cannot animate in - splitInstanceRef or state issue');
      return;
    }
    
    console.log('SimpleBroadcastText: Animating in with preset:', animation.preset);
    const preset = presets[animation.preset];
    if (!preset) {
      console.log('SimpleBroadcastText: No preset found for:', animation.preset);
      return;
    }

    try {
      setAnimationState('animating-in');
      
      // Apply animation to each character with staggered delay
      if (splitInstanceRef.current.chars) {
        splitInstanceRef.current.chars.forEach((char, index) => {
          char.style.animationDelay = `${index * 50}ms`;
          char.className = `char animate__animated ${preset.in}`;
        });

        // Mark as visible after animation
        setTimeout(() => {
          setAnimationState('visible');
        }, 1000);
      }
    } catch (error) {
      console.error('SimpleBroadcastText: Error in animateIn:', error);
    }
  };

  const animateOut = () => {
    if (!splitInstanceRef.current || animationState !== 'visible') return;
    
    console.log('SimpleBroadcastText: Animating out');
    const preset = presets[animation.preset];
    if (!preset) return;

    setAnimationState('animating-out');
    
    // Apply out animation to each character
    splitInstanceRef.current.chars.forEach((char, index) => {
      char.style.animationDelay = `${index * 25}ms`;
      char.className = `char animate__animated ${preset.out}`;
    });

    // Mark as hidden after animation
    setTimeout(() => {
      setAnimationState('hidden');
    }, 800);
  };

  const stop = () => {
    if (!splitInstanceRef.current) return;
    
    console.log('SimpleBroadcastText: Stopping animation');
    splitInstanceRef.current.chars.forEach(char => {
      char.className = 'char';
      char.style.animationDelay = '';
    });
    setAnimationState('hidden');
  };

  // Handle manual triggers
  useEffect(() => {
    switch (trigger) {
      case 'in':
        animateIn();
        break;
      case 'out':
        animateOut();
        break;
      case 'stop':
        stop();
        break;
    }
  }, [trigger]);

  return (
    <span 
      ref={textRef}
      style={{
        ...style,
        visibility: animationState === 'hidden' ? 'hidden' : 'visible'
      }}
      className={`simple-broadcast-text ${className}`}
      data-animation-state={animationState}
    >
      {children}
    </span>
  );
};

export default SimpleBroadcastText;