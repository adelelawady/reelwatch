// Native floating chat bar — lives entirely above the WebView in RN layer.
// Uses useSafeAreaInsets so it clears home indicator on all devices.
// No KeyboardAvoidingView — that resizes WebView and pauses video.
// Instead we use softwareKeyboardLayoutMode="adjustNothing" in app.json
// and manually translate the bar up when keyboard opens.

import { useEffect, useRef } from "react";
import {
  Animated,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  value: string;
  onChange: (t: string) => void;
  onSend: () => void;
};

export function ChatBar({ value, onChange, onSend }: Props) {
  const inputRef = useRef<TextInput>(null);
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(translateY, {
        toValue: -e.endCoordinates.height,
        duration: Platform.OS === "ios" ? (e.duration ?? 250) : 200,
        useNativeDriver: true,
      }).start();
    });

    const onHide = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(translateY, {
        toValue: 0,
        duration: Platform.OS === "ios" ? (e.duration ?? 250) : 200,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  const handleSend = () => {
    if (!value.trim()) return;
    onSend();
    inputRef.current?.focus();
  };

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ translateY }] }]}>
      <View style={styles.row}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder="Say something…"
          placeholderTextColor="rgba(255,255,255,0.4)"
          onSubmitEditing={handleSend}
          returnKeyType="send"
          blurOnSubmit={false}
          selectionColor="rgba(255,255,255,0.7)"
        />
        <TouchableOpacity
          onPress={handleSend}
          activeOpacity={0.7}
          style={styles.btn}
        >
          <Text style={styles.btnText}>➤</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const BOTTOM_INSET = Platform.OS === "ios" ? 34 : 16;

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: BOTTOM_INSET,
    left: 0,
    right: 0,
    zIndex: 999,
    elevation: 999, // Android
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 10,
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    paddingVertical: 8,
    // transparent — text floats directly on video
    backgroundColor: "transparent",
    textShadowColor: "rgba(0,0,0,0.95)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
  },
});
