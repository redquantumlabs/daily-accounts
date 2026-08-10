import { Expense } from '../context/ExpenseContext';
import notifee, { TriggerType, TimestampTrigger } from '@notifee/react-native';
import { BACKUP_TRIGGER_IDS } from './backupConstants';

const SUMMARY_PREFIX = 'summary_';
const REMINDER_PREFIX = 'reminder_';
const MONTHLY_PREFIX = 'monthly_';

export const scheduleAllNotifications = async (expenses: Expense[], currency: string, summaryTime: Date, reminderTimes: Date[]) => {
  try {
    // Cancel all trigger notifications EXCEPT the backup triggers
    // We cancel individually by prefix to avoid wiping the backup alarms
    const existingIds = await notifee.getTriggerNotificationIds();
    const idsToCancel = existingIds.filter(
      id => !BACKUP_TRIGGER_IDS.includes(id)
    );
    await Promise.all(idsToCancel.map(id => notifee.cancelTriggerNotification(id)));

    const now = new Date();
    const todayStr = now.toDateString();

    const todayExpenses = expenses.filter(e => new Date(e.date).toDateString() === todayStr);
    const todayTotal = todayExpenses.reduce((sum, e) => sum + (parseFloat(e.amount as any) || 0), 0);

    const currentMonthExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const currentMonthTotal = currentMonthExpenses.reduce((sum, e) => sum + (parseFloat(e.amount as any) || 0), 0);

    const promises: Promise<any>[] = [];

    for (let i = 1; i <= 14; i++) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + i);

      // ---- Summary ----
      targetDate.setHours(summaryTime.getHours(), summaryTime.getMinutes(), 0, 0);
      const summaryTotal = i === 1 ? todayTotal : 0;
      
      const summaryTrigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: targetDate.getTime(),
        alarmManager: true,
      };

      promises.push(notifee.createTriggerNotification({
        id: `${SUMMARY_PREFIX}${i}`,
        title: "Yesterday's Summary \uD83D\uDCCA",
        body: `Your total expense for yesterday was ${currency}${summaryTotal}.`,
        android: { channelId: 'daily_accounts', showTimestamp: true, smallIcon: 'ic_notification', pressAction: { id: 'default' } }
      }, summaryTrigger));

      // ---- Reminders ----
      for (let rIndex = 0; rIndex < reminderTimes.length; rIndex++) {
        const rTime = reminderTimes[rIndex];
        const rTargetDate = new Date(targetDate);
        rTargetDate.setHours(rTime.getHours(), rTime.getMinutes(), 0, 0);
        const reminderTrigger: TimestampTrigger = {
          type: TriggerType.TIMESTAMP,
          timestamp: rTargetDate.getTime(),
          alarmManager: true,
        };

        promises.push(notifee.createTriggerNotification({
          id: `${REMINDER_PREFIX}${i}_${rIndex}`,
          title: "Daily Reminder",
          body: "You haven't logged any expenses today. Don't forget to track your spending!",
          android: { channelId: 'daily_accounts', showTimestamp: true, smallIcon: 'ic_notification', pressAction: { id: 'default' } }
        }, reminderTrigger));
      }
    }

    for (let rIndex = 0; rIndex < reminderTimes.length; rIndex++) {
      const rTime = reminderTimes[rIndex];
      if (now.getHours() < rTime.getHours() || (now.getHours() === rTime.getHours() && now.getMinutes() < rTime.getMinutes())) {
        const todayReminder = new Date(now);
        todayReminder.setHours(rTime.getHours(), rTime.getMinutes(), 0, 0);
        
        let reminderBody = "You haven't logged any expenses today. Don't forget to track your spending!";
        if (todayTotal > 0) {
          reminderBody = `You've spent ${currency}${todayTotal} today. Don't forget to log any other expenses!`;
        }

        const trigger: TimestampTrigger = { type: TriggerType.TIMESTAMP, timestamp: todayReminder.getTime(), alarmManager: true };
        promises.push(notifee.createTriggerNotification({
          id: `${REMINDER_PREFIX}0_${rIndex}`,
          title: "Daily Reminder",
          body: reminderBody,
          android: { channelId: 'daily_accounts', showTimestamp: true, smallIcon: 'ic_notification', pressAction: { id: 'default' } }
        }, trigger));
      }
    }

    if (now.getHours() < summaryTime.getHours() || (now.getHours() === summaryTime.getHours() && now.getMinutes() < summaryTime.getMinutes())) {
      const todaySummary = new Date(now);
      todaySummary.setHours(summaryTime.getHours(), summaryTime.getMinutes(), 0, 0);
      
      const yesterdayDate = new Date(now);
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayStr = yesterdayDate.toDateString();
      const yesterdayExpenses = expenses.filter(e => new Date(e.date).toDateString() === yesterdayStr);
      const yesterdayTotal = yesterdayExpenses.reduce((sum, e) => sum + (parseFloat(e.amount as any) || 0), 0);

      const trigger: TimestampTrigger = { type: TriggerType.TIMESTAMP, timestamp: todaySummary.getTime(), alarmManager: true };
      promises.push(notifee.createTriggerNotification({
        id: `${SUMMARY_PREFIX}0`,
        title: "Yesterday's Summary \uD83D\uDCCA",
        body: `Your total expense for yesterday was ${currency}${yesterdayTotal}.`,
        android: { channelId: 'daily_accounts', showTimestamp: true, smallIcon: 'ic_notification', pressAction: { id: 'default' } }
      }, trigger));
    }

    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    nextMonthDate.setHours(summaryTime.getHours(), summaryTime.getMinutes(), 0, 0);
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentMonthName = monthNames[now.getMonth()];

    const trigger: TimestampTrigger = { type: TriggerType.TIMESTAMP, timestamp: nextMonthDate.getTime(), alarmManager: true };
    promises.push(notifee.createTriggerNotification({
      id: `${MONTHLY_PREFIX}`,
      title: "Monthly Summary \uD83D\uDCCA",
      body: `Your total expense for ${currentMonthName} was ${currency}${currentMonthTotal}.`,
      android: { channelId: 'daily_accounts', showTimestamp: true, smallIcon: 'ic_notification', pressAction: { id: 'default' } }
    }, trigger));

    await Promise.all(promises);

  } catch (error) {
    console.log('Error scheduling notifications:', error);
  }
};
