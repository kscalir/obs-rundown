import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createApi } from './api/client.js';
import { API_BASE_URL } from './config';

// CSS for animations
const animationStyles = `
  .boxes-wrapper {
    position: relative;
    overflow: hidden;
    height: 100%;
  }
  
  /* Box animations - continuous upward scroll */
  .boxes-stack { 
    position: relative; 
    height: 100%;
  }
  
  .boxes-layer { 
    position: absolute; 
    inset: 0;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  
  /* Box container base styles */
  .box-container {
    position: relative;
    transition: transform 0.6s ease-in-out;
  }
  
  .box-container.no-transition {
    transition: none;
  }
  
  /* Fade animation for labels */
  .box-label {
    transition: opacity 0.2s ease-out;
  }
  
  .box-label.fading {
    opacity: 0;
  }
  
  /* Notes animations */
  .notes-wrapper {
    position: relative;
    overflow: hidden;
    height: 100%;
  }
  
  .notes-content {
    position: absolute;
    width: 100%;
    padding: 10px;
  }
  
  .notes-scroll-out {
    animation: noteScrollOut 0.6s ease-in-out forwards;
  }
  
  .notes-scroll-in {
    animation: noteScrollIn 0.6s ease-in-out forwards;
  }
  
  @keyframes noteScrollOut {
    0% { 
      transform: translateY(0);
      opacity: 1;
    }
    100% { 
      transform: translateY(-100%);
      opacity: 0;
    }
  }
  
  @keyframes noteScrollIn {
    0% { 
      transform: translateY(100%);
      opacity: 0;
    }
    100% { 
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

const PresenterView = () => {
  const api = useMemo(() => createApi(API_BASE_URL), []);
  
  // Get showId and episodeId from URL
  const urlParams = new URLSearchParams(window.location.search);
  const showId = urlParams.get('showId');
  const episodeId = urlParams.get('episodeId');
  
  // State for presenter view data
  const [presenterData, setPresenterData] = useState({
    segmentName: null,
    segmentAllotted: null,
    currentItem: null,
    nextItem: null,
    presenterNote: null,
    liveItemId: null
  });
  
  // Separate timer state that syncs with control page
  const [timerState, setTimerState] = useState({
    segmentElapsed: 0,
    isRunning: false,
    baseTime: 0,      // The synced elapsed time value
    baseTimestamp: Date.now(),  // When we received that value
    hasReceivedSync: false  // Track if we've received at least one sync
  });
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [allItems, setAllItems] = useState([]); // All rundown items
  const [itemNotes, setItemNotes] = useState({}); // Map of item ID to presenter notes
  
  // Ref to store fetchPresenterData function for WebSocket access
  const fetchPresenterDataRef = useRef(null);
  
  // Calculate box height (50% of viewport minus padding)
  const boxHeight = window.innerHeight * 0.5 - 80;
  const scrollDistance = boxHeight + 20; // box height + margin
  
  // Simple state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [fadingLabels, setFadingLabels] = useState(false);
  const [, forceUpdate] = useState(0); // Force re-render for timer
  
  // WebSocket for timer sync and updates
  useEffect(() => {
    if (!episodeId) return;
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname + ':5050';
    const wsUrl = `${protocol}//${wsHost}/ws?presenter=true&episodeId=${episodeId}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      // Subscribe to timer sync
      ws.send(JSON.stringify({
        type: 'SUBSCRIBE_TIMER_SYNC',
        episodeId: episodeId
      }));
      // Subscribe to rundown updates
      ws.send(JSON.stringify({
        type: 'SUBSCRIBE_RUNDOWN',
        episodeId: episodeId
      }));
      // Request initial timer sync after a short delay to ensure control page is ready
      setTimeout(() => {
        ws.send(JSON.stringify({
          type: 'REQUEST_TIMER_SYNC',
          episodeId: episodeId
        }));
      }, 500);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle timer sync updates from control page
        if (data.type === 'TIMER_SYNC') {
          const syncValue = data.segmentElapsed || 0;
          const now = Date.now();
          setTimerState({
            segmentElapsed: syncValue,
            isRunning: data.isRunning !== false,
            baseTime: syncValue,
            baseTimestamp: now,
            hasReceivedSync: true
          });
        }
        
        // Handle segment change
        if (data.type === 'SEGMENT_CHANGE') {
          setPresenterData(prev => ({
            ...prev,
            segmentName: data.segmentName,
            segmentAllotted: data.segmentAllotted
          }));
          // Reset timer on segment change
          setTimerState(prev => ({
            segmentElapsed: 0,
            isRunning: true,
            baseTime: 0,
            baseTimestamp: Date.now(),
            hasReceivedSync: prev.hasReceivedSync
          }));
        }
        
        // Handle rundown updates - refetch data when rundown changes
        if (data.type === 'RUNDOWN_UPDATE' && data.episodeId === episodeId) {
          // Trigger immediate data refresh
          fetchPresenterDataRef.current();
        }
      } catch {
        // Silently ignore errors
      }
    };
    
    ws.onerror = () => {
    };
    
    ws.onclose = () => {
      setTimeout(() => {
        // Reconnect logic would go here
      }, 3000);
    };
    
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [episodeId]);
  
  // Fetch initial data and set up polling fallback
  useEffect(() => {
    if (!episodeId) return;
    
    const fetchPresenterData = async () => {
      try {
        // Fetch segments
        const segmentsResponse = await api.get(`/api/episodes/${episodeId}/segments`);
        const segments = segmentsResponse || [];
        
        // Fetch execution state
        const executionResponse = await api.get(`/api/execution/episode/${episodeId}`);
        
        if (executionResponse && segments.length > 0) {
          const liveItemId = executionResponse.live_item_id;
          
          // Build flat list of items (excluding overlays and manual blocks) and their notes
          const items = [];
          const notes = {};
          let previousItemId = null;
          
          for (const segment of segments) {
            for (const group of segment.groups || []) {
              for (const item of group.items || []) {
                // Skip overlays and manual blocks in presenter view
                if (item.type === 'overlay' || 
                    item.type === 'manual-block' || 
                    item.type === 'ManualBlock' || 
                    item.type === 'manual_block') {
                  continue;
                }
                
                // If this is a presenter note, attach it to the previous item
                if (item.type === 'presenter-note' && item.data?.note && previousItemId) {
                  notes[previousItemId] = item.data.note;
                } else {
                  // Add non-note items to the list
                  items.push({
                    ...item,
                    subtitle: item.data?.subtitle || item.data?.description || '',
                    duration: item.data?.duration || null
                  });
                  previousItemId = item.id;
                }
              }
            }
          }
          
          setAllItems(items);
          setItemNotes(notes);
          
          // Find current segment and items
          let currentSegment = null;
          let currentItem = null;
          let nextItem = null;
          let currentNote = null;
          
          const currentIdx = items.findIndex(item => item.id === liveItemId);
          if (currentIdx !== -1) {
            currentItem = items[currentIdx];
            nextItem = items[currentIdx + 1] || null;
            currentNote = notes[liveItemId] || null;
            
            // Find segment for current item
            for (const segment of segments) {
              const hasItem = segment.groups?.some(group => 
                group.items?.some(item => item.id === liveItemId)
              );
              if (hasItem) {
                currentSegment = segment;
                break;
              }
            }
          }
          
          // Don't initialize timer here - wait for WebSocket sync
          // This prevents the timer from starting at wrong value
          
          setPresenterData({
            segmentName: currentSegment?.title || null,
            segmentAllotted: currentSegment?.allotted_time || null,
            currentItem: currentItem,
            nextItem: nextItem,
            presenterNote: currentNote,
            liveItemId: liveItemId
          });
        }
        
        setLoading(false);
      } catch {
        setLoading(false);
      }
    };
    
    // Store function in ref for WebSocket access
    fetchPresenterDataRef.current = fetchPresenterData;
    
    // Initial fetch
    fetchPresenterData();
    
    // Poll every 1 second for faster updates (until we have full WebSocket implementation)
    const interval = setInterval(fetchPresenterData, 1000);
    
    return () => clearInterval(interval);
  }, [episodeId, api]);
  
  
  // Update clock and local segment timer every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      
      // Update local segment timer if running and we've received at least one sync
      setTimerState(prev => {
        if (!prev.isRunning || !prev.hasReceivedSync) return prev;
        
        // Calculate elapsed time: base time + seconds since base timestamp
        const secondsSinceBase = Math.floor((Date.now() - prev.baseTimestamp) / 1000);
        return {
          ...prev,
          segmentElapsed: prev.baseTime + secondsSinceBase
        };
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  
  
  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Format clock time
  const formatClock = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };
  
  // Update current index when live item changes
  useEffect(() => {
    if (presenterData.liveItemId && allItems.length > 0) {
      const newIndex = allItems.findIndex(item => item.id === presenterData.liveItemId);
      if (newIndex !== -1 && newIndex !== currentIndex) {
        // Animate to new position
        setFadingLabels(true);
        
        setTimeout(() => {
          setIsAnimating(true);
          setCurrentIndex(newIndex);
          
          // After animation completes
          setTimeout(() => {
            setIsAnimating(false);
            setFadingLabels(false);
          }, 600);
        }, 200);
      }
    }
  }, [presenterData.liveItemId, allItems]);


  
  return (
    <>
      <style>{animationStyles}</style>
      <div style={{
      height: '100vh',
      width: '100vw',
      background: '#1a1a1a',
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '20px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      overflow: 'hidden'
    }}>
      {/* Header with Segment Info and Clock */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#2a2a2a',
        padding: '15px 25px',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
          <h2 style={{ 
            margin: 0, 
            fontSize: '28px', 
            fontWeight: '600',
            color: '#4a90e2'
          }}>
            {presenterData.segmentName || 'No Segment'}
          </h2>
          <div style={{
            display: 'flex',
            gap: '15px',
            alignItems: 'center'
          }}>
            <div style={{
              fontSize: '24px',
              color: '#4caf50',
              fontWeight: '500'
            }}>
              {formatTime(timerState.segmentElapsed)}
            </div>
            <span style={{ color: '#666', fontSize: '20px' }}>/</span>
            <div style={{
              fontSize: '24px',
              color: '#ffcc00',
              fontWeight: '500'
            }}>
              {presenterData.segmentAllotted ? formatTime(presenterData.segmentAllotted) : '--:--'}
            </div>
          </div>
        </div>
        <div style={{
          fontSize: '32px',
          fontWeight: '600',
          color: '#4caf50'
        }}>
          {formatClock(currentTime)}
        </div>
      </div>
      
      {/* Main Content Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        gap: '20px',
        minHeight: 0
      }}>
        {/* Left Panel - Simple Vertical Carousel */}
        <div style={{ 
          flex: '1 1 60%', 
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Carousel container with fixed dimensions */}
          <div style={{
            position: 'relative',
            height: '100%',
            width: '100%'
          }}>
            {/* Fixed labels */}
            <div className={`box-label ${fadingLabels ? 'fading' : ''}`} style={{ 
              position: 'absolute',
              top: '20px',
              left: '30px',
              fontSize: '18px', 
              color: '#888', 
              textTransform: 'uppercase', 
              letterSpacing: '2px',
              zIndex: 10
            }}>
              CURRENT ITEM
            </div>
            
            <div className={`box-label ${fadingLabels ? 'fading' : ''}`} style={{ 
              position: 'absolute',
              top: 'calc(50vh - 60px + 20px)',
              left: '30px',
              fontSize: '18px', 
              color: '#888', 
              textTransform: 'uppercase', 
              letterSpacing: '2px',
              zIndex: 10
            }}>
              NEXT ITEM
            </div>
            
            {/* Fixed green border for current item */}
            <div style={{
              position: 'absolute',
              top: '0',
              left: '0',
              right: '0',
              height: 'calc(50vh - 84px)',
              border: `3px solid ${fadingLabels ? 'transparent' : '#4caf50'}`,
              borderRadius: '10px',
              pointerEvents: 'none',
              transition: 'border-color 0.2s ease-out, box-shadow 0.2s ease-out',
              boxShadow: fadingLabels ? 'none' : '0 0 20px rgba(76, 175, 80, 0.6), inset 0 0 15px rgba(76, 175, 80, 0.3)',
              zIndex: 5
            }} />
            
            {/* Carousel viewport */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              overflow: 'hidden'
            }}>
              {/* Scrolling track with all items */}
              <div style={{
                position: 'relative',
                width: '100%',
                transform: `translateY(${-currentIndex * scrollDistance}px)`,
                transition: isAnimating ? 'transform 0.6s ease-in-out' : 'none'
              }}>
                {/* Render all items, plus extras for continuous scrolling */}
                {allItems.length > 0 ? (
                  [...allItems, ...allItems, ...allItems].map((item, idx) => {
                    // Format item title based on type
                    let displayTitle = item.title || '';
                    if (item.type === 'graphic' && item.data?.source) {
                      const filename = item.data.source.split('/').pop();
                      displayTitle = item.title || `Graphic: ${filename}`;
                    } else if (item.type === 'video' && item.data?.source) {
                      const filename = item.data.source.split('/').pop();
                      displayTitle = item.title || `Video: ${filename}`;
                    } else if (item.type === 'presenter-note') {
                      displayTitle = 'Presenter Note';
                    }
                    
                    return (
                      <div key={`${item.id}-${idx}`} style={{
                        height: 'calc(50vh - 80px)',
                        marginBottom: '20px',
                        background: '#2a2a2a',
                        borderRadius: '10px',
                        padding: '30px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                        border: '2px solid #666',
                        boxSizing: 'border-box',
                        gap: '15px'
                      }}>
                        <div style={{ 
                          fontSize: '36px',
                          fontWeight: '700',
                          color: '#fff',
                          textAlign: 'center'
                        }}>
                          {displayTitle}
                        </div>
                        {item.subtitle && (
                          <div style={{
                            fontSize: '20px',
                            color: '#aaa',
                            textAlign: 'center'
                          }}>
                            {item.subtitle}
                          </div>
                        )}
                        {item.duration && (
                          <div style={{
                            fontSize: '24px',
                            color: '#4caf50',
                            fontWeight: '500'
                          }}>
                            {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  // Show placeholder if no items
                  <div style={{
                    height: 'calc(50vh - 80px)',
                    marginBottom: '20px',
                    background: '#2a2a2a',
                    borderRadius: '10px',
                    padding: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                    border: '2px solid #666',
                    boxSizing: 'border-box'
                  }}>
                    <div style={{ 
                      fontSize: '24px',
                      color: '#666',
                      textAlign: 'center'
                    }}>
                      No rundown items
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Panel - Presenter Notes */}
        <div style={{
          flex: '0 0 35%',
          background: '#2a2a2a',
          borderRadius: '10px',
          padding: '30px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            fontSize: '18px',
            color: '#888',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            marginBottom: '20px',
            borderBottom: '2px solid #444',
            paddingBottom: '10px'
          }}>
            PRESENTER NOTES
          </div>
          
          {/* Notes viewport - simple vertical scroller */}
          <div style={{ 
            flex: 1,
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Scrolling track with all notes */}
            <div style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              transform: `translateY(${-currentIndex * 100}%)`,
              transition: isAnimating ? 'transform 0.6s ease-in-out' : 'none'
            }}>
              {/* Render presenter notes for each item */}
              {allItems.length > 0 ? (
                [...allItems, ...allItems, ...allItems].map((item, idx) => {
                  const note = itemNotes[item.id] || '';
                  return (
                    <div key={`note-${item.id}-${idx}`} style={{
                      height: '100%',
                      fontSize: '24px', 
                      lineHeight: '1.6', 
                      color: note ? '#fff' : '#666', 
                      padding: '10px',
                      whiteSpace: 'pre-wrap',
                      boxSizing: 'border-box',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      {note || 'No presenter notes for this item'}
                    </div>
                  );
                })
              ) : (
                // Show placeholder if no items
                <div style={{
                  height: '100%',
                  fontSize: '24px', 
                  lineHeight: '1.6', 
                  color: '#666', 
                  padding: '10px',
                  whiteSpace: 'pre-wrap',
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  No presenter notes
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default PresenterView;