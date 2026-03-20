import { useCallback, useEffect, useRef, useState } from "react";
import {
  Platform,
  StatusBar as RNStatusBar,
  StyleSheet,
  View,
} from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";

import { ChatBar } from "../components/ChatBar";
import { ReelPlaceholder } from "../components/ReelPlaceholder";
import { StatusDot } from "../components/StatusDot";
import { ToastLayer } from "../components/ToastLayer";
import { CONFIG } from "../constants/config";
import { useAuth } from "../hooks/useAuth";
import { useSync } from "../hooks/useSync";
import { useToasts } from "../hooks/useToasts";
import { INJECTED_JS } from "../utils/injected.js";

// How long to wait for the very first 'ready' after the component mounts.
const READY_TIMEOUT_MS = 8_000;

// Minimum gap between reloads to prevent thrash.
const RELOAD_COOLDOWN_MS = 6_000;

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
  const hideTimer = useRef<any>(null);

  const syncNavigating = useRef(false);
  const lastSentId = useRef("");

  // When the server sends us to a new reel, we set this flag.
  // The next video_playing event will fire a tap on the overlay so
  // mute state is toggled via a real gesture (required by the browser).
  const pendingTapOnPlay = useRef(false);

  // ── watchdog ─────────────────────────────────────────────────────
  const readyTimer = useRef<any>(null);
  const lastReloadAt = useRef<number>(0);
  const everReceivedReady = useRef(false);

  const { authState, onLoggedOut, onLoginComplete } = useAuth();
  const { toasts, addToast } = useToasts();

  // ── throttled reload ─────────────────────────────────────────────
  const reloadWebView = useCallback((reason: string) => {
    const now = Date.now();
    if (now - lastReloadAt.current < RELOAD_COOLDOWN_MS) return;
    lastReloadAt.current = now;
    console.warn("[ReelScreen] reloading WebView:", reason);
    webviewRef.current?.reload();
  }, []);

  // ── arm watchdog ONCE on mount ───────────────────────────────────
  useEffect(() => {
    readyTimer.current = setTimeout(() => {
      if (!everReceivedReady.current) {
        reloadWebView("watchdog: 'ready' never received on first load");
      }
    }, READY_TIMEOUT_MS);

    return () => clearTimeout(readyTimer.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ────────────────────────────────────────────────────────────────

  const hidePlaceholder = useCallback(() => {
    clearTimeout(hideTimer.current);
    setShowPlaceholder(false);
  }, []);

  const showPlaceholderSafe = useCallback(() => {
    setShowPlaceholder(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowPlaceholder(false), 6000);
  }, []);

  const onSyncMessage = useCallback(
    (msg: any) => {
      if (msg.type === "url_change") {
        const id = reelId(msg.url);
        syncNavigating.current = true;
        lastSentId.current = id;
        showPlaceholderSafe();

        // Mark that the next video_playing should trigger an overlay tap
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
    [addToast, showPlaceholderSafe],
  );

  const { connected, sendUrl, sendComment } = useSync({
    onMessage: onSyncMessage,
  });

  const onWebViewMessage = useCallback(
    ({ nativeEvent }: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(nativeEvent.data);

        // ── startup signals ────────────────────────────────────────
        if (msg.type === "ready") {
          clearTimeout(readyTimer.current);
          everReceivedReady.current = true;
        }

        if (msg.type === "inject_error") {
          if (!everReceivedReady.current) {
            clearTimeout(readyTimer.current);
            console.warn(
              "[inject_error]",
              msg.msg,
              msg.src ? `${msg.src}:${msg.line}` : "",
            );
            reloadWebView(`inject_error: ${msg.msg}`);
          }
          return;
        }

        // ── normal messages ────────────────────────────────────────
        if (msg.type === "video_playing") {
          hidePlaceholder();

          // If this play event followed a server-driven navigation,
          // fire a tap on the overlay. This is the only browser-approved
          // way to toggle mute — programmatic v.muted=false is blocked
          // without a user gesture. The tap counts as one.
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
          } else if (msg.status === "logged_in") {
            onLoginComplete();
            if (authState === "logged_out") {
              setTimeout(() => {
                webviewRef.current?.injectJavaScript(
                  `window.location.href = '${CONFIG.START_URL}'; true;`,
                );
              }, 300);
            }
          }
        }

        if (msg.type === "url_change" && authState === "logged_in") {
          const id = reelId(msg.url);
          if (!syncNavigating.current && id && id !== lastSentId.current) {
            lastSentId.current = id;
            sendUrl(msg.url);
          }
        }
      } catch {}
    },
    [
      authState,
      onLoggedOut,
      onLoginComplete,
      sendUrl,
      hidePlaceholder,
      reloadWebView,
    ],
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
    [authState, sendUrl],
  );

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    sendComment(text);
    addToast(text, "me");
    setInput("");
  }, [input, sendComment, addToast]);

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
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        userAgent="Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
      />

      <ReelPlaceholder visible={showPlaceholder} />

      {authState === "logged_in" && loaded && (
        <View style={styles.overlays} pointerEvents="box-none">
          <StatusDot connected={connected} />
          <ToastLayer toasts={toasts} />
          <ChatBar value={input} onChange={setInput} onSend={handleSend} />
        </View>
      )}
    </View>
  );
}

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
});
