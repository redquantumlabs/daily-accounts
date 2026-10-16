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

        {/* Amount Section */}
        <View style={styles.amountSection}>
          <AppText style={styles.amountLabel}>Upcoming Total</AppText>
          <AppText style={styles.amountValue}>
            {!isAmountsVisible ? '••••••' : `${currency}${formatAmount(upcomingTotal)}`}
          </AppText>
        </View>

        {/* Dual Badges Row: Side-by-side equal width */}
        <View style={styles.badgesRow}>
          {/* Pending Badge */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onPress('pending')}
            style={[styles.badgePill, styles.pendingPill]}
          >
            <Ionicons name="time-outline" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
            <AppText style={styles.badgeText}>
              {pendingCount} Pending
            </AppText>
            <Ionicons name="chevron-forward" size={12} color="rgba(255,255,255,0.7)" style={{ marginLeft: 4 }} />
          </TouchableOpacity>

          {/* Archived Badge */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onPress('archived')}
            style={[styles.badgePill, styles.archivedPill]}
          >
            <Ionicons name="checkmark-done" size={15} color="#A7F3D0" style={{ marginRight: 6 }} />
            <AppText style={[styles.badgeText, styles.archivedBadgeText]}>
              {archivedCount} Archived
            </AppText>
            <Ionicons name="chevron-forward" size={12} color="rgba(167,243,208,0.7)" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
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
    marginBottom: 14,
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
  amountSection: {
    marginBottom: 14,
  },
  amountLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  badgePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  pendingPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  archivedPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.22)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
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
