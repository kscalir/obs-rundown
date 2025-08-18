import { useState, useEffect, useRef, useCallback } from 'react';

// Hook to manage overlay timing for auto overlays
export default function useOverlayTiming(segments, liveItemId, executionState) {
  const [activeOverlays, setActiveOverlays] = useState([]);
  const overlayTimers = useRef({});
  
  // Find all auto overlay children of a given item
  const findOverlayChildren = useCallback((parentItemId) => {
    if (!segments || !parentItemId) return [];
    
    const overlays = [];
    for (const segment of segments) {
      for (const cue of (segment.cues || segment.groups || [])) {
        // Find the parent item index
        const parentIndex = (cue.items || []).findIndex(item => item.id === parentItemId);
        if (parentIndex === -1) continue;
        
        // Look for overlays immediately after the parent
        for (let i = parentIndex + 1; i < cue.items.length; i++) {
          const item = cue.items[i];
          
          // If we hit a non-overlay item, stop looking
          if (item.type !== 'Overlay') break;
          
          // Check if this is an auto overlay
          if (item.type === 'Overlay' && (item.overlay_type === 'auto' || item.data?.overlay_type === 'auto')) {
            overlays.push({
              ...item,
              segmentId: segment.id,
              cueId: cue.id
            });
          }
        }
      }
    }
    
    return overlays;
  }, [segments]);
  
  // Start overlay based on its timing settings
  const startOverlay = useCallback((overlay, parentStartTime) => {
    const overlayId = overlay.id;
    const inPoint = overlay.overlay_in_point || 0;
    const duration = overlay.overlay_duration || 0;
    const automation = overlay.overlay_automation || 'auto_out';
    
    // Clear any existing timer for this overlay
    if (overlayTimers.current[overlayId]) {
      clearTimeout(overlayTimers.current[overlayId].inTimer);
      clearTimeout(overlayTimers.current[overlayId].outTimer);
      delete overlayTimers.current[overlayId];
    }
    
    // Schedule the overlay to appear after in_point seconds
    const inTimer = setTimeout(() => {
      setActiveOverlays(prev => {
        // Don't add if already active
        if (prev.some(o => o.id === overlayId)) return prev;
        
        return [...prev, {
          ...overlay,
          startTime: Date.now(),
          automation
        }];
      });
      
      // If auto_out, schedule removal after duration
      if (automation === 'auto_out' && duration > 0) {
        const outTimer = setTimeout(() => {
          removeOverlay(overlayId);
        }, duration * 1000);
        
        overlayTimers.current[overlayId] = {
          ...overlayTimers.current[overlayId],
          outTimer
        };
      }
    }, inPoint * 1000);
    
    overlayTimers.current[overlayId] = {
      inTimer,
      overlay,
      parentStartTime
    };
  }, []);
  
  // Remove an overlay
  const removeOverlay = useCallback((overlayId) => {
    setActiveOverlays(prev => prev.filter(o => o.id !== overlayId));
    
    // Clear any timers
    if (overlayTimers.current[overlayId]) {
      clearTimeout(overlayTimers.current[overlayId].inTimer);
      clearTimeout(overlayTimers.current[overlayId].outTimer);
      delete overlayTimers.current[overlayId];
    }
  }, []);
  
  // Handle parent item going live
  useEffect(() => {
    if (!liveItemId || executionState.isPaused || executionState.isStopped) return;
    
    // Find all auto overlays for this parent item
    const overlays = findOverlayChildren(liveItemId);
    const now = Date.now();
    
    // Start each overlay with its timing
    overlays.forEach(overlay => {
      startOverlay(overlay, now);
    });
    
    // Cleanup function - called when parent item is no longer live
    return () => {
      overlays.forEach(overlay => {
        const automation = overlay.overlay_automation || 'auto_out';
        
        // Handle different automation modes when parent ends
        if (automation === 'auto_out') {
          // Already handled by duration timer
        } else if (automation === 'leave_in_local') {
          // Will be removed when segment ends (handled below)
        } else if (automation === 'leave_in_global') {
          // Stays active indefinitely
        }
      });
    };
  }, [liveItemId, executionState.isPaused, executionState.isStopped, findOverlayChildren, startOverlay]);
  
  // Handle segment changes for leave_in_local overlays
  useEffect(() => {
    if (!liveItemId || !segments) return;
    
    // Find current segment
    let currentSegmentId = null;
    for (const segment of segments) {
      for (const cue of (segment.cues || segment.groups || [])) {
        if ((cue.items || []).some(item => item.id === liveItemId)) {
          currentSegmentId = segment.id;
          break;
        }
      }
      if (currentSegmentId) break;
    }
    
    // Remove leave_in_local overlays from other segments
    setActiveOverlays(prev => {
      return prev.filter(overlay => {
        if (overlay.automation === 'leave_in_local' && overlay.segmentId !== currentSegmentId) {
          // Clear timers for removed overlay
          if (overlayTimers.current[overlay.id]) {
            clearTimeout(overlayTimers.current[overlay.id].inTimer);
            clearTimeout(overlayTimers.current[overlay.id].outTimer);
            delete overlayTimers.current[overlay.id];
          }
          return false;
        }
        return true;
      });
    });
  }, [liveItemId, segments]);
  
  // Handle execution stop - clear non-global overlays
  useEffect(() => {
    if (executionState.isStopped) {
      setActiveOverlays(prev => {
        const remaining = prev.filter(overlay => overlay.automation === 'leave_in_global');
        
        // Clear timers for removed overlays
        prev.forEach(overlay => {
          if (overlay.automation !== 'leave_in_global' && overlayTimers.current[overlay.id]) {
            clearTimeout(overlayTimers.current[overlay.id].inTimer);
            clearTimeout(overlayTimers.current[overlay.id].outTimer);
            delete overlayTimers.current[overlay.id];
          }
        });
        
        return remaining;
      });
    }
  }, [executionState.isStopped]);
  
  // Handle pause - pause all timers
  useEffect(() => {
    if (executionState.isPaused) {
      // Store remaining time for each timer
      Object.keys(overlayTimers.current).forEach(overlayId => {
        const timer = overlayTimers.current[overlayId];
        if (timer.inTimer) {
          clearTimeout(timer.inTimer);
          // Store remaining time if needed for resume
        }
        if (timer.outTimer) {
          clearTimeout(timer.outTimer);
          // Store remaining time if needed for resume
        }
      });
    } else {
      // Resume timers with adjusted times
      // This would require storing pause time and calculating remaining duration
    }
  }, [executionState.isPaused]);
  
  // Manually trigger an overlay (for manual overlays in control pad)
  const triggerManualOverlay = useCallback((overlay) => {
    setActiveOverlays(prev => {
      // Toggle if already active
      const existing = prev.find(o => o.id === overlay.id);
      if (existing) {
        return prev.filter(o => o.id !== overlay.id);
      }
      
      return [...prev, {
        ...overlay,
        startTime: Date.now(),
        automation: 'manual'
      }];
    });
  }, []);
  
  // Clear all overlays
  const clearAllOverlays = useCallback(() => {
    // Clear all timers
    Object.keys(overlayTimers.current).forEach(overlayId => {
      clearTimeout(overlayTimers.current[overlayId].inTimer);
      clearTimeout(overlayTimers.current[overlayId].outTimer);
    });
    overlayTimers.current = {};
    
    setActiveOverlays([]);
  }, []);
  
  return {
    activeOverlays,
    triggerManualOverlay,
    removeOverlay,
    clearAllOverlays
  };
}