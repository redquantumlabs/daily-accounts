import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AppText from './AppText';
import PremiumCardBackground from './PremiumCardBackground';
import { useExpenseContext } from '../context/ExpenseContext';
import { useThemeColors } from '../hooks/useThemeColors';
import { formatAmount } from '../utils/format';
import { MONTH_NAMES } from '../utils/dateUtils';

interface ScheduledExpensesCardProps {
  onPress: (tab?: 'pending' | 'archived') => void;
}

export default function ScheduledExpensesCard({ onPress }: ScheduledExpensesCardProps) {
  const { scheduledExpenses, currency, isAmountsVisible } = useExpenseContext();
  const colors = useThemeColors();
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({});

  const toggleYear = (year: number) => {
    setExpandedYears((prev) => ({
      ...prev,
      [year]: !prev[year],
    }));
  };

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

  const yearlyTotals = useMemo(() => {
    const yearMap: Record<number, { total: number; months: Record<number, number> }> = {};

    pendingItems.forEach((item) => {
      if (!item.expenseDate) return;
      const d = new Date(item.expenseDate);
      if (isNaN(d.getTime())) return;

      const year = d.getFullYear();
      const month = d.getMonth();
      const amt = Number(item.amount) || 0;

      if (!yearMap[year]) {
        yearMap[year] = { total: 0, months: {} };
      }
      yearMap[year].total += amt;
      yearMap[year].months[month] = (yearMap[year].months[month] || 0) + amt;
    });

    return Object.keys(yearMap)
      .map(Number)
      .sort((a, b) => a - b)
      .map((year) => {
        const monthMap = yearMap[year].months;
        const months = Object.keys(monthMap)
          .map(Number)
          .sort((a, b) => a - b)
          .map((monthIndex) => ({
            monthIndex,
            monthName: MONTH_NAMES[monthIndex],
            total: monthMap[monthIndex],
          }));

        return {
          year,
          total: yearMap[year].total,
          months,
        };
      });
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
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsExpanded((prev) => !prev)}
            style={styles.amountLabelRow}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <AppText style={styles.amountLabel}>Upcoming Total</AppText>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={15}
              color="rgba(255,255,255,0.85)"
              style={styles.expandIcon}
            />
          </TouchableOpacity>

          <AppText style={styles.amountValue}>
            {!isAmountsVisible ? '••••••' : `${currency}${formatAmount(upcomingTotal)}`}
          </AppText>

          {/* Expanded Yearly Breakdown */}
          {isExpanded && (
            <View
              style={styles.yearlyListContainer}
              onStartShouldSetResponder={() => true}
            >
              {yearlyTotals.length === 0 ? (
                <AppText style={styles.noYearlyText}>No pending scheduled expenses</AppText>
              ) : (
                yearlyTotals.map((item, index) => {
                  const isYearExpanded = !!expandedYears[item.year];
                  const isLastYear = index === yearlyTotals.length - 1;

                  return (
                    <View
                      key={item.year}
                      style={[
                        styles.yearItemBlock,
                        !isLastYear && styles.yearlyRowDivider,
                      ]}
                    >
                      {/* Year Row Button */}
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => toggleYear(item.year)}
                        style={styles.yearlyRow}
                      >
                        <AppText style={styles.yearlyLabel}>
                          Upcoming Total of {item.year}:
                        </AppText>
                        <View style={styles.yearlyValueWrap}>
                          <AppText style={styles.yearlyValue}>
                            {!isAmountsVisible ? '••••••' : `${currency}${formatAmount(item.total)}`}
                          </AppText>
                          <Ionicons
                            name={isYearExpanded ? 'chevron-up' : 'chevron-down'}
                            size={14}
                            color="rgba(255, 255, 255, 0.85)"
                            style={styles.yearChevron}
                          />
                        </View>
                      </TouchableOpacity>

                      {/* Month Breakdown when Year is Expanded */}
                      {isYearExpanded && (
                        <View style={styles.monthlyListContainer}>
                          {item.months.map((m, mIdx) => (
                            <View
                              key={m.monthIndex}
                              style={[
                                styles.monthlyRow,
                                mIdx < item.months.length - 1 && styles.monthlyRowDivider,
                              ]}
                            >
                              <AppText style={styles.monthlyLabel}>
                                Upcoming Total of {m.monthName}:
                              </AppText>
                              <AppText style={styles.monthlyValue}>
                                {!isAmountsVisible ? '••••••' : `${currency}${formatAmount(m.total)}`}
                              </AppText>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}
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
  amountLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  amountLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  expandIcon: {
    marginLeft: 5,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 2,
  },
  yearlyListContainer: {
    marginTop: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.16)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  yearlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
  },
  yearItemBlock: {
    paddingVertical: 2,
  },
  yearlyValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  yearChevron: {
    marginLeft: 6,
  },
  yearlyRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
  },
  yearlyLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  yearlyValue: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  monthlyListContainer: {
    marginTop: 4,
    marginBottom: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.16)',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  monthlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  monthlyRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  monthlyLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  monthlyValue: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  noYearlyText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    fontStyle: 'italic',
    paddingVertical: 6,
    textAlign: 'center',
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
