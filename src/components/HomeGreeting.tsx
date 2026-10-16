import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import AppText from './AppText';
import { useThemeColors } from '../hooks/useThemeColors';
import { useAuthContext } from '../context/AuthContext';
import { useExpenseContext } from '../context/ExpenseContext';

interface HomeGreetingProps {
  onProfilePress?: () => void;
}

export default function HomeGreeting({ onProfilePress }: HomeGreetingProps) {
  const colors = useThemeColors();
  const { profileName } = useAuthContext();
  const { isAmountsVisible, toggleAmountsVisibility } = useExpenseContext();

  const now = new Date();
  const hours = now.getHours();

  // Determine time-of-day greeting, icon, and mood colors
  const greetingConfig = React.useMemo(() => {
    if (hours >= 5 && hours < 12) {
      return {
        greeting: 'Good Morning',
        icon: 'sunny-outline',
        iconColor: '#F59E0B',
        badgeBg: 'rgba(245, 158, 11, 0.12)',
      };
    } else if (hours >= 12 && hours < 18) {
      return {
        greeting: 'Good Afternoon',
        icon: 'sunny',
        iconColor: '#EAB308',
        badgeBg: 'rgba(234, 179, 8, 0.12)',
      };
    } else if (hours >= 18 && hours < 22) {
      return {
        greeting: 'Good Evening',
        icon: 'partly-sunny-outline',
        iconColor: '#F97316',
        badgeBg: 'rgba(249, 115, 22, 0.12)',
      };
    } else {
      return {
        greeting: 'Good Night',
        icon: 'moon-outline',
        iconColor: '#818CF8',
        badgeBg: 'rgba(129, 140, 248, 0.12)',
      };
    }
  }, [hours]);

  // Formatted date string
  const formattedDate = React.useMemo(() => {
    return now.toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
  }, []);

  const firstName = profileName?.firstName?.trim();
  const lastName = profileName?.lastName?.trim();
  const fullName = [firstName, lastName].filter(Boolean).join(' ');
  const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : '';
  const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : '';
  const initials = `${firstInitial}${lastInitial}` || null;

  return (
    <View style={styles.container}>
      {/* Left side: Greeting text and user name */}
      <View style={styles.leftCol}>
        {/* Time of day pill + greeting label */}
        <View style={styles.greetingRow}>
          <View style={[styles.timeIconWrap, { backgroundColor: greetingConfig.badgeBg }]}>
            <Ionicons name={greetingConfig.icon} size={15} color={greetingConfig.iconColor} />
          </View>
          <AppText style={[styles.greetingLabel, { color: colors.textMuted }]}>
            {greetingConfig.greeting}
          </AppText>
        </View>

        {/* User's Name / Main Welcome */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onProfilePress}
          style={styles.nameTouchable}
          disabled={!onProfilePress}
        >
          <AppText style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
            {fullName || 'Welcome'}
          </AppText>
        </TouchableOpacity>

        {/* Date Row */}
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
          <AppText style={[styles.dateText, { color: colors.textMuted }]}>
            {formattedDate}
          </AppText>
        </View>
      </View>

      {/* Right side: Quick Privacy Toggle & User Avatar */}
      <View style={styles.rightCol}>
        {/* Privacy Eye Toggle Button */}
        <TouchableOpacity
          onPress={() => toggleAmountsVisibility(!isAmountsVisible)}
          activeOpacity={0.7}
          style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={isAmountsVisible ? 'Hide amounts' : 'Show amounts'}
        >
          <Ionicons
            name={isAmountsVisible ? 'eye-outline' : 'eye-off-outline'}
            size={19}
            color={isAmountsVisible ? colors.text : colors.accent}
          />
        </TouchableOpacity>

        {/* Avatar / Profile Initials Circle */}
        <TouchableOpacity
          onPress={onProfilePress}
          activeOpacity={0.8}
          style={styles.avatarTouchable}
          accessibilityLabel="Open Profile"
        >
          <LinearGradient
            colors={[colors.accent, colors.primary || colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarGradient}
          >
            {initials ? (
              <AppText style={[styles.avatarText, initials.length > 1 && styles.avatarTextMulti]}>
                {initials}
              </AppText>
            ) : (
              <Ionicons name="person" size={17} color="#FFFFFF" />
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  leftCol: {
    flex: 1,
    paddingRight: 12,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  greetingLabel: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  nameTouchable: {
    marginVertical: 2,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  avatarTouchable: {
    borderRadius: 21,
    padding: 2,
  },
  avatarGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  avatarTextMulti: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
