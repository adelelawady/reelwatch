// Renders floating comment toasts in the center of the screen.
// Sits above the WebView, below nothing — fully transparent bg.

import { View, Text, StyleSheet, Animated } from 'react-native';
import { Toast } from '../hooks/useToasts';

type Props = {
  toasts: Toast[];
};

export function ToastLayer({ toasts }: Props) {
  if (toasts.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {toasts.map(t => (
        <Animated.View
          key={t.id}
          style={[
            styles.toast,
            { opacity: t.opacity, transform: [{ translateY: t.translateY }] },
          ]}
        >
          <Text style={styles.sender}>
            {t.sender === 'me' ? 'You' : 'Friend'}
          </Text>
          <Text style={styles.text}>{t.text}</Text>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position:       'absolute',
    top:            0,
    left:           0,
    right:          0,
    bottom:         0,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            10,
  },
  toast: {
    alignItems:      'center',
    paddingHorizontal: 22,
    paddingVertical:   12,
    borderRadius:      40,
    // glass effect — dark semi-transparent, no bg color
    backgroundColor: 'rgba(0,0,0,0.52)',
    maxWidth:        '70%',
  },
  sender: {
    color:       'rgba(255,255,255,0.5)',
    fontSize:    11,
    fontWeight:  '600',
    letterSpacing: 0.5,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  text: {
    color:      '#fff',
    fontSize:   18,
    fontWeight: '500',
    textAlign:  'center',
    lineHeight: 24,
  },
});
