import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import CustomKeyboard from "./CustomKeyboard";

export default function ChatBar({ onSend }) {
  const [text, setText] = useState("");

  const handleKey = (key) => {
    if (key === "backspace") {
      setText(text.slice(0, -1));
      return;
    }
    setText(text + key);
  };

  const handleSend = () => {
    if (text.trim()) {
      onSend(text);
      setText("");
    }
  };

  return (
    <>
      <View style={styles.inputWrapper}>
        <TextInput
          value={text}
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#aaa"
          editable={false} // Disable system keyboard
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendBtn}>
          <Text style={styles.sendTxt}>Send</Text>
        </TouchableOpacity>
      </View>

      <CustomKeyboard onKeyPress={handleKey} />
    </>
  );
}

const styles = StyleSheet.create({
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.85)",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 17,
    color: "#000",
  },
  sendBtn: {
    marginLeft: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#007aff",
    borderRadius: 5,
  },
  sendTxt: {
    color: "#fff",
    fontSize: 17,
  },
});
