import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AppText from './AppText';
import PremiumCardBackground from './PremiumCardBackground';
import { useExpenseContext } from '../context/ExpenseContext';
import { useThemeColors } from '../hooks/useThemeColors';
import { formatAmount } from '../utils/format';

interface ScheduledExpensesCardProps {
  onPress: (tab?: 'pending' | 'archived') => void;
}

export default function ScheduledExpensesCard({ onPress }: ScheduledExpensesCardProps) {
  const { scheduledExpenses, currency, isAmountsVisible } = useExpenseContext();
  const colors = useThemeColors();

  const pendingItems = useMemo(() => {
    return scheduledExpenses
      .filter((item) => !item.isProcessed)
      .sort((a, b) => new Date(a.scheduleDate).getTime() - new Date(b.scheduleDate).getTime());
  }, [scheduledExpenses]);

  const pendingCount = pendingItems.length;

  const archivedItems = useMemo(() => {
    return scheduledExpenses.filter((item) => item.isProcessed);
  }, [scheduledExpenses]);

  const archivedCount = archivedItems.length;

  const upcomingTotal = useMemo(() => {
    return pendingItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [pendingItems]);

  const nextItem = pendingItems[0];

  const nextDueText = useMemo(() => {
    if (!nextItem) {
      if (archivedCount > 0) {
        return `All scheduled expenses processed • ${archivedCount} archived`;
      }
      return 'No pending scheduled expenses • Tap to add';
    }
    const target = new Date(nextItem.scheduleDate);
    const dateFormatted = target.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
    });
    const timeFormatted = target.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `Next: Auto-adds on ${dateFormatted} at ${timeFormatted}`;
  }, [nextItem, archivedCount]);

  return (
    <TouchableOpacity onPress={() => onPress()} activeOpacity={0.85} style={styles.container}>
      <PremiumCardBackground color={colors.accent}>
        {/* Header: Title + Icon + Chevron */}
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <View style={styles.iconCircle}>
              <Ionicons name="time" size={20} color="#fff" />
            </View>
            <View>
              <AppText style={styles.cardTitle}>Scheduled Expenses</AppText>
              <AppText style={styles.cardSubtitle}>Auto-scheduled upcoming payments</AppText>
            </View>
          </View>
          <View style={styles.chevronWrap}>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.amountCol}>
            <AppText style={styles.amountLabel}>Upcoming Total</AppText>
            <AppText style={styles.amountValue}>
              {!isAmountsVisible ? '••••••' : `${currency}${formatAmount(upcomingTotal)}`}
            </AppText>
          </View>

          {/* Badges Column: Pending and Archived Counts */}
          <View style={styles.badgesCol}>
            {/* Pending Badge */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onPress('pending')}
              style={styles.badgePill}
            >
              <Ionicons name="time-outline" size={13} color="#FFFFFF" style={{ marginRight: 5 }} />
              <AppText style={styles.badgeText}>
                {pendingCount} Pending
              </AppText>
            </TouchableOpacity>

            {/* Archived Badge */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onPress('archived')}
              style={[styles.badgePill, styles.archivedBadgePill]}
            >
              <Ionicons name="checkmark-done" size={13} color="#A7F3D0" style={{ marginRight: 5 }} />
              <AppText style={[styles.badgeText, styles.archivedBadgeText]}>
                {archivedCount} Archived
              </AppText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Snippet */}
        <View style={styles.footerSnippet}>
          <Ionicons
            name={pendingCount > 0 ? 'alarm-outline' : 'add-circle-outline'}
            size={14}
            color="rgba(255,255,255,0.85)"
            style={{ marginRight: 6 }}
          />
          <AppText style={styles.footerText} numberOfLines={1}>
            {nextDueText}
          </AppText>
        </View>
      </PremiumCardBackground>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
    paddingTop: 4,
  },
  amountCol: {
    flex: 1,
    paddingRight: 10,
  },
  amountLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 2,
  },
  badgesCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  archivedBadgePill: {
    backgroundColor: 'rgba(16, 185, 129, 0.24)',
    borderColor: 'rgba(16, 185, 129, 0.38)',
  },
  archivedBadgeText: {
    color: '#E6FFFA',
  },
  footerSnippet: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  footerText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
});
