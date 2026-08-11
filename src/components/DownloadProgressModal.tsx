import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import AppText from './AppText';
import { useThemeColors } from '../hooks/useThemeColors';

interface DownloadProgressModalProps {
  visible: boolean;
  message?: string;
}

export default function DownloadProgressModal({
  visible,
  message = 'Generating PDF report…',
}: DownloadProgressModalProps) {
  const colors = useThemeColors();

  // Spinning ring animation
  const spinAnim = useRef(new Animated.Value(0)).current;
  // Pulsing dot animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // Fade-in animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  // Dots animation
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (visible) {
      // Fade in the overlay
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Spinning ring
      const spin = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spin.start();

      // Pulsing inner circle
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      // Cascading dots
      const makeDotAnim = (dot: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(dot, {
              toValue: 1,
              duration: 350,
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0.3,
              duration: 350,
              useNativeDriver: true,
            }),
            Animated.delay(700 - delay),
          ])
        );

      const dots = Animated.parallel([
        makeDotAnim(dot1, 0),
        makeDotAnim(dot2, 230),
        makeDotAnim(dot3, 460),
      ]);
      dots.start();

      return () => {
        spin.stop();
        pulse.stop();
        dots.stop();
        spinAnim.setValue(0);
        pulseAnim.setValue(1);
        dot1.setValue(0.3);
        dot2.setValue(0.3);
        dot3.setValue(0.3);
        fadeAnim.setValue(0);
      };
    }
  }, [visible]);

  const rotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              shadowColor: colors.primary,
            },
          ]}
        >
          {/* Spinning ring */}
          <View style={styles.spinnerContainer}>
            <Animated.View
              style={[
                styles.spinRing,
                {
                  borderTopColor: colors.primary,
                  borderRightColor: `${colors.primary}44`,
                  borderBottomColor: `${colors.primary}44`,
                  borderLeftColor: `${colors.primary}44`,
                  transform: [{ rotate }],
                },
              ]}
            />
            {/* Pulsing inner dot */}
            <Animated.View
              style={[
                styles.innerDot,
                {
                  backgroundColor: colors.primary,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            />
          </View>

          {/* Title */}
          <AppText style={[styles.title, { color: colors.text }]}>
            Preparing Download
          </AppText>

          {/* Message */}
          <AppText style={[styles.message, { color: colors.textMuted ?? colors.text }]}>
            {message}
          </AppText>

          {/* Animated dots row */}
          <View style={styles.dotsRow}>
            {[dot1, dot2, dot3].map((dot, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: colors.primary,
                    opacity: dot,
                  },
                ]}
              />
            ))}
          </View>

          {/* Hint */}
          <AppText style={[styles.hint, { color: colors.textMuted ?? colors.text }]}>
            Please wait, this may take a moment
          </AppText>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: 280,
    borderRadius: 24,
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: 'center',
    elevation: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  spinnerContainer: {
    width: 72,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  spinRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
  },
  innerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    opacity: 0.75,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
