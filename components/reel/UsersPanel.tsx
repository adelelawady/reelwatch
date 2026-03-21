import {
    Animated,
    Platform,
    StatusBar as RNStatusBar,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export type RoomUser = {
  name: string;
  isMe: boolean;
  isOwner: boolean;
  isController: boolean;
};

type Props = {
  visible: boolean;
  panelAnim: Animated.Value;
  roomId: string;
  isRemote: boolean;
  amController: boolean;
  users: RoomUser[];
  onClose: () => void;
  onTransferRemote: (name: string) => void;
};

export function UsersPanel({
  visible,
  panelAnim,
  roomId,
  isRemote,
  amController,
  users,
  onClose,
  onTransferRemote,
}: Props) {
  return (
    <>
      {/* Tap-outside dismisser */}
      {visible && (
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
          activeOpacity={1}
        />
      )}

      <Animated.View
        style={[
          styles.panel,
          {
            opacity: panelAnim,
            transform: [
              {
                translateY: panelAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-16, 0],
                }),
              },
            ],
          },
        ]}
        pointerEvents={visible ? "auto" : "none"}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {roomId}
          </Text>
          {isRemote && (
            <View style={styles.remoteTag}>
              <Text style={styles.remoteTagText}>🎮 Remote</Text>
            </View>
          )}
        </View>

        {/* User list */}
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {users.map((u) => (
            <View key={u.name} style={styles.userRow}>
              <View style={styles.userLeft}>
                <Text style={styles.userName}>
                  {u.name}
                  {u.isMe ? <Text style={styles.youLabel}> (you)</Text> : null}
                </Text>
                <View style={styles.tags}>
                  {u.isOwner && (
                    <View style={styles.tagOwner}>
                      <Text style={styles.tagText}>owner</Text>
                    </View>
                  )}
                  {u.isController && (
                    <View style={styles.tagCtrl}>
                      <Text style={styles.tagText}>🎮</Text>
                    </View>
                  )}
                </View>
              </View>

              {isRemote && amController && !u.isMe && (
                <TouchableOpacity
                  style={styles.transferBtn}
                  onPress={() => onTransferRemote(u.name)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={styles.transferText}>Give 🎮</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          {users.length === 0 && (
            <Text style={styles.emptyText}>No users yet…</Text>
          )}
        </ScrollView>
      </Animated.View>
    </>
  );
}

const SAFE_TOP =
  Platform.OS === "android" ? (RNStatusBar.currentHeight ?? 24) : 52;

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    top: SAFE_TOP + 48,
    left: 12,
    width: 220,
    maxHeight: 300,
    backgroundColor: "rgba(10,10,10,0.88)",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
    zIndex: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.07)",
    gap: 8,
    flexWrap: "wrap",
  },
  headerTitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 1,
  },
  remoteTag: {
    backgroundColor: "rgba(0,122,255,0.2)",
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  remoteTagText: { color: "#007aff", fontSize: 10, fontWeight: "600" },
  list: { maxHeight: 240, padding: 8 },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  userLeft: { flex: 1 },
  userName: { color: "#fff", fontSize: 13, fontWeight: "600" },
  youLabel: { color: "rgba(255,255,255,0.4)", fontWeight: "400" },
  tags: { flexDirection: "row", gap: 4, marginTop: 3 },
  tagOwner: {
    backgroundColor: "rgba(255,193,7,0.2)",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  tagCtrl: {
    backgroundColor: "rgba(0,122,255,0.2)",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  tagText: { color: "rgba(255,255,255,0.6)", fontSize: 9, fontWeight: "700" },
  transferBtn: {
    backgroundColor: "rgba(0,122,255,0.25)",
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  transferText: { color: "#007aff", fontSize: 11, fontWeight: "700" },
  emptyText: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 16,
  },
});
