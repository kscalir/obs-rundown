import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE_URL = (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) || 'http://localhost:5050';

/**
 * Unified hook for managing item data with debounced saves
 * This eliminates the need for multiple state management patterns
 * and prevents race conditions between parent/child components
 */
export const useItemData = (itemId, fieldPath = null) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Refs for managing debounced saves and preventing duplicate fetches
  const saveTimeoutRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  const currentItemIdRef = useRef(null);
  const isFetchingRef = useRef(false);
  
  // Clear any pending saves when component unmounts
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);


  // Save data with debouncing
  const saveData = useCallback(async (newData) => {
    if (!itemId || isInitialLoadRef.current) {
      console.log('[useItemData] Skipping save - no itemId or initial load');
      return;
    }

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for debounced save
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('[useItemData] Saving data:', newData);
        
        const updatePayload = fieldPath 
          ? { [fieldPath]: newData }
          : newData;
        
        const response = await fetch(`${API_BASE_URL}/api/items/${itemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: updatePayload })
        });

        if (!response.ok) {
          throw new Error(`Failed to save: ${response.statusText}`);
        }

        console.log('[useItemData] Save successful');
        
      } catch (err) {
        console.error('[useItemData] Save error:', err);
        setError(err.message);
      }
    }, 500); // 500ms debounce
  }, [itemId, fieldPath]);

  // Update data locally and trigger save
  const updateData = useCallback((newData) => {
    console.log('[useItemData] Updating data:', newData);
    setData(newData);
    saveData(newData);
  }, [saveData]);

  // Fetch data when itemId changes
  useEffect(() => {
    // Prevent duplicate fetches for the same itemId
    if (currentItemIdRef.current === itemId && isFetchingRef.current) {
      console.log('[useItemData] Skipping duplicate fetch for itemId:', itemId);
      return;
    }
    
    console.log('[useItemData] ItemId changed, fetching fresh data:', itemId);
    currentItemIdRef.current = itemId;
    
    // CRITICAL: Clear all state immediately when itemId changes
    setData(null);
    setError(null);
    setIsLoading(true);
    isInitialLoadRef.current = true;
    
    // Cancel any pending saves
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    
    // Create a fresh fetch function to avoid stale closure issues
    const doFetch = async () => {
      if (!itemId) {
        setData(null);
        setIsLoading(false);
        isFetchingRef.current = false;
        return;
      }

      isFetchingRef.current = true;
      
      try {
        console.log('[useItemData] Making API request for itemId:', itemId);
        const response = await fetch(`${API_BASE_URL}/api/items/${itemId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch item: ${response.statusText}`);
        }
        
        const itemData = await response.json();
        console.log('[useItemData] Fresh API response:', {
          itemId,
          fullItem: itemData,
          itemData: itemData.data,
          templateId: itemData.data?.templateId,
          templateData: itemData.data?.templateData
        });
        
        // Set the full data or specific field based on fieldPath
        const newData = fieldPath ? itemData.data?.[fieldPath] : itemData.data;
        setData(newData);
        isInitialLoadRef.current = false;
        
      } catch (err) {
        console.error('[useItemData] Fetch error:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    };
    
    doFetch();
  }, [itemId, fieldPath]);

  // Manual refetch function
  const refetch = useCallback(async () => {
    if (!itemId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[useItemData] Manual refetch for itemId:', itemId);
      const response = await fetch(`${API_BASE_URL}/api/items/${itemId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch item: ${response.statusText}`);
      }
      
      const itemData = await response.json();
      console.log('[useItemData] Manual refetch response:', itemData);
      
      const newData = fieldPath ? itemData.data?.[fieldPath] : itemData.data;
      setData(newData);
      
    } catch (err) {
      console.error('[useItemData] Refetch error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [itemId, fieldPath]);

  return {
    data,
    isLoading,
    error,
    updateData,
    refetch
  };
};

export default useItemData;