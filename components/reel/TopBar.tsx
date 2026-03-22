import React, { useState } from "react";
import {
  Platform,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ── Must be defined before StyleSheet.create ──────────────────
const SAFE_TOP =
  Platform.OS === "android" ? (RNStatusBar.currentHeight ?? 24) : 52;

type Props = {
  connected: boolean;
  joined: boolean;
  usersCount: number;
  usersVisible: boolean;
  amController: boolean;
  isRemoteRoom: boolean;
  keyboardSticky: boolean;
  onBack: () => void;
  onToggleUsers: () => void;
  onToggleSticky: () => void;
  onToggleDev: () => void; // ← just calls injectJavaScript from parent
};

export function TopBar({
  connected,
  joined,
  usersCount,
  usersVisible,
  amController,
  isRemoteRoom,
  keyboardSticky,
  onBack,
  onToggleUsers,
  onToggleSticky,
  onToggleDev,
}: Props) {
  const dotColor = joined ? "#4caf50" : connected ? "#ff9800" : "#f44336";
  const [devOn, setDevOn] = useState(false);

  const handleDev = () => {
    setDevOn((v) => !v);
    onToggleDev();
  };

  return (
    <>
      {/* ── Left cluster ── */}
      <View style={styles.topLeft} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.floatBtn}
          onPress={onBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.floatBtnText}>←</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.floatBtn, usersVisible && styles.floatBtnActive]}
          onPress={onToggleUsers}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.floatBtnText}>👥</Text>
          {usersCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{usersCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
      </View>

      {/* ── Right cluster ── */}
      <View style={styles.topRight} pointerEvents="box-none">
        {/* Remote badge — controller */}
        {isRemoteRoom && amController && (
          <View style={styles.remoteBadge}>
            <Text style={styles.remoteBadgeText}>🎮</Text>
          </View>
        )}

        {/* Watching badge — not controller 
        {isRemoteRoom && !amController && (
          <View style={styles.watchingBadge}>
            <Text style={styles.watchingBadgeText}>👁 Watching</Text>
          </View>
        )}*/}

        {/* Keyboard sticky toggle */}
        <TouchableOpacity
          style={[styles.floatBtn, keyboardSticky && styles.stickyBtnOn]}
          onPress={onToggleSticky}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.floatBtnText}>⌨</Text>
          <View
            style={[styles.stickyPin, keyboardSticky && styles.stickyPinOn]}
          />
        </TouchableOpacity>

        {/* Dev panel toggle — shows/hides the injected JS panel 
        <TouchableOpacity
          style={[styles.floatBtn, devOn && styles.devBtnOn]}
          onPress={handleDev}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.floatBtnText}>🛠</Text>
        </TouchableOpacity> */}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  topLeft: {
    position: "absolute",
    top: SAFE_TOP + 6,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 100,
    pointerEvents: "box-none",
  } as any,

  topRight: {
    position: "absolute",
    top: SAFE_TOP + 6,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 100,
    pointerEvents: "box-none",
  } as any,

  floatBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.15)",
  },
  floatBtnActive: {
    backgroundColor: "rgba(0,122,255,0.55)",
    borderColor: "rgba(0,122,255,0.4)",
  },
  floatBtnText: { fontSize: 16, color: "#fff" },

  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    backgroundColor: "#007aff",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 2,
  },

  remoteBadge: {
    backgroundColor: "rgba(0,122,255,0.75)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,122,255,0.9)",
  },
  remoteBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },

  watchingBadge: {
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.15)",
  },
  watchingBadgeText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    fontWeight: "600",
  },

  stickyBtnOn: {
    backgroundColor: "rgba(255,200,0,0.35)",
    borderColor: "rgba(255,200,0,0.5)",
  },
  stickyPin: {
    position: "absolute",
    bottom: 3,
    right: 3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  stickyPinOn: { backgroundColor: "#ffc800" },

  devBtnOn: {
    backgroundColor: "rgba(255,100,0,0.45)",
    borderColor: "rgba(255,100,0,0.5)",
  },
});
