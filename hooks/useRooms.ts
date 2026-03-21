import { useCallback, useEffect, useRef, useState } from "react";
import { CONFIG } from "../constants/config";

export type RoomInfo = {
  id: string;
  owner: string;
  remote_control: boolean;
  controller: string | null;
  users: string[];
  user_count: number;
  current_reel: string;
};

type UseRoomsOptions = {
  username: string;
  onJoined: (roomId: string) => void;
  onRoomDeleted?: (reason: string) => void;
  onRemoteTransferred?: (from: string, to: string) => void;
  onError: (msg: string) => void;
};

export function useRooms({
  username,
  onJoined,
  onRoomDeleted,
  onRemoteTransferred,
  onError,
}: UseRoomsOptions) {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [currentRoom, setCurrentRoom] = useState<RoomInfo | null>(null);
  const [connected, setConnected] = useState(false);
  const [registered, setRegistered] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<any>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!username || !mountedRef.current) return;

    try {
      const ws = new WebSocket(
        `ws://${CONFIG.SERVER_IP}:${CONFIG.SERVER_PORT}`,
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
        // Auto-reconnect after 3s
        reconnectTimer.current = setTimeout(() => {
          if (mountedRef.current) connect();
        }, 3000);
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        onError("Cannot reach server. Check SERVER_IP in config.");
      };

      ws.onmessage = (e) => {
        if (!mountedRef.current) return;
        try {
          const msg = JSON.parse(e.data);

          if (msg.type === "registered") {
            setRegistered(true);
          }

          if (msg.type === "rooms_list") {
            setRooms(msg.rooms || []);
          }

          if (msg.type === "room_state") {
            setCurrentRoom(msg.room);
          }

          if (msg.type === "room_created") {
            // After creating, auto-join
            ws.send(JSON.stringify({ type: "join", room: msg.room }));
          }

          if (msg.type === "joined") {
            onJoined(msg.room);
          }

          if (msg.type === "room_deleted") {
            setCurrentRoom(null);
            onRoomDeleted?.(msg.reason || "Room was deleted.");
          }

          if (msg.type === "remote_transferred") {
            onRemoteTransferred?.(msg.from, msg.to);
            // Also update currentRoom controller locally
            setCurrentRoom((prev) =>
              prev ? { ...prev, controller: msg.to } : prev,
            );
          }

          if (msg.type === "error") {
            onError(msg.msg || "Server error");
          }
        } catch {}
      };
    } catch {
      onError("Failed to connect to server.");
    }
  }, [username]);

  useEffect(() => {
    mountedRef.current = true;
    if (username) connect();
    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [username]);

  const createRoom = useCallback((roomId: string, remoteControl: boolean) => {
    wsRef.current?.send(
      JSON.stringify({
        type: "create_room",
        room: roomId,
        remote_control: remoteControl,
      }),
    );
  }, []);

  const joinRoom = useCallback((roomId: string) => {
    wsRef.current?.send(JSON.stringify({ type: "join", room: roomId }));
  }, []);

  const leaveRoom = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: "leave" }));
    setCurrentRoom(null);
  }, []);

  const deleteRoom = useCallback((roomId: string) => {
    wsRef.current?.send(JSON.stringify({ type: "delete_room", room: roomId }));
  }, []);

  const transferRemote = useCallback((toName: string) => {
    wsRef.current?.send(
      JSON.stringify({ type: "transfer_remote", to: toName }),
    );
  }, []);

  const refreshRooms = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: "list_rooms" }));
  }, []);

  return {
    rooms,
    currentRoom,
    connected,
    registered,
    createRoom,
    joinRoom,
    leaveRoom,
    deleteRoom,
    transferRemote,
    refreshRooms,
  };
}
