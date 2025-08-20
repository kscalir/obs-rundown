/**
 * Animation settings utilities for broadcast graphics
 * Handles prefers-reduced-motion accessibility setting
 */

// Check if user has reduced motion preference
export const prefersReducedMotion = () => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Animation behavior modes
export const ANIMATION_MODES = {
  RESPECT_PREFERENCE: 'respect_preference', // Default - respect user's OS setting
  FORCE_ANIMATIONS: 'force_animations',     // Broadcast mode - always animate
  MINIMAL_ANIMATIONS: 'minimal_animations', // Simple animations only
  NO_ANIMATIONS: 'no_animations'            // No animations
};

// Get current animation mode from localStorage or default
export const getAnimationMode = () => {
  return localStorage.getItem('obs_animation_mode') || ANIMATION_MODES.FORCE_ANIMATIONS;
};

// Set animation mode
export const setAnimationMode = (mode) => {
  localStorage.setItem('obs_animation_mode', mode);
  applyAnimationMode(mode);
};

// Apply animation mode to document
export const applyAnimationMode = (mode) => {
  const root = document.documentElement;
  
  // Remove existing animation mode classes
  root.classList.remove(
    'force-animations', 
    'minimal-animations', 
    'no-animations'
  );
  
  switch (mode) {
    case ANIMATION_MODES.FORCE_ANIMATIONS:
      // Override prefers-reduced-motion for broadcast use
      root.classList.add('force-animations');
      break;
      
    case ANIMATION_MODES.MINIMAL_ANIMATIONS:
      // Use simple animations only
      root.classList.add('minimal-animations');
      break;
      
    case ANIMATION_MODES.NO_ANIMATIONS:
      // Disable all animations
      root.classList.add('no-animations');
      break;
      
    case ANIMATION_MODES.RESPECT_PREFERENCE:
    default:
      // Let CSS handle prefers-reduced-motion naturally
      break;
  }
};

// Initialize animation mode on app load
export const initializeAnimationMode = () => {
  const mode = getAnimationMode();
  applyAnimationMode(mode);
  
  console.log('Animation mode initialized:', mode);
  console.log('User prefers reduced motion:', prefersReducedMotion());
};

// Check if animations should be enabled based on current settings
export const shouldAnimate = () => {
  const mode = getAnimationMode();
  
  switch (mode) {
    case ANIMATION_MODES.FORCE_ANIMATIONS:
      return true;
      
    case ANIMATION_MODES.NO_ANIMATIONS:
      return false;
      
    case ANIMATION_MODES.MINIMAL_ANIMATIONS:
      return 'minimal';
      
    case ANIMATION_MODES.RESPECT_PREFERENCE:
    default:
      return !prefersReducedMotion();
  }
};

// Get appropriate animation class based on settings
export const getAnimationClass = (primaryEffect, fallbackEffect = null) => {
  const animationStatus = shouldAnimate();
  
  if (animationStatus === false) {
    return ''; // No animation
  }
  
  if (animationStatus === 'minimal' && fallbackEffect) {
    return `animate__animated animate__${fallbackEffect}`;
  }
  
  return `animate__animated animate__${primaryEffect}`;
};