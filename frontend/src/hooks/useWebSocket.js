import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for WebSocket connection with auto-reconnect.
 *
 * @param {string} url - WebSocket URL to connect to.
 * @param {object} options
 * @param {function} options.onMessage - Callback when a message is received.
 * @param {number}   options.reconnectInterval - ms between reconnect attempts (default 3000).
 * @param {number}   options.maxRetries - Max reconnect attempts (default 10).
 */
export function useWebSocket(url, { onMessage, reconnectInterval = 3000, maxRetries = 10 } = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const retriesRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  const unmountedRef = useRef(false);

  // Keep onMessage ref current without re-triggering effect
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    if (unmountedRef.current) return;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        retriesRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessageRef.current?.(data);
        } catch {
          // Non-JSON message, ignore
        }
      };

      ws.onerror = () => {
        setError('Connection error');
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;

        // Auto-reconnect
        if (!unmountedRef.current && retriesRef.current < maxRetries) {
          retriesRef.current += 1;
          reconnectTimerRef.current = setTimeout(connect, reconnectInterval);
        }
      };
    } catch (err) {
      setError(err.message);
    }
  }, [url, reconnectInterval, maxRetries]);

  useEffect(() => {
    unmountedRef.current = false;
    connect();

    return () => {
      unmountedRef.current = true;
      clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      if (typeof message === 'string') {
        wsRef.current.send(message);
      } else {
        wsRef.current.send(JSON.stringify(message));
      }
      return true;
    }
    return false;
  }, []);

  return { isConnected, error, sendMessage };
}
