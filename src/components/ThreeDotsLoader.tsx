import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useThemeColors } from '../hooks/useThemeColors';

interface ThreeDotsLoaderProps {
  color?: string;
}

export default function ThreeDotsLoader({ color }: ThreeDotsLoaderProps) {
  const colors = useThemeColors();
  const loaderColor = color || colors.primary;

  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
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
      dots.stop();
    };
  }, []);

  return (
    <View style={styles.dotsRow}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: loaderColor,
              opacity: dot,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
