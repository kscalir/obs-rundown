import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createApi } from '../../api/client.js';
import { API_BASE_URL } from '../../config';

// Import components
import ControlPageHeader from './ControlPageHeader';
import RundownList from './RundownList';
import TimePanel from './TimePanel';
import SegmentCueStatus from './SegmentCueStatus';
import PresenterNotes from './PresenterNotes';
import QuickAccessButtons from './QuickAccessButtons';
import ManualCueButtons from './ManualCueButtons';
import QRCodeModal from './QRCodeModal';
import ActiveOverlaysDisplay from './ActiveOverlaysDisplay';

// Import hooks
import useExecutionState from './hooks/useExecutionState';
import useAutoAdvance from './hooks/useAutoAdvance';
import useWebSocket from './hooks/useWebSocket';
import useOverlayStates from './hooks/useOverlayStates';

export default function ControlPageRefactored() {
  const api = useMemo(() => createApi(API_BASE_URL), []);
  
  // Get showId and episodeId from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const showId = urlParams.get('showId');
  const episodeId = urlParams.get('episodeId');
  
  // WebSocket ref for audio commands (needs to be early)
  const sendMessageRef = useRef(null);
  
  // State
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liveItemId, setLiveItemId] = useState(null);
  const [previewItemId, setPreviewItemId] = useState(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [itemTimers, setItemTimers] = useState({});
  const [controlPadWindow, setControlPadWindow] = useState(null);
  const [controlPadZoom, setControlPadZoom] = useState(1.0);
  const [obsTransitions, setObsTransitions] = useState([]);
  const [timersPaused, setTimersPaused] = useState(false);
  const [use24HourTime, setUse24HourTime] = useState(true);
  
  // Time tracking
  const [currentTime, setCurrentTime] = useState(new Date());
  const [segmentStartTime, setSegmentStartTime] = useState(null);
  const [showStartTime, setShowStartTime] = useState(null);
  const [segmentElapsed, setSegmentElapsed] = useState(0);
  const [showElapsed, setShowElapsed] = useState(0);
  
  // Custom hooks
  const { 
    executionState, 
    togglePause, 
    toggleStop, 
    armTransition,
    clearArmedTransition,
    armManualButton,
    clearArmedManualButton,
    setCurrentItemId: setExecutionCurrentItemId,
    setPreviewItemId: setExecutionPreviewItemId,
    setExecutionState,
    toggleManualItem
  } = useExecutionState(api, episodeId);
  
  const { countdownTimers, startCountdown, stopCountdown, clearAllCountdowns } = 
    useAutoAdvance(executionState);
  
  const { overlayStates, forceRemoveOverlay, toggleManualOverlay } = 
    useOverlayStates(segments, liveItemId);
  
  // Alias for consistency with existing code
  const triggerManualOverlay = toggleManualOverlay;
  
  // Load rundown data exactly like old ControlPage
  useEffect(() => {
    if (!episodeId) {
      setLoading(false);
      return;
    }
    
    const loadRundownData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load rundown segments using exact same API call as old ControlPage
        const segmentsData = await api.get(`/api/episodes/${episodeId}/segments?include=groups,items`);
        
        // Process exactly like old ControlPage - rename groups to cues for compatibility
        const processedSegments = segmentsData.map(segment => ({
          ...segment,
          cues: (segment.groups || []).map(group => ({
            ...group,
            items: (group.items || []).map(item => ({
              ...item,
              automation_mode: item.automation_mode || 'manual',
              automation_duration: item.automation_duration || 10,
              parentType: item.parent_type || null
            }))
          }))
        }));
        
        setSegments(processedSegments);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load rundown data:', error);
        setError(error.message);
        setLoading(false);
      }
    };
    
    loadRundownData();
  }, [episodeId, api]);
  
  
  // Load OBS transitions
  useEffect(() => {
    const loadTransitions = async () => {
      try {
        const response = await api.get('/api/obs/transitions');
        if (response.transitions) {
          setObsTransitions(response.transitions);
        }
      } catch (error) {
        console.error('Failed to load OBS transitions:', error);
        // Use fallback transitions if OBS is not connected
        setObsTransitions([
          { transitionName: 'Cut', transitionKind: 'cut_transition' },
          { transitionName: 'Fade', transitionKind: 'fade_transition' },
          { transitionName: 'Slide', transitionKind: 'slide_transition' }
        ]);
      }
    };
    
    loadTransitions();
    // Refresh transitions periodically in case they change
    const interval = setInterval(loadTransitions, 30000);
    return () => clearInterval(interval);
  }, [api]);
  
  // Update timers
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      
      if (segmentStartTime && !timersPaused) {
        setSegmentElapsed(Date.now() - segmentStartTime);
      }
      
      if (showStartTime && !timersPaused) {
        setShowElapsed(Date.now() - showStartTime);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [segmentStartTime, showStartTime, timersPaused]);
  
  // Get current segment and cue
  const getCurrentSegmentAndCue = useCallback(() => {
    if (!segments || !liveItemId) return { segment: null, cue: null };
    
    for (const segment of segments) {
      for (const cue of segment.cues || []) {
        const hasLiveItem = cue.items?.some(item => item.id === liveItemId);
        if (hasLiveItem) {
          return { segment, cue };
        }
      }
    }
    return { segment: null, cue: null };
  }, [segments, liveItemId]);
  
  // Get upcoming segment and cue
  const getUpcomingSegmentAndCue = useCallback(() => {
    if (!segments || !liveItemId) return { segment: null, cue: null };
    
    let foundCurrent = false;
    for (const segment of segments) {
      for (const cue of segment.cues || []) {
        if (foundCurrent) {
          return { segment, cue };
        }
        const hasLiveItem = cue.items?.some(item => item.id === liveItemId);
        if (hasLiveItem) {
          foundCurrent = true;
        }
      }
    }
    return { segment: null, cue: null };
  }, [segments, liveItemId]);
  
  // Get current presenter note
  const getCurrentPresenterNote = useCallback(() => {
    if (!segments || !liveItemId) return null;
    
    // Get all items in order
    const allItems = [];
    segments.forEach(segment => {
      (segment.cues || []).forEach(cue => {
        (cue.items || []).forEach(item => {
          allItems.push(item);
        });
      });
    });
    
    // Find current item position
    const currentIndex = allItems.findIndex(item => item.id === liveItemId);
    if (currentIndex === -1) return null;
    
    // Look for the next presenter note from current position
    for (let i = currentIndex; i < allItems.length; i++) {
      const item = allItems[i];
      if (item.type === 'presenter-note' || item.type === 'PresenterNote' || 
          item.type === 'presenternote' || item.type === 'note') {
        // Check if the note is immediately after the current item (attached to it)
        const isCurrentNote = i === currentIndex + 1;
        return { 
          note: item.data?.note || item.data?.text || item.title || '', 
          isCurrent: isCurrentNote 
        };
      }
    }
    
    return null;
  }, [segments, liveItemId]);
  
  // Timer management ref
  const timerIntervalRef = useRef(null);
  
  // Forward declare executeNext for use in startAutoTimer
  const executeNextRef = useRef(null);
  // Forward declare getManualButtons for use in executeNext
  const getManualButtonsRef = useRef(null);
  
  // Start timer for auto items
  const startAutoTimer = useCallback((item) => {
    // Clear any existing timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    // Check if this is an audio cue (instant execution)
    const normalizedType = (item.type || '').toLowerCase().replace(/[-_\s]/g, '');
    const isAudioCue = normalizedType === 'audiocue' || item.type === 'AudioCue' || item.type === 'audio-cue';
    
    // Handle countdown for auto items
    if (item.automation_mode === 'auto') {
      // Audio cues execute instantly (0 duration)
      if (isAudioCue || item.automation_duration === 0) {
        // Execute immediately on next tick to allow UI update
        setTimeout(() => {
          if (executeNextRef.current) {
            executeNextRef.current();
          }
        }, 10);
      } else if (item.automation_duration > 0) {
        // Regular auto items with duration
        const duration = item.automation_duration * 1000;
        const startTime = Date.now();
        
        // Set initial timer value
        setItemTimers(prev => ({
          ...prev,
          [item.id]: item.automation_duration
        }));
        
        // Start countdown
        timerIntervalRef.current = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const remaining = Math.max(0, duration - elapsed);
          const secondsRemaining = Math.ceil(remaining / 1000);
          
          setItemTimers(prev => ({
            ...prev,
            [item.id]: secondsRemaining
          }));
          
          // When timer reaches 0, auto-advance
          if (secondsRemaining === 0) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
            if (executeNextRef.current) {
              executeNextRef.current();
            }
          }
        }, 100);
      }
    }
  }, []);
  
  // Execute next item
  const executeNext = useCallback(() => {
    // If stopped, start the execution
    if (executionState.stopped) {
      setExecutionState(prev => ({ ...prev, stopped: false }));
    }
    
    // Priority 1: Execute armed manual item
    if (executionState.armedManualItem || executionState.previewManualItem) {
      const manualToExecute = executionState.armedManualItem || executionState.previewManualItem;
      
      // Find the actual manual item data
      const allManualItems = getManualButtonsRef.current ? getManualButtonsRef.current() : [];
      const manualItem = allManualItems.find(item => item.id === manualToExecute);
      
      if (manualItem) {
        // TODO: Call the appropriate API to execute the manual item
        // This might involve calling OBS to switch scenes or show graphics
      }
      
      // Manual items replace regular items when executed
      setLiveItemId(null);  // Clear regular live item
      setExecutionCurrentItemId(null);
      
      setExecutionState(prev => ({
        ...prev,
        currentManualItem: manualToExecute,
        previewManualItem: null,
        armedManualItem: null,
        armedManualButton: null,
        currentItemId: null  // Clear regular live item in execution state
      }));
      
      // Clear any running timer since manual items don't auto-advance
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setItemTimers({});
      
      return;
    }
    
    // Get all items in order (excluding notes and auto overlays)
    const allItems = [];
    segments.forEach(segment => {
      (segment.cues || []).forEach(cue => {
        (cue.items || []).forEach(item => {
          // Skip notes
          if (item.type === 'note' || item.type === 'presenter-note' || item.type === 'PresenterNote') {
            return;
          }
          // Skip auto overlays - they should not be in the navigation sequence
          if (item.type === 'Overlay' && (item.overlay_type === 'auto' || item.data?.overlay_type === 'auto')) {
            return;
          }
          allItems.push(item);
        });
      });
    });
    
    if (allItems.length === 0) return;
    
    // Priority 2: Move preview to live
    if (previewItemId) {
      const previewItem = allItems.find(item => item.id === previewItemId);
      if (previewItem) {
        // Move preview to live
        setLiveItemId(previewItemId);
        setExecutionCurrentItemId(previewItemId);
        
        // Find next item for preview
        const previewIndex = allItems.findIndex(item => item.id === previewItemId);
        if (previewIndex !== -1 && previewIndex < allItems.length - 1) {
          const nextPreviewItem = allItems[previewIndex + 1];
          setPreviewItemId(nextPreviewItem.id);
          setExecutionPreviewItemId(nextPreviewItem.id);
        } else {
          setPreviewItemId(null);
          setExecutionPreviewItemId(null);
        }
        
        // Clear any manual items when executing regular items
        setExecutionState(prev => ({
          ...prev,
          currentManualItem: null,
          previewManualItem: null,
          armedManualItem: null,
          armedManualButton: null
        }));
        
        // Start timer if auto item
        startAutoTimer(previewItem);
        
        // Update segment timer if needed
        if (!segmentStartTime) {
          setSegmentStartTime(Date.now());
        }
        if (!showStartTime) {
          setShowStartTime(Date.now());
        }
      }
    } else if (!liveItemId && allItems.length > 0) {
      // No live or preview, start from beginning
      setLiveItemId(allItems[0].id);
      setExecutionCurrentItemId(allItems[0].id);
      startAutoTimer(allItems[0]);
      
      if (allItems.length > 1) {
        setPreviewItemId(allItems[1].id);
        setExecutionPreviewItemId(allItems[1].id);
      }
      
      setSegmentStartTime(Date.now());
      setShowStartTime(Date.now());
    } else if (liveItemId && !previewItemId) {
      // Have live but no preview, find next item
      const currentIndex = allItems.findIndex(item => item.id === liveItemId);
      if (currentIndex !== -1 && currentIndex < allItems.length - 1) {
        const nextItem = allItems[currentIndex + 1];
        setLiveItemId(nextItem.id);
        setExecutionCurrentItemId(nextItem.id);
        startAutoTimer(nextItem);
        
        // Set next preview if available
        if (currentIndex + 2 < allItems.length) {
          const nextPreviewItem = allItems[currentIndex + 2];
          setPreviewItemId(nextPreviewItem.id);
          setExecutionPreviewItemId(nextPreviewItem.id);
        }
      }
    }
    
    // Clear manual state when executing regular items
    setExecutionState(prev => ({
      ...prev,
      currentManualItem: null,
      previewManualItem: null,
      armedManualItem: null
    }));
    
    clearArmedTransition();
    clearArmedManualButton();
  }, [segments, liveItemId, previewItemId, executionState.stopped, executionState.armedManualItem,
      executionState.previewManualItem, setExecutionState, clearArmedTransition, clearArmedManualButton, 
      setExecutionCurrentItemId, setExecutionPreviewItemId, startAutoTimer,
      segmentStartTime, showStartTime, setItemTimers]);
  
  // Store executeNext in ref for use in startAutoTimer
  executeNextRef.current = executeNext;
  
  // Handle button clicks
  const handleButtonClick = useCallback((button) => {
    if (!button.active) return;
    
    switch(button.type) {
      case 'stop':
        toggleStop();
        // Reset timers and IDs when stopping
        setLiveItemId(null);
        setPreviewItemId(null);
        setSegmentStartTime(null);
        setShowStartTime(null);
        setSegmentElapsed(0);
        setShowElapsed(0);
        setItemTimers({});
        // Clear any running timer
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        break;
      case 'pause':
        togglePause();
        // Pause/resume timer
        if (!executionState.paused) {
          // Pausing - clear timer but keep the current time
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
        } else {
          // Resuming - restart timer if there's a live auto item
          const allItems = [];
          segments.forEach(segment => {
            (segment.cues || []).forEach(cue => {
              (cue.items || []).forEach(item => {
                // Skip notes
                if (item.type === 'note' || item.type === 'presenter-note' || item.type === 'PresenterNote') {
                  return;
                }
                // Skip auto overlays - they should not be in the navigation sequence
                if (item.type === 'Overlay' && (item.overlay_type === 'auto' || item.data?.overlay_type === 'auto')) {
                  return;
                }
                allItems.push(item);
              });
            });
          });
          const liveItem = allItems.find(item => item.id === liveItemId);
          if (liveItem && liveItem.automation_mode === 'auto' && itemTimers[liveItem.id] > 0) {
            // Resume countdown from where it left off
            const duration = itemTimers[liveItem.id] * 1000;
            const startTime = Date.now();
            
            timerIntervalRef.current = setInterval(() => {
              const elapsed = Date.now() - startTime;
              const remaining = Math.max(0, duration - elapsed);
              const secondsRemaining = Math.ceil(remaining / 1000);
              
              setItemTimers(prev => ({
                ...prev,
                [liveItem.id]: secondsRemaining
              }));
              
              if (secondsRemaining === 0) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
                executeNext();
              }
            }, 100);
          }
        }
        break;
      case 'next':
        executeNext();
        break;
      case 'transition':
        armTransition(button.data.type);
        break;
      case 'manual': {
        // Check if this is a manual overlay
        const isManualOverlay = button.data && button.data.type === 'Overlay' && 
            (button.data.overlay_type === 'manual' || button.data.data?.overlay_type === 'manual');
            
        if (isManualOverlay) {
          // It's a manual overlay - use toggle functionality
          triggerManualOverlay(button.data);
        } else if (button.armed) {
          executeNext();
        } else {
          armManualButton(button.data?.id);
        }
        break;
      }
    }
  }, [toggleStop, togglePause, armTransition, armManualButton, executeNext, 
      executionState.paused, segments, liveItemId, itemTimers, triggerManualOverlay]);
  
  // Handle item click - single click to remove live manual overlays
  const handleItemClick = useCallback((item) => {
    // Check if it's a manual overlay that's currently live
    if (item && item.type === 'Overlay' && 
        (item.overlay_type === 'manual' || item.data?.overlay_type === 'manual')) {
      // Check if this overlay is currently live
      if (overlayStates?.[item.id]?.state === 'live') {
        // Remove the live overlay
        forceRemoveOverlay(item.id);
      }
    }
    // Regular items do nothing on single click
  }, [overlayStates, forceRemoveOverlay]);
  
  // Handle item double click (preview)
  const handleItemDoubleClick = useCallback((item) => {
    // Check if it's a manual overlay
    if (item && item.type === 'Overlay' && 
        (item.overlay_type === 'manual' || item.data?.overlay_type === 'manual')) {
      // Toggle the manual overlay
      triggerManualOverlay(item);
    } else if (item && item.type !== 'note') {
      setPreviewItemId(item.id);
      setExecutionPreviewItemId(item.id);
    }
  }, [setExecutionPreviewItemId, triggerManualOverlay]);
  
  // Execute manual item directly to LIVE (double-click on manual sub-item)
  const armManualItem = useCallback((manualItem) => {
    // Check if item is already LIVE
    const isCurrentlyLive = executionState.currentManualItems.includes(manualItem.id);
    
    if (isCurrentlyLive) {
      // Item is already live - remove it
      toggleManualItem(manualItem.id);
    
    // Execute the actual manual item based on type
    if (manualItem && manualItem.data) {
      const normalizedType = (manualItem.type || '').toLowerCase().replace(/[-_\s]/g, '');
      const isAudioCue = normalizedType === 'audiocue' || manualItem.type === 'audio-cue';
      
      if (isAudioCue && manualItem.data.mode === 'new' && manualItem.data.sourceType === 'media') {
        // Play media file via OBS
        console.log('Playing audio media:', manualItem.data.sourceName);
        // Send command to backend to play media
        if (sendMessageRef.current) {
          sendMessageRef.current({
            type: 'PLAY_AUDIO',
            itemId: manualItem.id,
            mediaPath: manualItem.data.mediaPath,
            mediaId: manualItem.data.mediaId,
            volume: manualItem.data.volume || 100
          });
        }
      } else if (isAudioCue && manualItem.data.mode === 'new' && manualItem.data.sourceType === 'mic') {
        // Unmute/turn on mic
        console.log('Enabling mic:', manualItem.data.sourceName);
        if (sendMessageRef.current) {
          sendMessageRef.current({
            type: 'CONTROL_MIC',
            itemId: manualItem.id,
            sourceId: manualItem.data.sourceId,
            sourceName: manualItem.data.sourceName,
            volume: manualItem.data.volume || 100,
            action: 'unmute'
          });
        }
      }
    }
    } else {
      // Item is not live - add it
      toggleManualItem(manualItem.id);
    }
    
    console.log('Toggling manual item:', manualItem, 'isLive:', !isCurrentlyLive);
  }, [executionState.currentManualItems, toggleManualItem]);
  
  // Execute manual item (from button click) - put it directly LIVE
  const executeManualItem = useCallback((manualItem) => {
    // Check if this manual item is already LIVE - if so, clear it (toggle off)
    const isCurrentlyLive = executionState.currentManualItems.includes(manualItem.id);
    
    if (isCurrentlyLive) {
      // Remove from live items
      toggleManualItem(manualItem.id);
      
      // Stop audio if it's an audio cue
      if (manualItem && manualItem.data) {
        const normalizedType = (manualItem.type || '').toLowerCase().replace(/[-_\s]/g, '');
        const isAudioCue = normalizedType === 'audiocue' || manualItem.type === 'audio-cue';
        
        if (isAudioCue && manualItem.data.mode === 'new') {
          if (manualItem.data.sourceType === 'media') {
            // Stop media playback
            console.log('Stopping audio media:', manualItem.data.sourceName);
            if (sendMessageRef.current) {
              sendMessageRef.current({
                type: 'STOP_AUDIO',
                itemId: manualItem.id,
                mediaId: manualItem.data.mediaId,
                fadeOut: manualItem.data.manualFadeOut || false,
                fadeDuration: manualItem.data.manualFadeDuration || 0
              });
            }
          } else if (manualItem.data.sourceType === 'mic') {
            // Mute mic
            console.log('Muting mic:', manualItem.data.sourceName);
            if (sendMessageRef.current) {
              sendMessageRef.current({
                type: 'CONTROL_MIC',
                itemId: manualItem.id,
                sourceId: manualItem.data.sourceId,
                sourceName: manualItem.data.sourceName,
                action: 'mute',
                fadeOut: manualItem.data.manualFadeOut || false,
                fadeDuration: manualItem.data.manualFadeDuration || 0
              });
            }
          }
        }
      }
    } else {
      // Add to live items
      toggleManualItem(manualItem.id);
      
      // Execute the actual manual item based on type
      if (manualItem && manualItem.data) {
        const normalizedType = (manualItem.type || '').toLowerCase().replace(/[-_\s]/g, '');
        const isAudioCue = normalizedType === 'audiocue' || manualItem.type === 'audio-cue';
        
        if (isAudioCue && manualItem.data.mode === 'new' && manualItem.data.sourceType === 'media') {
          // Play media file via OBS
          console.log('Playing audio media:', manualItem.data.sourceName);
          // Send command to backend to play media
          if (sendMessageRef.current) {
            sendMessageRef.current({
              type: 'PLAY_AUDIO',
              itemId: manualItem.id,
              mediaPath: manualItem.data.mediaPath,
              mediaId: manualItem.data.mediaId,
              volume: manualItem.data.volume || 100
            });
          }
        } else if (isAudioCue && manualItem.data.mode === 'new' && manualItem.data.sourceType === 'mic') {
          // Unmute/turn on mic
          console.log('Enabling mic:', manualItem.data.sourceName);
          if (sendMessageRef.current) {
            sendMessageRef.current({
              type: 'CONTROL_MIC',
              itemId: manualItem.id,
              sourceId: manualItem.data.sourceId,
              sourceName: manualItem.data.sourceName,
              volume: manualItem.data.volume || 100,
              action: 'unmute'
            });
          }
        }
      }
    }
  }, [executionState.currentManualItems, toggleManualItem]);
  
  // Get manual buttons - show buttons if we're in a cue with manual blocks
  const getManualButtons = useCallback(() => {
    if (!segments) return [];
    
    let targetCue = null;
    
    // Priority 1: If we have a manual item in preview or current, find its cue
    if (executionState.previewManualItem || executionState.currentManualItems.length > 0) {
      // Look through all cues to find one with manual blocks
      for (const segment of segments) {
        for (const cue of segment.cues || []) {
          const hasManualBlocks = (cue.items || []).some(item => 
            item.type === 'ManualBlock' || item.type === 'manualblock' || item.type === 'manual-block'
          );
          if (hasManualBlocks) {
            targetCue = cue;
            break;
          }
        }
        if (targetCue) break;
      }
    }
    
    // Priority 2: If preview item exists and is in a cue with manual blocks
    if (!targetCue && previewItemId) {
      for (const segment of segments) {
        for (const cue of segment.cues || []) {
          const hasPreviewItem = (cue.items || []).some(item => item.id === previewItemId);
          if (hasPreviewItem) {
            const hasManualBlocks = (cue.items || []).some(item => 
              item.type === 'ManualBlock' || item.type === 'manualblock' || item.type === 'manual-block'
            );
            if (hasManualBlocks) {
              targetCue = cue;
              break;
            }
          }
        }
        if (targetCue) break;
      }
    }
    
    // Priority 3: If current item exists and is in a cue with manual blocks
    if (!targetCue && liveItemId) {
      for (const segment of segments) {
        for (const cue of segment.cues || []) {
          const hasCurrentItem = (cue.items || []).some(item => item.id === liveItemId);
          if (hasCurrentItem) {
            const hasManualBlocks = (cue.items || []).some(item => 
              item.type === 'ManualBlock' || item.type === 'manualblock' || item.type === 'manual-block'
            );
            if (hasManualBlocks) {
              targetCue = cue;
              break;
            }
          }
        }
        if (targetCue) break;
      }
    }
    
    if (!targetCue) {
      return [];
    }
    
    // Get manual block items from the data structure
    const manualBlocks = (targetCue.items || []).filter(item => 
      item.type === 'ManualBlock' || item.type === 'manualblock' || item.type === 'manual-block'
    );
    
    // Extract manual items from the manual blocks' data
    const manualItems = manualBlocks.flatMap(block => {
      // Get items from the manual block's data structure
      const items = block.data?.items || [];
      // Ensure each item has proper structure for execution
      return items.map(item => ({
        ...item,
        id: item.id || `manual-${Date.now()}-${Math.random()}`,
        title: item.title || item.name || 'Manual Item',
        type: item.type || 'manual',
        // Preserve overlay properties if they exist
        overlay_type: item.overlay_type || item.data?.overlay_type,
        overlay_color_index: item.overlay_color_index ?? item.data?.overlay_color_index
      }));
    });
    
    return manualItems;
  }, [segments, previewItemId, liveItemId, executionState.previewManualItem, executionState.currentManualItems]);
  
  // Store getManualButtons in ref for use in executeNext
  getManualButtonsRef.current = getManualButtons;
  
  // Update control pad with current button state
  const updateControlPad = useCallback((targetWindow = controlPadWindow) => {
    if (!targetWindow || targetWindow.closed) {
      return;
    }
    
    const manualButtons = getManualButtons();
    const buttons = [];
    
    // Separate manual cues from manual overlays
    const manualCues = [];
    const manualOverlays = [];
    
    manualButtons.forEach((item, index) => {
      const isOverlay = item.type === 'Overlay' && (item.overlay_type === 'manual' || item.data?.overlay_type === 'manual');
      
      const buttonData = {
        type: 'manual',
        content: item.title || item.type || `Manual ${index + 1}`,
        active: true,
        armed: executionState?.armedManualItem === item.id || executionState?.armedManualButton === item.id || executionState?.previewManualItem === item.id,
        isLive: overlayStates?.[item.id]?.state === 'live', // Track if overlay is live
        data: { 
          id: item.id, 
          ...item,
          // Ensure overlay properties are passed
          type: item.type,
          overlay_type: item.overlay_type || item.data?.overlay_type,
          overlay_color_index: item.overlay_color_index ?? item.data?.overlay_color_index ?? index
        }
      };
      
      if (isOverlay) {
        manualOverlays.push(buttonData);
      } else {
        manualCues.push(buttonData);
      }
    });
    
    // Row 1: Manual cues (non-overlay items)
    manualCues.forEach(button => {
      buttons.push(button);
    });
    
    // Fill rest of row 1
    while (buttons.length < 8) {
      buttons.push({
        type: 'empty',
        content: '',
        active: false
      });
    }
    
    // Row 2: Manual overlays
    manualOverlays.forEach(button => {
      buttons.push(button);
    });
    
    // Fill rest of row 2 and all of row 3
    while (buttons.length < 24) {
      buttons.push({
        type: 'empty',
        content: '',
        active: false
      });
    }
    
    // Add control buttons in the last row (row 4)
    // We need exactly 8 buttons for the last row
    // Layout: [STOP][Trans1][Trans2][Trans3][Trans4][empty][PAUSE][NEXT]
    
    const lastRowButtons = [];
    
    // STOP button (position 0)
    lastRowButtons.push({
      type: 'stop',
      content: 'STOP',
      active: true,
      stopped: executionState?.stopped
    });
    
    // Transition buttons (positions 1-4, max 4)
    const transitionsToShow = obsTransitions.slice(0, 4);
    transitionsToShow.forEach((trans) => {
      const transName = trans.transitionName || trans.name || 'Transition';
      lastRowButtons.push({
        type: 'transition',
        content: transName,
        active: true,
        armed: executionState?.armedTransition === transName.toLowerCase(),
        data: { type: transName.toLowerCase(), name: transName }
      });
    });
    
    // Fill to have exactly 4 transition slots
    while (lastRowButtons.length < 5) {
      lastRowButtons.push({ type: 'empty', content: '', active: false });
    }
    
    // Add empty space (position 5)
    lastRowButtons.push({ type: 'empty', content: '', active: false });
    
    // PAUSE button (position 6)
    lastRowButtons.push({
      type: 'pause',
      content: 'PAUSE',
      active: true,
      paused: executionState?.paused
    });
    
    // NEXT button (position 7 - rightmost)
    lastRowButtons.push({
      type: 'next',
      content: 'NEXT',
      active: true
    });
    
    // Add the last row buttons (should be exactly 8)
    buttons.push(...lastRowButtons);
    
    targetWindow.postMessage({
      type: 'UPDATE_CONTROL_PAD',
      buttons,
      buttonsPerRow: 8,
      totalRows: 4,
      controlPadZoom,
      executionState
    }, '*');
  }, [controlPadWindow, getManualButtons, executionState, controlPadZoom, obsTransitions, overlayStates]);
  
  // Open control surface modal
  const openControlSurface = useCallback(() => {
    setQrModalOpen(true);
  }, []);
  
  // Listen for messages from control pad
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === 'CONTROL_PAD_BUTTON_CLICK') {
        const { button } = event.data;
        
        if (button.type === 'manual' && button.data) {
          // Check if it's a manual overlay - check multiple possible locations
          const isManualOverlay = 
            (button.data.type === 'Overlay' && button.data.overlay_type === 'manual') ||
            (button.data.type === 'Overlay' && button.data.data?.overlay_type === 'manual');
            
          if (isManualOverlay) {
            triggerManualOverlay(button.data);
          } else {
            executeManualItem(button.data);
          }
        } else if (button.type === 'transition' && button.data) {
          // Handle transition button click
          handleButtonClick({
            type: 'transition',
            active: true,
            data: button.data
          });
        } else {
          handleButtonClick(button);
        }
      } else if (event.data.type === 'CONTROL_PAD_ZOOM_CHANGE') {
        setControlPadZoom(event.data.zoom);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [executeManualItem, handleButtonClick, triggerManualOverlay]);
  
  // Update control pad whenever state changes
  useEffect(() => {
    updateControlPad();
  }, [updateControlPad]);
  
  // Handle episode change - update URL parameters
  const handleEpisodeChange = useCallback((newEpisodeId) => {
    // Update URL to reflect new episode
    const url = new URL(window.location);
    url.searchParams.set('episodeId', newEpisodeId);
    window.location.href = url.toString();
  }, []);
  
  // Toggle timers pause
  const toggleTimersPause = useCallback(() => {
    setTimersPaused(prev => !prev);
  }, []);
  
  // Toggle time format
  const toggleTimeFormat = useCallback(() => {
    setUse24HourTime(prev => !prev);
  }, []);
  
  // WebSocket for control surface and OBS commands
  const { sendMessage } = useWebSocket(handleButtonClick);
  
  // Update sendMessage ref whenever it changes
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);
  
  // Get segment/cue status
  const { segment: currentSegment, cue: currentCue } = getCurrentSegmentAndCue();
  const { segment: upcomingSegment, cue: upcomingCue } = getUpcomingSegmentAndCue();
  
  // Get current allotted time
  const currentAllottedTime = currentSegment?.allotted_time ? 
    currentSegment.allotted_time * 1000 : null;
  
  return (
    <div style={{
      height: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#2c2c2c',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <ControlPageHeader
        showName={`Show ${showId || ''}`}
        episodeTitle={`Episode ${episodeId || ''}`}
        episodes={[]}
        selectedEpisodeId={episodeId}
        onEpisodeChange={handleEpisodeChange}
        onControlSurfaceClick={openControlSurface}
      />
      
      <div style={{
        height: 'calc(100vh - 40px)',
        display: 'flex',
        background: '#f5f5f5',
        width: '100%',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <RundownList
          segments={segments}
          liveItemId={liveItemId}
          previewItemId={previewItemId}
          executionState={executionState}
          onItemClick={handleItemClick}
          onItemDoubleClick={handleItemDoubleClick}
          onManualItemDoubleClick={armManualItem}
          itemTimers={itemTimers}
          overlayStates={overlayStates}
          onOverlayDoubleClick={forceRemoveOverlay}
        />
        
        <div style={{
          width: '35%',
          height: '100%',
          background: '#fff',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Scrollable content area */}
          <div style={{
            height: 'calc(100% - 300px)', // Reserve space for buttons
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <TimePanel
              currentTime={currentTime}
              segmentElapsed={segmentElapsed}
              showElapsed={showElapsed}
              allottedTime={currentAllottedTime}
              timersPaused={timersPaused}
              onToggleTimersPause={toggleTimersPause}
              use24HourTime={use24HourTime}
              onToggleTimeFormat={toggleTimeFormat}
            />
            
            <SegmentCueStatus
              currentSegment={currentSegment}
              currentCue={currentCue}
              upcomingSegment={upcomingSegment}
              upcomingCue={upcomingCue}
              segments={segments}
              liveItemId={liveItemId}
              currentManualItems={executionState.currentManualItems}
            />
            
            <PresenterNotes
              noteData={getCurrentPresenterNote()}
            />
          </div>
          
          {/* Fixed buttons at bottom */}
          <div style={{
            height: '130px',
            flexShrink: 0,
            background: '#fff',
            borderTop: '2px solid #e0e0e0',
            padding: '16px',
            boxShadow: '0 -4px 8px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <QuickAccessButtons
              onButtonClick={handleButtonClick}
              executionState={executionState}
            />
          </div>
        </div>
      </div>
      
      <QRCodeModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        onOpenControlPad={() => {
          const popup = window.open('/control-pad', 'ControlPad', 'width=900,height=700,resizable=yes');
          if (popup) {
            setControlPadWindow(popup);
            setTimeout(() => updateControlPad(popup), 500);
          }
        }}
      />
      
      {/* Active Overlays Display */}
      <ActiveOverlaysDisplay
        activeOverlays={Object.entries(overlayStates).map(([id, state]) => {
          // Find the overlay item from segments
          let overlayItem = null;
          segments?.forEach(segment => {
            segment.cues?.forEach(cue => {
              cue.items?.forEach(item => {
                if (item.id === id) {
                  overlayItem = item;
                }
                // Also check manual blocks
                if (item.type === 'ManualBlock' || item.type === 'manual-block') {
                  item.data?.items?.forEach(manualItem => {
                    if (manualItem.id === id) {
                      overlayItem = manualItem;
                    }
                  });
                }
              });
            });
          });
          
          return overlayItem ? {
            ...overlayItem,
            ...state,
            id
          } : null;
        }).filter(Boolean)}
        onRemoveOverlay={forceRemoveOverlay}
      />
    </div>
  );
}