import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Image, Dimensions, Text } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

interface AnimatedSplashScreenProps {
  accentColor: string;
}

export default function AnimatedSplashScreen({ accentColor }: AnimatedSplashScreenProps) {
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoTranslateY = useRef(new Animated.Value(0)).current;

  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;

  // For floating background orbs
  const orb1 = useRef(new Animated.Value(0)).current;
  const orb2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Spring in the logo with a playful bounce
    Animated.spring(logoScale, {
      toValue: 1,
      tension: 15,
      friction: 4,
      useNativeDriver: true,
    }).start(() => {
      // 2. Start continuous subtle levitation after entry
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoTranslateY, {
            toValue: -15,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(logoTranslateY, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    // 3. Fade in text smoothly with a slight delay
    Animated.sequence([
      Animated.delay(400),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        })
      ])
    ]).start();

    // 4. Slow, continuous orb floating for a magical background effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(orb1, { toValue: 1, duration: 4000, useNativeDriver: true }),
        Animated.timing(orb1, { toValue: 0, duration: 4000, useNativeDriver: true })
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(orb2, { toValue: 1, duration: 5000, useNativeDriver: true }),
        Animated.timing(orb2, { toValue: 0, duration: 5000, useNativeDriver: true })
      ])
    ).start();

  }, []);

  const orb1TranslateY = orb1.interpolate({ inputRange: [0, 1], outputRange: [0, -60] });
  const orb1Scale = orb1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] });

  const orb2TranslateX = orb2.interpolate({ inputRange: [0, 1], outputRange: [0, 60] });
  const orb2Scale = orb2.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] });

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b', '#000000']}
      style={styles.container}
    >
      {/* Animated Background Orbs */}
      <Animated.View style={[
        styles.orb,
        {
          backgroundColor: accentColor,
          top: -height * 0.1,
          left: -width * 0.2,
          opacity: 0.15,
          transform: [{ translateY: orb1TranslateY }, { scale: orb1Scale }]
        }
      ]} />

      <Animated.View style={[
        styles.orb,
        {
          backgroundColor: accentColor,
          bottom: -height * 0.1,
          right: -width * 0.2,
          opacity: 0.1,
          transform: [{ translateX: orb2TranslateX }, { scale: orb2Scale }]
        }
      ]} />

      {/* Main Content */}
      <Animated.View style={{
        alignItems: 'center',
        transform: [
          { scale: logoScale },
          { translateY: logoTranslateY }
        ]
      }}>
        <View style={[styles.imageContainer, { shadowColor: accentColor }]}>
          <Image
            source={require('../../android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      <Animated.View style={{
        marginTop: 40,
        opacity: textOpacity,
        transform: [{ translateY: textTranslateY }],
        alignItems: 'center'
      }}>
        <Text style={styles.titleText}>Daily Accounts</Text>
        <Text style={[styles.subtitleText, { color: accentColor }]}>Manage your accounts</Text>
      </Animated.View>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orb: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
  },
  imageContainer: {
    borderRadius: 35,
    elevation: 20,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    backgroundColor: '#ffffff',
    padding: 15,
  },
  logo: {
    width: 130,
    height: 130,
    borderRadius: 25,
  },
  titleText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    letterSpacing: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
  }
});
