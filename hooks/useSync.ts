import { useCallback, useEffect, useRef, useState } from "react";
import { CONFIG } from "../constants/config";

type UseSyncOptions = {
  username: string;
  roomId: string;
  onMessage: (msg: any) => void;
  onRoomDeleted?: () => void;
  onRemoteTransferred?: (from: string, to: string) => void;
  onRoomStateUpdate?: (room: any) => void;
};

export function useSync({
  username,
  roomId,
  onMessage,
  onRoomDeleted,
  onRemoteTransferred,
  onRoomStateUpdate,
}: UseSyncOptions) {
  const [connected, setConnected] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [joined, setJoined] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<any>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current || !username || !roomId) return;

    try {
      const protocol = CONFIG.SERVER_PORT === 443 ? "wss" : "ws";
      const ws = new WebSocket(
        `${protocol}://${CONFIG.SERVER_IP}:${CONFIG.SERVER_PORT}`,
      );
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setConnected(true);
        ws.send(JSON.stringify({ type: "register", name: username }));
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setConnected(false);
        setRegistered(false);
        setJoined(false);
        reconnectTimer.current = setTimeout(() => {
          if (mountedRef.current) connect();
        }, 3000);
      };

      ws.onerror = () => {};

      ws.onmessage = (e) => {
        if (!mountedRef.current) return;
        try {
          const msg = JSON.parse(e.data);

          if (msg.type === "registered") {
            setRegistered(true);
            // Immediately join the room after registering
            ws.send(JSON.stringify({ type: "join", room: roomId }));
          }

          if (msg.type === "joined") {
            setJoined(true);
          }

          if (msg.type === "room_state") {
            onRoomStateUpdate?.(msg.room);
          }

          if (msg.type === "room_deleted") {
            setJoined(false);
            onRoomDeleted?.();
          }

          if (msg.type === "remote_transferred") {
            onRemoteTransferred?.(msg.from, msg.to);
          }

          // Forward reel sync messages and comments to the screen
          if (
            msg.type === "url_change" ||
            msg.type === "reel_url" ||
            msg.type === "url" ||
            msg.type === "comment"
          ) {
            onMessage(msg);
          }
        } catch {}
      };
    } catch {}
  }, [username, roomId]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [username, roomId]);

  const sendUrl = useCallback((url: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "reel_url", url }));
    }
  }, []);

  const sendComment = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "comment", text }));
    }
  }, []);

  const transferRemote = useCallback((toName: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: "transfer_remote", to: toName }),
      );
    }
  }, []);

  return {
    connected,
    registered,
    joined,
    sendUrl,
    sendComment,
    transferRemote,
  };
}
