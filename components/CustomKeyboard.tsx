import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const enKeys = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["shift", "z", "x", "c", "v", "b", "n", "m", "back"],
  ["mode", "space", "return"],
];

const arKeys = [
  ["ض", "ص", "ث", "ق", "ف", "غ", "ع", "ه", "خ", "ح"],
  ["ش", "س", "ي", "ب", "ل", "ا", "ت", "ن", "م"],
  ["shift", "ئ", "ء", "ؤ", "ر", "لا", "ى", "ة", "back"],
  ["mode", "space", "return"],
];

export default function CustomKeyboard({ onKeyPress }) {
  const [isShift, setShift] = useState(false);
  const [isEnglish, setEnglish] = useState(true);

  const layout = isEnglish ? enKeys : arKeys;

  const handlePress = (key) => {
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
      return;
    }

    const value = isShift ? key.toUpperCase() : key;
    onKeyPress(value);
  };

  return (
    <View style={styles.container}>
      {layout.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map((key) => (
            <TouchableOpacity
              key={key}
              style={styles.key}
              onPress={() => handlePress(key)}
              activeOpacity={0.7}
            >
              <Text style={styles.keyText}>
                {key === "space" ? "" : key.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(229,229,234,0.65)",
    paddingBottom: 10,
    paddingTop: 4,
    borderTopColor: "#999",
    borderTopWidth: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 6,
  },
  key: {
    marginHorizontal: 4,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  keyText: {
    fontSize: 17,
    color: "#000",
  },
});
