import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AppText from '../components/AppText';
import EmptyState from '../components/EmptyState';
import { useThemeColors } from '../hooks/useThemeColors';
import { useExpenseContext, ScheduledExpense } from '../context/ExpenseContext';
import { useAlert } from '../context/AlertContext';
import { formatAmount } from '../utils/format';
import ScheduleExpenseModal from '../components/ScheduleExpenseModal';

export default function ScheduledExpensesScreen() {
  const colors = useThemeColors();
  const { showAlert } = useAlert();
  const {
    scheduledExpenses,
    categories,
    paymentModes,
    currency,
    isAmountsVisible,
    executeScheduledExpenseNow,
    deleteScheduledExpense,
    processPendingScheduledExpenses,
  } = useExpenseContext();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedItemToEdit, setSelectedItemToEdit] = useState<ScheduledExpense | null>(null);

  // Poll for due scheduled items every 5 seconds while on this screen
  useEffect(() => {
    processPendingScheduledExpenses();
    const interval = setInterval(() => {
      processPendingScheduledExpenses();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Filter pending vs processed
  const pendingItems = useMemo(() => {
    return scheduledExpenses
      .filter((item) => !item.isProcessed)
      .sort((a, b) => new Date(a.scheduleDate).getTime() - new Date(b.scheduleDate).getTime());
  }, [scheduledExpenses]);

  const handleOpenAdd = () => {
    setSelectedItemToEdit(null);
    setIsModalVisible(true);
  };

  const handleOpenEdit = (item: ScheduledExpense) => {
    setSelectedItemToEdit(item);
    setIsModalVisible(true);
  };

  const handleExecuteNow = (item: ScheduledExpense) => {
    showAlert(
      'Add Expense Now',
      `Are you sure you want to commit "${item.description}" (${currency}${formatAmount(item.amount)}) right now instead of waiting for the schedule date?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add Now',
          style: 'default',
          onPress: async () => {
            try {
              await executeScheduledExpenseNow(item.id);
            } catch (err: any) {
              showAlert('Error', err.message || 'Failed to execute scheduled expense.');
            }
          },
        },
      ]
    );
  };

  const handleDelete = (item: ScheduledExpense) => {
    showAlert(
      'Cancel Schedule',
      `Cancel and delete the scheduled expense for "${item.description}"?`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteScheduledExpense(item.id);
            } catch (err: any) {
              showAlert('Error', err.message || 'Failed to delete schedule.');
            }
          },
        },
      ]
    );
  };

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  // Helper for human-readable schedule countdown
  const getScheduleRelativeLabel = (scheduleDateStr: string) => {
    const target = new Date(scheduleDateStr);
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const timeFormatted = target.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (diffMs <= 0) {
      return 'Processing...';
    } else if (isSameDay(target, now)) {
      return `Auto-adds today at ${timeFormatted}`;
    } else if (isSameDay(target, tomorrow)) {
      return `Auto-adds tomorrow at ${timeFormatted}`;
    } else {
      const dateFormatted = target.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
      return `Auto-adds on ${dateFormatted} at ${timeFormatted}`;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          pendingItems.length === 0 && { flexGrow: 1, justifyContent: 'center' },
        ]}
      >
        {pendingItems.length === 0 ? (
          <EmptyState
            icon="time-outline"
            title="No Scheduled Expenses"
            message="Pre-schedule your upcoming bills, EMIs, or recurring payments. They will automatically be added on their scheduled date."
            actionLabel="Schedule an Expense"
            onAction={handleOpenAdd}
          />
        ) : (
          <View style={styles.listContainer}>
            {/* Top Info Banner */}
            <View style={[styles.infoBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
              <AppText style={[styles.infoBannerText, { color: colors.textMuted }]}>
                Expenses will automatically post on their auto-add date with their assigned expense date.
              </AppText>
            </View>

            {/* Items */}
            {pendingItems.map((item) => {
              const category = categories.find((c) => c.id === item.categoryId);
              const paymentMode = paymentModes.find((p) => p.id === item.paymentModeId);
              const formattedExpDate = new Date(item.expenseDate).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });
              const formattedSchedDate = new Date(item.scheduleDate).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });
              const formattedSchedTime = new Date(item.scheduleDate).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              const relativeLabel = getScheduleRelativeLabel(item.scheduleDate);
              const isDueOrPast = new Date(item.scheduleDate).getTime() <= Date.now();

              return (
                <View
                  key={item.id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      shadowColor: colors.shadow,
                    },
                  ]}
                >
                  {/* Top row: Category & Amount */}
                  <View style={styles.cardHeader}>
                    <View style={styles.categoryRow}>
                      <View
                        style={[
                          styles.categoryIconWrap,
                          { backgroundColor: category?.color ? `${category.color}20` : `${colors.primary}20` },
                        ]}
                      >
                        <Ionicons
                          name={(category?.icon as any) || 'pricetag'}
                          size={18}
                          color={category?.color || colors.primary}
                        />
                      </View>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <AppText style={[styles.description, { color: colors.text }]} numberOfLines={1}>
                          {item.description}
                        </AppText>
                        <AppText style={[styles.categoryName, { color: colors.textMuted }]}>
                          {category?.name || 'Uncategorized'}
                        </AppText>
                      </View>
                    </View>

                    <AppText style={[styles.amount, { color: colors.notification }]}>
                      {!isAmountsVisible ? '••••••' : `${currency}${formatAmount(item.amount)}`}
                    </AppText>
                  </View>

                  {/* Date Metadata Pills */}
                  <View style={styles.metadataContainer}>
                    {/* Expense Date Pill */}
                    <View style={[styles.datePill, { backgroundColor: colors.surface }]}>
                      <Ionicons name="calendar-outline" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                      <View>
                        <AppText style={[styles.datePillLabel, { color: colors.textMuted }]}>Expense Date</AppText>
                        <AppText style={[styles.datePillValue, { color: colors.text }]}>{formattedExpDate}</AppText>
                      </View>
                    </View>

                    {/* Schedule Date Pill */}
                    <View style={[styles.datePill, { backgroundColor: colors.surface }]}>
                      <Ionicons name="alarm-outline" size={14} color="#F59E0B" style={{ marginRight: 6 }} />
                      <View>
                        <AppText style={[styles.datePillLabel, { color: colors.textMuted }]}>Auto-Add Date</AppText>
                        <AppText style={[styles.datePillValue, { color: colors.text }]}>
                          {formattedSchedDate}, {formattedSchedTime}
                        </AppText>
                      </View>
                    </View>
                  </View>

                  {/* Badges Row: Payment Mode & Auto-Add Status */}
                  <View style={styles.badgesRow}>
                    {paymentMode && (
                      <View
                        style={[
                          styles.paymentBadge,
                          {
                            backgroundColor: `${paymentMode.color || colors.primary}15`,
                            borderColor: `${paymentMode.color || colors.primary}30`,
                          },
                        ]}
                      >
                        <Ionicons
                          name={(paymentMode.icon as any) || 'card-outline'}
                          size={12}
                          color={paymentMode.color || colors.primary}
                          style={{ marginRight: 5 }}
                        />
                        <AppText style={[styles.paymentBadgeText, { color: paymentMode.color || colors.primary }]}>
                          {paymentMode.name}
                        </AppText>
                      </View>
                    )}

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: isDueOrPast ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                          borderColor: isDueOrPast ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)',
                        },
                      ]}
                    >
                      <Ionicons
                        name={isDueOrPast ? 'alert-circle-outline' : 'time-outline'}
                        size={12}
                        color={isDueOrPast ? '#EF4444' : '#D97706'}
                        style={{ marginRight: 5 }}
                      />
                      <AppText
                        style={[styles.statusBadgeText, isDueOrPast && { color: '#EF4444' }]}
                        numberOfLines={1}
                      >
                        {relativeLabel}
                      </AppText>
                    </View>
                  </View>

                  {/* Actions Footer */}
                  <View style={[styles.actionsFooter, { borderTopColor: colors.border }]}>
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        {
                          backgroundColor: `${colors.primary}15`,
                          borderColor: `${colors.primary}30`,
                        },
                      ]}
                      onPress={() => handleExecuteNow(item)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="flash-outline" size={14} color={colors.primary} style={{ marginRight: 5 }} />
                      <AppText style={[styles.actionBtnText, { color: colors.primary }]}>Add Now</AppText>
                    </TouchableOpacity>

                    <View style={styles.iconActions}>
                      <TouchableOpacity
                        style={[
                          styles.iconActionBtn,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                          },
                        ]}
                        onPress={() => handleOpenEdit(item)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="pencil-outline" size={15} color={colors.text} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.iconActionBtn,
                          {
                            backgroundColor: 'rgba(255, 68, 68, 0.1)',
                            borderColor: 'rgba(255, 68, 68, 0.25)',
                          },
                        ]}
                        onPress={() => handleDelete(item)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={15} color="#ff4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
        onPress={handleOpenAdd}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Schedule Expense Modal */}
      <ScheduleExpenseModal
        visible={isModalVisible}
        onClose={() => {
          setIsModalVisible(false);
          setSelectedItemToEdit(null);
        }}
        itemToEdit={selectedItemToEdit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  listContainer: {
    gap: 14,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 4,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  description: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  categoryName: {
    fontSize: 12,
    marginTop: 2,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  metadataContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  datePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  datePillLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  datePillValue: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  paymentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    flexShrink: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '600',
  },
  actionsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  iconActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
