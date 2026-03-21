import { Audio } from "expo-av"; // npx expo install expo-av
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
  useWindowDimensions,
} from "react-native";

// ─────────────────────────────────────────────────────────────
//  YOUR SOUND — embedded directly from your uploaded sound.wav
//  Processed to: mono · 22 050 Hz · 16-bit · 30 ms (trimmed)
// ─────────────────────────────────────────────────────────────
const KEY_CLICK_WAV_B64 =
  "UklGRlgFAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YTQFAAD4/17xcvoECAspli+uMGUW3QSy3+3XKecs6N0AWwY/CRcBtQi5FMQN+BkbCygDxvfb7Wbjr9jg7dzwpQDxCFIMJxJ6EokXhAUaBwIIkAYhCfIAEv598Z/y0+l+4s7qk+7z+1wAMw1FEvgY0B6lEXcNuwUoBtj+0fjJ863qyPD67ajuB+/39ez++AIFDvsOtBXDF4QT1QyXBBoEefrj9anuZ+q37lvxDfYH9Yj9EASnCV4P7w15EDgPYQ/jB/8A4v3j9qL0EO/N7tfwUPaB+yX8lwK8BvsMXw7CDJsLKQnXCQkDnP1o+Dj1lPTZ8UPzCfSD+mr/bAJgBgAJhQ12DBUL5wYeBGsDwf7i+rH1RPWH9Sr2uPfH+HP+iwKTBq8H0QjLCqsJiwjAAxQB5f5k/Fz5MPVa9UT2Tvmh+zb+8AFwBeUI7AfIB10H5AZuBT0BNP7n+uL5a/gI93L3iPlM/VL//wGjA0MGIwj9BpIFhANrA/gB4/9d/ar6OPpy+bb57fnu+yH/VgFbA7kDVAVSBvUFWAQNAmEB9v+c/lj8fvoj+or67vvf/M/+uwAhAwYEkgMlBFQEawSSApQAMv8J/oj9FPyD+0L7W/wS/m7/WAG+AjIEzwOqApsBAQFRAaAA9f/Y/jL+0/1b/WT9W/1u/ob/AwD5ACECWANpA9sCgQFAACb/K/6f/YL98P14/hr/IwAxAesBIQK+AesA+P85/9H+xf76/l3/0f9EAGkUN+tPFV1HyzFSU5oKd9f0jcmfgLwQ+xZXQ2mIa1s2NwqbwVCtpJ4isOri6QQRMf1N9FyuQPYucQa40Q21MaULqgrEAfkGI7RULWpiXVpAdA0JzLKdi5RDmvrFVAlmQjJp8HTfWPkg/OVxqNCKyZWOuQXzpjmEZ5Nx/mInMa/soLQdkkaNJ7DA6PcjE1vqckJkeD5MBq/FnZ1ilQumxtQzEsZDTmKuZRdG9xRI4Tay5Z3RqhnL3fpvMHFRoFheSosjePHryAKvC6xtxcXsMhfPPiVRqEjOL4AIUduFvQ+0Sr2v3KgGjirMQ6FJiDYLFhbxW80ku9y/kdPZ9HQb3TUnQCE6eSC+/QvfScgWwvnQBOu6CQIoJTj+NQknGww37EbV8cpIzifiKv4XGKssCjTuKXoVo/sE4YDRYNF/3OHy7w35IRss1CrgGpkDf+2j2xbVBt1g7XgCFxibJKElVx3QC073yeXz3Jfd5umx+/EMcxs7IQkcKhAeACTv0+RD433oVfUcBVER7BjKGQASowXu+LztUejJ6mvysf0tCkkS8BR1EsQJ5f0D9KHtiOwy8lH7AgV8DS8RUw/UCZsBgPiY8gLxPvO0+ewBbAilDAoNIgn9ArH8TPfZ9O31aPnA/mAEFQh9CXsIuwSV/xv7Gfhy97f5U/2LAUoFIwfKBtEEdwGV/cT6nvkh+pL87P/yAhUFqgVuBA8CUv/C/EL7R/t9/Lb+UAFMA0wEKASvAmYAPP6g/AH8rfw3/iMACAItA1YDrAI7AV3/2f0I/f/87P1v//UALwK7AmcCdwEoAMf+1v2X/fj99v5CAF8BDQIoApQBiwBu/4L+Df40/tb+xv/EAHUBswF+AdYA7P8Y/5D+cf7N/n//RwD1AFEBRQHiAEIAi/8C/8r+6f5Z//j/jQDyAA8B2ABmANn/Xv8X/xf/WP/G/0AAoADQAMQAfAARAKT/Wf9A/17/q/8LAGQAmQCgAHoAMQDb/5L/bv9z/6H/6v8zAGkAfgBtAD0A/f/A/5j/kP+m/9b/DwA=";

// ─────────────────────────────────────────────────────────────
//  Keyboard layouts
// ─────────────────────────────────────────────────────────────
const enKeys = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["shift", "z", "x", "c", "v", "b", "n", "m", "back"],
  ["mode", "space", "return"],
];

const arKeys = [
  ["ض", "ص", "ث", "ق", "ف", "غ", "ع", "ه", "خ", "ح", "ج"],
  ["ش", "س", "ي", "ب", "ل", "ا", "ت", "ن", "م", "ك", "ة"],
  ["ء", "ظ", "ط", "ذ", "د", "ز", "ر", "و", "ي", "back"],
  ["mode", "space", "return"],
];

const emojiKeys = [
  ["😀", "😁", "😂", "🤣", "😃", "😄", "😅", "😆", "😉", "😊"],
  ["😍", "🥰", "😘", "😗", "😙", "😚", "🙂", "🤗", "🤩", "🤔"],
  ["😐", "😑", "😶", "🙄", "😏", "😣", "😥", "😮", "back"],
  ["mode", "space", "return"],
];

// ─────────────────────────────────────────────────────────────
//  Global toggles
// ─────────────────────────────────────────────────────────────
let VIBRATION_ENABLED = false;
let SOUND_ENABLED = true;

// Popup size constants — must match styles.popup dimensions exactly
// so we can centre/place it without a layout pass.
const POPUP_WIDTH = 60; // minWidth in style
const POPUP_HEIGHT = 56; // paddingVertical(8*2) + ~40px for large text
const POPUP_GAP = 6; // gap between top of key and bottom of popup

type KeyboardMode = "en" | "ar" | "emoji";

// ─────────────────────────────────────────────────────────────
//  FIX 1 & 2 — Sound: quieter (0.4) + fire-and-forget replayAsync
//  replayAsync() is a single atomic RN call — no double-await,
//  no blocking the JS thread, safe for rapid repeated taps.
// ─────────────────────────────────────────────────────────────
const useKeyClickSound = () => {
  const soundRef = useRef<Audio.Sound | null>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true, // plays even on silent mode (iOS)
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });

        const { sound } = await Audio.Sound.createAsync(
          { uri: `data:audio/wav;base64,${KEY_CLICK_WAV_B64}` },
          { volume: 0.4 }, // FIX 1: reduced from 0.8 → quieter click
        );

        if (alive) {
          soundRef.current = sound;
          readyRef.current = true;
        }
      } catch (err) {
        console.warn("[KeyClick] load failed:", err);
      }
    })();

    return () => {
      alive = false;
      soundRef.current?.unloadAsync();
    };
  }, []);

  // FIX 2: fire-and-forget — never awaited, never blocks typing
  const playClick = useCallback(() => {
    if (!SOUND_ENABLED || !readyRef.current || !soundRef.current) return;
    // replayAsync = seek-to-0 + play in one native call, no double await
    soundRef.current.replayAsync().catch(() => {
      // Silently swallow errors (backgrounded app, audio interruption, etc.)
    });
  }, []);

  return { playClick };
};

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────
const getKeyLabel = (key: string, mode: KeyboardMode, shifted: boolean) => {
  if (key === "shift") return shifted ? "⇪" : "⇧";
  if (key === "back") return "⌫";
  if (key === "mode") return "🌐";
  if (key === "space") return "";
  if (key === "return") return "return";
  if (mode === "en" && shifted && /[a-zA-Z]/.test(key))
    return key.toUpperCase();
  return key;
};

const getKeyFlex = (key: string) => {
  if (key === "space") return 4;
  if (["shift", "back", "mode", "return"].includes(key)) return 1.2;
  return 1;
};

// ─────────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────────
const CustomKeyboard = ({
  onKeyPress,
}: {
  onKeyPress: (key: string) => void;
}) => {
  const [mode, setMode] = useState<KeyboardMode>("en");
  const [isShift, setShift] = useState(false);
  const { width: screenWidth } = useWindowDimensions();

  // FIX 3: one ref per key → holds the TouchableOpacity node for .measure()
  // .measure() returns coords relative to the RN root view, not the parent row.
  const keyRefs = useRef<Map<string, any>>(new Map());

  // Ref to the keyboard container View — used as the measureInWindow anchor.
  const containerRef = useRef<View>(null);

  const [popupVisible, setPopupVisible] = useState(false);
  const [popupText, setPopupText] = useState("");
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fontSize = Math.min(Math.max(screenWidth / 20, 16), 24);
  const layout = mode === "en" ? enKeys : mode === "ar" ? arKeys : emojiKeys;

  const { playClick } = useKeyClickSound();

  // ── Popup ──────────────────────────────────────────────────
  // FIX 3: Use measureInWindow on each key ref.
  // measureInWindow gives absolute screen coords, then we subtract the
  // container's own screen origin so the popup sits inside the container
  // with position: 'absolute' — exactly like iOS keyboard popups.
  const showPopup = useCallback(
    (text: string, key: string) => {
      const keyNode = keyRefs.current.get(key);
      const containerNode = containerRef.current;
      if (!keyNode || !containerNode) return;

      if (hideTimeout.current) clearTimeout(hideTimeout.current);

      // Get absolute screen position of the key
      keyNode.measureInWindow(
        (kx: number, ky: number, kw: number, _kh: number) => {
          // Get absolute screen position of our container
          containerNode.measureInWindow(
            (cx: number, cy: number, _cw: number, _ch: number) => {
              // Convert to coords relative to container
              const relX = kx - cx;
              const relY = ky - cy;

              // Centre the popup above the key, clamped to [4, screenWidth-POPUP_WIDTH-4]
              const left = Math.min(
                Math.max(relX + kw / 2 - POPUP_WIDTH / 2, 4),
                screenWidth - POPUP_WIDTH - 4,
              );
              // Place popup fully above the key with a small gap
              const top = relY - POPUP_HEIGHT - POPUP_GAP;

              setPopupPosition({ top, left });
              setPopupText(text);
              setPopupVisible(true);
            },
          );
        },
      );
    },
    [screenWidth],
  );

  const scheduleHidePopup = useCallback(() => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => setPopupVisible(false), 180);
  }, []);

  // ── Key press ──────────────────────────────────────────────
  const handlePress = useCallback(
    (key: string) => {
      if (popupVisible) setPopupVisible(false);

      // 🔊 Fire-and-forget click — zero blocking latency
      playClick();

      const isSpecial = ["shift", "back", "mode", "space", "return"].includes(
        key,
      );
      if (!isSpecial) {
        showPopup(getKeyLabel(key, mode, isShift), key);
        if (VIBRATION_ENABLED) Vibration.vibrate(10);
      }

      switch (key) {
        case "shift":
          setShift((s) => !s);
          return;
        case "back":
          onKeyPress("backspace");
   
        case "space":
          onKeyPress(" ");
          return;
        case "return":
          onKeyPress("\n");
          return;
        case "mode":
          setMode((m) => (m === "en" ? "ar" : m === "ar" ? "emoji" : "en"));
          setShift(false);
          return;
      }

      const value =
        mode === "en" && isShift && /[a-zA-Z]/.test(key)
          ? key.toUpperCase()
          : key;
      onKeyPress(value);
      if (mode === "en" && isShift && /[a-zA-Z]/.test(key)) setShift(false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [mode, isShift, popupVisible, playClick, showPopup, onKeyPress],
  );

  // ── Render ─────────────────────────────────────────────────
  return (
    <View style={styles.container} ref={containerRef}>
      {layout.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.row}>
          {row.map((key) => {
            const isSpecial = [
              "shift",
              "back",
              "mode",
              "return",
              "space",
            ].includes(key);
            return (
              <TouchableOpacity
                key={key}
                ref={(node) => {
                  if (node) keyRefs.current.set(key, node);
                  else keyRefs.current.delete(key);
                }}
                style={[
                  styles.key,
                  { flex: getKeyFlex(key) },
                  isSpecial && styles.specialKey,
                  key === "shift" && isShift && styles.shiftActive,
                ]}
                onPressIn={() => handlePress(key)}
                onPressOut={scheduleHidePopup}
                activeOpacity={0.6}
              >
                <Text
                  style={[
                    styles.keyText,
                    { fontSize },
                    key === "space" && styles.spaceText,
                    isSpecial && styles.specialKeyText,
                  ]}
                  allowFontScaling={false}
                >
                  {getKeyLabel(key, mode, isShift)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {/* Popup — rendered inside container so position:'absolute' is relative to it */}
      {popupVisible && (
        <View
          style={[
            styles.popup,
            { top: popupPosition.top, left: popupPosition.left },
          ]}
          pointerEvents="none"
        >
          <Text style={[styles.popupText, { fontSize: fontSize * 1.8 }]}>
            {popupText}
          </Text>
        </View>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    backgroundColor: "#d1d5db",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 8,
    width: "100%",
  },
  key: {
    backgroundColor: "#ffffff",
    borderRadius: 6,
    marginHorizontal: 3,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  specialKey: { backgroundColor: "#b0b3b8" },
  shiftActive: { backgroundColor: "#007aff" },
  keyText: {
    fontWeight: "500",
    color: "#000000",
    textAlign: "center",
  },
  specialKeyText: { color: "#ffffff" },
  spaceText: { fontSize: 0 },
  popup: {
    position: "absolute",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 10, // high elevation so it renders above all keys
    alignItems: "center",
    justifyContent: "center",
    minWidth: POPUP_WIDTH,
    zIndex: 999,
  },
  popupText: {
    fontWeight: "bold",
    color: "#000",
  },
});

export default CustomKeyboard;
