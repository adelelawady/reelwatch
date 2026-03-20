import { StyleSheet, View } from "react-native";

type Props = { connected: boolean };

export function StatusDot({ connected }: Props) {
  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.dot,
          { backgroundColor: connected ? "#4ade80" : "#f87171" },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 14,
    right: 14,
    zIndex: 99,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
});
