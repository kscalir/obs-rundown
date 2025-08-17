import { useState, useEffect, useRef, useCallback } from 'react';

const useAutoAdvance = (executionState) => {
  const [countdownTimers, setCountdownTimers] = useState({});
  const timerIntervals = useRef({});
  
  // Start countdown for an item
  const startCountdown = useCallback((itemId, duration) => {
    if (timerIntervals.current[itemId]) {
      clearInterval(timerIntervals.current[itemId]);
    }
    
    const startTime = Date.now();
    const endTime = startTime + duration;
    
    setCountdownTimers(prev => ({
      ...prev,
      [itemId]: duration
    }));
    
    timerIntervals.current[itemId] = setInterval(() => {
      const remaining = Math.max(0, endTime - Date.now());
      
      setCountdownTimers(prev => ({
        ...prev,
        [itemId]: remaining
      }));
      
      if (remaining <= 0) {
        clearInterval(timerIntervals.current[itemId]);
        delete timerIntervals.current[itemId];
      }
    }, 100);
  }, []);
  
  // Stop countdown for an item
  const stopCountdown = useCallback((itemId) => {
    if (timerIntervals.current[itemId]) {
      clearInterval(timerIntervals.current[itemId]);
      delete timerIntervals.current[itemId];
    }
    
    setCountdownTimers(prev => {
      const newTimers = { ...prev };
      delete newTimers[itemId];
      return newTimers;
    });
  }, []);
  
  // Clear all countdowns
  const clearAllCountdowns = useCallback(() => {
    Object.keys(timerIntervals.current).forEach(itemId => {
      clearInterval(timerIntervals.current[itemId]);
    });
    timerIntervals.current = {};
    setCountdownTimers({});
  }, []);
  
  // Pause/resume countdowns based on execution state
  useEffect(() => {
    if (executionState?.paused) {
      // Store current timer values when pausing
      const currentTimers = { ...countdownTimers };
      
      // Clear all intervals
      Object.keys(timerIntervals.current).forEach(itemId => {
        clearInterval(timerIntervals.current[itemId]);
        delete timerIntervals.current[itemId];
      });
    } else if (executionState?.paused === false) {
      // Resume timers with stored values
      Object.entries(countdownTimers).forEach(([itemId, remaining]) => {
        if (remaining > 0) {
          startCountdown(itemId, remaining);
        }
      });
    }
  }, [executionState?.paused]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllCountdowns();
    };
  }, []);
  
  return {
    countdownTimers,
    startCountdown,
    stopCountdown,
    clearAllCountdowns
  };
};

export default useAutoAdvance;