import { useState, useEffect, useRef, useCallback } from 'react';

// Hook to manage overlay states and countdown timers
export default function useOverlayStates(segments, liveItemId) {
  // Track overlay states: { overlayId: { state: 'waiting'|'live', countdown: number, startTime: number } }
  const [overlayStates, setOverlayStates] = useState({});
  const intervalRef = useRef(null);
  const parentStartTimeRef = useRef(null);
  
  // Find all auto overlays that follow a parent item
  const findChildOverlays = useCallback((parentItemId) => {
    if (!segments || !parentItemId) return [];
    
    const overlays = [];
    for (const segment of segments) {
      for (const cue of (segment.cues || segment.groups || [])) {
        const parentIndex = (cue.items || []).findIndex(item => item.id === parentItemId);
        if (parentIndex === -1) continue;
        
        // Look for overlays immediately after the parent
        for (let i = parentIndex + 1; i < cue.items.length; i++) {
          const item = cue.items[i];
          
          // If we hit a non-overlay item, stop looking
          if (item.type !== 'Overlay') break;
          
          // Check if this is an auto overlay
          if (item.type === 'Overlay' && (item.overlay_type === 'auto' || item.data?.overlay_type === 'auto')) {
            overlays.push(item);
          }
        }
      }
    }
    
    return overlays;
  }, [segments]);
  
  // Handle parent item going live
  useEffect(() => {
    // Clear only auto overlay states when parent changes (preserve manual overlays)
    setOverlayStates(prev => {
      const updated = {};
      // Keep only manual overlays
      Object.entries(prev).forEach(([id, state]) => {
        if (state.isManual) {
          updated[id] = state;
        }
      });
      return updated;
    });
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (!liveItemId) {
      parentStartTimeRef.current = null;
      return;
    }
    
    // Find child overlays for the newly live item
    const childOverlays = findChildOverlays(liveItemId);
    if (childOverlays.length === 0) {
      parentStartTimeRef.current = null;
      return;
    }
    
    // Record when the parent went live
    parentStartTimeRef.current = Date.now();
    
    // Initialize overlay states (preserving manual overlays)
    setOverlayStates(prev => {
      const newStates = {};
      
      // Keep existing manual overlays
      Object.entries(prev).forEach(([id, state]) => {
        if (state.isManual) {
          newStates[id] = state;
        }
      });
      
      // Add new auto overlays
      childOverlays.forEach(overlay => {
        const inPoint = overlay.overlay_in_point || overlay.data?.overlay_in_point || 0;
        const duration = overlay.overlay_duration || overlay.data?.overlay_duration || 10;
        
        newStates[overlay.id] = {
          state: 'waiting',
          countdown: inPoint,
          duration: duration,
          inPoint: inPoint,
          automation: overlay.overlay_automation || overlay.data?.overlay_automation || 'auto_out'
        };
      });
      
      return newStates;
    });
    
    // Start the countdown timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - parentStartTimeRef.current) / 1000);
      
      setOverlayStates(prev => {
        const updated = { ...prev };
        let hasChanges = false;
        
        Object.keys(updated).forEach(overlayId => {
          const state = updated[overlayId];
          
          // Skip manual overlays in the timer
          if (state.isManual) {
            return;
          }
          
          if (state.state === 'waiting') {
            // Calculate remaining wait time
            const remaining = state.inPoint - elapsed;
            
            if (remaining <= 0) {
              // Transition to live
              updated[overlayId] = {
                ...state,
                state: 'live',
                countdown: state.duration,
                startTime: now
              };
              hasChanges = true;
            } else if (remaining !== state.countdown) {
              // Update countdown
              updated[overlayId] = {
                ...state,
                countdown: remaining
              };
              hasChanges = true;
            }
          } else if (state.state === 'live') {
            // Only count down if auto_out
            if (state.automation === 'auto_out') {
              const liveElapsed = Math.floor((now - state.startTime) / 1000);
              const remaining = state.duration - liveElapsed;
              
              if (remaining <= 0) {
                // Remove from active overlays
                delete updated[overlayId];
                hasChanges = true;
              } else if (remaining !== state.countdown) {
                // Update countdown
                updated[overlayId] = {
                  ...state,
                  countdown: remaining
                };
                hasChanges = true;
              }
            }
          }
        });
        
        return hasChanges ? updated : prev;
      });
    }, 100); // Update every 100ms for smooth countdown
    
    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [liveItemId, findChildOverlays]);
  
  // Force remove an overlay (for double-click failsafe)
  const forceRemoveOverlay = useCallback((overlayId) => {
    setOverlayStates(prev => {
      const updated = { ...prev };
      delete updated[overlayId];
      return updated;
    });
  }, []);
  
  // Handle manual overlay toggle (for manual overlays in manual blocks)
  const toggleManualOverlay = useCallback((overlay) => {
    setOverlayStates(prev => {
      const updated = { ...prev };
      
      if (updated[overlay.id]) {
        // Remove if already active
        delete updated[overlay.id];
      } else {
        // Add as live
        updated[overlay.id] = {
          state: 'live',
          countdown: null, // Manual overlays don't have countdown
          isManual: true
        };
      }
      
      return updated;
    });
  }, []);
  
  return {
    overlayStates,
    forceRemoveOverlay,
    toggleManualOverlay
  };
}