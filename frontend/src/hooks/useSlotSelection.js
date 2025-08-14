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
      
      console.log('[useSlotSelection] Loaded item from DB:', item);
      console.log('[useSlotSelection] Loaded slots from DB:', slotsData);
      
      // Debug: Check for media data in slots
      slotsData.forEach((slot, idx) => {
        if (slot.mediaData) {
          console.log(`[useSlotSelection] Slot ${idx} has mediaData:`, slot.mediaData);
        }
      });
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
        console.log('[useSlotSelection] Saving slots:', JSON.stringify(newSlots, null, 2));
        
        // Debug: Check if we have mediaData to save
        const slotsWithMediaData = newSlots.filter(slot => slot.mediaData);
        if (slotsWithMediaData.length > 0) {
          console.log('[useSlotSelection] Found slots with mediaData:', slotsWithMediaData);
        }
        
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

  // Update a specific slot's mediaData and properties
  const updateSlotMediaData = useCallback((slotIndex, mediaData) => {
    setSlots(prevSlots => {
      const newSlots = [...prevSlots];
      if (newSlots[slotIndex]) {
        const oldSlot = { ...newSlots[slotIndex] };
        // Determine selectedSource based on data type
        let selectedSource = "";
        if (mediaData) {
          if (mediaData.media) {
            // Regular media data
            selectedSource = `MEDIA:${mediaData.media.id}`;
          } else if (mediaData.youtube) {
            // YouTube data
            selectedSource = `YOUTUBE:${mediaData.youtube.videoId}`;
          } else if (mediaData.pdfImage) {
            // PDF/Image data
            selectedSource = `PDFIMAGE:${mediaData.pdfImage.id}`;
          }
        }
        
        const updatedSlot = {
          ...newSlots[slotIndex],
          mediaData,
          selectedSource
        };
        newSlots[slotIndex] = updatedSlot;
        
        console.log('[useSlotSelection] Updated slot with media data for index:', slotIndex);
      }
      
      // Save to database
      saveSlots(newSlots);
      
      return newSlots;
    });
  }, [saveSlots]);

  // Update a specific slot's genericType
  const updateSlotGenericType = useCallback((slotIndex, genericType) => {
    setSlots(prevSlots => {
      const newSlots = [...prevSlots];
      if (newSlots[slotIndex]) {
        newSlots[slotIndex] = {
          ...newSlots[slotIndex],
          genericType
        };
      }
      
      console.log('[useSlotSelection] Updated slot generic type:', {
        slotIndex,
        genericType,
        newSlots
      });
      
      // Save to database
      saveSlots(newSlots);
      
      return newSlots;
    });
  }, [saveSlots]);

  // Merge slots with OBS scene layout (preserving selectedSource and other data)
  const mergeWithSceneLayout = useCallback((sceneSlots) => {
    setSlots(prevSlots => {
      // Create a map of existing slot data by slot number
      const existingSlotData = {};
      prevSlots.forEach(slot => {
        existingSlotData[slot.slot] = {
          selectedSource: slot.selectedSource,
          mediaData: slot.mediaData,
          genericType: slot.genericType,
          sourceProps: slot.sourceProps
        };
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

      // Always merge scene layout structure, but preserve all existing data from DB/prev state
      const mergedSlots = sceneSlots.map(sceneSlot => {
        const existingData = existingSlotData[sceneSlot.slot] || {};
        return {
          ...sceneSlot,
          selectedSource: existingData.selectedSource || sceneSlot.selectedSource || '',
          mediaData: existingData.mediaData,
          genericType: existingData.genericType,
          sourceProps: existingData.sourceProps
        };
      });

      console.log('[useSlotSelection] Merged with scene layout:', {
        hasLoadedData: hasLoadedDataRef.current,
        existingSlotData,
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
    updateSlotMediaData,
    updateSlotGenericType,
    mergeWithSceneLayout,
    refetch: fetchSlots
  };
};

export default useSlotSelection;