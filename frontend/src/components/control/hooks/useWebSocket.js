import { useState, useEffect, useCallback } from 'react';

const useWebSocket = (onControlAction) => {
  const [ws, setWs] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?control=true`;
    
    const websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      setWs(websocket);
      setIsConnected(true);
    };
    
    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'CONTROL_ACTION' && data.button && onControlAction) {
          onControlAction(data.button);
        }
      } catch (error) {
        // Silently ignore parse errors
      }
    };
    
    websocket.onerror = (error) => {
      // Silently handle errors
    };
    
    websocket.onclose = () => {
      setWs(null);
      setIsConnected(false);
    };
    
    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
    };
  }, [onControlAction]);
  
  const sendMessage = useCallback((message) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, [ws]);
  
  return { isConnected, sendMessage };
};

export default useWebSocket;