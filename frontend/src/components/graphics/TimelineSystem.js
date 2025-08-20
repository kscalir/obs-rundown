/**
 * Animation Timeline System
 * Core data structures and state management for the animation timeline
 * Inspired by After Effects, Theatre.js, and professional animation tools
 */

/**
 * Timeline Data Structure
 * 
 * timeline: {
 *   duration: number,           // Total timeline duration in seconds
 *   currentTime: number,        // Current playhead position in seconds
 *   isPlaying: boolean,         // Playback state
 *   fps: number,                // Frames per second (default 30)
 *   tracks: Track[]             // Array of animation tracks
 * }
 * 
 * track: {
 *   id: string,                 // Unique track identifier
 *   elementId: string,          // Element this track animates
 *   elementName: string,        // Display name for track
 *   type: 'element' | 'effect', // Track type
 *   visible: boolean,           // Track visibility in timeline
 *   locked: boolean,            // Track editing lock
 *   properties: Property[]      // Animatable properties
 * }
 * 
 * property: {
 *   name: string,               // Property name (x, y, opacity, etc.)
 *   keyframes: Keyframe[],      // Array of keyframes
 *   interpolation: 'linear' | 'bezier' | 'step'
 * }
 * 
 * keyframe: {
 *   time: number,               // Time position in seconds
 *   value: any,                 // Property value at this keyframe
 *   easing: {
 *     type: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'cubic-bezier',
 *     values?: [number, number, number, number] // For cubic-bezier
 *   },
 *   selected: boolean           // Selection state for editing
 * }
 */

// Default easing options
export const EASING_PRESETS = {
  linear: { type: 'linear' },
  ease: { type: 'ease' },
  easeIn: { type: 'ease-in' },
  easeOut: { type: 'ease-out' },
  easeInOut: { type: 'ease-in-out' },
  // Custom bezier curves
  bounce: { type: 'cubic-bezier', values: [0.68, -0.55, 0.265, 1.55] },
  back: { type: 'cubic-bezier', values: [0.175, 0.885, 0.32, 1.275] },
  elastic: { type: 'cubic-bezier', values: [0.68, -0.55, 0.265, 1.55] }
};

// Animatable properties for different element types
export const ANIMATABLE_PROPERTIES = {
  common: ['x', 'y', 'opacity', 'rotation', 'scaleX', 'scaleY'],
  text: ['fontSize', 'textColor', 'textShadow', 'textEffect'],
  rect: ['width', 'height', 'fill', 'stroke', 'cornerRadius'],
  circle: ['radius', 'fill', 'stroke'],
  image: ['width', 'height', 'saturation', 'brightness', 'contrast'],
  video: ['width', 'height', 'volume', 'saturation', 'brightness']
};

/**
 * Timeline State Manager
 * Handles timeline state, playback, and keyframe manipulation
 */
export class TimelineManager {
  constructor() {
    this.timeline = {
      duration: 10, // 10 seconds default
      currentTime: 0,
      isPlaying: false,
      fps: 30,
      tracks: [],
      selectedKeyframes: []
    };
    
    this.playbackTimer = null;
    this.subscribers = [];
  }

  // Subscribe to timeline changes
  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  // Notify subscribers of changes
  notify() {
    this.subscribers.forEach(callback => callback(this.timeline));
  }

  // Create a new track for an element
  createTrack(element) {
    const track = {
      id: `track-${element.id}`,
      elementId: element.id,
      elementName: element.name || `${element.type} ${element.id.substring(0, 8)}`,
      type: 'element',
      visible: true,
      locked: false,
      properties: []
    };

    // Initialize default properties based on element type
    const commonProps = ANIMATABLE_PROPERTIES.common;
    const typeProps = ANIMATABLE_PROPERTIES[element.type] || [];
    const allProps = [...commonProps, ...typeProps];

    allProps.forEach(propName => {
      track.properties.push({
        name: propName,
        keyframes: [],
        interpolation: 'linear'
      });
    });

    this.timeline.tracks.push(track);
    this.notify();
    return track;
  }

  // Add a keyframe to a property
  addKeyframe(trackId, propertyName, time, value, easing = EASING_PRESETS.linear) {
    const track = this.timeline.tracks.find(t => t.id === trackId);
    if (!track) return null;

    const property = track.properties.find(p => p.name === propertyName);
    if (!property) return null;

    // Remove existing keyframe at the same time
    property.keyframes = property.keyframes.filter(kf => Math.abs(kf.time - time) > 0.01);

    // Add new keyframe
    const keyframe = {
      time,
      value,
      easing,
      selected: false
    };

    property.keyframes.push(keyframe);
    property.keyframes.sort((a, b) => a.time - b.time);

    this.notify();
    return keyframe;
  }

  // Get interpolated value for a property at current time
  getPropertyValue(trackId, propertyName, time = this.timeline.currentTime) {
    const track = this.timeline.tracks.find(t => t.id === trackId);
    if (!track) return null;

    const property = track.properties.find(p => p.name === propertyName);
    if (!property || property.keyframes.length === 0) return null;

    const keyframes = property.keyframes.sort((a, b) => a.time - b.time);

    // If time is before first keyframe, return first value
    if (time <= keyframes[0].time) {
      return keyframes[0].value;
    }

    // If time is after last keyframe, return last value
    if (time >= keyframes[keyframes.length - 1].time) {
      return keyframes[keyframes.length - 1].value;
    }

    // Find keyframes to interpolate between
    let startKeyframe = null;
    let endKeyframe = null;

    for (let i = 0; i < keyframes.length - 1; i++) {
      if (time >= keyframes[i].time && time <= keyframes[i + 1].time) {
        startKeyframe = keyframes[i];
        endKeyframe = keyframes[i + 1];
        break;
      }
    }

    if (!startKeyframe || !endKeyframe) {
      return keyframes[0].value;
    }

    // Calculate interpolation progress
    const duration = endKeyframe.time - startKeyframe.time;
    const progress = (time - startKeyframe.time) / duration;

    // Apply easing
    const easedProgress = this.applyEasing(progress, startKeyframe.easing);

    // Interpolate value based on type
    return this.interpolateValue(startKeyframe.value, endKeyframe.value, easedProgress);
  }

  // Apply easing function to progress
  applyEasing(progress, easing) {
    switch (easing.type) {
      case 'linear':
        return progress;
      case 'ease':
        return this.cubicBezier(0.25, 0.1, 0.25, 1, progress);
      case 'ease-in':
        return this.cubicBezier(0.42, 0, 1, 1, progress);
      case 'ease-out':
        return this.cubicBezier(0, 0, 0.58, 1, progress);
      case 'ease-in-out':
        return this.cubicBezier(0.42, 0, 0.58, 1, progress);
      case 'cubic-bezier':
        return this.cubicBezier(...easing.values, progress);
      default:
        return progress;
    }
  }

  // Cubic bezier easing calculation
  cubicBezier(x1, y1, x2, y2, t) {
    // Simplified cubic bezier calculation
    const u = 1 - t;
    return 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t;
  }

  // Interpolate between two values
  interpolateValue(start, end, progress) {
    if (typeof start === 'number' && typeof end === 'number') {
      return start + (end - start) * progress;
    }
    
    if (typeof start === 'string' && typeof end === 'string') {
      // Color interpolation
      if (start.startsWith('#') && end.startsWith('#')) {
        return this.interpolateColor(start, end, progress);
      }
      // String values - no interpolation
      return progress < 0.5 ? start : end;
    }

    if (typeof start === 'object' && typeof end === 'object') {
      // Object interpolation (for complex properties)
      const result = {};
      for (const key in start) {
        if (end.hasOwnProperty(key)) {
          result[key] = this.interpolateValue(start[key], end[key], progress);
        }
      }
      return result;
    }

    // Fallback - no interpolation
    return progress < 0.5 ? start : end;
  }

  // Interpolate between hex colors
  interpolateColor(startHex, endHex, progress) {
    const start = this.hexToRgb(startHex);
    const end = this.hexToRgb(endHex);
    
    const r = Math.round(start.r + (end.r - start.r) * progress);
    const g = Math.round(start.g + (end.g - start.g) * progress);
    const b = Math.round(start.b + (end.b - start.b) * progress);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  // Convert hex to RGB
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // Start timeline playback
  play() {
    if (this.timeline.isPlaying) return;
    
    this.timeline.isPlaying = true;
    const startTime = Date.now() - (this.timeline.currentTime * 1000);
    
    this.playbackTimer = setInterval(() => {
      const now = Date.now();
      const newTime = (now - startTime) / 1000;
      
      if (newTime >= this.timeline.duration) {
        this.pause();
        this.timeline.currentTime = this.timeline.duration;
      } else {
        this.timeline.currentTime = newTime;
      }
      
      this.notify();
    }, 1000 / this.timeline.fps);
    
    this.notify();
  }

  // Pause timeline playback
  pause() {
    if (!this.timeline.isPlaying) return;
    
    this.timeline.isPlaying = false;
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }
    
    this.notify();
  }

  // Seek to specific time
  seek(time) {
    this.timeline.currentTime = Math.max(0, Math.min(time, this.timeline.duration));
    this.notify();
  }

  // Get current timeline state
  getState() {
    return { ...this.timeline };
  }

  // Set timeline duration
  setDuration(duration) {
    this.timeline.duration = Math.max(1, duration);
    if (this.timeline.currentTime > duration) {
      this.timeline.currentTime = duration;
    }
    this.notify();
  }
}

// Export singleton instance
export const timelineManager = new TimelineManager();