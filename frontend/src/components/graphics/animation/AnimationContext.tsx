import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AnimationEngine } from './AnimationEngine';
import { useEditorStore } from '../state/editorStore';

interface AnimationContextType {
  engine: AnimationEngine | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  autoKey: boolean;
  playbackRate: number;
  
  // Control methods
  play: () => void;
  pause: () => void;
  stop: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setAutoKey: (enabled: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  
  // Keyframe methods
  addKeyframe: (elementId: string, propertyName: string, value: any, time?: number) => void;
  removeKeyframe: (elementId: string, propertyName: string, time: number) => void;
  hasKeyframes: (elementId: string) => boolean;
  
  // Property tracking
  recordPropertyChange: (elementId: string, propertyName: string, value: any) => void;
}

const AnimationContext = createContext<AnimationContextType | null>(null);

export const useAnimation = () => {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimation must be used within AnimationProvider');
  }
  return context;
};

interface AnimationProviderProps {
  children: React.ReactNode;
}

export const AnimationProvider: React.FC<AnimationProviderProps> = ({ children }) => {
  // Only initialize if we're in the graphics editor route
  const isGraphicsEditor = window.location.pathname === '/graphics-editor';
  
  const engine = React.useMemo(() => {
    if (!isGraphicsEditor) return null;
    return AnimationEngine.getInstance();
  }, [isGraphicsEditor]);
  
  const { updateElement } = useEditorStore();
  
  const [currentTime, setCurrentTimeState] = useState(0);
  const [duration, setDurationState] = useState(10);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoKey, setAutoKey] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(1);

  // Set up the update callback for the animation engine
  useEffect(() => {
    if (!engine || !isGraphicsEditor) return;
    
    engine.setUpdateCallback((elementId, updates) => {
      updateElement(elementId, updates);
    });
  }, [updateElement, engine, isGraphicsEditor]);

  // Update current time from engine
  useEffect(() => {
    if (!engine || !isGraphicsEditor) return;
    
    const interval = setInterval(() => {
      if (engine.isAnimating()) {
        setCurrentTimeState(engine.getCurrentTime());
        setIsPlaying(true);
      } else {
        setIsPlaying(false);
      }
    }, 1000 / 30); // 30 FPS update

    return () => clearInterval(interval);
  }, [engine, isGraphicsEditor]);

  const play = useCallback(() => {
    if (!engine) return;
    engine.play();
    setIsPlaying(true);
  }, [engine]);

  const pause = useCallback(() => {
    if (!engine) return;
    engine.pause();
    setIsPlaying(false);
  }, [engine]);

  const stop = useCallback(() => {
    if (!engine) return;
    engine.stop();
    setIsPlaying(false);
    setCurrentTimeState(0);
  }, [engine]);

  const setCurrentTime = useCallback((time: number) => {
    if (!engine) return;
    engine.setCurrentTime(time);
    setCurrentTimeState(time);
  }, [engine]);

  const setDuration = useCallback((dur: number) => {
    if (!engine) return;
    engine.setDuration(dur);
    setDurationState(dur);
  }, [engine]);

  const setPlaybackRate = useCallback((rate: number) => {
    if (!engine) return;
    engine.setPlaybackRate(rate);
    setPlaybackRateState(rate);
  }, [engine]);

  const addKeyframe = useCallback((elementId: string, propertyName: string, value: any, time?: number) => {
    if (!engine) return;
    engine.addKeyframe(elementId, propertyName, value, time);
  }, [engine]);

  const removeKeyframe = useCallback((elementId: string, propertyName: string, time: number) => {
    if (!engine) return;
    engine.removeKeyframe(elementId, propertyName, time);
  }, [engine]);

  const hasKeyframes = useCallback((elementId: string): boolean => {
    if (!engine) return false;
    return engine.hasKeyframes(elementId);
  }, [engine]);

  const recordPropertyChange = useCallback((elementId: string, propertyName: string, value: any) => {
    if (!engine || !autoKey) return;
    engine.addKeyframe(elementId, propertyName, value);
  }, [autoKey, engine]);

  const value: AnimationContextType = {
    engine,
    currentTime,
    duration,
    isPlaying,
    autoKey,
    playbackRate,
    play,
    pause,
    stop,
    setCurrentTime,
    setDuration,
    setAutoKey,
    setPlaybackRate,
    addKeyframe,
    removeKeyframe,
    hasKeyframes,
    recordPropertyChange
  };

  return (
    <AnimationContext.Provider value={value}>
      {children}
    </AnimationContext.Provider>
  );
};