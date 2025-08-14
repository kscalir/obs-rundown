import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE_URL = (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) || 'http://localhost:5050';

/**
 * Clean slot selection hook that handles:
 * 1. Loading slot data from database
 * 2. Saving slot changes with debouncing
 * 3. Merging with OBS scene layout data
 * 4. Avoiding race conditions
 */
export const useSlotSelection = (itemId) => {
  const [slots, setSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [slotsReady, setSlotsReady] = useState(false);
  
  const saveTimeoutRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  const hasLoadedDataRef = useRef(false);

  // Fetch slot data from database
  const fetchSlots = useCallback(async () => {
    if (!itemId) {
      setSlots([]);
      return;
    }

    setIsLoading(true);
    setSlotsReady(false);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/items/${itemId}`);
      if (!response.ok) throw new Error('Failed to fetch item');
      
      const item = await response.json();
      const slotsData = item.data?.slots || [];
      
      console.log('[useSlotSelection] Loaded slots from DB:', slotsData);
      setSlots(slotsData);
      setSlotsReady(true);
      isInitialLoadRef.current = false;
      hasLoadedDataRef.current = true;
      
    } catch (err) {
      console.error('[useSlotSelection] Fetch error:', err);
      setError(err.message);
      setSlotsReady(false);
    } finally {
      setIsLoading(false);
    }
  }, [itemId]);

  // Save slots to database with debouncing
  const saveSlots = useCallback(async (newSlots) => {
    if (!itemId || isInitialLoadRef.current) {
      console.log('[useSlotSelection] Skipping save - no itemId or initial load');
      return;
    }

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounced save
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('[useSlotSelection] Saving slots:', newSlots);
        
        const response = await fetch(`${API_BASE_URL}/api/items/${itemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: { slots: newSlots } })
        });

        if (!response.ok) throw new Error('Failed to save slots');
        
        console.log('[useSlotSelection] Save successful');
        
      } catch (err) {
        console.error('[useSlotSelection] Save error:', err);
        setError(err.message);
      }
    }, 300); // 300ms debounce
  }, [itemId]);

  // Update a specific slot's selectedSource
  const updateSlotSource = useCallback((slotIndex, selectedSource) => {
    setSlots(prevSlots => {
      const newSlots = [...prevSlots];
      if (newSlots[slotIndex]) {
        newSlots[slotIndex] = {
          ...newSlots[slotIndex],
          selectedSource
        };
      }
      
      console.log('[useSlotSelection] Updated slot source:', {
        slotIndex,
        selectedSource,
        newSlots
      });
      
      // Save to database
      saveSlots(newSlots);
      
      return newSlots;
    });
  }, [saveSlots]);

  // Merge slots with OBS scene layout (preserving selectedSource)
  const mergeWithSceneLayout = useCallback((sceneSlots) => {
    setSlots(prevSlots => {
      // Create a map of existing selectedSource values by slot number
      const existingSelections = {};
      prevSlots.forEach(slot => {
        if (slot.selectedSource) {
          existingSelections[slot.slot] = slot.selectedSource;
        }
      });

      // Defer merging scene layout until we have loaded DB state once for this item.
      if (!hasLoadedDataRef.current) {
        console.log('[useSlotSelection] Deferring scene merge until DB slots are loaded');
        return prevSlots;
      }

      // Only merge if we actually have scene slots to merge
      if (!sceneSlots || sceneSlots.length === 0) {
        console.log('[useSlotSelection] No scene slots to merge, keeping existing');
        return prevSlots;
      }

      // Always merge scene layout structure, but preserve selectedSource from DB/prev state
      const mergedSlots = sceneSlots.map(sceneSlot => ({
        ...sceneSlot,
        selectedSource: existingSelections[sceneSlot.slot] || sceneSlot.selectedSource || ''
      }));

      console.log('[useSlotSelection] Merged with scene layout:', {
        hasLoadedData: hasLoadedDataRef.current,
        existingSelections,
        sceneSlots,
        mergedSlots
      });

      return mergedSlots;
    });
  }, []);

  // Load slots when itemId changes
  useEffect(() => {
    console.log('[useSlotSelection] ItemId changed, loading slots:', itemId);
    isInitialLoadRef.current = true;
    hasLoadedDataRef.current = false;
    setSlotsReady(false);
    fetchSlots();
  }, [fetchSlots, itemId]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    slots,
    isLoading,
    error,
    slotsReady,
    updateSlotSource,
    mergeWithSceneLayout,
    refetch: fetchSlots
  };
};

export default useSlotSelection;