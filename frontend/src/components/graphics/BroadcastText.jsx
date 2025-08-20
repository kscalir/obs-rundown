import React, { useEffect, useRef, useState } from 'react';
import SplitType from 'split-type';
import $ from 'jquery';
import 'animate.css/animate.min.css';

// Make jQuery available globally
window.$ = window.jQuery = $;

// Dynamically import textillate to avoid SSR issues
let textillateLoaded = false;

const BroadcastText = ({ 
  children,
  animation = {},
  style = {},
  className = "",
  onAnimationComplete = () => {},
  trigger = 'auto' // 'auto', 'manual', 'in', 'out'
}) => {
  const textRef = useRef(null);
  const splitInstanceRef = useRef(null);
  const [animationState, setAnimationState] = useState('hidden'); // 'hidden', 'animating-in', 'visible', 'animating-out'

  // Broadcast animation presets
  const presets = {
    'lower-third': {
      in: { effect: 'fadeInLeft', delayScale: 1.5, delay: 50 },
      out: { effect: 'fadeOutRight', delayScale: 1, delay: 25 }
    },
    'breaking-news': {
      in: { effect: 'flash', sync: true, delay: 0 },
      out: { effect: 'fadeOut', delay: 100 }
    },
    'title-card': {
      in: { effect: 'fadeInUp', delayScale: 2, delay: 80 },
      out: { effect: 'fadeOutDown', delayScale: 1, delay: 40 }
    },
    'sports-score': {
      in: { effect: 'bounceIn', sync: true },
      out: { effect: 'bounceOut', sync: true }
    },
    'typewriter': {
      in: { effect: 'fadeIn', delayScale: 3, delay: 100 },
      out: { effect: 'fadeOut', delay: 50 }
    },
    'slide-up': {
      in: { effect: 'fadeInUp', delayScale: 1, delay: 60 },
      out: { effect: 'fadeOutUp', delayScale: 0.5, delay: 30 }
    },
    'slide-down': {
      in: { effect: 'fadeInDown', delayScale: 1, delay: 60 },
      out: { effect: 'fadeOutDown', delayScale: 0.5, delay: 30 }
    },
    'zoom-in': {
      in: { effect: 'zoomIn', delayScale: 2, delay: 40 },
      out: { effect: 'zoomOut', delayScale: 1, delay: 20 }
    },
    'rotate-in': {
      in: { effect: 'rotateIn', delayScale: 2, delay: 70 },
      out: { effect: 'rotateOut', delayScale: 1, delay: 35 }
    },
    'flip-in': {
      in: { effect: 'flipInX', delayScale: 1.5, delay: 60 },
      out: { effect: 'flipOutX', delayScale: 1, delay: 30 }
    }
  };

  // Get animation config
  const getAnimationConfig = () => {
    const preset = animation.preset || 'lower-third';
    const config = presets[preset] || presets['lower-third'];
    
    return {
      in: {
        ...config.in,
        callback: () => {
          setAnimationState('visible');
          onAnimationComplete('in');
        }
      },
      out: {
        ...config.out,
        callback: () => {
          setAnimationState('hidden');
          onAnimationComplete('out');
        }
      },
      // Optional loop settings
      loop: animation.loop || false,
      minDisplayTime: animation.minDisplayTime || 2000,
      autoStart: animation.autoStart !== false
    };
  };

  // Load textillate dynamically and initialize
  useEffect(() => {
    const loadTextillate = async () => {
      if (!textillateLoaded) {
        try {
          console.log('BroadcastText: Loading textillate...');
          await import('textillate/jquery.textillate.js');
          textillateLoaded = true;
          console.log('BroadcastText: textillate loaded successfully');
        } catch (error) {
          console.error('BroadcastText: Failed to load textillate:', error);
          return false;
        }
      }
      return true;
    };

    const initializeTextillate = async () => {
      console.log('BroadcastText: Initializing textillate');
      if (!textRef.current) {
        console.log('BroadcastText: No textRef.current');
        return;
      }

      const loaded = await loadTextillate();
      if (!loaded) {
        console.log('BroadcastText: Textillate not loaded, skipping initialization');
        return;
      }

      console.log('BroadcastText: jQuery available:', typeof $);
      console.log('BroadcastText: textillate available:', typeof $.fn.textillate);

      const $element = $(textRef.current);
      const config = getAnimationConfig();
      
      console.log('BroadcastText: Config:', config);

      try {
        // Initialize textillate with our config
        $element.textillate({
          autoStart: false, // We'll control this manually
          in: config.in,
          out: config.out,
          loop: config.loop,
          minDisplayTime: config.minDisplayTime,
          selector: '.char', // Use SplitType's character elements
          type: 'char' // Animate by character
        });

        // Store reference for manual control
        textRef.current.textillateInstance = $element;
        console.log('BroadcastText: textillate initialized successfully');
      } catch (error) {
        console.error('BroadcastText: Failed to initialize textillate:', error);
      }
    };

    initializeTextillate();

    return () => {
      if (textRef.current?.textillateInstance) {
        try {
          textRef.current.textillateInstance.textillate('stop');
        } catch (error) {
          console.error('BroadcastText: Error stopping textillate:', error);
        }
      }
      if (splitInstanceRef.current) {
        splitInstanceRef.current.revert();
      }
    };
  }, [animation]);

  // Handle text splitting when content changes
  useEffect(() => {
    if (!textRef.current || !children) return;

    // Clean up previous split
    if (splitInstanceRef.current) {
      splitInstanceRef.current.revert();
    }

    // Split the text for character-level animation
    const splitInstance = new SplitType(textRef.current, {
      types: 'chars',
      absolute: false // Use relative positioning for better compatibility
    });

    splitInstanceRef.current = splitInstance;

    // Auto-start animation if enabled
    if (trigger === 'auto' && getAnimationConfig().autoStart) {
      setTimeout(() => animateIn(), 100);
    }
  }, [children, trigger]);

  // Animation control methods
  const animateIn = () => {
    if (!textRef.current?.textillateInstance || animationState !== 'hidden') return;
    
    setAnimationState('animating-in');
    textRef.current.textillateInstance.textillate('in');
  };

  const animateOut = () => {
    if (!textRef.current?.textillateInstance || animationState !== 'visible') return;
    
    setAnimationState('animating-out');
    textRef.current.textillateInstance.textillate('out');
  };

  const stop = () => {
    if (!textRef.current?.textillateInstance) return;
    
    textRef.current.textillateInstance.textillate('stop');
    setAnimationState('hidden');
  };

  // Expose control methods
  useEffect(() => {
    if (textRef.current) {
      textRef.current.broadcastControls = {
        animateIn,
        animateOut,
        stop,
        state: animationState
      };
    }
  }, [animationState]);

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
      className={`broadcast-text ${className}`}
      data-animation-state={animationState}
    >
      {children}
    </span>
  );
};

export default BroadcastText;