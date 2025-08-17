import React, { useRef } from 'react';

const RundownList = ({ 
  segments,
  liveItemId,
  previewItemId,
  executionState,
  onItemClick,
  onItemDoubleClick,
  onManualItemDoubleClick,
  itemTimers
}) => {
  const containerRef = useRef(null);
  
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
  
  const getItemSubtitle = (item) => {
    // Graphics items
    if (item.type === 'FullScreenGraphic') {
      const graphic = item.data?.selectedGraphic;
      if (graphic?.template_id && graphic?.template_data?.f0) {
        return `${graphic.template_id} - ${graphic.template_data.f0}`;
      }
      if (graphic?.template_id) {
        return graphic.template_id;
      }
      if (graphic?.type) {
        return graphic.type;
      }
    }
    
    // Video items
    if (item.type === 'FullScreenVideo') {
      const media = item.data?.selectedMedia;
      if (media?.title && media.title.trim() !== '') {
        return media.title;
      }
      if (media?.name && media.name.trim() !== '') {
        return media.name;
      }
      if (media?.originalname) {
        return media.originalname;
      }
      if (media?.filename) {
        return media.filename;
      }
    }
    
    // PDF/Image items
    if (item.type === 'FullScreenPdfImage') {
      const media = item.data?.selectedMedia;
      if (media?.title && media.title.trim() !== '') {
        return media.title;
      }
      if (media?.name && media.name.trim() !== '') {
        return media.name;
      }
      if (media?.originalname) {
        return media.originalname;
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
           '';
  };
  
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
  
  if (!segments || segments.length === 0) {
    return (
      <div style={{
        width: '65%',
        background: '#fff',
        overflow: 'auto',
        padding: '16px',
        borderRight: '2px solid #ddd',
        scrollBehavior: 'auto',
        boxSizing: 'border-box'
      }}>
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#666',
          fontStyle: 'italic'
        }}>
          No segments found in this rundown
        </div>
      </div>
    );
  }
  
  return (
    <div 
      ref={containerRef}
      style={{
        width: '65%',
        background: '#fff',
        overflow: 'auto',
        padding: '16px',
        borderRight: '2px solid #ddd',
        scrollBehavior: 'auto',
        boxSizing: 'border-box'
      }}
    >
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
              {(!segment.cues || segment.cues.length === 0) ? (
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
                  {segment.cues.map((cue, cueIndex) => {
                    // Determine cue status
                    let status = 'upcoming';
                    let backgroundColor = '#e8f4fd';
                    let borderColor = '#90caf9';
                    let textColor = '#1565c0';
                    
                    const cueHasCurrentItem = (cue.items || []).some(item => item.id === liveItemId);
                    const cueHasPreviewItem = (cue.items || []).some(item => item.id === previewItemId);
                    
                    // Check if this cue has manual blocks with active manual items
                    const cueHasActiveManual = executionState?.currentManualItem && (cue.items || []).some(item => {
                      if (item.type === 'ManualBlock' || item.type === 'manualblock' || item.type === 'manual-block') {
                        return (item.data?.items || []).some(manualItem => 
                          manualItem.id === executionState.currentManualItem
                        );
                      }
                      return false;
                    });
                    
                    const cueHasPreviewManual = executionState?.previewManualItem && (cue.items || []).some(item => {
                      if (item.type === 'ManualBlock' || item.type === 'manualblock' || item.type === 'manual-block') {
                        return (item.data?.items || []).some(manualItem => 
                          manualItem.id === executionState.previewManualItem
                        );
                      }
                      return false;
                    });
                    
                    if (cueHasCurrentItem || cueHasActiveManual) {
                      status = 'ACTIVE';
                      backgroundColor = '#ffcdd2';
                      borderColor = '#f44336';
                      textColor = '#d32f2f';
                    } else if (cueHasPreviewItem || cueHasPreviewManual) {
                      status = 'READY';
                      backgroundColor = '#ffe0b2';
                      borderColor = '#ff9800';
                      textColor = '#f57c00';
                    }

                    return (
                      <div
                        key={cue.id}
                        style={{
                          padding: '12px 16px',
                          borderBottom: cueIndex < segment.cues.length - 1 ? '1px solid #e0e0e0' : 'none',
                          background: backgroundColor,
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
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
                            const typeColor = getItemTypeColor(item.type);

                            // Determine item status
                            let itemStatus = 'upcoming';
                            let itemBgColor = '#f8f9fa';
                            let itemBorderColor = '#dee2e6';
                            
                            if (item.id === liveItemId) {
                              itemStatus = 'LIVE';
                              itemBgColor = '#ffebee';
                              itemBorderColor = '#f44336';
                            } else if (item.id === previewItemId) {
                              itemStatus = 'PREVIEW';
                              itemBgColor = '#fff8e1';
                              itemBorderColor = '#ff9800';
                            }

                            // Check if this is a manual block or presenter note
                            const isManualBlock = item.type === 'ManualBlock' || item.type === 'manualblock' || item.type === 'manual-block';
                            const isPresenterNote = item.type === 'PresenterNote' || item.type === 'presenter-note' || item.type === 'presenternote' || item.type === 'note';
                            
                            if (isPresenterNote) {
                              // Render presenter note with prominent text display
                              const noteText = item.data?.note || item.data?.text || item.title || 'No note text';
                              const truncatedText = noteText.length > 120 ? noteText.substring(0, 120) + '...' : noteText;
                              
                              return (
                                <div
                                  key={item.id || itemIndex}
                                  style={{
                                    position: 'relative',
                                    marginLeft: '40px',
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
                                      background: '#e0f2f1',
                                      border: '2px solid #009688',
                                      borderRadius: '6px',
                                      cursor: 'default',
                                      transition: 'all 0.15s',
                                      minHeight: '60px',
                                      userSelect: 'text',
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
                              // Render manual block
                              const isActiveManualBlock = item.id === executionState?.currentManualItem;
                              
                              return (
                                <div key={item.id || itemIndex}>
                                  <div
                                    data-item-id={item.id}
                                    style={{
                                      background: isActiveManualBlock ? '#e8f5e8' : '#f8f4ff',
                                      border: `3px solid ${isActiveManualBlock ? '#4caf50' : '#9c27b0'}`,
                                      borderRadius: '6px',
                                      marginBottom: '6px',
                                      overflow: 'hidden',
                                      boxShadow: isActiveManualBlock ? '0 2px 8px rgba(76, 175, 80, 0.2)' : 'none',
                                      transition: 'all 0.3s ease'
                                    }}
                                  >
                                    {/* Manual Block header */}
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      padding: '8px 12px',
                                      borderBottom: '1px solid #d1c4e9',
                                      background: isActiveManualBlock ? '#c8e6c9' : '#f0ebff'
                                    }}>
                                      <span style={{ 
                                        flex: 1,
                                        color: '#333',
                                        fontWeight: '600',
                                        fontSize: '14px'
                                      }}>
                                        {item.title || 'Manual Block'}
                                      </span>
                                      
                                      <span style={{
                                        fontSize: '10px',
                                        color: '#666',
                                        fontStyle: 'italic',
                                        marginRight: '8px'
                                      }}>
                                        2 items
                                      </span>
                                      
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
                                    
                                    {/* Manual Block sub-items - hardcoded for now */}
                                    <div style={{ padding: '8px 8px 8px 20px' }}>
                                      {/* Manual items from the manual block data */}
                                      {(item.data?.items || []).map((manualItem) => {
                                        const isArmed = executionState?.armedManualItem === manualItem.id || 
                                                       executionState?.armedManualButton === manualItem.id;
                                        const isLive = executionState?.currentManualItem === manualItem.id;
                                        const isPreview = executionState?.previewManualItem === manualItem.id;
                                        
                                        return (
                                          <div 
                                            key={manualItem.id}
                                            onDoubleClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              if (onManualItemDoubleClick) {
                                                onManualItemDoubleClick(manualItem);
                                              }
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
                                              WebkitUserSelect: 'none'
                                            }}
                                            onMouseEnter={(e) => {
                                              if (!isLive && !isPreview && !isArmed) {
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
                                                {manualItem.title}
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
                                                border: '1px solid #ccc',
                                                textTransform: 'uppercase'
                                              }}>
                                                {manualItem.type}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            // Regular item rendering
                            const subtitle = getItemSubtitle(item);
                            
                            return (
                              <div
                                key={item.id || itemIndex}
                                data-item-id={item.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onItemClick(item, segmentIndex, cueIndex, itemIndex);
                                }}
                                onDoubleClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onItemDoubleClick(item);
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
                                  userSelect: 'none',
                                  WebkitUserSelect: 'none'
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
                                  
                                  {/* Automation countdown - positioned before status badge */}
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
    </div>
  );
};

export default RundownList;