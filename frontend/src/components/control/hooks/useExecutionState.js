import { useState, useCallback } from 'react';

const useExecutionState = (api, episodeId) => {
  const [executionState, setExecutionState] = useState({
    paused: false,
    stopped: false,
    armedTransition: null,
    armedManualButton: null,
    currentItemId: null,
    previewItemId: null,
    currentManualItem: null,
    previewManualItem: null,
    armedManualItem: null
  });
  
  const togglePause = useCallback(() => {
    setExecutionState(prev => ({
      ...prev,
      paused: !prev.paused
    }));
    return !executionState.paused;
  }, [executionState.paused]);
  
  const toggleStop = useCallback(() => {
    setExecutionState(prev => {
      const newStopped = !prev.stopped;
      if (newStopped) {
        // Reset everything when stopping
        return {
          ...prev,
          stopped: true,
          currentItemId: null,
          previewItemId: null,
          currentManualItem: null,
          previewManualItem: null,
          armedManualItem: null,
          armedTransition: null,
          armedManualButton: null,
          paused: false
        };
      } else {
        // Resume from stopped state
        return {
          ...prev,
          stopped: false
        };
      }
    });
  }, []);
  
  const armTransition = useCallback((transitionType) => {
    setExecutionState(prev => ({
      ...prev,
      armedTransition: transitionType
    }));
  }, []);
  
  const clearArmedTransition = useCallback(() => {
    setExecutionState(prev => ({
      ...prev,
      armedTransition: null
    }));
  }, []);
  
  const armManualButton = useCallback((buttonId) => {
    setExecutionState(prev => ({
      ...prev,
      armedManualButton: buttonId
    }));
  }, []);
  
  const clearArmedManualButton = useCallback(() => {
    setExecutionState(prev => ({
      ...prev,
      armedManualButton: null
    }));
  }, []);
  
  const setCurrentItemId = useCallback((itemId) => {
    setExecutionState(prev => ({
      ...prev,
      currentItemId: itemId
    }));
  }, []);
  
  const setPreviewItemId = useCallback((itemId) => {
    setExecutionState(prev => ({
      ...prev,
      previewItemId: itemId
    }));
  }, []);
  
  return {
    executionState,
    togglePause,
    toggleStop,
    armTransition,
    clearArmedTransition,
    armManualButton,
    clearArmedManualButton,
    setCurrentItemId,
    setPreviewItemId,
    setExecutionState
  };
};

export default useExecutionState;