import { Expense } from '../context/ExpenseContext';
import notifee, { TriggerType, TimestampTrigger } from '@notifee/react-native';

const SUMMARY_PREFIX = 'summary_';
const REMINDER_PREFIX = 'reminder_';
const MONTHLY_PREFIX = 'monthly_';

export const scheduleAllNotifications = async (expenses: Expense[], currency: string, summaryTime: Date, reminderTime: Date) => {
  try {
    // Cancel all existing scheduled notifications without clearing delivered ones
    await notifee.cancelTriggerNotifications();

    const now = new Date();
    const todayStr = now.toDateString();

    const todayExpenses = expenses.filter(e => new Date(e.date).toDateString() === todayStr);
    const todayTotal = todayExpenses.reduce((sum, e) => sum + (parseFloat(e.amount as any) || 0), 0);
    const hasTodayExpense = todayExpenses.length > 0;

    const currentMonthExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const currentMonthTotal = currentMonthExpenses.reduce((sum, e) => sum + (parseFloat(e.amount as any) || 0), 0);

    for (let i = 1; i <= 14; i++) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + i);

      // ---- Summary ----
      targetDate.setHours(summaryTime.getHours(), summaryTime.getMinutes(), 0, 0);
      const summaryTotal = i === 1 ? todayTotal : 0;
      
      const summaryTrigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: targetDate.getTime(),
      };

      await notifee.createTriggerNotification({
        id: `${SUMMARY_PREFIX}${i}`,
        title: "Yesterday's Summary \uD83D\uDCCA",
        body: `Your total expense for yesterday was ${currency}${summaryTotal}.`,
        android: { channelId: 'daily_accounts', smallIcon: 'ic_notification' }
      }, summaryTrigger);

      // ---- Reminder ----
      targetDate.setHours(reminderTime.getHours(), reminderTime.getMinutes(), 0, 0);
      const reminderTrigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: targetDate.getTime(),
      };

      await notifee.createTriggerNotification({
        id: `${REMINDER_PREFIX}${i}`,
        title: "Daily Reminder",
        body: "You haven't logged any expenses today. Don't forget to track your spending!",
        android: { channelId: 'daily_accounts', smallIcon: 'ic_notification' }
      }, reminderTrigger);
    }

    if (!hasTodayExpense && (now.getHours() < reminderTime.getHours() || (now.getHours() === reminderTime.getHours() && now.getMinutes() < reminderTime.getMinutes()))) {
      const todayReminder = new Date(now);
      todayReminder.setHours(reminderTime.getHours(), reminderTime.getMinutes(), 0, 0);
      
      const trigger: TimestampTrigger = { type: TriggerType.TIMESTAMP, timestamp: todayReminder.getTime() };
      await notifee.createTriggerNotification({
        id: `${REMINDER_PREFIX}0`,
        title: "Daily Reminder",
        body: "You haven't logged any expenses today. Don't forget to track your spending!",
        android: { channelId: 'daily_accounts', smallIcon: 'ic_notification' }
      }, trigger);
    }

    if (now.getHours() < summaryTime.getHours() || (now.getHours() === summaryTime.getHours() && now.getMinutes() < summaryTime.getMinutes())) {
      const todaySummary = new Date(now);
      todaySummary.setHours(summaryTime.getHours(), summaryTime.getMinutes(), 0, 0);
      
      const yesterdayDate = new Date(now);
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayStr = yesterdayDate.toDateString();
      const yesterdayExpenses = expenses.filter(e => new Date(e.date).toDateString() === yesterdayStr);
      const yesterdayTotal = yesterdayExpenses.reduce((sum, e) => sum + (parseFloat(e.amount as any) || 0), 0);

      const trigger: TimestampTrigger = { type: TriggerType.TIMESTAMP, timestamp: todaySummary.getTime() };
      await notifee.createTriggerNotification({
        id: `${SUMMARY_PREFIX}0`,
        title: "Yesterday's Summary \uD83D\uDCCA",
        body: `Your total expense for yesterday was ${currency}${yesterdayTotal}.`,
        android: { channelId: 'daily_accounts', smallIcon: 'ic_notification' }
      }, trigger);
    }

    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    nextMonthDate.setHours(summaryTime.getHours(), summaryTime.getMinutes(), 0, 0);
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentMonthName = monthNames[now.getMonth()];

    const trigger: TimestampTrigger = { type: TriggerType.TIMESTAMP, timestamp: nextMonthDate.getTime() };
    await notifee.createTriggerNotification({
      id: `${MONTHLY_PREFIX}`,
      title: "Monthly Summary \uD83D\uDCCA",
      body: `Your total expense for ${currentMonthName} was ${currency}${currentMonthTotal}.`,
      android: { channelId: 'daily_accounts', smallIcon: 'ic_notification' }
    }, trigger);

  } catch (error) {
    console.log('Error scheduling notifications:', error);
  }
};
