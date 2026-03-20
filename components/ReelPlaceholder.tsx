// Instagram-style reel loading placeholder
// Shows while video is loading, hides with fade when video starts playing

import { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";

const { width, height } = Dimensions.get("window");

type Props = { visible: boolean };

// Shimmer bar component
function Shimmer({ style }: { style: any }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.65],
  });

  return <Animated.View style={[style, { opacity }]} />;
}

export function ReelPlaceholder({ visible }: Props) {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(1);
    }
  }, [visible]);

  return (
    <Animated.View
      style={[styles.container, { opacity: fadeAnim }]}
      pointerEvents={visible ? "none" : "none"}
    >
      {/* Dark background like Instagram */}
      <View style={styles.bg} />

      {/* Shimmer video area */}
      <Shimmer style={styles.videoArea} />

      {/* Bottom overlay — username, caption, audio */}
      <View style={styles.bottomBar}>
        {/* Avatar + username row */}
        <View style={styles.userRow}>
          <Shimmer style={styles.avatar} />
          <Shimmer style={styles.username} />
          <Shimmer style={styles.followBtn} />
        </View>
        {/* Caption lines */}
        <Shimmer style={styles.captionLine1} />
        <Shimmer style={styles.captionLine2} />
        {/* Audio row */}
        <View style={styles.audioRow}>
          <Shimmer style={styles.audioIcon} />
          <Shimmer style={styles.audioText} />
        </View>
      </View>

      {/* Right side action buttons */}
      <View style={styles.rightBar}>
        <Shimmer style={styles.actionBtn} />
        <Shimmer style={styles.actionLabel} />
        <Shimmer style={styles.actionBtn} />
        <Shimmer style={styles.actionLabel} />
        <Shimmer style={styles.actionBtn} />
        <Shimmer style={styles.actionLabel} />
        <Shimmer style={styles.audioThumb} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#111",
  },
  videoArea: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#222",
    borderRadius: 0,
  },

  // Bottom left: user info + caption
  bottomBar: {
    position: "absolute",
    bottom: 80,
    left: 14,
    right: 70,
    gap: 8,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#444",
  },
  username: {
    width: 100,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#444",
  },
  followBtn: {
    width: 60,
    height: 26,
    borderRadius: 6,
    backgroundColor: "#333",
    marginLeft: 6,
  },
  captionLine1: {
    width: "85%",
    height: 12,
    borderRadius: 6,
    backgroundColor: "#333",
  },
  captionLine2: {
    width: "60%",
    height: 12,
    borderRadius: 6,
    backgroundColor: "#333",
  },
  audioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  audioIcon: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#444",
  },
  audioText: {
    width: 140,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#333",
  },

  // Right side action buttons
  rightBar: {
    position: "absolute",
    right: 14,
    bottom: 100,
    alignItems: "center",
    gap: 4,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#444",
    marginTop: 8,
  },
  actionLabel: {
    width: 28,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#333",
  },
  audioThumb: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: "#444",
    marginTop: 16,
  },
});
