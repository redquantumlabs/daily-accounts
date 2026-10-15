import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee from '@notifee/react-native';
import { SCHEDULED_EXPENSES_CHANNEL_ID, SCHEDULED_EXPENSES_TRIGGER_PREFIX } from '../utils/scheduledExpenseConstants';
import { roundAmount } from '../utils/format';

let isPerformingTask = false;

export const performScheduledExpenseTask = async (targetNotificationId?: string) => {
  if (isPerformingTask) return;
  isPerformingTask = true;

  try {
    const scheduledKey = '@app_scheduled_expenses';
    const expensesKey = '@app_expenses';
    const currencyKey = '@app_currency';

    const [storedScheduled, storedExpenses, storedCurrency] = await Promise.all([
      AsyncStorage.getItem(scheduledKey),
      AsyncStorage.getItem(expensesKey),
      AsyncStorage.getItem(currencyKey),
    ]);

    if (!storedScheduled) return;

    const scheduledList: any[] = JSON.parse(storedScheduled);
    const expensesList: any[] = storedExpenses ? JSON.parse(storedExpenses) : [];
    const currency = storedCurrency || '$';

    const targetId = targetNotificationId ? targetNotificationId.replace(SCHEDULED_EXPENSES_TRIGGER_PREFIX, '') : null;
    const now = Date.now();

    let updated = false;
    const newlyAddedExpenses: any[] = [];

    const updatedScheduledList = scheduledList.map(item => {
      const isTarget = targetId ? item.id === targetId : false;
      const isDue = new Date(item.scheduleDate).getTime() <= now + 60000;

      if (!item.isProcessed && (isTarget || isDue)) {
        updated = true;
        const newExpense = {
          id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 4),
          amount: roundAmount(item.amount),
          description: item.description,
          date: new Date(item.expenseDate).toISOString(),
          categoryId: item.categoryId,
          paymentModeId: item.paymentModeId,
        };
        newlyAddedExpenses.push({ ...newExpense, formattedExpenseDate: new Date(item.expenseDate).toLocaleDateString() });
        return {
          ...item,
          isProcessed: true,
          processedAt: new Date().toISOString(),
        };
      }
      return item;
    });

    if (updated && newlyAddedExpenses.length > 0) {
      const mergedExpenses = [...newlyAddedExpenses.map(({ formattedExpenseDate: _formattedExpenseDate, ...rest }) => rest), ...expensesList];
      mergedExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      await AsyncStorage.setItem(expensesKey, JSON.stringify(mergedExpenses));
      await AsyncStorage.setItem(scheduledKey, JSON.stringify(updatedScheduledList));

      // Show notification for added expenses if triggered without an existing notification
      if (!targetNotificationId) {
        for (const exp of newlyAddedExpenses) {
          await notifee.displayNotification({
            id: `added_sched_${exp.id}`,
            title: 'Scheduled Expense Added',
            body: `${exp.description} (${currency}${exp.amount}) has been recorded for ${exp.formattedExpenseDate}.`,
            android: {
              channelId: SCHEDULED_EXPENSES_CHANNEL_ID,
              smallIcon: 'ic_notification',
              largeIcon: 'ic_launcher',
              circularLargeIcon: true,
              showTimestamp: true,
              pressAction: { id: 'default' },
            },
          }).catch(err => console.warn('[performScheduledExpenseTask] Notification failed:', err));
        }
      }
    }
  } catch (error) {
    console.error('[performScheduledExpenseTask] Error:', error);
  } finally {
    isPerformingTask = false;
  }
};
