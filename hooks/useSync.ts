// Manages WebSocket connection, sends/receives URL + comment events.
// Returns helpers the screen uses to send and a callback for incoming messages.

import { useEffect, useRef, useState, useCallback } from 'react';
import { CONFIG } from '../constants/config';

export type SyncMessage =
  | { type: 'url_change'; url: string }
  | { type: 'comment';    text: string; sender: 'friend' };

type Props = {
  onMessage: (msg: SyncMessage) => void;
};

export function useSync({ onMessage }: Props) {
  const wsRef     = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(`ws://${CONFIG.SERVER_IP}:${CONFIG.SERVER_PORT}`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', room: CONFIG.ROOM }));
      setConnected(true);
    };

    ws.onmessage = ({ data }) => {
      try {
        const msg = JSON.parse(data);

        if (msg.type === 'url')     onMessage({ type: 'url_change', url: msg.url });
        if (msg.type === 'comment') onMessage({ type: 'comment', text: msg.text, sender: 'friend' });
      } catch {}
    };

    ws.onerror  = () => setConnected(false);
    ws.onclose  = () => setConnected(false);

    return () => ws.close();
  }, []);

  const sendUrl = useCallback((url: string) => {
    wsRef.current?.readyState === 1 &&
      wsRef.current.send(JSON.stringify({ type: 'url', url, room: CONFIG.ROOM }));
  }, []);

  const sendComment = useCallback((text: string) => {
    wsRef.current?.readyState === 1 &&
      wsRef.current.send(JSON.stringify({ type: 'comment', text, room: CONFIG.ROOM }));
  }, []);

  return { connected, sendUrl, sendComment };
}
