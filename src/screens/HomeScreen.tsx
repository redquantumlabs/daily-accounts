import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../hooks/useThemeColors';
import HomeGreeting from '../components/HomeGreeting';
import ScheduledExpensesCard from '../components/ScheduledExpensesCard';

export default function HomeScreen({ navigation }: any) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const handleProfilePress = () => {
    navigation.navigate('Settings', { screen: 'Profile', initial: false });
  };

  const handleScheduledPress = (tab?: 'pending' | 'archived') => {
    navigation.navigate('ScheduledExpenses', { initialTab: tab || 'pending' });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
      >
        {/* Top Greeting Section */}
        <HomeGreeting onProfilePress={handleProfilePress} />

        {/* Scheduled Expenses Card */}
        <ScheduledExpensesCard onPress={handleScheduledPress} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
