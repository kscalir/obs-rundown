import React, { useEffect, useRef, useState } from 'react';
import SplitType from 'split-type';
import 'animate.css/animate.min.css';

const WorkingBroadcastText = ({ 
  children,
  animation = {},
  style = {},
  className = "",
  trigger = 'auto'
}) => {
  const textRef = useRef(null);
  const splitInstanceRef = useRef(null);
  const [animationState, setAnimationState] = useState('hidden');

  // Broadcast animation presets using animate.css classes
  const presets = {
    'lower-third': {
      in: 'animate__fadeInLeft',
      out: 'animate__fadeOutRight',
      duration: '0.8s',
      delay: '50ms'
    },
    'breaking-news': {
      in: 'animate__flash',
      out: 'animate__fadeOut',
      duration: '0.5s',
      delay: '0ms'
    },
    'title-card': {
      in: 'animate__fadeInUp',
      out: 'animate__fadeOutDown',
      duration: '1s',
      delay: '80ms'
    },
    'slide-up': {
      in: 'animate__fadeInUp',
      out: 'animate__fadeOutUp',
      duration: '0.6s',
      delay: '60ms'
    },
    'zoom-in': {
      in: 'animate__zoomIn',
      out: 'animate__zoomOut',
      duration: '0.7s',
      delay: '40ms'
    }
  };

  // Initialize SplitType
  useEffect(() => {
    if (!textRef.current || !children) return;

    try {
      console.log('WorkingBroadcastText: Initializing SplitType');

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
      console.log('WorkingBroadcastText: Created', splitInstance.chars?.length || 0, 'characters');

      // Auto-start animation if enabled
      if (trigger === 'auto' && animation.preset && animation.preset !== 'none') {
        setTimeout(() => animateIn(), 100);
      }
    } catch (error) {
      console.error('WorkingBroadcastText: Error initializing SplitType:', error);
    }

    return () => {
      try {
        if (splitInstanceRef.current) {
          splitInstanceRef.current.revert();
        }
      } catch (error) {
        console.error('WorkingBroadcastText: Error cleaning up SplitType:', error);
      }
    };
  }, [children, animation.preset]);

  // Animation control methods
  const animateIn = () => {
    if (!splitInstanceRef.current?.chars || animationState !== 'hidden') {
      console.log('WorkingBroadcastText: Cannot animate in - no chars or wrong state');
      return;
    }
    
    console.log('WorkingBroadcastText: Animating in with preset:', animation.preset);
    const preset = presets[animation.preset];
    if (!preset) {
      console.log('WorkingBroadcastText: No preset found for:', animation.preset);
      return;
    }

    try {
      setAnimationState('animating-in');
      
      // Apply animation to each character with staggered delay
      splitInstanceRef.current.chars.forEach((char, index) => {
        // Clear any existing classes
        char.className = 'char';
        
        // Set animation delay
        const delay = parseInt(preset.delay) * index;
        char.style.animationDelay = `${delay}ms`;
        char.style.animationDuration = preset.duration;
        
        // Add animation classes
        setTimeout(() => {
          char.className = `char animate__animated ${preset.in}`;
        }, 10); // Small delay to ensure style is applied
      });

      // Mark as visible after animation completes
      const totalDuration = parseInt(preset.duration) * 1000 + (parseInt(preset.delay) * splitInstanceRef.current.chars.length);
      setTimeout(() => {
        setAnimationState('visible');
        console.log('WorkingBroadcastText: Animation in completed');
      }, totalDuration);
    } catch (error) {
      console.error('WorkingBroadcastText: Error in animateIn:', error);
    }
  };

  const animateOut = () => {
    if (!splitInstanceRef.current?.chars || animationState !== 'visible') {
      console.log('WorkingBroadcastText: Cannot animate out - no chars or wrong state');
      return;
    }
    
    console.log('WorkingBroadcastText: Animating out');
    const preset = presets[animation.preset];
    if (!preset) return;

    try {
      setAnimationState('animating-out');
      
      // Apply out animation to each character
      splitInstanceRef.current.chars.forEach((char, index) => {
        // Clear existing classes
        char.className = 'char';
        
        // Set animation delay for out animation (usually faster)
        const delay = (parseInt(preset.delay) / 2) * index;
        char.style.animationDelay = `${delay}ms`;
        char.style.animationDuration = preset.duration;
        
        // Add out animation classes
        setTimeout(() => {
          char.className = `char animate__animated ${preset.out}`;
        }, 10);
      });

      // Mark as hidden after animation completes
      const totalDuration = parseInt(preset.duration) * 1000 + ((parseInt(preset.delay) / 2) * splitInstanceRef.current.chars.length);
      setTimeout(() => {
        setAnimationState('hidden');
        console.log('WorkingBroadcastText: Animation out completed');
      }, totalDuration);
    } catch (error) {
      console.error('WorkingBroadcastText: Error in animateOut:', error);
    }
  };

  const stop = () => {
    if (!splitInstanceRef.current?.chars) return;
    
    console.log('WorkingBroadcastText: Stopping animation');
    try {
      splitInstanceRef.current.chars.forEach(char => {
        char.className = 'char';
        char.style.animationDelay = '';
        char.style.animationDuration = '';
      });
      setAnimationState('hidden');
    } catch (error) {
      console.error('WorkingBroadcastText: Error stopping animation:', error);
    }
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
        display: 'inline-block'
      }}
      className={`working-broadcast-text ${className}`}
      data-animation-state={animationState}
    >
      {children}
    </span>
  );
};

export default WorkingBroadcastText;