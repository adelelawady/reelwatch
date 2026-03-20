import { useCallback, useRef, useState } from "react";
import { Animated } from "react-native";
import { MAX_TOASTS, TOAST_DURATION } from "../constants/config";

export type Toast = {
  id: string;
  text: string;
  sender: "me" | "friend";
  opacity: Animated.Value;
  translateY: Animated.Value;
};

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const addToast = useCallback((text: string, sender: "me" | "friend") => {
    const id = `${Date.now()}-${counter.current++}`;
    const opacity = new Animated.Value(0);
    const translateY = new Animated.Value(20);

    setToasts((prev) => [
      ...prev.slice(-(MAX_TOASTS - 1)),
      { id, text, sender, opacity, translateY },
    ]);

    // animate in
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    // animate out after TOAST_DURATION
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -10,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      });
    }, TOAST_DURATION);
  }, []);

  return { toasts, addToast };
}
