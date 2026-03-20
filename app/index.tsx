import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";

import CustomKeyboard from "@/components/CustomKeyboard";
import { ReelPlaceholder } from "../components/ReelPlaceholder";
import { StatusDot } from "../components/StatusDot";
import { ToastLayer } from "../components/ToastLayer";
import { CONFIG } from "../constants/config";
import { useAuth } from "../hooks/useAuth";
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
  const webviewRef = useRef<WebView>(null);

  const [input, setInput] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(true);

  // Keyboard visibility state
  const [keyboardVisible, setKeyboardVisible] = useState(true);
  const keyboardFadeAnim = useRef(new Animated.Value(1)).current;

  const hideTimer = useRef<any>(null);
  const syncNavigating = useRef(false);
  const lastSentId = useRef("");
  const pendingTapOnPlay = useRef(false);

  const readyTimer = useRef<any>(null);
  const lastReloadAt = useRef<number>(0);
  const everReceivedReady = useRef(false);

  const { authState, onLoggedOut, onLoginComplete } = useAuth();
  const { toasts, addToast } = useToasts();

  // Keyboard fade animation
  const fadeKeyboard = useCallback(
    (show: boolean) => {
      Animated.timing(keyboardFadeAnim, {
        toValue: show ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setKeyboardVisible(show));
    },
    [keyboardFadeAnim],
  );

  const hideKeyboard = useCallback(() => fadeKeyboard(false), [fadeKeyboard]);
  const showKeyboard = useCallback(() => fadeKeyboard(true), [fadeKeyboard]);

  /* ───────── reload guard ───────── */
  const reloadWebView = useCallback((reason: string) => {
    const now = Date.now();
    if (now - lastReloadAt.current < RELOAD_COOLDOWN_MS) return;
    lastReloadAt.current = now;
    webviewRef.current?.reload();
  }, []);

  /* ───────── watchdog ───────── */
  useEffect(() => {
    readyTimer.current = setTimeout(() => {
      if (!everReceivedReady.current) {
        reloadWebView("no ready");
      }
    }, READY_TIMEOUT_MS);

    return () => clearTimeout(readyTimer.current);
  }, []);

  const hidePlaceholder = useCallback(() => {
    clearTimeout(hideTimer.current);
    setShowPlaceholder(false);
  }, []);

  const showPlaceholderSafe = useCallback(() => {
    setShowPlaceholder(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowPlaceholder(false), 6000);
  }, []);

  /* ───────── sync ───────── */
  const onSyncMessage = useCallback(
    (msg: any) => {
      if (msg.type === "url_change") {
        const id = reelId(msg.url);
        syncNavigating.current = true;
        lastSentId.current = id;
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

  const { connected, sendUrl, sendComment } = useSync({
    onMessage: onSyncMessage,
  });

  /* ───────── webview messages ───────── */
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

        if (msg.type === "auth") {
          if (msg.status === "logged_out") {
            onLoggedOut();
          } else {
            onLoginComplete();
          }
        }

        if (msg.type === "url_change" && authState === "logged_in") {
          const id = reelId(msg.url);
          if (!syncNavigating.current && id !== lastSentId.current) {
            lastSentId.current = id;
            sendUrl(msg.url);
          }
        }
      } catch {}
    },
    [authState],
  );

  const onNavStateChange = useCallback(
    (navState: any) => {
      if (!navState.url?.includes("/reels/")) return;
      if (authState !== "logged_in") return;
      if (syncNavigating.current) return;

      const id = reelId(navState.url);
      if (!id || id === lastSentId.current) return;

      lastSentId.current = id;
      sendUrl(navState.url);
    },
    [authState],
  );

  /* ───────── keyboard input ───────── */
  const handleKey = (key: string) => {
    if (key === "backspace") {
      setInput((t) => t.slice(0, -1));
      return;
    }
    setInput((t) => t + key);
  };

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;

    sendComment(text);
    addToast(text, "me");
    setInput("");
  }, [input]);

  /* ───────── UI ───────── */
  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        source={{ uri: CONFIG.START_URL }}
        style={styles.webview}
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

      <ReelPlaceholder visible={showPlaceholder} />

      {authState === "logged_in" && loaded && (
        <View style={styles.overlays} pointerEvents="box-none">
          <StatusDot connected={connected} />
          <ToastLayer toasts={toasts} />

          {/* Overlay to hide keyboard when tapping outside (only when keyboard is visible) */}
          {keyboardVisible && (
            <TouchableOpacity
              style={styles.keyboardOverlay}
              onPress={hideKeyboard}
              activeOpacity={1}
            />
          )}

          {/* Bottom panel – appears only when keyboard is hidden */}
          {!keyboardVisible && (
            <TouchableOpacity
              style={styles.panel}
              onPress={showKeyboard}
              activeOpacity={0.9}
            />
          )}

          {/* Keyboard container with fade animation */}
          <Animated.View
            style={[
              styles.wrapper,
              {
                opacity: keyboardFadeAnim,
                transform: [
                  {
                    translateY: keyboardFadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                ],
              },
            ]}
            pointerEvents={keyboardVisible ? "auto" : "none"}
          >
            <View style={styles.inputBar}>
              <TextInput
                value={input}
                style={styles.input}
                placeholder="Say something…"
                placeholderTextColor="rgba(255,255,255,0.5)"
                editable={false}
              />
              <TouchableOpacity onPress={handleSend} style={styles.sendBtn}>
                <Text style={styles.sendText}>Send</Text>
              </TouchableOpacity>
            </View>

            <CustomKeyboard onKeyPress={handleKey} />
          </Animated.View>
        </View>
      )}
    </View>
  );
}

/* ───────── styles ───────── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingTop:
      Platform.OS === "android" ? (RNStatusBar.currentHeight ?? 0) : 0,
  },
  webview: { flex: 1 },
  overlays: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99,
    pointerEvents: "box-none",
  },
  keyboardOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    zIndex: 50,
  },
  panel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "15%", // 15% of screen height
    backgroundColor: "transparent",
    zIndex: 100,
  },
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 200,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
  },
  sendBtn: {
    marginLeft: 10,
    backgroundColor: "#007aff",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  sendText: {
    color: "#fff",
    fontSize: 15,
  },
});
