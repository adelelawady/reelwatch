import { LinearGradient } from "expo-linear-gradient"; // or 'react-native-linear-gradient'
import { Animated, StyleSheet, Text, View } from "react-native";
import { Toast } from "../hooks/useToasts";

type Props = {
  toasts: Toast[];
};

export function ToastLayer({ toasts }: Props) {
  if (toasts.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {toasts.map((t) => (
        <Animated.View
          key={t.id}
          style={[
            styles.toastWrapper,
            {
              alignSelf: t.sender === "friend" ? "flex-start" : "flex-end",
              opacity: t.opacity,
              transform: [{ translateY: t.translateY }],
            },
          ]}
        >
          <LinearGradient
            colors={["#f58529", "#feda77", "#dd2a7b", "#8134af", "#515bd4"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <Text
              style={[
                styles.sender,
                t.sender === "friend" ? styles.friendName : styles.meName,
              ]}
            >
              {t.sender === "me" ? "You" : "Friend"}
            </Text>
            <Text style={styles.text}>{t.text}</Text>
          </LinearGradient>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    zIndex: 1000,
  },
  toastWrapper: {
    maxWidth: "65%",
    marginVertical: 2,
  },
  gradient: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 40,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  sender: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 2,
    textTransform: "uppercase",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  friendName: {
    color: "#ffeb99",
  },
  meName: {
    color: "#b3e0ff",
  },
  text: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
