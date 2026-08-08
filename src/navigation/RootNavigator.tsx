import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'react-native';

import { useThemeContext } from '../context/ThemeContext';
import BottomTabs from './BottomTabs';
import AnimatedSplashScreen from '../components/AnimatedSplashScreen';

export default function RootNavigator() {
  const { isDarkTheme, accentColor } = useThemeContext();
  const [isSplashAnimationDone, setIsSplashAnimationDone] = useState(false);

  const CustomDarkTheme = {
    ...DarkTheme,
    colors: { ...DarkTheme.colors, primary: accentColor },
  };

  const CustomLightTheme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, primary: accentColor },
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSplashAnimationDone(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  if (!isSplashAnimationDone) {
    return <AnimatedSplashScreen accentColor={accentColor} />;
  }

  return (
    <NavigationContainer theme={isDarkTheme ? CustomDarkTheme : CustomLightTheme}>
      <StatusBar backgroundColor={isDarkTheme ? '#121212' : '#ffffff'} barStyle={isDarkTheme ? 'light-content' : 'dark-content'} />
      <BottomTabs />
    </NavigationContainer>
  );
}
