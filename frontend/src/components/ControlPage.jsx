import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { API_BASE_URL } from '../config';
import { useSelection } from '../selection/SelectionContext.jsx';
import { createApi } from '../api/client.js';
import { useEpisodes } from '../hooks/useEpisodes.js';
import { QRCodeSVG } from 'qrcode.react';

export default function ControlPage({ showId }) {
  // API client (memoized to prevent re-creation)
  const api = useMemo(() => createApi(API_BASE_URL), []);

  // Add LED flash animation CSS
  React.useEffect(() => {
    const styleId = 'led-flash-animation';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes ledFlash {
          0%, 50% { 
            opacity: 1; 
            box-shadow: 0 0 6px #ffa500, 0 0 10px #ffa500, 0 0 14px #ffa500;
          }
          51%, 100% { 
            opacity: 0.3; 
            box-shadow: 0 0 2px #ffa500;
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);
  
  // Episode data using proper hook
  const { episodes, selectedEpisode } = useEpisodes(api, showId);
  
  // Get the current episode (either from selection context or from episodes)
  const { episodeId } = useSelection();
  
  // Find the current episode - prefer episodeId from context, fallback to selectedEpisode
  let currentEpisode = null;
  if (episodeId && episodes.length > 0) {
    // Convert episodeId to number for comparison since API might return numbers
    currentEpisode = episodes.find(ep => Number(ep.id) === Number(episodeId));
  }
  if (!currentEpisode && selectedEpisode) {
    currentEpisode = selectedEpisode;
  }
  // If still no episode but we have episodes, use the first one
  if (!currentEpisode && episodes.length > 0) {
    currentEpisode = episodes[0];
  }
  
  // Execution state - now tracks items instead of cues
  const [executionState, setExecutionState] = useState({
    currentItemId: null,  // Currently LIVE item
    previewItemId: null,  // Next item (PREVIEW)
    stopped: false,
    paused: false,  // New: Track pause state
    armedTransition: null,
    armedManualItem: null,  // Currently armed manual item (ready for NEXT)
    currentManualItem: null,  // Currently LIVE manual item
    previewManualItem: null,   // Currently PREVIEW manual item
    remainingTime: null,  // Remaining time if paused
    startTime: null,  // When the current item started
    activeOverlays: []  // Currently active overlay graphics
  });
  
  // Rundown data
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Graphics data cache for subtitle lookups
  const [graphicsCache, setGraphicsCache] = useState({});
  
  // Ref for rundown container for auto-scrolling
  const rundownContainerRef = useRef(null);
  
  // QR code modal state
  const [qrModalOpen, setQrModalOpen] = useState(false);
  
  // State for local IP detection
  const [localIP, setLocalIP] = useState(null);
  
  // Get control surface URL with IP address for network access
  const getControlSurfaceUrl = () => {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    // If already accessing via IP or external hostname, use that
    // Otherwise, try to detect the local IP
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      // Already using an IP or hostname that works externally
      return `${protocol}//${hostname}${port ? ':' + port : ''}/control-surface`;
    }
    
    // For localhost, we need to get the actual network IP
    // Use detected IP if available, otherwise fallback to hostname
    const hostToUse = localIP || hostname;
    return `${protocol}//${hostToUse}${port ? ':' + port : ''}/control-surface`;
  };
  
  // Detect local IP on component mount
  useEffect(() => {
    const detectLocalIP = async () => {
      try {
        // Try to get IP from backend using fetch directly
        const response = await fetch(`${API_BASE_URL}/api/system/ip`);
        const data = await response.json();
        console.log('IP detection response:', data);
        if (data.ip) {
          setLocalIP(data.ip);
          console.log('Local IP set to:', data.ip);
        }
      } catch (err) {
        console.error('Error fetching IP from backend:', err);
        // Fallback: try to detect from WebRTC
        try {
          const pc = new RTCPeerConnection({ iceServers: [] });
          pc.createDataChannel('');
          pc.createOffer().then(offer => pc.setLocalDescription(offer));
          
          pc.onicecandidate = (event) => {
            if (!event || !event.candidate || !event.candidate.candidate) return;
            const candidate = event.candidate.candidate;
            const ipMatch = /([0-9]{1,3}\.){3}[0-9]{1,3}/.exec(candidate);
            if (ipMatch && ipMatch[0] && !ipMatch[0].startsWith('127.')) {
              console.log('WebRTC detected IP:', ipMatch[0]);
              setLocalIP(ipMatch[0]);
              pc.close();
            }
          };
          
          // Timeout fallback
          setTimeout(() => pc.close(), 1000);
        } catch (e) {
          console.log('Could not detect local IP via WebRTC');
        }
      }
    };
    
    detectLocalIP();
  }, []);
  
  
  
  // Sync essential state to localStorage for control surface
  useEffect(() => {
    const essentialState = {
      executionState,
      selectedEpisodeId: selectedEpisode?.id,
      segments: segments || [],
      currentEpisode: currentEpisode,
      liveItemId: executionState?.liveItemId,
      previewItemId: executionState?.previewItemId
    };
    
    try {
      localStorage.setItem('controlSurfaceState', JSON.stringify(essentialState));
    } catch (error) {
      console.error('Error saving control surface state:', error);
    }
  }, [executionState, selectedEpisode?.id, segments, currentEpisode]);
  
  // Smooth scroll function with easing
  const smoothScrollToItem = (itemId, offset = 20) => {
    if (!rundownContainerRef.current || !itemId) return;
    
    const container = rundownContainerRef.current;
    const targetElement = document.querySelector(`[data-item-id="${itemId}"]`);
    
    if (!targetElement) return;
    
    const containerRect = container.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();
    
    // Calculate the target scroll position to place item near top with offset
    const targetScrollTop = container.scrollTop + (targetRect.top - containerRect.top) - offset;
    
    // Only scroll if the item is not already visible in the desired position
    const currentScrollTop = container.scrollTop;
    const isAlreadyInPosition = Math.abs(targetScrollTop - currentScrollTop) < 50;
    
    if (isAlreadyInPosition) return;
    
    // Smooth scroll with custom easing
    const startScrollTop = currentScrollTop;
    const distance = targetScrollTop - startScrollTop;
    const duration = 600; // 600ms for smooth animation
    const startTime = performance.now();
    
    // Easing function: ease-in-out cubic
    const easeInOutCubic = (t) => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };
    
    const animateScroll = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeInOutCubic(progress);
      
      container.scrollTop = startScrollTop + (distance * easedProgress);
      
      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    };
    
    requestAnimationFrame(animateScroll);
  };
  
  
  // Function to fetch graphics data
  const fetchGraphic = async (graphicId) => {
    if (!graphicId || graphicsCache[graphicId]) {
      return graphicsCache[graphicId] || null;
    }
    
    try {
      const graphicData = await api.get(`/api/graphics/${graphicId}`);
      setGraphicsCache(prev => ({
        ...prev,
        [graphicId]: graphicData
      }));
      return graphicData;
    } catch (err) {
      console.error('Failed to fetch graphic:', graphicId, err);
      return null;
    }
  };

  // Track automation countdown timers
  const [itemTimers, setItemTimers] = useState({});
  const timerIntervalRef = useRef(null);
  
  // Time tracking state
  const [currentTime, setCurrentTime] = useState(new Date());
  const [segmentStartTime, setSegmentStartTime] = useState(null);
  const [showStartTime, setShowStartTime] = useState(null);
  const [segmentElapsed, setSegmentElapsed] = useState(0);
  const [showElapsed, setShowElapsed] = useState(0);

  // Get all cues (groups) from segments
  const allCues = segments.flatMap(segment => segment.groups || []);
  
  // Get all items from all cues for execution tracking
  const allItems = allCues.flatMap(cue => 
    (cue.items || []).map(item => ({
      ...item,
      cueId: cue.id,
      cueTitle: cue.title
    }))
  );

  // Update clock every second
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
      
      // Update segment timer
      if (segmentStartTime) {
        const elapsed = Math.floor((Date.now() - segmentStartTime) / 1000);
        setSegmentElapsed(elapsed);
      }
      
      // Update show timer
      if (showStartTime) {
        const elapsed = Math.floor((Date.now() - showStartTime) / 1000);
        setShowElapsed(elapsed);
      }
    }, 1000);
    
    return () => clearInterval(clockInterval);
  }, [segmentStartTime, showStartTime]);
  
  // Track previous item ID for segment change detection
  const [previousItemId, setPreviousItemId] = useState(null);

  // Track when items go live to update timers
  useEffect(() => {
    if (executionState.currentItemId) {
      // If this is the first item going live, start show timer
      if (!showStartTime) {
        setShowStartTime(Date.now());
      }
      
      // Find which cue this item belongs to
      const currentItem = allItems.find(item => item.id === executionState.currentItemId);
      if (currentItem) {
        // Check if we've moved to a new cue/segment
        const prevItem = previousItemId ? allItems.find(item => item.id === previousItemId) : null;
        if (!prevItem || prevItem.cueId !== currentItem.cueId) {
          // New segment started
          setSegmentStartTime(Date.now());
        }
      }
      
      // Update previous item ID for next comparison
      setPreviousItemId(executionState.currentItemId);
    } else if (executionState.stopped) {
      // Reset timers when stopped
      setSegmentStartTime(null);
      setShowStartTime(null);
      setSegmentElapsed(0);
      setShowElapsed(0);
      setPreviousItemId(null);
    }
  }, [executionState.currentItemId, executionState.stopped]);

  // Load rundown data
  useEffect(() => {
    if (!showId || !currentEpisode?.id) return;
    
    const loadRundownData = async () => {
      try {
        setLoading(true);
        
        // Load rundown segments (using existing API structure for now)
        const segmentsData = await api.get(`/api/episodes/${currentEpisode.id}/segments?include=groups,items`);
        
        // Enhanced: Add automation fields to items if not present
        const enhancedSegments = segmentsData.map(segment => ({
          ...segment,
          groups: (segment.groups || []).map(group => ({
            ...group,
            items: (group.items || []).map(item => ({
              ...item,
              automation_mode: item.automation_mode || 'manual',
              automation_duration: item.automation_duration || 10,
              use_media_duration: item.use_media_duration || false
            }))
          }))
        }));
        
        setSegments(enhancedSegments || []);

        // Reset execution state on page load to ensure clean start
        // This prevents random start positions on page refresh
        try {
          await api.put(`/api/execution/episode/${currentEpisode.id}`, {
            live_item_id: null,
            preview_item_id: null,
            is_paused: false,
            remaining_time: null,
            armed_transition: null,
            armed_manual_item_id: null,
            current_manual_block_id: null,
            active_overlays: []
          });
          
          // Set local state to match
          setExecutionState({
            currentItemId: null,
            previewItemId: null,
            armedTransition: null,
            currentManualItem: null,
            previewManualItem: null,
            armedManualItem: null,
            stopped: true,
            paused: false,
            startTime: null,
            remainingTime: null,
            activeOverlays: []
          });
        } catch (err) {
          console.error('Failed to reset execution state:', err);
        }
        
      } catch (err) {
        console.error('Failed to load rundown data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadRundownData();
  }, [showId, currentEpisode?.id, api]);

  // Preload graphics data when segments are loaded
  useEffect(() => {
    const preloadGraphics = async () => {
      const graphicIds = new Set();
      
      // Find all graphic IDs in the rundown
      segments.forEach(segment => {
        (segment.groups || []).forEach(cue => {
          (cue.items || []).forEach(item => {
            if (item.type === 'FullScreenGraphic' && item.data?.selectedGraphic?.id) {
              graphicIds.add(item.data.selectedGraphic.id);
            }
          });
        });
      });
      
      // Fetch graphics data for all IDs
      await Promise.all(
        Array.from(graphicIds).map(id => fetchGraphic(id))
      );
    };
    
    if (segments.length > 0) {
      preloadGraphics();
    }
  }, [segments]);

  // Store auto-advance callback in a ref to avoid stale closure
  const autoAdvanceRef = useRef(null);
  
  // Store handler in ref for popup access
  const handleButtonClickRef = useRef(null);
  
  // Listen for actions from control surface - MUST be defined before any returns
  useEffect(() => {
    console.log('Setting up control surface listener...');
    
    // WebSocket for reliable communication
    let ws = null;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?control=true`;
    
    try {
      ws = new WebSocket(wsUrl);
      console.log('Connecting to WebSocket:', wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connected for control surface');
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received WebSocket message:', data);
          
          if (data.type === 'CONTROL_ACTION' && data.button && handleButtonClickRef.current) {
            handleButtonClickRef.current(data.button);
            console.log('Button click handled via WebSocket');
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
    
    // Fallback: Poll localStorage for cross-device communication
    let lastActionTimestamp = 0;
    let pollCount = 0;
    const checkActions = () => {
      try {
        pollCount++;
        if (pollCount % 50 === 0) { // Log every 5 seconds (50 * 100ms)
          console.log('Polling localStorage... count:', pollCount);
        }
        
        const storedAction = localStorage.getItem('controlSurfaceAction');
        if (storedAction) {
          const action = JSON.parse(storedAction);
          console.log('Found in localStorage:', action, 'lastTimestamp:', lastActionTimestamp);
          
          // Check if this is a new action we haven't processed yet
          if (action.type === 'BUTTON_CLICK' && 
              action.timestamp > lastActionTimestamp && 
              Date.now() - action.timestamp < 5000) {
            console.log('Processing button click from localStorage:', action.button);
            lastActionTimestamp = action.timestamp;
            
            // Use the ref to call the function
            if (handleButtonClickRef.current) {
              handleButtonClickRef.current(action.button);
              console.log('Button click handled via localStorage');
            } else {
              console.log('handleButtonClickRef.current is null');
            }
          } else {
            if (action.timestamp <= lastActionTimestamp) {
              console.log('Skipping old action');
            }
            if (Date.now() - action.timestamp >= 5000) {
              console.log('Skipping expired action');
            }
          }
        }
      } catch (error) {
        console.error('Error processing localStorage action:', error);
      }
    };
    
    // Check for actions every 100ms
    const interval = setInterval(checkActions, 100);
    
    // Also listen for storage events (works when control surface is in different tab)
    const handleStorageChange = (e) => {
      if (e.key === 'controlSurfaceAction') {
        checkActions();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  // Find current item for timer - memoized to avoid re-running effect
  const currentItemForTimer = useMemo(() => {
    if (!executionState.currentItemId) return null;
    return allItems.find(item => item.id === executionState.currentItemId);
  }, [executionState.currentItemId, segments]); // segments is more stable than allItems

  // Countdown timer management for automation
  useEffect(() => {
    // Clear any existing interval
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    // If we have a current item and it's in auto mode and not paused
    if (currentItemForTimer && !executionState.paused) {
      if (currentItemForTimer.automation_mode === 'auto') {
        // Start countdown timer
        const startTime = executionState.startTime || Date.now();
        const duration = currentItemForTimer.automation_duration * 1000; // Convert to ms
        
        // If resuming from pause, adjust start time based on remaining time
        let adjustedStartTime = startTime;
        if (executionState.remainingTime) {
          adjustedStartTime = Date.now() - (duration - (executionState.remainingTime * 1000));
        }
        
        // Capture item ID to avoid closure issues
        const itemId = currentItemForTimer.id;
        
        // Set initial timer value immediately
        setItemTimers(prev => ({
          ...prev,
          [itemId]: currentItemForTimer.automation_duration // Set initial value
        }));
        
        timerIntervalRef.current = setInterval(() => {
          const elapsed = Date.now() - adjustedStartTime;
          const remaining = Math.max(0, duration - elapsed);
          const secondsRemaining = Math.ceil(remaining / 1000);
          
          setItemTimers(prev => ({
            ...prev,
            [itemId]: secondsRemaining // Store seconds remaining
          }));
          
          // Auto-advance when timer reaches 0
          if (remaining <= 0) {
            clearInterval(timerIntervalRef.current);
            // Call auto-advance via ref to avoid stale closure
            if (autoAdvanceRef.current) {
              autoAdvanceRef.current();
            }
          }
        }, 100); // Update every 100ms for smooth countdown
        
        // Only update startTime if it wasn't already set
        if (!executionState.startTime) {
          setExecutionState(prev => ({ 
            ...prev, 
            startTime: adjustedStartTime,
            remainingTime: null 
          }));
        }
      }
    }
    
    // Cleanup on unmount or when dependencies change
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [currentItemForTimer, executionState.paused, executionState.startTime, executionState.remainingTime]);

  // Auto-scroll when live item changes
  useEffect(() => {
    // Delay to ensure DOM is updated
    const timer = setTimeout(() => {
      if (executionState.currentItemId) {
        smoothScrollToItem(executionState.currentItemId);
      } else if (executionState.currentManualItem && executionState.currentManualItem.id) {
        // For manual items, we need to find their container manual block
        const manualBlockElement = document.querySelector(`[data-manual-item-id="${executionState.currentManualItem.id}"]`);
        if (manualBlockElement) {
          const manualBlockContainer = manualBlockElement.closest('[data-item-id]');
          if (manualBlockContainer) {
            const manualBlockId = manualBlockContainer.getAttribute('data-item-id');
            smoothScrollToItem(manualBlockId);
          }
        }
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [executionState.currentItemId, executionState.currentManualItem]);

  // Get current and preview items
  const currentItem = allItems.find(item => item.id === executionState.currentItemId);
  const previewItem = allItems.find(item => item.id === executionState.previewItemId);

  // Get manual buttons - show buttons if we have a manual item in preview/current OR regular item in manual block cue
  const getManualButtons = () => {
    let targetCue = null;
    
    // Priority 1: If we have a manual item in preview or current, find its cue
    if (executionState.previewManualItem || executionState.currentManualItem) {
      // We need to find which cue contains manual blocks to get all manual items
      // Look through all cues to find one with manual blocks
      targetCue = allCues.find(cue => 
        (cue.items || []).some(item => 
          item.type === 'ManualBlock' || item.type === 'manualblock' || item.type === 'manual-block'
        )
      );
    }
    
    // Priority 2: If regular preview item exists and is in a cue with manual blocks
    if (!targetCue && previewItem) {
      const previewCue = allCues.find(cue => cue.id === previewItem.cueId);
      if (previewCue) {
        const hasManualBlocks = (previewCue.items || []).some(item => 
          item.type === 'ManualBlock' || item.type === 'manualblock' || item.type === 'manual-block'
        );
        if (hasManualBlocks) {
          targetCue = previewCue;
        }
      }
    }
    
    // Priority 3: If regular current item exists and is in a cue with manual blocks
    if (!targetCue && currentItem) {
      const currentCue = allCues.find(cue => cue.id === currentItem.cueId);
      if (currentCue) {
        const hasManualBlocks = (currentCue.items || []).some(item => 
          item.type === 'ManualBlock' || item.type === 'manualblock' || item.type === 'manual-block'
        );
        if (hasManualBlocks) {
          targetCue = currentCue;
        }
      }
    }
    
    if (!targetCue) return [];
    
    const manualBlocks = (targetCue.items || []).filter(item => 
      item.type === 'ManualBlock' || 
      item.type === 'manualblock' || 
      item.type === 'manual-block'
    );
    
    const manualItems = manualBlocks.flatMap(block => {
      return block.data?.items || [];
    });
    
    return manualItems;
  };

  const currentManualButtons = getManualButtons();


  // Available transitions (would be loaded from OBS in real implementation)
  const availableTransitions = [
    { name: 'Cut', type: 'cut' },
    { name: 'Fade', type: 'fade' },
    { name: 'Slide', type: 'slide' },
    { name: 'Stinger', type: 'stinger' }
  ];
  
  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        color: '#666'
      }}>
        Loading rundown control...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        fontSize: '18px',
        color: '#d32f2f'
      }}>
        <div>Error loading rundown control</div>
        <div style={{ fontSize: '14px', marginTop: '8px' }}>{error}</div>
      </div>
    );
  }

  if (!currentEpisode) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        fontSize: '18px',
        color: '#666'
      }}>
        <div>No episode selected</div>
        <div style={{ fontSize: '14px', marginTop: '8px' }}>
          Please select an episode from the Rundown tab first
        </div>
      </div>
    );
  }

  // Helper function to find next actionable item (skip manual blocks and presenter notes)
  const findNextActionableItem = (currentIndex) => {
    for (let i = currentIndex + 1; i < allItems.length; i++) {
      const item = allItems[i];
      const isManualBlock = item.type === 'ManualBlock' || item.type === 'manualblock' || item.type === 'manual-block';
      const isPresenterNote = item.type === 'PresenterNote' || item.type === 'presenter-note' || item.type === 'presenternote';
      if (!isManualBlock && !isPresenterNote) {
        return i;
      }
    }
    return -1; // No more actionable items
  };

  // Update execution state in backend
  const updateBackendExecutionState = async (updates) => {
    if (!currentEpisode?.id) return;
    
    try {
      await api.put(`/api/execution/episode/${currentEpisode.id}`, updates);
    } catch (err) {
      console.error('Failed to update execution state:', err);
    }
  };

  // Execute NEXT - advance preview item to program, next item to preview, or execute armed manual item
  const executeNext = async () => {
    // If stopped, start the execution by setting stopped to false
    if (executionState.stopped) {
      setExecutionState(prev => ({ ...prev, stopped: false }));
    }
    
    // Priority 1: Execute armed manual item
    if (executionState.armedManualItem) {
      
      // Set the manual item as current (LIVE) and clear preview manual item
      setExecutionState(prev => ({
        ...prev,
        currentManualItem: prev.armedManualItem,  // Move to live
        previewManualItem: null,  // Clear preview manual item
        currentItemId: null,  // Clear regular current item
        previewItemId: null,  // Clear regular preview item
        armedManualItem: null,
        armedTransition: null
      }));
      return;
    }
    
    // Priority 2: Regular preview → program advancement
    const previewIndex = allItems.findIndex(item => item.id === executionState.previewItemId);
    
    if (previewIndex !== -1) {
      const previewItem = allItems[previewIndex];
      
      // Check if the preview item IS a manual block or presenter note (should not be executed)
      const isManualBlockItem = previewItem.type === 'ManualBlock' || 
                                previewItem.type === 'manualblock' || 
                                previewItem.type === 'manual-block';
      
      const isPresenterNote = previewItem.type === 'PresenterNote' || 
                              previewItem.type === 'presenter-note' || 
                              previewItem.type === 'presenternote';
      
      if (isPresenterNote) {
        // Presenter notes should never be executed - skip to next actionable item
        const nextActionableIndex = findNextActionableItem(previewIndex);
        setExecutionState(prev => ({
          ...prev,
          currentItemId: nextActionableIndex !== -1 ? allItems[nextActionableIndex]?.id || null : null,
          previewItemId: nextActionableIndex !== -1 ? 
            (() => {
              const afterNext = findNextActionableItem(nextActionableIndex);
              return afterNext !== -1 ? allItems[afterNext]?.id || null : null;
            })() : null,
          armedTransition: null,
          startTime: Date.now(),
          paused: false
        }));
        setItemTimers({});
      } else if (isManualBlockItem) {
        // Manual block behavior: make current item LIVE but don't auto-advance preview
        setExecutionState(prev => ({
          ...prev,
          currentItemId: previewItem.id,
          // DON'T auto-advance previewItemId for manual blocks
          armedTransition: null,
          startTime: Date.now(),
          paused: false
        }));
        setItemTimers({});
      } else {
        // Regular behavior: move preview to program, skip manual blocks and presenter notes for next preview
        const nextActionableIndex = findNextActionableItem(previewIndex);
        const newState = {
          currentItemId: allItems[previewIndex]?.id || null,
          previewItemId: nextActionableIndex !== -1 ? allItems[nextActionableIndex]?.id || null : null,
          armedTransition: null,
          startTime: Date.now(),
          paused: false
        };
        
        setExecutionState(prev => ({ ...prev, ...newState }));
        setItemTimers({});
        
        // Update backend
        await updateBackendExecutionState({
          live_item_id: newState.currentItemId,
          preview_item_id: newState.previewItemId,
          is_paused: false
        });
      }
    } else if (executionState.currentItemId && !executionState.previewItemId) {
      // We have a current item but no preview - find next actionable item (skip manual blocks and presenter notes)
      const currentIndex = allItems.findIndex(item => item.id === executionState.currentItemId);
      if (currentIndex !== -1) {
        const nextActionableIndex = findNextActionableItem(currentIndex);
        setExecutionState(prev => ({
          ...prev,
          previewItemId: nextActionableIndex !== -1 ? allItems[nextActionableIndex]?.id || null : null,
          armedTransition: null
        }));
      }
    } else if (!executionState.currentItemId && allItems.length > 0) {
      // First item - start from beginning, skip manual blocks and presenter notes if first item is one
      const firstActionableIndex = findNextActionableItem(-1);
      if (firstActionableIndex !== -1) {
        const secondActionableIndex = findNextActionableItem(firstActionableIndex);
        const newState = {
          currentItemId: allItems[firstActionableIndex]?.id || null,
          previewItemId: secondActionableIndex !== -1 ? allItems[secondActionableIndex]?.id || null : null,
          armedTransition: null,
          startTime: Date.now(),
          paused: false
        };
        
        setExecutionState(prev => ({ ...prev, ...newState }));
        setItemTimers({});
        
        // Update backend
        await updateBackendExecutionState({
          live_item_id: newState.currentItemId,
          preview_item_id: newState.previewItemId,
          is_paused: false
        });
      }
    }
  };

  // Toggle STOP state
  const toggleStop = () => {
    setExecutionState(prev => {
      const newStopped = !prev.stopped;
      if (newStopped) {
        // Resetting to stopped state - clear timers
        setSegmentStartTime(null);
        setShowStartTime(null);
        setSegmentElapsed(0);
        setShowElapsed(0);
        setPreviousItemId(null);
        setItemTimers({});
        
        return {
          ...prev,
          stopped: true,
          currentItemId: null,
          previewItemId: null,
          armedTransition: null,
          armedManualItem: null,
          currentManualItem: null,
          previewManualItem: null,
          paused: false,
          remainingTime: null,
          startTime: null,
          activeOverlays: []
        };
      } else {
        // Coming out of stopped state
        return {
          ...prev,
          stopped: false
        };
      }
    });
  };

  // Arm transition
  const armTransition = (transitionType) => {
    setExecutionState(prev => ({
      ...prev,
      armedTransition: prev.armedTransition === transitionType ? null : transitionType
    }));
  };

  // Put item in preview (double-click)
  const setItemToPreview = (itemId) => {
    const itemIndex = allItems.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return;
    
    const targetItem = allItems[itemIndex];
    
    // Prevent presenter notes from being previewed
    const isPresenterNote = targetItem.type === 'PresenterNote' || 
                            targetItem.type === 'presenter-note' || 
                            targetItem.type === 'presenternote';
    if (isPresenterNote) {
      return;
    }
    
    // Check if we're moving from a manual block cue to a different cue
    const targetCue = allCues.find(cue => cue.id === targetItem.cueId);
    let currentCue = null;
    
    if (executionState.currentItemId) {
      const currentItemData = allItems.find(item => item.id === executionState.currentItemId);
      if (currentItemData) {
        currentCue = allCues.find(cue => cue.id === currentItemData.cueId);
      }
    }
    
    // Special handling: If moving from a manual block cue to a different cue, clear current
    const currentCueHasManualBlocks = currentCue && (currentCue.items || []).some(item => 
      item.type === 'ManualBlock' || item.type === 'manualblock' || item.type === 'manual-block'
    );
    
    if (currentCueHasManualBlocks && currentCue && targetCue && currentCue.id !== targetCue.id) {
      // Moving to a different cue from a manual block cue - clear current
      setExecutionState(prev => ({
        ...prev,
        currentItemId: null,
        previewItemId: itemId
      }));
    } else {
      // Normal preview setting
      setExecutionState(prev => ({
        ...prev,
        previewItemId: itemId
      }));
    }
  };

  // Arm manual item for execution (double-click on manual sub-item)
  const armManualItem = (manualItem) => {
    setExecutionState(prev => ({
      ...prev,
      armedManualItem: manualItem,
      previewManualItem: manualItem,  // Set as preview manual item
      previewItemId: null  // Clear regular preview when setting manual preview
    }));
  };

  // Execute manual item (from button click) - just arm it like transitions
  const executeManualItem = (manualItem) => {
    // Check if this manual item is already armed - if so, disarm it
    if (executionState.armedManualItem === manualItem) {
      setExecutionState(prev => ({
        ...prev,
        armedManualItem: null
      }));
    } else {
      // Arm this manual item
      armManualItem(manualItem);
    }
  };

  // Toggle pause state
  const togglePause = async () => {
    if (!currentEpisode?.id) return;
    
    const newPausedState = !executionState.paused;
    
    // Calculate remaining time if pausing
    let remainingTime = null;
    if (newPausedState && executionState.currentItemId) {
      const currentItem = allItems.find(item => item.id === executionState.currentItemId);
      if (currentItem && currentItem.automation_mode === 'auto' && itemTimers[currentItem.id]) {
        remainingTime = itemTimers[currentItem.id];
      }
    }
    
    // Update local state
    setExecutionState(prev => ({
      ...prev,
      paused: newPausedState,
      remainingTime
    }));
    
    // Update backend
    try {
      await api.post(`/api/execution/episode/${currentEpisode.id}/pause`, {
        pause: newPausedState,
        remaining_time: remainingTime
      });
    } catch (err) {
      console.error('Failed to update pause state:', err);
    }
  };

  // Handle button clicks from control surface
  const handleButtonClick = (button) => {
    if (!button.active) return;
    
    switch (button.type) {
      case 'manual':
        executeManualItem(button.data);
        break;
      case 'transition':
        armTransition(button.data.type);
        break;
      case 'stop':
        toggleStop();
        break;
      case 'pause':
        togglePause();
        break;
      case 'next':
        executeNext();
        break;
    }
  };
  
  // Update refs with current functions
  handleButtonClickRef.current = handleButtonClick;
  autoAdvanceRef.current = executeNext;
  
  // Format elapsed time as MM:SS
  const formatElapsedTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Get current segment and its allotted time
  const getCurrentSegmentInfo = () => {
    if (!executionState.currentItemId) return null;
    
    // Find the current item
    const currentItem = allItems.find(item => item.id === executionState.currentItemId);
    if (!currentItem) return null;
    
    // Find which cue contains this item
    const currentCue = allCues.find(cue => cue.id === currentItem.cueId);
    if (!currentCue) return null;
    
    // Find which segment contains this cue
    const currentSegment = segments.find(segment => 
      (segment.groups || []).some(group => group.id === currentCue.id)
    );
    
    return currentSegment;
  };
  
  // Get segment and cue status info
  const getSegmentCueStatus = () => {
    const status = {
      currentSegment: null,
      upcomingSegment: null,
      currentCue: null,
      upcomingCue: null
    };
    
    if (!executionState.currentItemId) return status;
    
    // Find current item and its cue
    const currentItem = allItems.find(item => item.id === executionState.currentItemId);
    if (currentItem) {
      status.currentCue = allCues.find(cue => cue.id === currentItem.cueId);
      
      // Find current segment
      if (status.currentCue) {
        status.currentSegment = segments.find(segment => 
          (segment.groups || []).some(group => group.id === status.currentCue.id)
        );
      }
    }
    
    // Find upcoming item and its cue/segment
    if (executionState.previewItemId) {
      const upcomingItem = allItems.find(item => item.id === executionState.previewItemId);
      if (upcomingItem) {
        status.upcomingCue = allCues.find(cue => cue.id === upcomingItem.cueId);
        
        // Find upcoming segment
        if (status.upcomingCue) {
          status.upcomingSegment = segments.find(segment => 
            (segment.groups || []).some(group => group.id === status.upcomingCue.id)
          );
        }
      }
    }
    
    return status;
  };
  
  // Get current presenter note
  const getCurrentPresenterNote = () => {
    // Check all items from current position forward for the next presenter note
    if (!executionState.currentItemId) return null;
    
    const currentIndex = allItems.findIndex(item => item.id === executionState.currentItemId);
    if (currentIndex === -1) return null;
    
    // Look for the next presenter note from current position
    for (let i = currentIndex; i < allItems.length; i++) {
      const item = allItems[i];
      if (item.type === 'presenter-note' || item.type === 'PresenterNote' || item.type === 'presenternote') {
        // Check if the note is immediately after the current item (attached to it)
        const isCurrentNote = i === currentIndex + 1;
        return { 
          note: item.data?.note || '', 
          isCurrent: isCurrentNote 
        };
      }
    }
    
    return null;
  };

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
      {/* Header with show info */}
      <div style={{
        background: '#1e1e1e',
        borderBottom: '2px solid #444',
        padding: '8px 24px',
        color: '#fff',
        flexShrink: 0,
        minHeight: '40px',
        maxHeight: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#fff' }}>
          Show {showId} • Episode {currentEpisode?.id || episodeId || 'None'}
        </h1>
        <button
          onClick={() => setQrModalOpen(true)}
          style={{
            background: '#4caf50',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#45a049';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#4caf50';
          }}
        >
          📱 Control Surface
        </button>
      </div>

      {/* Main content area with two columns */}
      <div style={{
        height: 'calc(100vh - 40px)',
        display: 'flex',
        background: '#f5f5f5',
        width: '100%',
        overflow: 'hidden'
      }}>
        {/* Left column - Rundown (narrower) */}
        <div 
          ref={rundownContainerRef}
          style={{
            width: '65%',
            background: '#fff',
            overflow: 'auto',
            padding: '16px',
            borderRight: '2px solid #ddd',
            scrollBehavior: 'auto', // We'll handle smooth scrolling manually
            boxSizing: 'border-box'
          }}
        >
          {segments.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: '#666',
              fontStyle: 'italic'
            }}>
              No segments found in this rundown
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {segments.map((segment, segmentIndex) => (
              <div key={segment.id} style={{ marginBottom: '16px' }}>
                {/* Segment header */}
                <div style={{
                  background: '#1565c0',
                  padding: '12px 16px',
                  borderRadius: '8px 8px 0 0',
                  border: '1px solid #0d47a1',
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#ffffff'
                }}>
                  {segment.title || `Segment ${segmentIndex + 1}`}
                </div>
                
                {/* Cues in this segment */}
                <div style={{
                  border: '1px solid #2196f3',
                  borderTop: 'none',
                  borderRadius: '0 0 8px 8px',
                  background: '#fff'
                }}>
                  {(segment.groups || []).length === 0 ? (
                    <div style={{
                      padding: '20px',
                      textAlign: 'center',
                      color: '#666',
                      fontSize: '14px',
                      fontStyle: 'italic'
                    }}>
                      No cues in this segment
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {(segment.groups || []).map((cue, cueIndex) => {
                        // Determine cue status based on items within it
                        let status = 'upcoming';
                        let backgroundColor = '#e8f4fd'; // Light blue background for offline cues
                        let borderColor = '#90caf9';
                        let textColor = '#1565c0';
                        
                        const cueHasCurrentItem = (cue.items || []).some(item => item.id === executionState.currentItemId);
                        const cueHasPreviewItem = (cue.items || []).some(item => item.id === executionState.previewItemId);
                        
                        if (cueHasCurrentItem) {
                          status = 'ACTIVE';
                          backgroundColor = '#ffcdd2'; // Much lighter red/pink for active cues
                          borderColor = '#f44336';
                          textColor = '#d32f2f';
                        } else if (cueHasPreviewItem) {
                          status = 'READY';
                          backgroundColor = '#ffe0b2'; // Much lighter orange for ready cues
                          borderColor = '#ff9800';
                          textColor = '#f57c00';
                        }

                        return (
                          <div
                            key={cue.id}
                            style={{
                              padding: '12px 16px',
                              borderBottom: cueIndex < (segment.groups || []).length - 1 ? '1px solid #e0e0e0' : 'none',
                              background: backgroundColor,
                              cursor: 'pointer',
                              transition: 'background-color 0.2s'
                            }}
                            onClick={() => {
                              // Cue click is now less important - just for visual feedback
                            }}
                            onMouseEnter={(e) => {
                              if (status === 'upcoming') {
                                e.currentTarget.style.backgroundColor = '#f0f0f0';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = backgroundColor;
                            }}
                          >
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px'
                            }}>
                              {/* LED Status indicator for cue */}
                              {(status === 'ACTIVE' || status === 'READY') && (
                                <div style={{
                                  width: '14px',
                                  height: '14px',
                                  borderRadius: '50%',
                                  background: status === 'ACTIVE' ? '#ff0000' : '#ffa500',
                                  flexShrink: 0,
                                  boxShadow: status === 'ACTIVE' 
                                    ? '0 0 10px #ff0000, 0 0 15px #ff0000, 0 0 20px #ff0000'
                                    : '0 0 8px #ffa500, 0 0 12px #ffa500',
                                  animation: status === 'READY' ? 'ledFlash 1.5s infinite' : 'none',
                                  border: '2px solid rgba(255,255,255,0.4)'
                                }} />
                              )}
                              
                              {/* Cue title */}
                              <div style={{
                                fontSize: '15px',
                                fontWeight: '600',
                                color: textColor,
                                flex: 1
                              }}>
                                {cue.title || `Cue ${segmentIndex + 1}.${cueIndex + 1}`}
                              </div>
                              
                              {/* Status label */}
                              <div style={{
                                fontSize: '11px',
                                fontWeight: '700',
                                color: borderColor,
                                textTransform: 'uppercase',
                                background: 'rgba(255,255,255,0.8)',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                border: `1px solid ${borderColor}`
                              }}>
                                {status}
                              </div>
                            </div>

                            {/* Individual rundown items */}
                            <div style={{ 
                              paddingLeft: '24px', 
                              marginTop: '8px'
                            }}>
                              {(cue.items || []).map((item, itemIndex) => {
                                const getItemTypeColor = (type) => {
                                  switch (type) {
                                    case 'FullScreenGraphic':
                                    case 'GraphicsItem':
                                    case 'graphics':
                                      return '#4caf50';
                                    case 'FullScreenVideo':
                                    case 'VideoItem':
                                    case 'video':
                                      return '#2196f3';
                                    case 'FullScreenAudio':
                                    case 'AudioItem':
                                    case 'audio':
                                      return '#ff9800';
                                    case 'ManualBlock':
                                    case 'manualblock':
                                    case 'manual-block':
                                      return '#9c27b0';
                                    case 'FullScreenPdfImage':
                                    case 'PdfImageItem':
                                    case 'pdf':
                                    case 'image':
                                      return '#795548';
                                    default:
                                      return '#666';
                                  }
                                };

                                const typeColor = getItemTypeColor(item.type);

                                // Determine item status
                                let itemStatus = 'upcoming';
                                let itemBgColor = '#f8f9fa';
                                let itemBorderColor = '#dee2e6';
                                
                                if (item.id === executionState.currentItemId) {
                                  itemStatus = 'LIVE';
                                  itemBgColor = '#ffebee';
                                  itemBorderColor = '#f44336';
                                } else if (item.id === executionState.previewItemId) {
                                  itemStatus = 'PREVIEW';
                                  itemBgColor = '#fff8e1';
                                  itemBorderColor = '#ff9800';
                                }

                                // Get subtitle
                                const getItemSubtitle = (item) => {
                                  // Graphics items - need to fetch from graphics table
                                  if (item.type === 'FullScreenGraphic') {
                                    const graphic = item.data?.selectedGraphic;
                                    const graphicId = graphic?.id;
                                    
                                    if (graphicId && graphicsCache[graphicId]) {
                                      const fullGraphicData = graphicsCache[graphicId];
                                      const templateId = fullGraphicData.template_id;
                                      const templateData = fullGraphicData.template_data;
                                      const f0 = templateData?.f0;
                                      
                                      if (templateId && f0) {
                                        return `${templateId} - ${f0}`;
                                      }
                                      if (templateId) {
                                        return templateId;
                                      }
                                    }
                                    
                                    // Fallback to basic graphic type
                                    if (graphic?.type) {
                                      return graphic.type;
                                    }
                                  }
                                  
                                  // Video items
                                  if (item.type === 'FullScreenVideo') {
                                    const media = item.data?.selectedMedia;
                                    
                                    // Check all possible title fields
                                    if (media?.title && media.title.trim() !== '') {
                                      return media.title;
                                    }
                                    if (media?.name && media.name.trim() !== '') {
                                      return media.name;
                                    }
                                    if (media?.originalname) {
                                      return media.originalname; // This is the actual video title
                                    }
                                    if (media?.filename) {
                                      return media.filename;
                                    }
                                  }
                                  
                                  // PDF/Image items
                                  if (item.type === 'FullScreenPdfImage') {
                                    const media = item.data?.selectedMedia;
                                    
                                    // Check all possible title fields
                                    if (media?.title && media.title.trim() !== '') {
                                      return media.title;
                                    }
                                    if (media?.name && media.name.trim() !== '') {
                                      return media.name;
                                    }
                                    if (media?.originalname) {
                                      return media.originalname; // This is the actual image/PDF title
                                    }
                                    if (media?.filename) {
                                      return media.filename;
                                    }
                                  }
                                  
                                  // Fallback options
                                  return item.data?.subtitle || 
                                         item.subtitle || 
                                         item.data?.description ||
                                         item.data?.notes ||
                                         ''; // Return blank instead of debug
                                };
                                
                                const subtitle = getItemSubtitle(item);

                                // Check if this is a manual block or presenter note - render them specially
                                const isManualBlock = item.type === 'ManualBlock' || item.type === 'manualblock' || item.type === 'manual-block';
                                const isPresenterNote = item.type === 'PresenterNote' || item.type === 'presenter-note' || item.type === 'presenternote';
                                
                                if (isPresenterNote) {
                                  // Render presenter note with prominent text display
                                  const noteText = item.data?.note || item.data?.text || 'No note text';
                                  const truncatedText = noteText.length > 120 ? noteText.substring(0, 120) + '...' : noteText;
                                  
                                  return (
                                    <div
                                      key={item.id || itemIndex}
                                      style={{
                                        position: 'relative',
                                        marginLeft: '40px', // Indent the note
                                        marginBottom: '6px'
                                      }}
                                    >
                                      {/* Visual connector line */}
                                      <div style={{
                                        position: 'absolute',
                                        left: '-25px',
                                        top: '-6px',
                                        width: '20px',
                                        height: '50%',
                                        borderLeft: '2px solid #009688',
                                        borderBottom: '2px solid #009688',
                                        borderBottomLeftRadius: '8px'
                                      }} />
                                      
                                      <div
                                        data-item-id={item.id}
                                        style={{
                                          padding: '12px 16px',
                                          background: '#e0f2f1', // Light teal background
                                          border: '2px solid #009688', // Teal border
                                          borderRadius: '6px',
                                          cursor: 'default', // No pointer cursor since it's not clickable
                                          transition: 'all 0.15s',
                                          minHeight: '60px', // More height for note content
                                          userSelect: 'text', // Allow text selection
                                          WebkitUserSelect: 'text',
                                          position: 'relative'
                                        }}
                                    >
                                      {/* Header row */}
                                      <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        marginBottom: '8px'
                                      }}>
                                        <span style={{ 
                                          flex: 1,
                                          color: '#333',
                                          fontWeight: '600',
                                          fontSize: '14px'
                                        }}>
                                          {item.title || 'Presenter Note'}
                                        </span>
                                        
                                        <span style={{
                                          fontSize: '9px',
                                          fontWeight: '600',
                                          color: '#00695c',
                                          background: 'rgba(255,255,255,0.9)',
                                          padding: '2px 6px',
                                          borderRadius: '8px',
                                          border: '1px solid #00695c',
                                          textTransform: 'uppercase'
                                        }}>
                                          NOTE
                                        </span>
                                      </div>
                                      
                                      {/* Note content */}
                                      <div style={{
                                        fontSize: '14px',
                                        lineHeight: '1.4',
                                        color: '#424242',
                                        fontStyle: 'normal',
                                        padding: '0 4px',
                                        wordWrap: 'break-word',
                                        overflow: 'hidden'
                                      }}>
                                        {truncatedText}
                                      </div>
                                    </div>
                                  </div>
                                  );
                                } else if (isManualBlock) {
                                  // Render manual block and its sub-items
                                  const manualItems = item.data?.items || [];
                                  
                                  // Check if THIS specific manual block is active
                                  const thisBlockContainsActiveItem = manualItems.some(manualItem => 
                                    manualItem === executionState.currentManualItem || 
                                    manualItem === executionState.previewManualItem || 
                                    manualItem === executionState.armedManualItem
                                  );
                                  const isActiveManualBlock = thisBlockContainsActiveItem;
                                  
                                  return (
                                    <div key={item.id || itemIndex}>
                                      {/* Manual Block container with border wrapping everything */}
                                      <div
                                        data-item-id={item.id}
                                        style={{
                                          background: isActiveManualBlock ? '#e8f5e8' : '#f8f4ff', // Light green when active, light purple when inactive
                                          border: `3px solid ${isActiveManualBlock ? '#4caf50' : '#9c27b0'}`, // Green border when active
                                          borderRadius: '6px',
                                          marginBottom: '6px',
                                          overflow: 'hidden',
                                          boxShadow: isActiveManualBlock ? '0 2px 8px rgba(76, 175, 80, 0.2)' : 'none', // Subtle green glow when active
                                          transition: 'all 0.3s ease' // Smooth transition between states
                                        }}
                                      >
                                        {/* Manual Block header */}
                                        <div style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '8px',
                                          padding: '8px 12px',
                                          borderBottom: manualItems.length > 0 ? `1px solid ${isActiveManualBlock ? '#81c784' : '#d1c4e9'}` : 'none',
                                          background: isActiveManualBlock ? '#c8e6c9' : '#f0ebff' // Light green header when active
                                        }}>
                                          <span style={{ 
                                            flex: 1,
                                            color: '#333',
                                            fontWeight: '600',
                                            fontSize: '14px'
                                          }}>
                                            {item.title || 'Manual Block'}
                                          </span>
                                          
                                          {manualItems.length > 0 && (
                                            <span style={{
                                              fontSize: '10px',
                                              color: '#666',
                                              fontStyle: 'italic',
                                              marginRight: '8px'
                                            }}>
                                              {manualItems.length} item{manualItems.length !== 1 ? 's' : ''}
                                            </span>
                                          )}
                                          
                                          <span style={{
                                            fontSize: '9px',
                                            fontWeight: '600',
                                            color: isActiveManualBlock ? '#2e7d32' : '#9c27b0',
                                            background: isActiveManualBlock ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.8)',
                                            padding: '2px 6px',
                                            borderRadius: '8px',
                                            border: `1px solid ${isActiveManualBlock ? '#2e7d32' : '#9c27b0'}`,
                                            textTransform: 'uppercase',
                                            boxShadow: isActiveManualBlock ? '0 1px 3px rgba(46, 125, 50, 0.3)' : 'none'
                                          }}>
                                            {isActiveManualBlock ? 'MANUAL ACTIVE' : 'MANUAL'}
                                          </span>
                                        </div>
                                        
                                        {/* Manual Block sub-items inside the container */}
                                        {manualItems.length > 0 && (
                                          <div style={{ padding: '8px 8px 8px 20px' }}> {/* Add left padding for sub-items */}
                                            {manualItems.map((manualItem, manualIndex) => {
                                        // Check manual item status
                                        const isArmed = executionState.armedManualItem === manualItem;
                                        const isLive = executionState.currentManualItem === manualItem;
                                        const isPreview = executionState.previewManualItem === manualItem;
                                        
                                        return (
                                          <div
                                            key={`manual-${manualIndex}`}
                                            data-manual-item-id={manualItem.id || `manual-${manualIndex}`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                            }}
                                            onDoubleClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              armManualItem(manualItem);
                                            }}
                                            onMouseDown={(e) => {
                                              e.preventDefault();
                                            }}
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'column',
                                              gap: '4px',
                                              padding: '6px 10px',
                                              marginBottom: '4px',
                                              background: isLive ? '#ffebee' : isPreview ? '#fff8e1' : isArmed ? '#fff3cd' : '#ffffff',
                                              border: `2px solid ${isLive ? '#f44336' : isPreview ? '#ff9800' : isArmed ? '#ff9800' : '#d1c4e9'}`,
                                              borderRadius: '4px',
                                              cursor: 'pointer',
                                              transition: 'all 0.15s',
                                              minHeight: '32px',
                                              userSelect: 'none',
                                              WebkitUserSelect: 'none',
                                              MozUserSelect: 'none',
                                              msUserSelect: 'none',
                                              WebkitTouchCallout: 'none',
                                              WebkitTapHighlightColor: 'transparent'
                                            }}
                                            onMouseEnter={(e) => {
                                              if (isLive) {
                                                e.currentTarget.style.backgroundColor = '#ffcdd2';
                                              } else if (isPreview) {
                                                e.currentTarget.style.backgroundColor = '#ffecb3';
                                              } else if (isArmed) {
                                                e.currentTarget.style.backgroundColor = '#ffecb3';
                                              } else {
                                                e.currentTarget.style.backgroundColor = '#f5f5f5';
                                              }
                                            }}
                                            onMouseLeave={(e) => {
                                              const bgColor = isLive ? '#ffebee' : isPreview ? '#fff8e1' : isArmed ? '#fff3cd' : '#ffffff';
                                              e.currentTarget.style.backgroundColor = bgColor;
                                            }}
                                        >
                                          <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                          }}>
                                            {/* LED Status indicator for manual items */}
                                            {(isLive || isPreview) && (
                                              <div style={{
                                                width: '10px',
                                                height: '10px',
                                                borderRadius: '50%',
                                                background: isLive ? '#ff0000' : '#ffa500',
                                                flexShrink: 0,
                                                boxShadow: isLive 
                                                  ? '0 0 6px #ff0000, 0 0 10px #ff0000, 0 0 14px #ff0000'
                                                  : '0 0 4px #ffa500, 0 0 8px #ffa500',
                                                animation: isPreview ? 'ledFlash 1.5s infinite' : 'none',
                                                border: '1px solid rgba(255,255,255,0.3)'
                                              }} />
                                            )}
                                            
                                            <span style={{ 
                                              flex: 1,
                                              color: '#333',
                                              fontWeight: '500',
                                              fontSize: '13px'
                                            }}>
                                              {manualItem.title || manualItem.type || 'Manual Item'}
                                            </span>
                                            
                                            {/* Status badge for manual items */}
                                            {(isLive || isPreview || isArmed) && (
                                              <span style={{
                                                fontSize: '8px',
                                                fontWeight: '700',
                                                color: isLive ? '#f44336' : isPreview ? '#ff9800' : '#ff9800',
                                                background: 'rgba(255,255,255,0.9)',
                                                padding: '1px 6px',
                                                borderRadius: '6px',
                                                border: `1px solid ${isLive ? '#f44336' : isPreview ? '#ff9800' : '#ff9800'}`,
                                                textTransform: 'uppercase',
                                                marginRight: '4px'
                                              }}>
                                                {isLive ? 'LIVE' : isPreview ? 'PREVIEW' : 'ARMED'}
                                              </span>
                                            )}
                                            
                                            <span style={{
                                              fontSize: '8px',
                                              fontWeight: '600',
                                              color: '#666',
                                              background: 'rgba(255,255,255,0.8)',
                                              padding: '1px 4px',
                                              borderRadius: '6px',
                                              border: `1px solid #ccc`,
                                              textTransform: 'uppercase'
                                            }}>
                                              {manualItem.type?.replace('FullScreen', '').replace('Item', '').replace('Block', '') || 'ITEM'}
                                            </span>
                                          </div>
                                        </div>
                                            );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                }

                                // Regular item rendering
                                return (
                                  <div
                                    key={item.id || itemIndex}
                                    data-item-id={item.id}
                                    onClick={(e) => {
                                      e.stopPropagation(); // Don't trigger cue click
                                      // Single click could be used for selection/highlighting
                                    }}
                                    onDoubleClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setItemToPreview(item.id);
                                    }}
                                    onMouseDown={(e) => {
                                      e.preventDefault(); // Prevent text selection and accessibility triggers
                                    }}
                                    style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '4px',
                                      padding: '8px 12px',
                                      marginBottom: '6px',
                                      background: itemBgColor,
                                      border: `2px solid ${itemBorderColor}`,
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      transition: 'all 0.15s',
                                      minHeight: '40px',
                                      userSelect: 'none', // Prevent text selection
                                      WebkitUserSelect: 'none',
                                      MozUserSelect: 'none',
                                      msUserSelect: 'none',
                                      WebkitTouchCallout: 'none', // Prevent iOS callout
                                      WebkitTapHighlightColor: 'transparent' // Prevent mobile tap highlight
                                    }}
                                    onMouseEnter={(e) => {
                                      if (itemStatus === 'upcoming') {
                                        e.currentTarget.style.backgroundColor = '#e9ecef';
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = itemBgColor;
                                    }}
                                  >
                                    {/* Top row - title and status */}
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px'
                                    }}>
                                      {/* LED Status indicator */}
                                      {itemStatus !== 'upcoming' && (
                                        <div style={{
                                          width: '12px',
                                          height: '12px',
                                          borderRadius: '50%',
                                          background: itemStatus === 'LIVE' ? '#ff0000' : '#ffa500',
                                          flexShrink: 0,
                                          boxShadow: itemStatus === 'LIVE' 
                                            ? '0 0 8px #ff0000, 0 0 12px #ff0000, 0 0 16px #ff0000'
                                            : '0 0 6px #ffa500, 0 0 10px #ffa500',
                                          animation: itemStatus === 'PREVIEW' ? 'ledFlash 1.5s infinite' : 'none',
                                          border: '1px solid rgba(255,255,255,0.3)'
                                        }} />
                                      )}
                                      
                                      {/* Item title */}
                                      <span style={{ 
                                        flex: 1,
                                        color: '#333',
                                        fontWeight: '600',
                                        fontSize: '14px'
                                      }}>
                                        {item.title || item.data?.title || 'Untitled Item'}
                                      </span>
                                      
                                      {/* Automation countdown - positioned before LIVE pill */}
                                      {item.automation_mode === 'auto' && itemStatus === 'LIVE' && (
                                        <span style={{
                                          fontSize: '18px',
                                          fontWeight: '700',
                                          color: '#fff',
                                          background: itemTimers[item.id] <= 5 ? '#ff5722' : '#2196f3',
                                          padding: '4px 10px',
                                          borderRadius: '6px',
                                          minWidth: '45px',
                                          textAlign: 'center',
                                          marginRight: '8px',
                                          animation: itemTimers[item.id] <= 5 ? 'ledFlash 1s infinite' : 'none'
                                        }}>
                                          {(() => {
                                            const seconds = itemTimers[item.id] !== undefined ? itemTimers[item.id] : item.automation_duration;
                                            const mins = Math.floor(seconds / 60);
                                            const secs = seconds % 60;
                                            return `${mins}:${secs.toString().padStart(2, '0')}`;
                                          })()}
                                        </span>
                                      )}
                                      
                                      {/* Manual mode indicator - same size/position as countdown */}
                                      {item.automation_mode === 'manual' && itemStatus === 'LIVE' && (
                                        <span style={{
                                          fontSize: '18px',
                                          fontWeight: '700',
                                          color: '#fff',
                                          background: '#ff9800',
                                          padding: '4px 10px',
                                          borderRadius: '6px',
                                          minWidth: '45px',
                                          textAlign: 'center',
                                          marginRight: '8px',
                                          animation: 'ledFlash 2s infinite'
                                        }}>
                                          [M]
                                        </span>
                                      )}
                                      
                                      {/* Status badge */}
                                      {itemStatus !== 'upcoming' && (
                                        <span style={{
                                          fontSize: '10px',
                                          fontWeight: '700',
                                          color: itemBorderColor,
                                          background: 'rgba(255,255,255,0.9)',
                                          padding: '2px 8px',
                                          borderRadius: '10px',
                                          border: `1px solid ${itemBorderColor}`,
                                          textTransform: 'uppercase'
                                        }}>
                                          {itemStatus}
                                        </span>
                                      )}
                                      
                                      {/* Item type badge */}
                                      <span style={{
                                        fontSize: '9px',
                                        fontWeight: '600',
                                        color: typeColor,
                                        background: 'rgba(255,255,255,0.8)',
                                        padding: '2px 6px',
                                        borderRadius: '8px',
                                        border: `1px solid ${typeColor}`,
                                        textTransform: 'uppercase'
                                      }}>
                                        {item.type === 'FullScreenPdfImage' ? 'PDF/IMAGE' : 
                                         item.type?.replace('FullScreen', '').replace('Item', '').replace('Block', '') || 'Item'}
                                      </span>
                                    </div>
                                    
                                    {/* Subtitle row */}
                                    {subtitle && (
                                      <div style={{
                                        fontSize: '12px',
                                        color: '#666',
                                        fontStyle: 'italic',
                                        paddingLeft: '18px'
                                      }}>
                                        {subtitle}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              
                              {(cue.items || []).length === 0 && (
                                <div style={{
                                  padding: '12px',
                                  textAlign: 'center',
                                  color: '#999',
                                  fontSize: '12px',
                                  fontStyle: 'italic'
                                }}>
                                  No items in this cue
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
        
        {/* Right column - Time and Notes Panel */}
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
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
          {/* Clock Display */}
          <div style={{
            background: '#2c2c2c',
            borderRadius: '8px',
            padding: '16px 20px',
            textAlign: 'center',
            border: '1px solid #444'
          }}>
            <div style={{
              fontSize: '42px',
              fontWeight: '700',
              color: '#4caf50',
              fontFamily: 'monospace',
              letterSpacing: '2px'
            }}>
              {currentTime.toLocaleTimeString('en-US', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </div>
          </div>
          
          {/* Timer Display */}
          <div style={{
            background: '#f8f8f8',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid #e1e6ec'
          }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              {/* Segment Timer with Allotted Time */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '12px',
                  color: '#666',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  fontWeight: '600'
                }}>
                  Segment Time
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {(() => {
                    const currentSegment = getCurrentSegmentInfo();
                    const allottedTime = currentSegment?.allotted_time;
                    const hasAllottedTime = allottedTime && allottedTime > 0;
                    
                    // Calculate time remaining if allotted time exists
                    let timeRemaining = null;
                    let isWarning = false;
                    let isOverTime = false;
                    let shouldFlash = false;
                    
                    if (hasAllottedTime) {
                      timeRemaining = allottedTime - segmentElapsed;
                      isOverTime = timeRemaining < 0;
                      isWarning = !isOverTime && timeRemaining <= 30;
                      shouldFlash = isWarning; // Flash when 30 seconds or less remaining
                    }
                    
                    return (
                      <>
                        {/* Main timer display */}
                        <div style={{
                          fontSize: '28px',
                          fontWeight: '700',
                          color: isOverTime ? '#f44336' : (isWarning ? '#ff9800' : '#2196f3'),
                          fontFamily: 'monospace',
                          animation: shouldFlash ? 'ledFlash 1s infinite' : 'none'
                        }}>
                          {formatElapsedTime(segmentElapsed)}
                        </div>
                        
                        {/* Allotted time subtitle */}
                        {hasAllottedTime && (
                          <div style={{
                            fontSize: '13px',
                            color: isOverTime ? '#f44336' : '#888',
                            fontFamily: 'monospace',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <span style={{ color: '#999' }}>allotted</span>
                            <span style={{ fontWeight: '600' }}>{formatElapsedTime(allottedTime)}</span>
                            {isOverTime && (
                              <span style={{ 
                                color: '#f44336',
                                fontWeight: '700'
                              }}>
                                (+{formatElapsedTime(Math.abs(timeRemaining))})
                              </span>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
              
              {/* Show Timer */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '12px',
                  color: '#666',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  fontWeight: '600'
                }}>
                  Show Duration
                </div>
                <div style={{
                  fontSize: '28px',
                  fontWeight: '700',
                  color: '#673ab7',
                  fontFamily: 'monospace'
                }}>
                  {formatElapsedTime(showElapsed)}
                </div>
              </div>
            </div>
          </div>
          
          {/* Segment/Cue Status */}
          <div style={{
            background: '#f8f8f8',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid #e1e6ec'
          }}>
            {(() => {
              const status = getSegmentCueStatus();
              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {/* Current Column */}
                  <div>
                    <div style={{
                      fontSize: '11px',
                      color: '#999',
                      textTransform: 'uppercase',
                      fontWeight: '600',
                      marginBottom: '8px',
                      letterSpacing: '0.5px'
                    }}>Current</div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div>
                        <div style={{
                          fontSize: '10px',
                          color: '#666',
                          marginBottom: '2px'
                        }}>SEGMENT</div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#2196f3'
                        }}>
                          {status.currentSegment?.title || '—'}
                        </div>
                      </div>
                      
                      <div>
                        <div style={{
                          fontSize: '10px',
                          color: '#666',
                          marginBottom: '2px'
                        }}>CUE</div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#2196f3'
                        }}>
                          {status.currentCue?.title || '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Upcoming Column */}
                  <div>
                    <div style={{
                      fontSize: '11px',
                      color: '#999',
                      textTransform: 'uppercase',
                      fontWeight: '600',
                      marginBottom: '8px',
                      letterSpacing: '0.5px'
                    }}>Upcoming</div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div>
                        <div style={{
                          fontSize: '10px',
                          color: '#666',
                          marginBottom: '2px'
                        }}>SEGMENT</div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#666'
                        }}>
                          {status.upcomingSegment?.title || '—'}
                        </div>
                      </div>
                      
                      <div>
                        <div style={{
                          fontSize: '10px',
                          color: '#666',
                          marginBottom: '2px'
                        }}>CUE</div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#666'
                        }}>
                          {status.upcomingCue?.title || '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
          
          {/* Presenter Notes */}
          <div style={{
            background: '#f8f8f8',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid #e1e6ec',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '200px'
          }}>
            {(() => {
              const noteData = getCurrentPresenterNote();
              return (
                <>
                  <div style={{
                    fontSize: '14px',
                    color: noteData?.isCurrent ? '#4caf50' : '#666',
                    marginBottom: '12px',
                    textTransform: 'uppercase',
                    fontWeight: '600'
                  }}>
                    {noteData?.isCurrent ? 'Current Presenter Note' : 'Upcoming Presenter Note'}
                  </div>
                  <div style={{
                    flex: 1,
                    fontSize: '20px',
                    lineHeight: '1.6',
                    color: '#333',
                    overflowY: 'auto'
                  }}>
                    {!noteData ? (
                      <em style={{ color: '#999' }}>No presenter notes available</em>
                    ) : (
                      <div style={{ whiteSpace: 'pre-wrap' }}>{noteData.note}</div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
          
          {/* Quick Access Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: '16px'
          }}>
            {/* STOP Button */}
            <button
              onClick={() => handleButtonClickRef.current({ type: 'stop', active: true })}
              style={{
                width: '80px',
                height: '80px',
                background: executionState?.stopped ? '#f44336' : '#fff',
                border: '2px solid #f44336',
                borderRadius: '8px',
                color: executionState?.stopped ? '#fff' : '#f44336',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              STOP
            </button>
            
            {/* PAUSE Button */}
            <button
              onClick={() => handleButtonClickRef.current({ type: 'pause', active: true })}
              style={{
                width: '80px',
                height: '80px',
                background: executionState?.paused ? '#ff9800' : '#fff',
                border: '2px solid #ff9800',
                borderRadius: '8px',
                color: executionState?.paused ? '#fff' : '#ff9800',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              PAUSE
            </button>
            
            {/* NEXT Button */}
            <button
              onClick={() => handleButtonClickRef.current({ type: 'next', active: true })}
              style={{
                width: '80px',
                height: '80px',
                background: '#4caf50',
                border: '2px solid #4caf50',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              NEXT
            </button>
          </div>
        </div>
        </div>

      {/* QR Code Modal */}
      {qrModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            position: 'relative'
          }}>
            {/* Close button */}
            <button
              onClick={() => setQrModalOpen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666'
              }}
            >
              ✕
            </button>
            
            <h2 style={{
              margin: '0 0 24px 0',
              fontSize: '24px',
              fontWeight: '700',
              textAlign: 'center'
            }}>
              Control Surface
            </h2>
            
            {/* QR Code */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '24px'
            }}>
              <QRCodeSVG
                value={getControlSurfaceUrl()}
                size={256}
                level="H"
                includeMargin={true}
              />
            </div>
            
            {/* URL Display */}
            <div style={{
              background: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              fontFamily: 'monospace',
              fontSize: '14px',
              wordBreak: 'break-all',
              textAlign: 'center'
            }}>
              {getControlSurfaceUrl()}
            </div>
            
            {/* Copy Button */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(getControlSurfaceUrl());
                // Show temporary success feedback
                const btn = event.target;
                const originalText = btn.textContent;
                btn.textContent = '✓ Copied!';
                btn.style.background = '#4caf50';
                setTimeout(() => {
                  btn.textContent = originalText;
                  btn.style.background = '#2196f3';
                }, 2000);
              }}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                fontWeight: '600',
                background: '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              Copy URL
            </button>
            
            <p style={{
              marginTop: '16px',
              fontSize: '14px',
              color: '#666',
              textAlign: 'center',
              lineHeight: '1.5'
            }}>
              Scan the QR code or use the URL to open the control surface on any device
            </p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}