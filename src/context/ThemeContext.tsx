import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeContextType {
  isDarkTheme: boolean;
  accentColor: string;
  toggleTheme: () => void;
  setAccentColor: (color: string) => Promise<void>;
  refreshTheme: () => Promise<void>;
  useCustomCardUI: boolean;
  toggleCustomCardUI: () => Promise<void>;
}

export const ACCENT_COLORS = [
  '#3B82F6', // Royal Blue
  '#6366F1', // Indigo
  '#10B981', // Emerald Green
  '#06B6D4', // Cyan
  '#8B5CF6', // Amethyst Purple
  '#F59E0B', // Amber Orange
  '#14B8A6', // Teal
  '#EAB308', // Yellow
  '#64848B', // Slate Grey
  '#84CC16', // Lime Green
  '#8B4513', // Brown
  '#0EA5E9', // Sky Blue
  '#34D399', // Mint
  '#F98316', // Orange
  '#EF4444', // Red
  '#A8A29E', // Warm Gray
  '#0F182A', // Slate Dark
];

const ThemeContext = createContext<ThemeContextType>({
  isDarkTheme: true,
  accentColor: ACCENT_COLORS[0],
  toggleTheme: () => { },
  setAccentColor: async () => { },
  refreshTheme: async () => { },
  useCustomCardUI: true,
  toggleCustomCardUI: async () => { },
});

export const useThemeContext = () => useContext(ThemeContext);

const THEME_KEY = '@app_theme_is_dark';
const ACCENT_KEY = '@app_theme_accent_color';
const CUSTOM_CARD_UI_KEY = '@app_theme_custom_card_ui';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const themeKey = THEME_KEY;
  const accentKey = ACCENT_KEY;

  const [isDarkTheme, setIsDarkTheme] = useState(systemColorScheme === 'dark' || systemColorScheme == null);
  const [accentColor, setAccentColorState] = useState(ACCENT_COLORS[0]);
  const [useCustomCardUI, setUseCustomCardUI] = useState(true);
  const [isReady, setIsReady] = useState(false);

  const loadTheme = async () => {
    try {
      const storedTheme = await AsyncStorage.getItem(themeKey);
      if (storedTheme !== null) {
        setIsDarkTheme(JSON.parse(storedTheme));
      } else {
        const defaultTheme = systemColorScheme === 'dark' || systemColorScheme == null;
        setIsDarkTheme(defaultTheme);
        await AsyncStorage.setItem(themeKey, JSON.stringify(defaultTheme));
      }

      const storedAccent = await AsyncStorage.getItem(accentKey);
      if (storedAccent !== null) {
        setAccentColorState(storedAccent);
      } else {
        setAccentColorState(ACCENT_COLORS[0]);
        await AsyncStorage.setItem(accentKey, ACCENT_COLORS[0]);
      }

      const storedCustomCardUI = await AsyncStorage.getItem(CUSTOM_CARD_UI_KEY);
      if (storedCustomCardUI !== null) {
        setUseCustomCardUI(JSON.parse(storedCustomCardUI));
      } else {
        setUseCustomCardUI(true);
        await AsyncStorage.setItem(CUSTOM_CARD_UI_KEY, JSON.stringify(true));
      }
    } catch (e) {
      console.error('Failed to load theme.', e);
    } finally {
      setIsReady(true);
    }
  };

  useEffect(() => {
    loadTheme();
  }, [themeKey, accentKey]);

  const toggleTheme = async () => {
    const newTheme = !isDarkTheme;
    setIsDarkTheme(newTheme);
    await AsyncStorage.setItem(themeKey, JSON.stringify(newTheme));
  };

  const setAccentColor = async (color: string) => {
    setAccentColorState(color);
    await AsyncStorage.setItem(accentKey, color);
  };

  const toggleCustomCardUI = async () => {
    const newVal = !useCustomCardUI;
    setUseCustomCardUI(newVal);
    await AsyncStorage.setItem(CUSTOM_CARD_UI_KEY, JSON.stringify(newVal));
  };

  if (!isReady) return null;

  return (
    <ThemeContext.Provider value={{ isDarkTheme, accentColor, toggleTheme, setAccentColor, refreshTheme: loadTheme, useCustomCardUI, toggleCustomCardUI }}>
      {children}
    </ThemeContext.Provider>
  );
};



