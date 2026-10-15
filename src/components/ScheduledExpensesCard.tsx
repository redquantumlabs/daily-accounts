import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AppText from './AppText';
import PremiumCardBackground from './PremiumCardBackground';
import { useExpenseContext } from '../context/ExpenseContext';
import { useThemeColors } from '../hooks/useThemeColors';
import { formatAmount } from '../utils/format';

interface ScheduledExpensesCardProps {
  onPress: () => void;
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

  const upcomingTotal = useMemo(() => {
    return pendingItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [pendingItems]);

  const nextItem = pendingItems[0];

  const nextDueText = useMemo(() => {
    if (!nextItem) return 'No pending scheduled expenses • Tap to add';
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
  }, [nextItem]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.container}>
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
          <View>
            <AppText style={styles.amountLabel}>Upcoming Total</AppText>
            <AppText style={styles.amountValue}>
              {!isAmountsVisible ? '••••••' : `${currency}${formatAmount(upcomingTotal)}`}
            </AppText>
          </View>

          <View style={styles.countBadge}>
            <Ionicons name="calendar-outline" size={14} color="#fff" style={{ marginRight: 4 }} />
            <AppText style={styles.countBadgeText}>
              {pendingCount} {pendingCount === 1 ? 'Pending' : 'Pending'}
            </AppText>
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
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  countBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
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
