import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";

import { ReelPlaceholder } from "../components/ReelPlaceholder";
import { ToastLayer } from "../components/ToastLayer";
import { KeyboardBar } from "../components/reel/KeyboardBar";
import { TopBar } from "../components/reel/TopBar";
import { RoomUser, UsersPanel } from "../components/reel/UsersPanel";

import { CONFIG } from "../constants/config";
import { useSync } from "../hooks/useSync";
import { useToasts } from "../hooks/useToasts";
import { INJECTED_JS } from "../utils/injected.js";

const READY_TIMEOUT_MS = 8000;
const RELOAD_COOLDOWN_MS = 6000;

function reelId(url: string) {
  const parts = (url || "").split("/reels/");
  if (parts.length < 2) return "";
  return parts[1].replace(/\/$/, "");
}

export default function ReelScreen() {
  const router = useRouter();
  const { room: roomParam, username: usernameParam } = useLocalSearchParams<{
    room: string;
    username: string;
  }>();

  const myName = usernameParam || CONFIG.DEV_USERNAME;
  const myRoom = roomParam || CONFIG.DEV_DEFAULT_ROOM;

  const webviewRef = useRef<WebView>(null);

  // ─── UI state ─────────────────────────────────────────────
  const [input, setInput] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [keyboardVisible, setKeyboardVisible] = useState(true);
  const [usersVisible, setUsersVisible] = useState(false);

  // ─── Animated values ──────────────────────────────────────
  const keyboardFadeAnim = useRef(new Animated.Value(1)).current;
  const usersPanelAnim = useRef(new Animated.Value(0)).current;

  // ─── Room state ───────────────────────────────────────────
  const [roomUsers, setRoomUsers] = useState<string[]>([]);
  const [roomOwner, setRoomOwner] = useState("");
  const [roomController, setRoomController] = useState<string | null>(null);
  const [roomRemote, setRoomRemote] = useState(false);

  // ─── Refs ─────────────────────────────────────────────────
  const hideTimer = useRef<any>(null);
  const syncNavigating = useRef(false);
  const lastSentId = useRef("");
  const pendingTapOnPlay = useRef(false);
  const readyTimer = useRef<any>(null);
  const lastReloadAt = useRef<number>(0);
  const everReceivedReady = useRef(false);

  const { toasts, addToast } = useToasts();

  // ─── Keyboard helpers ─────────────────────────────────────
  const fadeKeyboard = useCallback(
    (show: boolean) => {
      Animated.timing(keyboardFadeAnim, {
        toValue: show ? 1 : 0,
        duration: 280,
        useNativeDriver: true,
      }).start(() => setKeyboardVisible(show));
    },
    [keyboardFadeAnim],
  );

  // ─── Users panel helpers ──────────────────────────────────
  const toggleUsers = useCallback(() => {
    const next = !usersVisible;
    setUsersVisible(next);
    Animated.spring(usersPanelAnim, {
      toValue: next ? 1 : 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  }, [usersVisible, usersPanelAnim]);

  // ─── Placeholder helpers ──────────────────────────────────
  const hidePlaceholder = useCallback(() => {
    clearTimeout(hideTimer.current);
    setShowPlaceholder(false);
  }, []);

  const showPlaceholderSafe = useCallback(() => {
    setShowPlaceholder(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowPlaceholder(false), 6000);
  }, []);

  // ─── Reload guard ─────────────────────────────────────────
  const reloadWebView = useCallback(() => {
    const now = Date.now();
    if (now - lastReloadAt.current < RELOAD_COOLDOWN_MS) return;
    lastReloadAt.current = now;
    webviewRef.current?.reload();
  }, []);

  useEffect(() => {
    readyTimer.current = setTimeout(() => {
      if (!everReceivedReady.current) reloadWebView();
    }, READY_TIMEOUT_MS);
    return () => clearTimeout(readyTimer.current);
  }, []);

  // ─── Sync hook ────────────────────────────────────────────
  const onSyncMessage = useCallback(
    (msg: any) => {
      if (msg.type === "reel_url" || msg.type === "url_change") {
        syncNavigating.current = true;
        lastSentId.current = reelId(msg.url);
        showPlaceholderSafe();
        pendingTapOnPlay.current = true;
        webviewRef.current?.injectJavaScript(
          `window.location.href = '${msg.url}'; true;`,
        );
        setTimeout(() => {
          syncNavigating.current = false;
        }, 3000);
      }
      if (msg.type === "comment") {
        addToast(msg.text, "friend");
      }
    },
    [addToast],
  );

  const { connected, joined, sendUrl, sendComment, transferRemote } = useSync({
    username: myName,
    roomId: myRoom,
    onMessage: onSyncMessage,
    onRoomDeleted: () => router.replace("/entrance"),
    onRoomStateUpdate: (room) => {
      setRoomUsers(room.users || []);
      setRoomOwner(room.owner || "");
      setRoomController(room.controller || null);
      setRoomRemote(room.remote_control || false);
    },
  });

  // ─── WebView messages ─────────────────────────────────────
  const onWebViewMessage = useCallback(
    ({ nativeEvent }: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(nativeEvent.data);

        if (msg.type === "ready") {
          clearTimeout(readyTimer.current);
          everReceivedReady.current = true;
        }

        if (msg.type === "video_playing") {
          hidePlaceholder();
          if (pendingTapOnPlay.current) {
            pendingTapOnPlay.current = false;
            webviewRef.current?.injectJavaScript(
              `if(window.__rwTapOverlay) window.__rwTapOverlay(); true;`,
            );
          }
        }

        if (msg.type === "url_change" && joined) {
          const id = reelId(msg.url);
          if (!syncNavigating.current && id !== lastSentId.current) {
            lastSentId.current = id;
            sendUrl(msg.url);
          }
        }
      } catch {}
    },
    [joined],
  );

  const onNavStateChange = useCallback(
    (navState: any) => {
      if (!navState.url?.includes("/reels/")) return;
      if (!joined || syncNavigating.current) return;
      const id = reelId(navState.url);
      if (!id || id === lastSentId.current) return;
      lastSentId.current = id;
      sendUrl(navState.url);
    },
    [joined],
  );

  // ─── Keyboard input ───────────────────────────────────────
  const handleKey = useCallback((key: string) => {
    if (key === "backspace") {
      setInput((t) => t.slice(0, -1));
    } else {
      setInput((t) => t + key);
    }
  }, []);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    sendComment(text);
    addToast(text, "me");
    setInput("");
  }, [input]);

  // ─── Derived user list for panel ──────────────────────────
  const userList: RoomUser[] = roomUsers.map((name) => ({
    name,
    isMe: name === myName,
    isOwner: name === roomOwner,
    isController: name === roomController && roomRemote,
  }));

  // ══════════════════════════════════════════════════════════
  return (
    <View style={styles.container}>
      {/* WebView — always at the very bottom */}
      <WebView
        ref={webviewRef}
        source={{ uri: CONFIG.START_URL }}
        style={StyleSheet.absoluteFillObject}
        injectedJavaScript={INJECTED_JS}
        injectedJavaScriptBeforeContentLoaded={INJECTED_JS}
        onMessage={onWebViewMessage}
        onLoad={() => {
          setLoaded(true);
          setTimeout(hidePlaceholder, 1500);
        }}
        onNavigationStateChange={onNavStateChange}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
      />

      {/*
        Placeholder sits above WebView (zIndex 5)
        but BELOW all UI controls (zIndex 10+).
        When video starts playing hidePlaceholder() removes it.
      */}
      <ReelPlaceholder visible={showPlaceholder} />

      {/* All UI controls — always rendered above placeholder */}
      {loaded && (
        <View style={styles.overlay} pointerEvents="box-none">
          <TopBar
            connected={connected}
            joined={joined}
            usersCount={roomUsers.length}
            usersVisible={usersVisible}
            onBack={() => router.replace("/entrance")}
            onToggleUsers={toggleUsers}
          />

          <UsersPanel
            visible={usersVisible}
            panelAnim={usersPanelAnim}
            roomId={myRoom}
            isRemote={roomRemote}
            amController={myName === roomController}
            users={userList}
            onClose={toggleUsers}
            onTransferRemote={(name) => {
              transferRemote(name);
              toggleUsers();
            }}
          />

          <ToastLayer toasts={toasts} />

          <KeyboardBar
            input={input}
            fadeAnim={keyboardFadeAnim}
            visible={keyboardVisible}
            onKeyPress={handleKey}
            onSend={handleSend}
            onDismiss={() => fadeKeyboard(false)}
            onShow={() => fadeKeyboard(true)}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  // zIndex 20 — sits above ReelPlaceholder (which defaults to ~zIndex 1)
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    pointerEvents: "box-none",
  } as any,
});
