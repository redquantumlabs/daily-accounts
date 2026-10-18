import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface DashboardFlipCardProps {
  front: React.ReactNode | ((onFlip: () => void) => React.ReactNode);
  back: React.ReactNode | ((onFlip: () => void) => React.ReactNode);
  frontLabel?: string;
  backLabel?: string;
  showFloatingButton?: boolean;
  flipButtonRight?: number;
  flipButtonTop?: number;
  frontFlipButtonRight?: number;
  frontFlipButtonTop?: number;
  backFlipButtonRight?: number;
  backFlipButtonTop?: number;
}

export default function DashboardFlipCard({
  front,
  back,
  frontLabel,
  backLabel,
  showFloatingButton,
  flipButtonRight = 52,
  flipButtonTop = 18,
  frontFlipButtonRight,
  frontFlipButtonTop,
  backFlipButtonRight,
  backFlipButtonTop,
}: DashboardFlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const animatedValue = useRef(new Animated.Value(0)).current;

  const [frontHeight, setFrontHeight] = useState<number>(0);
  const [backHeight, setBackHeight] = useState<number>(0);

  const handleFlip = useCallback(() => {
    const nextFlipped = !isFlipped;
    setIsFlipped(nextFlipped);

    Animated.spring(animatedValue, {
      toValue: nextFlipped ? 180 : 0,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
  }, [isFlipped, animatedValue]);

  const frontInterpolate = animatedValue.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = animatedValue.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  const frontOpacity = animatedValue.interpolate({
    inputRange: [89, 90],
    outputRange: [1, 0],
  });

  const backOpacity = animatedValue.interpolate({
    inputRange: [90, 91],
    outputRange: [0, 1],
  });

  const onFrontLayout = useCallback((e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    if (h > 0) setFrontHeight(h);
  }, []);

  const onBackLayout = useCallback((e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    if (h > 0) setBackHeight(h);
  }, []);

  const activeHeight = isFlipped
    ? backHeight || frontHeight || undefined
    : frontHeight || backHeight || undefined;

  const isCustomFront = typeof front === 'function';
  const isCustomBack = typeof back === 'function';

  const frontContent = isCustomFront ? front(handleFlip) : front;
  const backContent = isCustomBack ? back(handleFlip) : back;

  const shouldRenderFrontFloating = showFloatingButton ?? !isCustomFront;
  const shouldRenderBackFloating = showFloatingButton ?? !isCustomBack;

  return (
    <View style={[styles.container, activeHeight ? { height: activeHeight } : null]}>
      {/* Front Face */}
      <Animated.View
        onLayout={onFrontLayout}
        pointerEvents={isFlipped ? 'none' : 'auto'}
        style={[
          styles.cardFace,
          isFlipped ? styles.absoluteFace : styles.relativeFace,
          {
            transform: [{ perspective: 1200 }, { rotateY: frontInterpolate }],
            opacity: frontOpacity,
          },
        ]}
      >
        {frontContent}
        {/* Flip Button on Front Side (only if no custom flip button inside card) */}
        {shouldRenderFrontFloating && (
          <TouchableOpacity
            style={[
              styles.flipBtn,
              {
                top: frontFlipButtonTop ?? flipButtonTop,
                right: frontFlipButtonRight ?? flipButtonRight,
              },
            ]}
            onPress={handleFlip}
            activeOpacity={0.75}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Flip card"
            accessibilityRole="button"
          >
            <Ionicons name="swap-horizontal" size={17} color="#FFF" />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Back Face */}
      <Animated.View
        onLayout={onBackLayout}
        pointerEvents={isFlipped ? 'auto' : 'none'}
        style={[
          styles.cardFace,
          isFlipped ? styles.relativeFace : styles.absoluteFace,
          {
            transform: [{ perspective: 1200 }, { rotateY: backInterpolate }],
            opacity: backOpacity,
          },
        ]}
      >
        {backContent}
        {/* Flip Button on Back Side (only if no custom flip button inside card) */}
        {shouldRenderBackFloating && (
          <TouchableOpacity
            style={[
              styles.flipBtn,
              {
                top: backFlipButtonTop ?? flipButtonTop,
                right: backFlipButtonRight ?? flipButtonRight,
              },
            ]}
            onPress={handleFlip}
            activeOpacity={0.75}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Flip card back"
            accessibilityRole="button"
          >
            <Ionicons name="swap-horizontal" size={17} color="#FFF" />
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
  },
  cardFace: {
    width: '100%',
    backfaceVisibility: 'hidden',
  },
  relativeFace: {
    position: 'relative',
  },
  absoluteFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  flipBtn: {
    position: 'absolute',
    zIndex: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
});
