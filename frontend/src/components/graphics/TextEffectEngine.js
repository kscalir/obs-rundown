/**
 * TextEffectEngine - Core system for Google Web Designer-style text effects
 * 
 * This engine provides a unified system for creating text animations that exactly
 * match GWD's interface and behavior, with support for char/word/line sequencing,
 * staggered timing, and all the standard animation properties.
 */

// Effect parameter schema - matches GWD interface exactly
export const createEffectParams = (overrides = {}) => ({
  // Core animation properties
  duration: 2,           // Duration slider (seconds)
  easing: 'ease-out',    // Easing dropdown
  speed: 0.5,            // Speed slider (affects stagger timing)
  sequence: 'char',      // Sequence: 'char' | 'word' | 'line'
  groupSize: 1,          // Grouping size slider
  randomize: false,      // Randomize order checkbox
  reverse: false,        // Reverse checkbox
  
  // Effect-specific parameters (only shown when relevant)
  scaleFrom: undefined,     // Scale slider (for Zoom, etc.)
  opacityFrom: undefined,   // Opacity slider (for fades)
  xFrom: undefined,         // For slide effects
  yFrom: undefined,         // For drop effects
  blurFromPx: undefined,    // For blur effect
  rotateFrom: undefined,    // For flip/spin effects
  rotateAxis: 'z',          // Rotation axis ('x' | 'y' | 'z')
  
  ...overrides
});

// Easing function implementations
export const easingFunctions = {
  'linear': t => t,
  'ease': t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  'ease-in': t => t * t,
  'ease-out': t => t * (2 - t),
  'ease-in-out': t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  'bounce-out': t => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  },
  'back-out': t => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
};

// Apply easing function to a 0-1 progress value
export const applyEasing = (easingName, progress) => {
  const fn = easingFunctions[easingName] || easingFunctions['ease-out'];
  return fn(Math.max(0, Math.min(1, progress)));
};

// Linear interpolation
export const lerp = (from, to, progress) => {
  return from + (to - from) * progress;
};

// Clamp value between 0 and 1
export const clamp01 = (value) => Math.max(0, Math.min(1, value));

// Shuffle array indices (for randomize option)
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Calculate staggered progress for a unit based on effect parameters
export const calculateUnitProgress = (unitIndex, totalUnits, masterProgress, params) => {
  // Handle grouping - collapse multiple units into groups
  const effectiveIndex = Math.floor(unitIndex / Math.max(1, params.groupSize));
  const totalGroups = Math.ceil(totalUnits / Math.max(1, params.groupSize));
  
  // Handle randomization
  let orderIndex = effectiveIndex;
  if (params.randomize) {
    // Create consistent random order based on total units (deterministic)
    const indices = Array.from({ length: totalGroups }, (_, i) => i);
    const seededRandom = (seed) => {
      let x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };
    
    // Simple seeded shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom(i + totalGroups) * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    orderIndex = indices[effectiveIndex];
  }
  
  // Handle reverse
  if (params.reverse) {
    orderIndex = totalGroups - 1 - orderIndex;
  }
  
  // Calculate timing
  const maxStagger = params.duration * 0.7; // 70% of duration for staggering
  const animationDuration = params.duration - maxStagger;
  
  // Speed affects how much of the duration is used for staggering
  const staggerAmount = maxStagger * params.speed;
  const perUnitDelay = totalGroups > 1 ? staggerAmount / (totalGroups - 1) : 0;
  
  // Calculate when this unit should start (0 to staggerAmount)
  const unitStartTime = orderIndex * perUnitDelay;
  
  // Calculate local progress for this unit
  const globalTime = masterProgress * params.duration;
  const localTime = globalTime - unitStartTime;
  const localProgress = localTime / animationDuration;
  
  return clamp01(localProgress);
};

// Text splitting utilities
export const splitText = (element, splitType) => {
  if (!element || !element.textContent) return [];
  
  const text = element.textContent;
  
  switch (splitType) {
    case 'char':
      return text.split('').map((char, index) => ({
        content: char,
        index,
        type: 'char'
      }));
      
    case 'word':
      return text.split(/(\s+)/).filter(word => word.trim()).map((word, index) => ({
        content: word,
        index,
        type: 'word'
      }));
      
    case 'line':
      return text.split('\n').map((line, index) => ({
        content: line,
        index,
        type: 'line'
      }));
      
    default:
      return [{
        content: text,
        index: 0,
        type: 'block'
      }];
  }
};

// Create DOM structure for split text
export const createSplitDOM = (element, units, splitType) => {
  if (!element) return [];
  
  // Clear existing content
  element.innerHTML = '';
  
  // Create span elements for each unit
  const unitElements = units.map(unit => {
    const span = document.createElement('span');
    span.className = `text-unit text-${unit.type}`;
    span.textContent = unit.content;
    span.style.display = 'inline-block';
    span.style.whiteSpace = splitType === 'line' ? 'pre-line' : 'inherit';
    
    // Preserve spaces for word splitting
    if (splitType === 'word' && unit.content.includes(' ')) {
      span.style.whiteSpace = 'pre';
    }
    
    element.appendChild(span);
    return span;
  });
  
  return unitElements;
};

// Build CSS transform string from animation values
export const buildTransform = (values, rotateAxis = 'z') => {
  const transforms = [];
  
  if (values.x !== 0 || values.y !== 0) {
    transforms.push(`translate(${values.x}px, ${values.y}px)`);
  }
  
  if (values.scale !== 1) {
    transforms.push(`scale(${values.scale})`);
  }
  
  if (values.rotate !== 0) {
    switch (rotateAxis) {
      case 'x':
        transforms.push(`rotateX(${values.rotate}deg)`);
        break;
      case 'y':
        transforms.push(`rotateY(${values.rotate}deg)`);
        break;
      case 'z':
      default:
        transforms.push(`rotate(${values.rotate}deg)`);
        break;
    }
  }
  
  return transforms.length > 0 ? transforms.join(' ') : '';
};

// Main animation renderer - applies effect to all units at given progress
export const renderTextEffect = (effectSpec, unitElements, masterProgress, params) => {
  if (!effectSpec || !effectSpec.eval || !unitElements || unitElements.length === 0) {
    return;
  }
  
  const totalUnits = unitElements.length;
  
  unitElements.forEach((element, index) => {
    // Calculate progress for this specific unit
    const unitProgress = calculateUnitProgress(index, totalUnits, masterProgress, params);
    
    // Apply easing to the progress
    const easedProgress = applyEasing(params.easing, unitProgress);
    
    // Get animation values from the effect spec
    const values = effectSpec.eval(index, totalUnits, easedProgress, params);
    
    // Apply the values to the DOM element
    element.style.opacity = values.opacity.toString();
    element.style.filter = values.blur > 0 ? `blur(${values.blur}px)` : '';
    
    const transform = buildTransform(values, params.rotateAxis);
    element.style.transform = transform;
    
    // Ensure transform-origin is set for rotations
    if (values.rotate !== 0) {
      element.style.transformOrigin = 'center center';
    }
  });
};

// Animation loop controller
export class TextEffectController {
  constructor(element, effectSpec, params) {
    this.element = element;
    this.effectSpec = effectSpec;
    this.params = { ...params };
    this.unitElements = [];
    this.isPlaying = false;
    this.startTime = 0;
    this.animationFrame = null;
    
    this.initialize();
  }
  
  initialize() {
    if (!this.element || !this.effectSpec) return;
    
    // Split text and create DOM structure
    const units = splitText(this.element, this.params.sequence);
    this.unitElements = createSplitDOM(this.element, units, this.params.sequence);
    
    // Reset to initial state
    this.setProgress(0);
  }
  
  setProgress(progress) {
    const clampedProgress = clamp01(progress);
    renderTextEffect(this.effectSpec, this.unitElements, clampedProgress, this.params);
  }
  
  play() {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - this.startTime;
      const progress = elapsed / (this.params.duration * 1000);
      
      this.setProgress(progress);
      
      if (progress < 1 && this.isPlaying) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        this.stop();
      }
    };
    
    this.animationFrame = requestAnimationFrame(animate);
  }
  
  stop() {
    this.isPlaying = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }
  
  reset() {
    this.stop();
    this.setProgress(0);
  }
  
  updateParams(newParams) {
    const shouldReinitialize = (
      newParams.sequence !== this.params.sequence
    );
    
    this.params = { ...newParams };
    
    if (shouldReinitialize) {
      this.initialize();
    }
  }
  
  destroy() {
    this.stop();
    if (this.element) {
      this.element.innerHTML = this.element.textContent;
    }
  }
}

export default {
  createEffectParams,
  easingFunctions,
  applyEasing,
  lerp,
  clamp01,
  calculateUnitProgress,
  splitText,
  createSplitDOM,
  buildTransform,
  renderTextEffect,
  TextEffectController
};