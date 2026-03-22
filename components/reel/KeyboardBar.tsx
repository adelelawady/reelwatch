import CustomKeyboard from "@/components/CustomKeyboard";
import {
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  input: string;
  fadeAnim: Animated.Value;
  visible: boolean;
  sticky: boolean; // ← new
  onKeyPress: (key: string) => void;
  onSend: () => void;
  onDismiss: () => void;
  onShow: () => void;
};

export function KeyboardBar({
  input,
  fadeAnim,
  visible,
  sticky,
  onKeyPress,
  onSend,
  onDismiss,
  onShow,
}: Props) {
  return (
    <>
      {/*
        Dismiss overlay — only shown when:
        - keyboard is visible
        - AND not sticky (sticky = can't dismiss by tapping outside)
      */}
      {visible && !sticky && (
        <TouchableOpacity
          style={styles.dismissOverlay}
          onPress={onDismiss}
          activeOpacity={1}
        />
      )}

      {/*
        Show strip — only shown when keyboard is hidden AND not sticky.
        If sticky, keyboard never hides so this never shows.
      */}
      {!visible && !sticky && (
        <TouchableOpacity
          style={styles.showStrip}
          onPress={onShow}
          activeOpacity={0.9}
        />
      )}

      {/* Keyboard + input bar */}
      <Animated.View
        style={[
          styles.wrapper,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [60, 0],
                }),
              },
            ],
          },
        ]}
        pointerEvents={visible ? "auto" : "none"}
      >
        <View style={styles.inputBar}>
          <TextInput
            value={input}
            style={styles.inputField}
            placeholder="Say something…"
            placeholderTextColor="rgba(255,255,255,0.4)"
            editable={false}
          />
          <TouchableOpacity onPress={onSend} style={styles.sendBtn}>
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>

        <CustomKeyboard onKeyPress={onKeyPress} />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  dismissOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
  showStrip: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "12%",
    zIndex: 90,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    gap: 8,
  },
  inputField: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    paddingVertical: 0,
  },
  sendBtn: {
    backgroundColor: "#007aff",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  sendText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
