'use client';

import { useEffect, useRef, useState } from 'react';

type WebSocketMessage = {
  type: 'new_alert' | 'new_file_event' | 'metrics_update' | 'echo';
  data: any;
};

export function useWebSocket(userEmail: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  const connect = () => {
    if (!userEmail) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//localhost:8001/ws/${userEmail}`;

    try {
      ws.current = new WebSocket(wsUrl);
      console.log(`[WebSocket] onopen. userEmail: ${userEmail}`);

      ws.current.onopen = () => {
        setIsConnected(true);
        setConnectionError(null);
        console.log('WebSocket connected');
      };

      ws.current.onmessage = (event) => {
        console.log(`[WebSocket] onmessage. event.data: ${event.data}`);
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          console.log(`[WebSocket] Received message`);
          setLastMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        setIsConnected(false);
        console.log(`WebSocket closed with code: ${event.code}, reason: ${event.reason}`);
        
        // Don't reconnect if it was a normal closure
        if (event.code === 1000) {
          console.log('WebSocket closed normally');
          return;
        }

        // Attempt to reconnect after 3 seconds
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
        }
        reconnectTimeout.current = setTimeout(() => {
          console.log('Attempting to reconnect WebSocket...');
          connect();
        }, 3000);
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        setConnectionError('Connection error. Attempting to reconnect...');
        
        // Close the current connection to trigger reconnection
        if (ws.current) {
          ws.current.close();
        }
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionError('Failed to connect to server');
      
      // Retry connection after 5 seconds
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      reconnectTimeout.current = setTimeout(() => {
        connect();
      }, 5000);
    }
  };

  useEffect(() => {
    if (!userEmail) return;

    connect();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close(1000, 'Component unmounted');
      }
    };
  }, [userEmail]);

  const sendMessage = (message: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
      }
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
    }
  };

  return { isConnected, lastMessage, sendMessage, connectionError };
}
