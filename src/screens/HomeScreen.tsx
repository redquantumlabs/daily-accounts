import React from 'react';
import { View } from 'react-native';
import { useThemeColors } from '../hooks/useThemeColors';

export default function HomeScreen() {
  const colors = useThemeColors();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} />
  );
}
