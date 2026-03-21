import { Platform, StatusBar as RNStatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";



type Props = {
  connected: boolean;
  joined: boolean;
  usersCount: number;
  usersVisible: boolean;
  onBack: () => void;
  onToggleUsers: () => void;
};

export function TopBar({
  connected,
  joined,
  usersCount,
  usersVisible,
  onBack,
  onToggleUsers,
}: Props) {
  const dotColor = joined ? "#4caf50" : connected ? "#ff9800" : "#f44336";

  return (
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
  );
}
const SAFE_TOP =
  Platform.OS === "android" ? (RNStatusBar.currentHeight ?? 24) : 52;

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
});
