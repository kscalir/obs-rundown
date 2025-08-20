import React, { useEffect, useRef, useState } from 'react';
import SplitType from 'split-type';
import $ from 'jquery';
import 'animate.css/animate.min.css';

// Make jQuery available globally
window.$ = window.jQuery = $;

// Dynamically load textillate
let textillateLoaded = false;

const TextAnimationComponent = ({ 
  children,
  animation = {},
  style = {},
  className = "",
  // Theatre.js timeline integration props
  animationTrigger = false,
  animationProgress = 0,
  timelineControlled = false
}) => {
  const textRef = useRef(null);
  const splitInstanceRef = useRef(null);
  const [animationState, setAnimationState] = useState('ready');
  const lastTriggerRef = useRef(false);
  const lastProgressRef = useRef(0);

  // Complete list of Animate.css effects available for textillate
  const animationEffects = {
    // Attention Seekers
    attention: [
      'bounce', 'flash', 'pulse', 'rubberBand', 'shake', 'swing', 'tada', 'wobble'
    ],
    
    // Bounce Animations
    bounceIn: [
      'bounceIn', 'bounceInDown', 'bounceInLeft', 'bounceInRight', 'bounceInUp'
    ],
    bounceOut: [
      'bounceOut', 'bounceOutDown', 'bounceOutLeft', 'bounceOutRight', 'bounceOutUp'
    ],
    
    // Fade Animations
    fadeIn: [
      'fadeIn', 'fadeInDown', 'fadeInDownBig', 'fadeInLeft', 'fadeInLeftBig', 
      'fadeInRight', 'fadeInRightBig', 'fadeInUp', 'fadeInUpBig'
    ],
    fadeOut: [
      'fadeOut', 'fadeOutDown', 'fadeOutDownBig', 'fadeOutLeft', 'fadeOutLeftBig',
      'fadeOutRight', 'fadeOutRightBig', 'fadeOutUp', 'fadeOutUpBig'
    ],
    
    // Slide Animations
    slideIn: [
      'slideInDown', 'slideInLeft', 'slideInRight', 'slideInUp'
    ],
    slideOut: [
      'slideOutDown', 'slideOutLeft', 'slideOutRight', 'slideOutUp'
    ],
    
    // Rotate Animations
    rotateIn: [
      'rotateIn', 'rotateInDownLeft', 'rotateInDownRight', 'rotateInUpLeft', 'rotateInUpRight'
    ],
    rotateOut: [
      'rotateOut', 'rotateOutDownLeft', 'rotateOutDownRight', 'rotateOutUpLeft', 'rotateOutUpRight'
    ],
    
    // Flip Animations
    flip: [
      'flip', 'flipInX', 'flipInY', 'flipOutX', 'flipOutY'
    ],
    
    // Zoom Animations
    zoomIn: [
      'zoomIn', 'zoomInDown', 'zoomInLeft', 'zoomInRight', 'zoomInUp'
    ],
    zoomOut: [
      'zoomOut', 'zoomOutDown', 'zoomOutLeft', 'zoomOutRight', 'zoomOutUp'
    ],
    
    // Special Effects
    special: [
      'hinge', 'rollIn', 'rollOut'
    ]
  };

  // Get all effects as a flat array
  const getAllEffects = () => {
    return Object.values(animationEffects).flat();
  };

  // Load textillate dynamically
  const loadTextillate = async () => {
    if (!textillateLoaded) {
      try {
        console.log('TextAnimationComponent: Loading textillate...');
        await import('textillate/jquery.textillate.js');
        textillateLoaded = true;
        console.log('TextAnimationComponent: textillate loaded successfully');
        return true;
      } catch (error) {
        console.error('TextAnimationComponent: Failed to load textillate:', error);
        return false;
      }
    }
    return true;
  };

  // Initialize SplitType and textillate
  useEffect(() => {
    const initialize = async () => {
      if (!textRef.current || !children) return;

      try {
        // Load textillate first
        const loaded = await loadTextillate();
        if (!loaded) {
          console.log('TextAnimationComponent: Textillate not loaded, using basic component');
          return;
        }

        console.log('TextAnimationComponent: Initializing SplitType and textillate');

        // Clean up previous instances
        if (splitInstanceRef.current) {
          splitInstanceRef.current.revert();
        }

        // Initialize textillate if animation effect is specified
        if (animation.effect && getAllEffects().includes(animation.effect)) {
          const $element = $(textRef.current);
          
          // Configure textillate options
          const options = {
            autoStart: false,
            in: {
              effect: animation.effect,
              delayScale: animation.delayScale || 1.5,
              delay: animation.delay || 50,
              sync: animation.sync || false
            },
            out: {
              effect: animation.outEffect || 'fadeOut',
              delayScale: animation.outDelayScale || 1,
              delay: animation.outDelay || 25,
              sync: animation.outSync || false
            },
            type: animation.splitType || 'char', // char, word, line
            callback: () => {
              console.log('TextAnimationComponent: Animation completed');
            }
          };

          console.log('TextAnimationComponent: Initializing textillate with options:', options);
          $element.textillate(options);
          
          // Store reference
          textRef.current.textillateInstance = $element;
        }
        
        setAnimationState('ready');
      } catch (error) {
        console.error('TextAnimationComponent: Error during initialization:', error);
      }
    };

    initialize();

    return () => {
      try {
        if (textRef.current?.textillateInstance) {
          textRef.current.textillateInstance.textillate('stop');
        }
        if (splitInstanceRef.current) {
          splitInstanceRef.current.revert();
        }
      } catch (error) {
        console.error('TextAnimationComponent: Error during cleanup:', error);
      }
    };
  }, [children, animation]);

  // Handle Theatre.js timeline control
  useEffect(() => {
    if (!timelineControlled || !textRef.current?.textillateInstance) return;

    // Check if animation trigger changed
    if (animationTrigger !== lastTriggerRef.current) {
      lastTriggerRef.current = animationTrigger;
      
      if (animationTrigger) {
        console.log('TextAnimationComponent: Timeline triggered animation IN');
        textRef.current.textillateInstance.textillate('in');
      } else {
        console.log('TextAnimationComponent: Timeline triggered animation OUT');
        textRef.current.textillateInstance.textillate('out');
      }
    }

    // Handle animation progress for more precise control
    if (Math.abs(animationProgress - lastProgressRef.current) > 0.01) {
      lastProgressRef.current = animationProgress;
      
      // Progress-based animation control (0 = out, 1 = in)
      if (animationProgress > 0.5 && !animationTrigger) {
        // Auto-trigger in animation when progress > 50%
        console.log('TextAnimationComponent: Progress-based animation IN');
        textRef.current.textillateInstance.textillate('in');
      } else if (animationProgress < 0.5 && animationTrigger) {
        // Auto-trigger out animation when progress < 50%
        console.log('TextAnimationComponent: Progress-based animation OUT');
        textRef.current.textillateInstance.textillate('out');
      }
    }
  }, [animationTrigger, animationProgress, timelineControlled]);

  // Expose control methods for timeline integration
  useEffect(() => {
    if (textRef.current) {
      textRef.current.animationControls = {
        play: () => {
          if (textRef.current?.textillateInstance) {
            textRef.current.textillateInstance.textillate('in');
          }
        },
        playOut: () => {
          if (textRef.current?.textillateInstance) {
            textRef.current.textillateInstance.textillate('out');
          }
        },
        stop: () => {
          if (textRef.current?.textillateInstance) {
            textRef.current.textillateInstance.textillate('stop');
          }
        },
        getAvailableEffects: () => animationEffects,
        getAllEffects: getAllEffects
      };
    }
  }, [animationState]);

  return (
    <span 
      ref={textRef}
      style={{
        ...style,
        display: 'inline-block'
      }}
      className={`text-animation-component ${className}`}
      data-animation-state={animationState}
    >
      {children}
    </span>
  );
};

export default TextAnimationComponent;