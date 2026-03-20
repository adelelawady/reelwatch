import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StatusBar as RNStatusBar,
  StyleSheet,
  View,
} from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";

import { ChatBar } from "../components/ChatBar";
import { StatusDot } from "../components/StatusDot";
import { ToastLayer } from "../components/ToastLayer";
import { CONFIG } from "../constants/config";
import { useAuth } from "../hooks/useAuth";
import { useSync } from "../hooks/useSync";
import { useToasts } from "../hooks/useToasts";
import { INJECTED_JS } from "../utils/injected.js";

export default function ReelScreen() {
  const webviewRef = useRef<WebView>(null);
  const [input, setInput] = useState("");
  const [loaded, setLoaded] = useState(false);

  const { authState, onLoggedOut, onLoginComplete } = useAuth();
  const { toasts, addToast } = useToasts();

  const onSyncMessage = useCallback(
    (msg: any) => {
      if (msg.type === "url_change") {
        webviewRef.current?.injectJavaScript(
          `window.location.href = '${msg.url}'; true;`,
        );
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

  const onWebViewMessage = useCallback(
    ({ nativeEvent }: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(nativeEvent.data);

        if (msg.type === "auth") {
          if (msg.status === "logged_out") {
            onLoggedOut();
          } else if (msg.status === "logged_in") {
            onLoginComplete();
            // if we just logged in, navigate to reels
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
          sendUrl(msg.url);
        }
      } catch {}
    },
    [authState, onLoggedOut, onLoginComplete, sendUrl],
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
        onLoad={() => setLoaded(true)}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        userAgent="Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
      />

      {/* Black splash while WebView loads — hides flash of unstyled Instagram */}
      {!loaded && (
        <View style={styles.splash}>
          <ActivityIndicator color="#fff" size="small" />
        </View>
      )}

      {/* Overlays — zIndex 99 puts them above everything Instagram renders */}
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
  // covers WebView while loading — prevents flash of Instagram chrome
  splash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },
  // wrapper for all our overlays — sits above WebView and Instagram's own UI
  overlays: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99,
    pointerEvents: "box-none",
  },
});
