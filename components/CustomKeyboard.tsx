import React, { useRef, useState } from "react";
import {
  LayoutRectangle,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
  useWindowDimensions,
} from "react-native";

// ---------- ENGLISH LAYOUT (iPhone style, with shift) ----------
const enKeys = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["shift", "z", "x", "c", "v", "b", "n", "m", "back"],
  ["mode", "space", "return"],
];

// ---------- ARABIC LAYOUT (exactly as requested) ----------
const arKeys = [
  ["ض", "ص", "ث", "ق", "ف", "غ", "ع", "ه", "خ", "ح", "ج"],
  ["ش", "س", "ي", "ب", "ل", "ا", "ت", "ن", "م", "ك", "ة"],
  ["ء", "ظ", "ط", "ذ", "د", "ز", "ر", "و", "ي", "back"],
  ["mode", "space", "return"],
];

// ---------- Global vibration toggle (can be replaced with context/state later) ----------
let VIBRATION_ENABLED = false; // set to false to disable vibration

// Special key labels
const getKeyLabel = (
  key: string,
  isShiftActive: boolean,
  isEnglish: boolean,
) => {
  if (key === "shift") return isShiftActive ? "⇪" : "⇧";
  if (key === "back") return "⌫";
  if (key === "mode") return "🌐";
  if (key === "space") return "";
  if (key === "return") return "return";
  if (isEnglish && isShiftActive && /[a-zA-Z]/.test(key))
    return key.toUpperCase();
  return key;
};

// Flex ratios for special keys (makes space bar wider)
const getKeyFlex = (key: string) => {
  if (key === "space") return 4;
  if (["shift", "back", "mode", "return"].includes(key)) return 1.2;
  return 1;
};

const CustomKeyboard = ({
  onKeyPress,
}: {
  onKeyPress: (key: string) => void;
}) => {
  const [isShift, setShift] = useState(false);
  const [isEnglish, setEnglish] = useState(true);
  const { width: screenWidth } = useWindowDimensions();

  const layoutMap = useRef<Map<string, LayoutRectangle>>(new Map());

  const [popupVisible, setPopupVisible] = useState(false);
  const [popupText, setPopupText] = useState("");
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });

  const hideTimeout = useRef<NodeJS.Timeout | null>(null);

  const fontSize = Math.min(Math.max(screenWidth / 20, 16), 24);
  const layout = isEnglish ? enKeys : arKeys;

  const showPopup = (text: string, key: string) => {
    const rect = layoutMap.current.get(key);
    if (!rect) return;

    // Cancel any pending hide
    if (hideTimeout.current) clearTimeout(hideTimeout.current);

    // Position popup above the key (with safety margin to avoid top edge)
    const popupTop = Math.max(rect.y - 50, 10);
    const popupLeft = rect.x + rect.width / 2 - 30;
    setPopupPosition({ top: popupTop, left: popupLeft });
    setPopupText(text);
    setPopupVisible(true);
  };

  const hidePopup = () => {
    // Cancel any pending hide
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    setPopupVisible(false);
  };

  // Called on key release – we delay the hide so the popup lingers
  const scheduleHidePopup = () => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => {
      hidePopup();
    }, 200); // linger for 200ms after release
  };

  const triggerVibration = () => {
    if (VIBRATION_ENABLED) {
      Vibration.vibrate(10); // short, subtle vibration
    }
  };

  const handlePress = (key: string) => {
    // If a new key is pressed while popup is visible, hide it immediately
    if (popupVisible) {
      hidePopup();
    }

    // Show popup for normal letters only (skip special keys)
    if (!["shift", "back", "mode", "space", "return"].includes(key)) {
      showPopup(getKeyLabel(key, isShift, isEnglish), key);
      triggerVibration(); // vibrate for letter keys
    }

    // Special key handling
    if (key === "shift") {
      setShift(!isShift);
      return;
    }
    if (key === "back") {
      onKeyPress("backspace");
      return;
    }
    if (key === "space") {
      onKeyPress(" ");
      return;
    }
    if (key === "return") {
      onKeyPress("\n");
      return;
    }
    if (key === "mode") {
      setEnglish(!isEnglish);
      setShift(false);
      return;
    }

    // Normal letter key
    let value = key;
    if (isEnglish && isShift && /[a-zA-Z]/.test(key)) {
      value = key.toUpperCase();
    }
    onKeyPress(value);

    // Reset shift after typing a letter (iOS behaviour)
    if (isEnglish && isShift && /[a-zA-Z]/.test(key)) {
      setShift(false);
    }
  };

  return (
    <View style={styles.container}>
      {layout.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((key) => {
            const flex = getKeyFlex(key);
            const isSpecial = [
              "shift",
              "back",
              "mode",
              "return",
              "space",
            ].includes(key);
            const label = getKeyLabel(key, isShift, isEnglish);

            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.key,
                  { flex },
                  isSpecial && styles.specialKey,
                  key === "shift" && isShift && styles.shiftActive,
                ]}
                onLayout={(event) => {
                  const { layout } = event.nativeEvent;
                  layoutMap.current.set(key, layout);
                }}
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
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {/* Magnified popup (instant appearance/disappearance) */}
      {popupVisible && (
        <View
          style={[
            styles.popup,
            {
              top: popupPosition.top,
              left: popupPosition.left,
            },
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
  specialKey: {
    backgroundColor: "#b0b3b8",
  },
  shiftActive: {
    backgroundColor: "#007aff",
  },
  keyText: {
    fontWeight: "500",
    color: "#000000",
    textAlign: "center",
  },
  specialKeyText: {
    color: "#ffffff",
  },
  spaceText: {
    fontSize: 0,
  },
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
    elevation: 5,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 60,
  },
  popupText: {
    fontWeight: "bold",
    color: "#000",
  },
});

export default CustomKeyboard;
