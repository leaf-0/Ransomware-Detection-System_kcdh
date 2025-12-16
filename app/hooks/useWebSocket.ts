'use client';

import { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api';

type WebSocketMessage = {
  type: 'new_alert' | 'new_file_event' | 'metrics_update' | 'echo';
  data: any;
};

export function useWebSocket(userEmail: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!userEmail) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const token = apiClient.getToken() || '';
    const wsUrl = `${protocol}//localhost:8000/ws/${encodeURIComponent(userEmail)}${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    const connect = () => {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        setIsConnected(true);
        setConnectionError(null);
        console.log('WebSocket connected');
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          setLastMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onclose = () => {
        setIsConnected(false);
        setConnectionError('Connection closed');
        console.log('WebSocket disconnected');
        // Attempt to reconnect after 3 seconds
        setTimeout(connect, 3000);
      };

      ws.current.onerror = () => {
        console.error('WebSocket error');
        setConnectionError('WebSocket error');
        setIsConnected(false);
      };
    };

    connect();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [userEmail]);

  const sendMessage = (message: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  };

  return { isConnected, lastMessage, sendMessage, connectionError };
}
