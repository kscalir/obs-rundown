import Scene, { SceneItem } from 'scenejs';
import { PropertyDiscoverySystem } from '../Timeline/PropertyDiscovery';

export interface Keyframe {
  time: number;
  value: any;
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'cubic-bezier';
  bezier?: [number, number, number, number];
}

export interface PropertyTrack {
  propertyName: string;
  keyframes: Keyframe[];
}

export interface ElementAnimation {
  elementId: string;
  tracks: PropertyTrack[];
}

export class AnimationEngine {
  private static instance: AnimationEngine;
  private scene: Scene;
  private animations: Map<string, ElementAnimation> = new Map();
  private propertyDiscovery = PropertyDiscoverySystem.getInstance();
  private updateCallback?: (elementId: string, updates: any) => void;
  private currentTime = 0;
  private duration = 10;
  private isPlaying = false;
  private playbackRate = 1;

  private constructor() {
    this.scene = new Scene({
      duration: this.duration,
      iterationCount: 1,
      easing: 'linear',
    });

    this.scene.on('animate', (e: any) => {
      this.currentTime = e.time;
      this.applyAnimations(e.time);
    });

    this.scene.on('ended', () => {
      this.isPlaying = false;
    });
  }

  static getInstance(): AnimationEngine {
    if (!AnimationEngine.instance) {
      AnimationEngine.instance = new AnimationEngine();
    }
    return AnimationEngine.instance;
  }

  setUpdateCallback(callback: (elementId: string, updates: any) => void) {
    this.updateCallback = callback;
  }

  setDuration(duration: number) {
    this.duration = duration;
    this.scene.setDuration(duration);
  }

  getDuration(): number {
    return this.duration;
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  setCurrentTime(time: number) {
    this.currentTime = time;
    this.scene.setTime(time);
    this.applyAnimations(time);
  }

  play() {
    this.isPlaying = true;
    this.scene.play();
  }

  pause() {
    this.isPlaying = false;
    this.scene.pause();
  }

  stop() {
    this.isPlaying = false;
    this.scene.pause();
    this.scene.setTime(0);
    this.currentTime = 0;
  }

  isAnimating(): boolean {
    return this.isPlaying;
  }

  setPlaybackRate(rate: number) {
    this.playbackRate = rate;
    this.scene.setPlaySpeed(rate);
  }

  // Keyframe management
  addKeyframe(elementId: string, propertyName: string, value: any, time?: number) {
    const frameTime = time ?? this.currentTime;
    
    if (!this.animations.has(elementId)) {
      this.animations.set(elementId, {
        elementId,
        tracks: []
      });
    }

    const animation = this.animations.get(elementId)!;
    let track = animation.tracks.find(t => t.propertyName === propertyName);
    
    if (!track) {
      track = {
        propertyName,
        keyframes: []
      };
      animation.tracks.push(track);
    }

    // Check if keyframe exists at this time
    const existingIndex = track.keyframes.findIndex(kf => Math.abs(kf.time - frameTime) < 0.01);
    
    if (existingIndex !== -1) {
      track.keyframes[existingIndex].value = value;
    } else {
      track.keyframes.push({
        time: frameTime,
        value,
        easing: 'linear'
      });
      track.keyframes.sort((a, b) => a.time - b.time);
    }

    this.updateSceneItem(elementId);
  }

  removeKeyframe(elementId: string, propertyName: string, time: number) {
    const animation = this.animations.get(elementId);
    if (!animation) return;

    const track = animation.tracks.find(t => t.propertyName === propertyName);
    if (!track) return;

    track.keyframes = track.keyframes.filter(kf => Math.abs(kf.time - time) >= 0.01);
    
    if (track.keyframes.length === 0) {
      animation.tracks = animation.tracks.filter(t => t !== track);
    }

    if (animation.tracks.length === 0) {
      this.animations.delete(elementId);
    }

    this.updateSceneItem(elementId);
  }

  getKeyframes(elementId: string, propertyName?: string): PropertyTrack[] {
    const animation = this.animations.get(elementId);
    if (!animation) return [];

    if (propertyName) {
      const track = animation.tracks.find(t => t.propertyName === propertyName);
      return track ? [track] : [];
    }

    return animation.tracks;
  }

  getAllAnimations(): ElementAnimation[] {
    return Array.from(this.animations.values());
  }

  hasKeyframes(elementId: string): boolean {
    const animation = this.animations.get(elementId);
    return animation ? animation.tracks.length > 0 : false;
  }

  // Update Scene.js with current keyframes
  private updateSceneItem(elementId: string) {
    const animation = this.animations.get(elementId);
    
    if (!animation || animation.tracks.length === 0) {
      this.scene.removeItem(elementId);
      return;
    }

    const sceneItem = new SceneItem();
    
    animation.tracks.forEach(track => {
      const keyframeObj: any = {};
      
      track.keyframes.forEach(kf => {
        keyframeObj[kf.time] = {
          value: kf.value,
          easing: kf.easing || 'linear'
        };
      });
      
      sceneItem.set(track.propertyName, keyframeObj);
    });

    this.scene.setItem(elementId, sceneItem);
  }

  // Apply animations at current time
  private applyAnimations(time: number) {
    if (!this.updateCallback) return;

    this.animations.forEach((animation, elementId) => {
      const updates: any = {};
      
      animation.tracks.forEach(track => {
        const value = this.interpolateValue(track.keyframes, time);
        if (value !== undefined) {
          updates[track.propertyName] = value;
        }
      });

      if (Object.keys(updates).length > 0) {
        this.updateCallback!(elementId, updates);
      }
    });
  }

  // Interpolation logic
  private interpolateValue(keyframes: Keyframe[], time: number): any {
    if (keyframes.length === 0) return undefined;
    if (keyframes.length === 1) return keyframes[0].value;

    // Find surrounding keyframes
    let prevKf: Keyframe | null = null;
    let nextKf: Keyframe | null = null;

    for (let i = 0; i < keyframes.length; i++) {
      if (keyframes[i].time <= time) {
        prevKf = keyframes[i];
      } else {
        nextKf = keyframes[i];
        break;
      }
    }

    if (!prevKf) return keyframes[0].value;
    if (!nextKf) return keyframes[keyframes.length - 1].value;

    // Calculate interpolation factor
    const t = (time - prevKf.time) / (nextKf.time - prevKf.time);
    const easedT = this.applyEasing(t, prevKf.easing || 'linear', prevKf.bezier);

    // Interpolate based on type
    return this.lerp(prevKf.value, nextKf.value, easedT);
  }

  private applyEasing(t: number, easing: string, bezier?: [number, number, number, number]): number {
    switch (easing) {
      case 'ease-in':
        return t * t;
      case 'ease-out':
        return t * (2 - t);
      case 'ease-in-out':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      case 'cubic-bezier':
        if (bezier) {
          return this.cubicBezier(t, bezier[0], bezier[1], bezier[2], bezier[3]);
        }
        return t;
      case 'linear':
      default:
        return t;
    }
  }

  private cubicBezier(t: number, p1: number, p2: number, p3: number, p4: number): number {
    // Simplified cubic bezier calculation
    const cx = 3 * p1;
    const bx = 3 * (p3 - p1) - cx;
    const ax = 1 - cx - bx;
    const cy = 3 * p2;
    const by = 3 * (p4 - p2) - cy;
    const ay = 1 - cy - by;

    const sampleCurveY = (t: number) => ((ay * t + by) * t + cy) * t;
    return sampleCurveY(t);
  }

  private lerp(start: any, end: any, t: number): any {
    // Number interpolation
    if (typeof start === 'number' && typeof end === 'number') {
      return start + (end - start) * t;
    }

    // Boolean interpolation
    if (typeof start === 'boolean') {
      return t < 0.5 ? start : end;
    }

    // Color interpolation
    if (typeof start === 'string' && typeof end === 'string' && 
        start.match(/^#[0-9A-Fa-f]{6}$/) && end.match(/^#[0-9A-Fa-f]{6}$/)) {
      return this.interpolateColor(start, end, t);
    }

    // Array interpolation
    if (Array.isArray(start) && Array.isArray(end)) {
      return this.interpolateArray(start, end, t);
    }

    // Default to step interpolation
    return t < 0.5 ? start : end;
  }

  private interpolateColor(color1: string, color2: string, t: number): string {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);
    
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private interpolateArray(arr1: any[], arr2: any[], t: number): any[] {
    const result = [];
    const maxLength = Math.max(arr1.length, arr2.length);
    
    for (let i = 0; i < maxLength; i++) {
      const val1 = arr1[i] !== undefined ? arr1[i] : arr2[i];
      const val2 = arr2[i] !== undefined ? arr2[i] : arr1[i];
      result.push(this.lerp(val1, val2, t));
    }
    
    return result;
  }

  // Export/Import animations
  exportAnimations(): string {
    const data = {
      duration: this.duration,
      animations: Array.from(this.animations.entries()).map(([id, anim]) => ({
        elementId: id,
        tracks: anim.tracks
      }))
    };
    return JSON.stringify(data, null, 2);
  }

  importAnimations(jsonData: string) {
    try {
      const data = JSON.parse(jsonData);
      this.duration = data.duration || 10;
      this.scene.setDuration(this.duration);
      
      this.animations.clear();
      data.animations.forEach((anim: ElementAnimation) => {
        this.animations.set(anim.elementId, anim);
        this.updateSceneItem(anim.elementId);
      });
    } catch (error) {
      console.error('Failed to import animations:', error);
    }
  }

  clearAllAnimations() {
    this.animations.clear();
    this.scene.clear();
  }
}