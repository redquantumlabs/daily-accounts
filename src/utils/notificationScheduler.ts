import { Expense } from '../context/ExpenseContext';
import notifee, { TriggerType, TimestampTrigger } from '@notifee/react-native';

const SUMMARY_PREFIX = 'summary_';
const REMINDER_PREFIX = 'reminder_';
const MONTHLY_PREFIX = 'monthly_';

export const scheduleAllNotifications = async (expenses: Expense[], currency: string, summaryTime: Date, reminderTimes: Date[]) => {
  try {
    // Cancel ONLY the reminder/summary triggers — NOT the backup triggers which are managed separately
    const allTriggers = await notifee.getTriggerNotificationIds();
    const toCancel = allTriggers.filter(id =>
      id.startsWith(SUMMARY_PREFIX) ||
      id.startsWith(REMINDER_PREFIX) ||
      id.startsWith(MONTHLY_PREFIX),
    );
    if (toCancel.length > 0) {
      await Promise.all(toCancel.map(id => notifee.cancelTriggerNotification(id)));
    }

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
      };

      promises.push(notifee.createTriggerNotification({
        id: `${SUMMARY_PREFIX}${i}`,
        title: "Yesterday's Summary \uD83D\uDCCA",
        body: `Your total expense for yesterday was ${currency}${summaryTotal}.`,
        android: { channelId: 'daily_accounts', showTimestamp: true, smallIcon: 'ic_notification' }
      }, summaryTrigger));

      // ---- Reminders ----
      for (let rIndex = 0; rIndex < reminderTimes.length; rIndex++) {
        const rTime = reminderTimes[rIndex];
        const rTargetDate = new Date(targetDate);
        rTargetDate.setHours(rTime.getHours(), rTime.getMinutes(), 0, 0);
        const reminderTrigger: TimestampTrigger = {
          type: TriggerType.TIMESTAMP,
          timestamp: rTargetDate.getTime(),
        };

        promises.push(notifee.createTriggerNotification({
          id: `${REMINDER_PREFIX}${i}_${rIndex}`,
          title: "Daily Reminder",
          body: "You haven't logged any expenses today. Don't forget to track your spending!",
          android: { channelId: 'daily_accounts', showTimestamp: true, smallIcon: 'ic_notification' }
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

        const trigger: TimestampTrigger = { type: TriggerType.TIMESTAMP, timestamp: todayReminder.getTime() };
        promises.push(notifee.createTriggerNotification({
          id: `${REMINDER_PREFIX}0_${rIndex}`,
          title: "Daily Reminder",
          body: reminderBody,
          android: { channelId: 'daily_accounts', showTimestamp: true, smallIcon: 'ic_notification' }
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

      const trigger: TimestampTrigger = { type: TriggerType.TIMESTAMP, timestamp: todaySummary.getTime() };
      promises.push(notifee.createTriggerNotification({
        id: `${SUMMARY_PREFIX}0`,
        title: "Yesterday's Summary \uD83D\uDCCA",
        body: `Your total expense for yesterday was ${currency}${yesterdayTotal}.`,
        android: { channelId: 'daily_accounts', showTimestamp: true, smallIcon: 'ic_notification' }
      }, trigger));
    }

    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    nextMonthDate.setHours(summaryTime.getHours(), summaryTime.getMinutes(), 0, 0);
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentMonthName = monthNames[now.getMonth()];

    const trigger: TimestampTrigger = { type: TriggerType.TIMESTAMP, timestamp: nextMonthDate.getTime() };
    promises.push(notifee.createTriggerNotification({
      id: `${MONTHLY_PREFIX}`,
      title: "Monthly Summary \uD83D\uDCCA",
      body: `Your total expense for ${currentMonthName} was ${currency}${currentMonthTotal}.`,
      android: { channelId: 'daily_accounts', showTimestamp: true, smallIcon: 'ic_notification' }
    }, trigger));

    await Promise.all(promises);

  } catch (error) {
    console.log('Error scheduling notifications:', error);
  }
};
