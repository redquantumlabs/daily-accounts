import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '@react-navigation/native';

export default function AppText({ style, ...props }: TextProps) {
  const { colors } = useTheme();
  const flatStyle = StyleSheet.flatten(style) || {};
  
  let fontFamily = 'sans-serif';
  if (flatStyle.fontWeight === 'bold' || flatStyle.fontWeight === '700') {
    fontFamily = 'sans-serif-medium';
  } else if (flatStyle.fontWeight === '600') {
    fontFamily = 'sans-serif-medium';
  }

  return (
    <Text
      {...props}
      style={[{ color: colors.text }, style, { fontFamily }]} // fontFamily overrides fontWeight
    />
  );
}
