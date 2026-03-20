import { useCallback, useRef, useState } from "react";
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

  // Track whether WE triggered the navigation (so we don't echo it back)
  const syncNavigating = useRef(false);
  // Last URL we sent to server (don't re-send what we just received)
  const lastSentId = useRef("");

  const { authState, onLoggedOut, onLoginComplete } = useAuth();
  const { toasts, addToast } = useToasts();

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
        // Mark that WE are triggering this navigation — don't echo back
        syncNavigating.current = true;
        lastSentId.current = id;
        showPlaceholderSafe();
        webviewRef.current?.injectJavaScript(
          `window.location.href = '${msg.url}'; true;`,
        );
        // Clear flag after navigation settles
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

        if (msg.type === "video_playing") {
          hidePlaceholder();
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

        // url_change from injected JS — only send if WE scrolled (not a sync nav)
        if (msg.type === "url_change" && authState === "logged_in") {
          const id = reelId(msg.url);
          if (!syncNavigating.current && id && id !== lastSentId.current) {
            lastSentId.current = id;
            sendUrl(msg.url);
          }
        }
      } catch {}
    },
    [authState, onLoggedOut, onLoginComplete, sendUrl, hidePlaceholder],
  );

  // onNavigationStateChange — Android reliable URL tracking
  const onNavStateChange = useCallback(
    (navState: any) => {
      if (!navState.url?.includes("/reels/")) return;
      if (authState !== "logged_in") return;
      // Skip if we triggered this navigation from a sync message
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
