import React, { useEffect, useState } from 'react';
import './AnimatedText.css';

const AnimatedText = ({ 
  animation, 
  children, 
  style = {},
  className = "",
  onAnimationComplete = () => {}
}) => {
  const [animationKey, setAnimationKey] = useState(0);

  // Reset animation when animation properties change
  useEffect(() => {
    setAnimationKey(prev => prev + 1);
  }, [animation?.type, animation?.variant, animation?.duration]);

  // If no animation or animation is 'none', render static text
  if (!animation || animation.type === 'none') {
    return <span style={style} className={className}>{children}</span>;
  }

  // Get animation CSS classes based on type and variant
  const getAnimationClasses = () => {
    const baseClass = `animated-text-${animation.type}`;
    const variantClass = `variant-${animation.variant || 1}`;
    const loopClass = animation.loop ? 'loop' : '';
    
    return `${baseClass} ${variantClass} ${loopClass}`.trim();
  };

  // Get animation duration CSS variable
  const getAnimationStyle = () => {
    return {
      ...style,
      '--animation-duration': `${animation.duration || 1000}ms`,
      '--animation-delay': `${animation.delay || 0}ms`,
      animationDelay: `${animation.delay || 0}ms`,
      animationDuration: `${animation.duration || 1000}ms`,
      animationIterationCount: animation.loop ? 'infinite' : '1',
      animationFillMode: 'both'
    };
  };

  // Render different animation types
  const renderAnimatedText = () => {
    const text = typeof children === 'string' ? children : '';
    
    // Debug logging
    console.log('AnimatedText rendering:', animation.type, 'variant:', animation.variant);
    
    switch (animation.type) {
      case 'split':
        return (
          <span 
            key={animationKey}
            className={`animated-text-split ${getAnimationClasses()}`}
            style={getAnimationStyle()}
          >
            {text.split('').map((char, index) => (
              <span 
                key={index} 
                className="char"
                style={{ 
                  animationDelay: `${(animation.delay || 0) + (index * 100)}ms`,
                  display: 'inline-block',
                  opacity: 0,
                  transform: 'translateY(20px)',
                  animation: `splitTextReveal ${animation.duration || 1000}ms ease-out ${(animation.delay || 0) + (index * 100)}ms forwards`
                }}
              >
                {char === ' ' ? '\u00A0' : char}
              </span>
            ))}
          </span>
        );
        
      case 'typewriter':
        return (
          <TypewriterText
            key={animationKey}
            text={text}
            duration={animation.duration}
            variant={animation.variant}
            style={getAnimationStyle()}
            className={getAnimationClasses()}
          />
        );
        
      case 'blur':
        return (
          <span 
            key={animationKey}
            className={`animated-text-blur ${getAnimationClasses()}`}
            style={{
              ...getAnimationStyle(),
              filter: 'blur(10px)',
              opacity: 0,
              animation: `blurTextReveal ${animation.duration || 1000}ms ease-out forwards`
            }}
          >
            {children}
          </span>
        );
        
      case 'gradient':
        return (
          <span 
            key={animationKey}
            className={`animated-text-gradient ${getAnimationClasses()}`}
            style={{
              ...getAnimationStyle(),
              background: 'linear-gradient(90deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4)',
              backgroundSize: '400% 400%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: `gradientShift ${animation.duration || 2000}ms ease-in-out ${animation.loop ? 'infinite' : '1'}`
            }}
          >
            {children}
          </span>
        );
        
      case 'shiny':
        return (
          <span 
            key={animationKey}
            className={`animated-text-shiny ${getAnimationClasses()}`}
            style={{
              ...getAnimationStyle(),
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {children}
            <span 
              className="shine-overlay"
              style={{
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                animation: `shine ${animation.duration || 1000}ms ease-in-out ${animation.loop ? 'infinite' : '1'}`,
                pointerEvents: 'none'
              }}
            />
          </span>
        );
        
      case 'circular':
        return (
          <div
            key={animationKey}
            className={`animated-text-circular ${getAnimationClasses()}`}
            style={{
              ...getAnimationStyle(),
              transform: 'rotate(0deg)',
              animation: `circularText ${animation.duration || 3000}ms linear ${animation.loop ? 'infinite' : '1'}`
            }}
          >
            {children}
          </div>
        );
        
      case 'fuzzy':
        return (
          <span 
            key={animationKey}
            className={`animated-text-fuzzy ${getAnimationClasses()}`}
            style={{
              ...getAnimationStyle(),
              filter: 'blur(8px) contrast(1.5)',
              animation: `fuzzyText ${animation.duration || 1500}ms ease-out forwards`
            }}
          >
            {children}
          </span>
        );
        
      case 'decrypted':
        return (
          <DecryptedText
            key={animationKey}
            text={text}
            duration={animation.duration}
            style={getAnimationStyle()}
            className={getAnimationClasses()}
          />
        );
        
      case 'focus':
        return (
          <span 
            key={animationKey}
            className={`animated-text-focus ${getAnimationClasses()}`}
            style={{
              ...getAnimationStyle(),
              filter: 'blur(20px)',
              transform: 'scale(0.8)',
              animation: `trueFocus ${animation.duration || 1000}ms ease-out forwards`
            }}
          >
            {children}
          </span>
        );
        
      case 'curved':
        return (
          <div
            key={animationKey}
            className={`animated-text-curved ${getAnimationClasses()}`}
            style={{
              ...getAnimationStyle(),
              transform: 'translateX(-50%)',
              animation: `curvedLoop ${animation.duration || 4000}ms ease-in-out ${animation.loop ? 'infinite' : '1'}`
            }}
          >
            {children}
          </div>
        );
        
      default:
        console.warn('Unknown animation type:', animation.type);
        // For unimplemented animations, show a placeholder with fade effect
        return (
          <span 
            key={animationKey}
            className={`animated-text-placeholder ${getAnimationClasses()}`}
            style={{
              ...getAnimationStyle(),
              opacity: 0,
              animation: `fadeIn ${animation.duration || 1000}ms ease-in-out forwards`
            }}
          >
            {children}
          </span>
        );
    }
  };

  return renderAnimatedText();
};

// Decrypted text component
const DecryptedText = ({ text, duration, style, className }) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  
  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        // Scramble effect before revealing actual character
        let scrambleCount = 0;
        const scrambleInterval = setInterval(() => {
          if (scrambleCount < 3) {
            const scrambledChar = characters[Math.floor(Math.random() * characters.length)];
            setDisplayText(prev => prev.slice(0, -1) + scrambledChar);
            scrambleCount++;
          } else {
            clearInterval(scrambleInterval);
            setDisplayText(prev => prev.slice(0, -1) + text[currentIndex]);
            setCurrentIndex(prev => prev + 1);
          }
        }, 50);
        
        setDisplayText(prev => prev + characters[Math.floor(Math.random() * characters.length)]);
      }, (duration || 2000) / text.length);

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, duration, characters]);

  // Reset when text changes
  useEffect(() => {
    setDisplayText('');
    setCurrentIndex(0);
  }, [text]);

  return (
    <span style={style} className={className}>
      {displayText}
      <span style={{ opacity: 0.5 }}>|</span>
    </span>
  );
};

// Simple typewriter component
const TypewriterText = ({ text, duration, variant, style, className }) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, (duration || 1000) / text.length);

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, duration]);

  // Reset when text changes
  useEffect(() => {
    setDisplayText('');
    setCurrentIndex(0);
  }, [text]);

  return (
    <span style={style} className={className}>
      {displayText}
      <span className="cursor" style={{ 
        opacity: currentIndex < text.length ? 1 : 0,
        animation: 'blink 1s infinite'
      }}>|</span>
    </span>
  );
};

export default AnimatedText;