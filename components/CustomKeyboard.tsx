import { Audio } from "expo-av"; // npx expo install expo-av
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
  useWindowDimensions,
} from "react-native";

// ─────────────────────────────────────────────────────────────
//  deleteLastChar — USE THIS IN YOUR PARENT'S BACKSPACE HANDLER
//
//  ✗  NEVER do:  setText((prev) => prev.slice(0, -1))
//     → breaks on emoji / Arabic ligatures (leaves broken "?" that
//       can never be deleted).
//
//  ✓  Always use:
//       import CustomKeyboard, { deleteLastChar } from "./CustomKeyboard";
//       setText((prev) => deleteLastChar(prev));
// ─────────────────────────────────────────────────────────────
export function deleteLastChar(str: string): string {
  if (!str) return str;
  if (typeof Intl !== "undefined" && (Intl as any).Segmenter) {
    const segs: { index: number }[] = [
      ...new (Intl as any).Segmenter().segment(str),
    ];
    return segs.length === 0 ? "" : str.slice(0, segs[segs.length - 1].index);
  }
  const pts = [...str];
  pts.pop();
  return pts.join("");
}

// ─────────────────────────────────────────────────────────────
//  Embedded click sound (your sound.wav → mono·22050Hz·30ms)
// ─────────────────────────────────────────────────────────────
const KEY_CLICK_WAV_B64 =
  "UklGRlgFAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YTQFAAD4/17xcvoECAspli+uMGUW3QSy3+3XKecs6N0AWwY/CRcBtQi5FMQN+BkbCygDxvfb7Wbjr9jg7dzwpQDxCFIMJxJ6EokXhAUaBwIIkAYhCfIAEv598Z/y0+l+4s7qk+7z+1wAMw1FEvgY0B6lEXcNuwUoBtj+0fjJ863qyPD67ajuB+/39ez++AIFDvsOtBXDF4QT1QyXBBoEefrj9anuZ+q37lvxDfYH9Yj9EASnCV4P7w15EDgPYQ/jB/8A4v3j9qL0EO/N7tfwUPaB+yX8lwK8BvsMXw7CDJsLKQnXCQkDnP1o+Dj1lPTZ8UPzCfSD+mr/bAJgBgAJhQ12DBUL5wYeBGsDwf7i+rH1RPWH9Sr2uPfH+HP+iwKTBq8H0QjLCqsJiwjAAxQB5f5k/Fz5MPVa9UT2Tvmh+zb+8AFwBeUI7AfIB10H5AZuBT0BNP7n+uL5a/gI93L3iPlM/VL//wGjA0MGIwj9BpIFhANrA/gB4/9d/ar6OPpy+bb57fnu+yH/VgFbA7kDVAVSBvUFWAQNAmEB9v+c/lj8fvoj+or67vvf/M/+uwAhAwYEkgMlBFQEawSSApQAMv8J/oj9FPyD+0L7W/wS/m7/WAG+AjIEzwOqApsBAQFRAaAA9f/Y/jL+0/1b/WT9W/1u/ob/AwD5ACECWANpA9sCgQFAACb/K/6f/YL98P14/hr/IwAxAesBIQK+AesA+P85/9H+xf76/l3/0f9EAGkUN+tPFV1HyzFSU5oKd9f0jcmfgLwQ+xZXQ2mIa1s2NwqbwVCtpJ4isOri6QQRMf1N9FyuQPYucQa40Q21MaULqgrEAfkGI7RULWpiXVpAdA0JzLKdi5RDmvrFVAlmQjJp8HTfWPkg/OVxqNCKyZWOuQXzpjmEZ5Nx/mInMa/soLQdkkaNJ7DA6PcjE1vqckJkeD5MBq/FnZ1ilQumxtQzEsZDTmKuZRdG9xRI4Tay5Z3RqhnL3fpvMHFRoFheSosjePHryAKvC6xtxcXsMhfPPiVRqEjOL4AIUduFvQ+0Sr2v3KgGjirMQ6FJiDYLFhbxW80ku9y/kdPZ9HQb3TUnQCE6eSC+/QvfScgWwvnQBOu6CQIoJTj+NQknGww37EbV8cpIzifiKv4XGKssCjTuKXoVo/sE4YDRYNF/3OHy7w35IRss1CrgGpkDf+2j2xbVBt1g7XgCFxibJKElVx3QC073yeXz3Jfd5umx+/EMcxs7IQkcKhAeACTv0+RD433oVfUcBVER7BjKGQASowXu+LztUejJ6mvysf0tCkkS8BR1EsQJ5f0D9KHtiOwy8lH7AgV8DS8RUw/UCZsBgPiY8gLxPvO0+ewBbAilDAoNIgn9ArH8TPfZ9O31aPnA/mAEFQh9CXsIuwSV/xv7Gfhy97f5U/2LAUoFIwfKBtEEdwGV/cT6nvkh+pL87P/yAhUFqgVuBA8CUv/C/EL7R/t9/Lb+UAFMA0wEKASvAmYAPP6g/AH8rfw3/iMACAItA1YDrAI7AV3/2f0I/f/87P1v//UALwK7AmcCdwEoAMf+1v2X/fj99v5CAF8BDQIoApQBiwBu/4L+Df40/tb+xv/EAHUBswF+AdYA7P8Y/5D+cf7N/n//RwD1AFEBRQHiAEIAi/8C/8r+6f5Z//j/jQDyAA8B2ABmANn/Xv8X/xf/WP/G/0AAoADQAMQAfAARAKT/Wf9A/17/q/8LAGQAmQCgAHoAMQDb/5L/bv9z/6H/6v8zAGkAfgBtAD0A/f/A/5j/kP+m/9b/DwA=";

// ─────────────────────────────────────────────────────────────
//  Layouts
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

const SPECIAL_KEYS = new Set(["shift", "back", "mode", "space", "return"]);

let VIBRATION_ENABLED = false;
let SOUND_ENABLED = true;

// Popup size constants — must stay in sync with styles.popup
const POPUP_WIDTH = 60;
const POPUP_HEIGHT = 56;
const POPUP_GAP = 6;

type KeyboardMode = "en" | "ar" | "emoji";

// ─────────────────────────────────────────────────────────────
//  Sound — fire-and-forget replayAsync, volume 0.4
// ─────────────────────────────────────────────────────────────
const useKeyClickSound = () => {
  const soundRef = useRef<Audio.Sound | null>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
        const { sound } = await Audio.Sound.createAsync(
          { uri: `data:audio/wav;base64,${KEY_CLICK_WAV_B64}` },
          { volume: 0.4 },
        );
        if (alive) {
          soundRef.current = sound;
          readyRef.current = true;
        }
      } catch (e) {
        console.warn("[KeyClick] load failed:", e);
      }
    })();
    return () => {
      alive = false;
      soundRef.current?.unloadAsync();
    };
  }, []);

  // Stable ref — never changes, never causes re-renders in consumers
  const playClick = useRef(() => {
    if (!SOUND_ENABLED || !readyRef.current || !soundRef.current) return;
    soundRef.current.replayAsync().catch(() => {});
  }).current;

  return playClick;
};

// ─────────────────────────────────────────────────────────────
//  Helpers (pure, defined once outside component)
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
  if (SPECIAL_KEYS.has(key)) return 1.2;
  return 1;
};

// ─────────────────────────────────────────────────────────────
//  KeyButton — memoised so it only re-renders when its own
//  props change, not when sibling keys or popup state changes.
// ─────────────────────────────────────────────────────────────
type KeyButtonProps = {
  keyName: string;
  label: string;
  flex: number;
  isSpecial: boolean;
  isShiftActive: boolean;
  fontSize: number;
  onPressIn: (key: string) => void;
  onPressOut: () => void;
  setRef: (key: string, node: any) => void;
};

const KeyButton = memo(
  ({
    keyName,
    label,
    flex,
    isSpecial,
    isShiftActive,
    fontSize,
    onPressIn,
    onPressOut,
    setRef,
  }: KeyButtonProps) => (
    <TouchableOpacity
      ref={(node) => setRef(keyName, node)}
      style={[
        styles.key,
        { flex },
        isSpecial && styles.specialKey,
        keyName === "shift" && isShiftActive && styles.shiftActive,
      ]}
      onPressIn={() => onPressIn(keyName)}
      onPressOut={onPressOut}
      activeOpacity={0.6}
    >
      <Text
        style={[
          styles.keyText,
          { fontSize },
          keyName === "space" && styles.spaceText,
          isSpecial && styles.specialKeyText,
        ]}
        allowFontScaling={false}
      >
        {label}
      </Text>
    </TouchableOpacity>
  ),
);

// ─────────────────────────────────────────────────────────────
//  Main component
// ─────────────────────────────────────────────────────────────
const CustomKeyboard = ({
  onKeyPress,
}: {
  onKeyPress: (key: string) => void;
}) => {
  const [mode, setMode] = useState<KeyboardMode>("en");
  const [isShift, setShift] = useState(false);
  const { width: screenWidth } = useWindowDimensions();

  // Refs — never trigger re-renders
  const keyRefs = useRef<Map<string, any>>(new Map());
  const containerRef = useRef<View>(null);
  // FIX 1: Mirror popupVisible in a ref so handlePress doesn't need it
  // as a useCallback dependency — eliminating the re-render cascade.
  const popupVisibleRef = useRef(false);
  // FIX 2: Cache the container's screen position after first measure.
  // The keyboard never moves, so we only need one bridge round-trip ever.
  const containerPos = useRef<{ x: number; y: number } | null>(null);

  // Popup state — merged into one object (FIX 3: single setState = single render pass)
  const [popup, setPopup] = useState<{
    visible: boolean;
    text: string;
    top: number;
    left: number;
  }>({ visible: false, text: "", top: 0, left: 0 });

  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fontSize = Math.min(Math.max(screenWidth / 20, 16), 24);
  const layout = mode === "en" ? enKeys : mode === "ar" ? arKeys : emojiKeys;
  const playClick = useKeyClickSound();

  // Keep ref in sync with state
  popupVisibleRef.current = popup.visible;

  // ── Popup ─────────────────────────────────────────────────
  const showPopup = useCallback(
    (text: string, key: string) => {
      const keyNode = keyRefs.current.get(key);
      if (!keyNode) return;
      if (hideTimeout.current) clearTimeout(hideTimeout.current);

      const place = (cx: number, cy: number) => {
        keyNode.measureInWindow((kx: number, ky: number, kw: number) => {
          const left = Math.min(
            Math.max(kx - cx + kw / 2 - POPUP_WIDTH / 2, 4),
            screenWidth - POPUP_WIDTH - 4,
          );
          const top = ky - cy - POPUP_HEIGHT - POPUP_GAP;
          // FIX 3: one setState call → one render pass
          setPopup({ visible: true, text, top, left });
          popupVisibleRef.current = true;
        });
      };

      // FIX 2: use cached container position on every tap after the first
      if (containerPos.current) {
        place(containerPos.current.x, containerPos.current.y);
      } else {
        containerRef.current?.measureInWindow((cx, cy) => {
          containerPos.current = { x: cx, y: cy };
          place(cx, cy);
        });
      }
    },
    [screenWidth],
  );

  const scheduleHidePopup = useCallback(() => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => {
      setPopup((p) => ({ ...p, visible: false }));
      popupVisibleRef.current = false;
    }, 180);
  }, []);

  // ── Key press ─────────────────────────────────────────────
  // FIX 1: popupVisible is read from ref, NOT from closure —
  // so this callback is stable and never recreated on popup toggle.
  const handlePress = useCallback(
    (key: string) => {
      if (popupVisibleRef.current) {
        setPopup((p) => ({ ...p, visible: false }));
        popupVisibleRef.current = false;
      }

      playClick();

      const isSpecial = SPECIAL_KEYS.has(key);
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
          return;
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
    },
    [mode, isShift, playClick, showPopup, onKeyPress],
  );

  // Stable ref setter — never recreated (FIX 4 support)
  const setKeyRef = useCallback((key: string, node: any) => {
    if (node) keyRefs.current.set(key, node);
    else keyRefs.current.delete(key);
  }, []);

  // Invalidate container position cache on layout change (rotation, etc.)
  const onContainerLayout = useCallback(() => {
    containerPos.current = null;
  }, []);

  // ── Render ────────────────────────────────────────────────
  return (
    <View
      style={styles.container}
      ref={containerRef}
      onLayout={onContainerLayout}
    >
      {layout.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.row}>
          {row.map((key) => (
            // FIX 4: KeyButton is memo'd — only re-renders if its own props change.
            // Changing popup state no longer re-renders all 30-40 keys.
            <KeyButton
              key={key}
              keyName={key}
              label={getKeyLabel(key, mode, isShift)}
              flex={getKeyFlex(key)}
              isSpecial={SPECIAL_KEYS.has(key)}
              isShiftActive={isShift}
              fontSize={fontSize}
              onPressIn={handlePress}
              onPressOut={scheduleHidePopup}
              setRef={setKeyRef}
            />
          ))}
        </View>
      ))}

      {popup.visible && (
        <View
          style={[styles.popup, { top: popup.top, left: popup.left }]}
          pointerEvents="none"
        >
          <Text style={[styles.popupText, { fontSize: fontSize * 1.8 }]}>
            {popup.text}
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
    elevation: 10,
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
