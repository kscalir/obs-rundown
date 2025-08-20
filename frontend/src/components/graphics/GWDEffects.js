/**
 * GWDEffects - Effect registry with all 12 Google Web Designer text effects
 * 
 * Each effect is a recipe that defines:
 * - Default parameter values
 * - Which UI controls to show
 * - An eval() function that computes animation values at any progress point
 */

import { createEffectParams, lerp } from './TextEffectEngine.js';

// Create the effect registry with all 12 GWD effects
export const GWDEffects = {
  
  'Blur': {
    name: 'Blur',
    defaults: createEffectParams({
      blurFromPx: 8,
      opacityFrom: 0,
      duration: 1.0,
      easing: 'ease-out',
      speed: 0.6
    }),
    ui: ['duration', 'easing', 'blurFromPx', 'opacityFrom', 'speed', 'sequence', 'groupSize', 'randomize', 'reverse'],
    eval: (i, N, progress) => ({
      x: 0,
      y: 0,
      scale: 1,
      rotate: 0,
      opacity: lerp(this.defaults?.opacityFrom ?? 0, 1, progress),
      blur: lerp(this.defaults?.blurFromPx ?? 8, 0, progress)
    })
  },

  'Drop in': {
    name: 'Drop in',
    defaults: createEffectParams({
      yFrom: -60,
      opacityFrom: 0,
      duration: 0.8,
      easing: 'bounce-out',
      speed: 0.4,
      direction: 'top'
    }),
    ui: ['duration', 'easing', 'direction', 'opacityFrom', 'speed', 'sequence', 'groupSize', 'randomize', 'reverse'],
    eval: (i, N, progress) => ({
      x: 0,
      y: lerp(this.defaults?.yFrom ?? -60, 0, progress),
      scale: 1,
      rotate: 0,
      opacity: lerp(this.defaults?.opacityFrom ?? 0, 1, progress),
      blur: 0
    })
  },


  'Flip': {
    name: 'Flip',
    defaults: createEffectParams({
      rotateFrom: -90,
      rotateAxis: 'x',
      opacityFrom: 0,
      duration: 0.7,
      easing: 'ease-out',
      speed: 0.5,
      direction: 'center'
    }),
    ui: ['duration', 'easing', 'direction', 'rotateFrom', 'opacityFrom', 'speed', 'sequence', 'groupSize', 'randomize', 'reverse'],
    eval: (i, N, progress) => ({
      x: 0,
      y: 0,
      scale: 1,
      rotate: lerp(this.defaults?.rotateFrom ?? -90, 0, progress),
      opacity: lerp(this.defaults?.opacityFrom ?? 0, 1, progress),
      blur: 0
    })
  },

  'Line up': {
    name: 'Line up',
    defaults: createEffectParams({
      yFrom: 20,
      opacityFrom: 0,
      duration: 0.6,
      easing: 'ease-out',
      speed: 0.8,
      direction: 'bottom'
    }),
    ui: ['duration', 'easing', 'direction', 'yFrom', 'opacityFrom', 'speed', 'sequence', 'groupSize', 'randomize', 'reverse'],
    eval: (i, N, progress) => ({
      x: 0,
      y: lerp(this.defaults?.yFrom ?? 20, 0, progress),
      scale: 1,
      rotate: 0,
      opacity: lerp(this.defaults?.opacityFrom ?? 0, 1, progress),
      blur: 0
    })
  },

  'Roll': {
    name: 'Roll',
    defaults: createEffectParams({
      rotateFrom: -180,
      xFrom: -40,
      opacityFrom: 0,
      duration: 1.0,
      easing: 'ease-out',
      speed: 0.4,
      direction: 'center'
    }),
    ui: ['duration', 'easing', 'direction', 'rotateFrom', 'opacityFrom', 'speed', 'sequence', 'groupSize', 'randomize', 'reverse'],
    eval: (i, N, progress) => ({
      x: lerp(this.defaults?.xFrom ?? -40, 0, progress),
      y: 0,
      scale: 1,
      rotate: lerp(this.defaults?.rotateFrom ?? -180, 0, progress),
      opacity: lerp(this.defaults?.opacityFrom ?? 0, 1, progress),
      blur: 0
    })
  },

  'Scroll': {
    name: 'Scroll',
    defaults: createEffectParams({
      yFrom: 80,
      opacityFrom: 0,
      duration: 1.0,
      easing: 'ease-out',
      speed: 0.3,
      type: 'regular'
    }),
    ui: ['duration', 'easing', 'type', 'speed', 'sequence', 'groupSize', 'randomize', 'reverse'],
    eval: (i, N, progress) => ({
      x: 0,
      y: lerp(this.defaults?.yFrom ?? 80, 0, progress),
      scale: 1,
      rotate: 0,
      opacity: lerp(this.defaults?.opacityFrom ?? 0, 1, progress),
      blur: 0
    })
  },

  'Slide': {
    name: 'Slide',
    defaults: createEffectParams({
      xFrom: -120,
      opacityFrom: 0,
      duration: 0.8,
      easing: 'ease-out',
      speed: 0.5,
      direction: 'left'
    }),
    ui: ['duration', 'easing', 'direction', 'opacityFrom', 'speed', 'sequence', 'groupSize', 'randomize', 'reverse'],
    eval: (i, N, progress) => ({
      x: lerp(this.defaults?.xFrom ?? -120, 0, progress),
      y: 0,
      scale: 1,
      rotate: 0,
      opacity: lerp(this.defaults?.opacityFrom ?? 0, 1, progress),
      blur: 0
    })
  },

  'Spin': {
    name: 'Spin',
    defaults: createEffectParams({
      rotateFrom: -360,
      scaleFrom: 0.3,
      opacityFrom: 0,
      duration: 1.2,
      easing: 'ease-out',
      speed: 0.4,
      direction: 'center'
    }),
    ui: ['duration', 'easing', 'direction', 'rotateFrom', 'opacityFrom', 'speed', 'sequence', 'groupSize', 'randomize', 'reverse'],
    eval: (i, N, progress) => ({
      x: 0,
      y: 0,
      scale: lerp(this.defaults?.scaleFrom ?? 0.3, 1, progress),
      rotate: lerp(this.defaults?.rotateFrom ?? -360, 0, progress),
      opacity: lerp(this.defaults?.opacityFrom ?? 0, 1, progress),
      blur: 0
    })
  },

  'Spread': {
    name: 'Spread',
    defaults: createEffectParams({
      scaleFrom: 0.1,
      opacityFrom: 0,
      duration: 0.9,
      easing: 'back-out',
      speed: 0.6,
      direction: 'right'
    }),
    ui: ['duration', 'easing', 'direction', 'scaleFrom', 'opacityFrom', 'speed', 'sequence', 'groupSize', 'randomize', 'reverse'],
    eval: (i, N, progress) => ({
      x: 0,
      y: 0,
      scale: lerp(this.defaults?.scaleFrom ?? 0.1, 1, progress),
      rotate: 0,
      opacity: lerp(this.defaults?.opacityFrom ?? 0, 1, progress),
      blur: 0
    })
  },

  'Typewriter': {
    name: 'Typewriter',
    defaults: createEffectParams({
      duration: 2.0,
      easing: 'linear',
      speed: 0.5,
      sequence: 'char', // Typewriter works best with character sequence
      fadeIn: false
    }),
    ui: ['duration', 'opacityFrom', 'speed', 'fadeIn', 'sequence', 'groupSize', 'randomize', 'reverse'],
    eval: (i, N, progress) => {
      // Typewriter effect - hard cutoff reveal
      const revealed = progress >= 1.0 ? 1 : (progress <= 0 ? 0 : progress);
      const threshold = 0.95; // Slight threshold for smoother reveal
      
      return {
        x: 0,
        y: 0,
        scale: 1,
        rotate: 0,
        opacity: revealed >= threshold ? 1 : 0,
        blur: 0
      };
    }
  },

  'Zoom': {
    name: 'Zoom',
    defaults: createEffectParams({
      scaleFrom: 0.2,
      opacityFrom: 0,
      duration: 0.7,
      easing: 'back-out',
      speed: 0.5
    }),
    ui: ['duration', 'easing', 'scaleFrom', 'opacityFrom', 'speed', 'sequence', 'groupSize', 'randomize', 'reverse'],
    eval: (i, N, progress) => ({
      x: 0,
      y: 0,
      scale: lerp(this.defaults?.scaleFrom ?? 0.2, 1, progress),
      rotate: 0,
      opacity: lerp(this.defaults?.opacityFrom ?? 0, 1, progress),
      blur: 0
    })
  }

};

// Fix the eval function context issue by binding defaults properly
Object.keys(GWDEffects).forEach(effectName => {
  const effect = GWDEffects[effectName];
  const originalEval = effect.eval;
  
  effect.eval = (i, N, progress, params) => {
    // Use the actual parameters passed from the UI, fall back to defaults
    const actualParams = params || effect.defaults;
    
    switch (effectName) {
      case 'Blur':
        return {
          x: 0,
          y: 0,
          scale: 1,
          rotate: 0,
          opacity: lerp(actualParams.opacityFrom ?? 0, 1, progress),
          blur: lerp(actualParams.blurFromPx ?? 8, 0, progress)
        };
        
      case 'Drop in':
        // Calculate direction-based offset
        const direction = actualParams.direction || 'top';
        let xOffset = 0, yOffset = 0;
        const distance = 60;
        
        switch (direction) {
          case 'top':
            yOffset = -distance;
            break;
          case 'bottom':
            yOffset = distance;
            break;
          case 'left':
            xOffset = -distance;
            break;
          case 'right':
            xOffset = distance;
            break;
        }
        
        return {
          x: lerp(xOffset, 0, progress),
          y: lerp(yOffset, 0, progress),
          scale: 1,
          rotate: 0,
          opacity: lerp(actualParams.opacityFrom ?? 0, 1, progress),
          blur: 0
        };
        
      case 'Flip':
        return {
          x: 0,
          y: 0,
          scale: 1,
          rotate: lerp(actualParams.rotateFrom ?? -90, 0, progress),
          opacity: lerp(actualParams.opacityFrom ?? 0, 1, progress),
          blur: 0
        };
        
      case 'Line up':
        // Calculate direction-based offset
        const lineDirection = actualParams.direction || 'bottom';
        let lineYOffset = 0;
        const lineDistance = 20;
        
        switch (lineDirection) {
          case 'bottom':
            lineYOffset = lineDistance;
            break;
          case 'top':
            lineYOffset = -lineDistance;
            break;
        }
        
        return {
          x: 0,
          y: lerp(lineYOffset, 0, progress),
          scale: 1,
          rotate: 0,
          opacity: lerp(actualParams.opacityFrom ?? 0, 1, progress),
          blur: 0
        };
        
      case 'Roll':
        // Calculate direction-based offset and rotation
        const rollDirection = actualParams.direction || 'center';
        let rollXOffset = 0;
        let rollRotation = actualParams.rotateFrom ?? -180;
        
        switch (rollDirection) {
          case 'left':
            rollXOffset = -40;
            rollRotation = -180;
            break;
          case 'right':
            rollXOffset = 40;
            rollRotation = 180;
            break;
          case 'center':
          default:
            rollXOffset = actualParams.xFrom ?? -40;
            rollRotation = actualParams.rotateFrom ?? -180;
            break;
        }
        
        return {
          x: lerp(rollXOffset, 0, progress),
          y: 0,
          scale: 1,
          rotate: lerp(rollRotation, 0, progress),
          opacity: lerp(actualParams.opacityFrom ?? 0, 1, progress),
          blur: 0
        };
        
      case 'Scroll':
        return {
          x: 0,
          y: lerp(actualParams.yFrom ?? 80, 0, progress),
          scale: 1,
          rotate: 0,
          opacity: lerp(actualParams.opacityFrom ?? 0, 1, progress),
          blur: 0
        };
        
      case 'Slide':
        // Calculate direction-based offset
        const slideDirection = actualParams.direction || 'left';
        let slideXOffset = 0, slideYOffset = 0;
        const slideDistance = 120;
        
        switch (slideDirection) {
          case 'left':
            slideXOffset = -slideDistance;
            break;
          case 'right':
            slideXOffset = slideDistance;
            break;
          case 'top':
            slideYOffset = -slideDistance;
            break;
          case 'bottom':
            slideYOffset = slideDistance;
            break;
        }
        
        return {
          x: lerp(slideXOffset, 0, progress),
          y: lerp(slideYOffset, 0, progress),
          scale: 1,
          rotate: 0,
          opacity: lerp(actualParams.opacityFrom ?? 0, 1, progress),
          blur: 0
        };
        
      case 'Spin':
        return {
          x: 0,
          y: 0,
          scale: lerp(actualParams.scaleFrom ?? 0.3, 1, progress),
          rotate: lerp(actualParams.rotateFrom ?? -360, 0, progress),
          opacity: lerp(actualParams.opacityFrom ?? 0, 1, progress),
          blur: 0
        };
        
      case 'Spread':
        // Calculate direction-based initial offset for spread effect
        const spreadDirection = actualParams.direction || 'center';
        let spreadXOffset = 0, spreadYOffset = 0;
        const spreadDistance = 30;
        
        // Spread starts from a direction and scales up to center
        switch (spreadDirection) {
          case 'left':
            spreadXOffset = -spreadDistance * (1 - progress);
            break;
          case 'right':
            spreadXOffset = spreadDistance * (1 - progress);
            break;
          case 'top':
            spreadYOffset = -spreadDistance * (1 - progress);
            break;
          case 'bottom':
            spreadYOffset = spreadDistance * (1 - progress);
            break;
          case 'center':
          default:
            // No offset for center spread
            spreadXOffset = 0;
            spreadYOffset = 0;
            break;
        }
        
        return {
          x: spreadXOffset,
          y: spreadYOffset,
          scale: lerp(actualParams.scaleFrom ?? 0.1, 1, progress),
          rotate: 0,
          opacity: lerp(actualParams.opacityFrom ?? 0, 1, progress),
          blur: 0
        };
        
      case 'Typewriter':
        // Typewriter effect - hard cutoff reveal
        const revealed = progress >= 1.0 ? 1 : (progress <= 0 ? 0 : progress);
        const threshold = 0.95; // Slight threshold for smoother reveal
        
        return {
          x: 0,
          y: 0,
          scale: 1,
          rotate: 0,
          opacity: revealed >= threshold ? 1 : 0,
          blur: 0
        };
        
      case 'Zoom':
        return {
          x: 0,
          y: 0,
          scale: lerp(actualParams.scaleFrom ?? 0.2, 1, progress),
          rotate: 0,
          opacity: lerp(actualParams.opacityFrom ?? 0, 1, progress),
          blur: 0
        };
        
      default:
        return { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1, blur: 0 };
    }
  };
});

// Helper function to get effect by name
export const getEffect = (effectName) => {
  return GWDEffects[effectName] || null;
};

// Get list of all effect names
export const getEffectNames = () => {
  return Object.keys(GWDEffects);
};

// Create merged parameters for an effect with user overrides
export const createEffectParameters = (effectName, overrides = {}) => {
  const effect = getEffect(effectName);
  if (!effect) return createEffectParams(overrides);
  
  return {
    ...effect.defaults,
    ...overrides
  };
};

export default GWDEffects;