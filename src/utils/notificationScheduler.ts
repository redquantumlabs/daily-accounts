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
    
    if (idsToCancel.length > 0) {
      try {
        await notifee.cancelTriggerNotifications(idsToCancel);
      } catch (err) {
        console.warn('Error cancelling old triggers:', err);
      }
    }

    // We append a unique run ID to all new triggers so we NEVER reuse an ID.
    // Reusing IDs immediately after cancelling them causes a race condition in Android's AlarmManager,
    // which results in the new alarms being silently dropped by the OS.
    const RUN_ID = Date.now();

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
        alarmManager: { allowWhileIdle: true },
      };

      promises.push(
        notifee.createTriggerNotification({
          id: `${SUMMARY_PREFIX}${i}_${RUN_ID}`,
          title: "Yesterday's Summary \uD83D\uDCCA",
          body: `Your total expense for yesterday was ${currency}${summaryTotal}.`,
          android: { channelId: 'daily_accounts', showTimestamp: true, smallIcon: 'ic_notification', pressAction: { id: 'default' } }
        }, summaryTrigger).catch(e => console.warn(`Failed to schedule summary ${i}:`, e))
      );

      // ---- Reminders ----
      for (let rIndex = 0; rIndex < reminderTimes.length; rIndex++) {
        const rTime = reminderTimes[rIndex];
        const rTargetDate = new Date(targetDate);
        rTargetDate.setHours(rTime.getHours(), rTime.getMinutes(), 0, 0);
        const reminderTrigger: TimestampTrigger = {
          type: TriggerType.TIMESTAMP,
          timestamp: rTargetDate.getTime(),
          alarmManager: { allowWhileIdle: true },
        };

        promises.push(
          notifee.createTriggerNotification({
            id: `${REMINDER_PREFIX}${i}_${rIndex}_${RUN_ID}`,
            title: "Daily Reminder",
            body: "You haven't logged any expenses today. Don't forget to track your spending!",
            android: { channelId: 'daily_accounts', showTimestamp: true, smallIcon: 'ic_notification', pressAction: { id: 'default' } }
          }, reminderTrigger).catch(e => console.warn(`Failed to schedule reminder ${i}_${rIndex}:`, e))
        );
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

        // Add 1000ms buffer to prevent scheduling in the absolute past if clock ticks over
        const trigger: TimestampTrigger = { type: TriggerType.TIMESTAMP, timestamp: Math.max(todayReminder.getTime(), Date.now() + 1000), alarmManager: { allowWhileIdle: true } };
        promises.push(
          notifee.createTriggerNotification({
            id: `${REMINDER_PREFIX}0_${rIndex}_${RUN_ID}`,
            title: "Daily Reminder",
            body: reminderBody,
            android: { channelId: 'daily_accounts', showTimestamp: true, smallIcon: 'ic_notification', pressAction: { id: 'default' } }
          }, trigger).catch(e => console.warn(`Failed to schedule today reminder ${rIndex}:`, e))
        );
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

      // Add 1000ms buffer
      const trigger: TimestampTrigger = { type: TriggerType.TIMESTAMP, timestamp: Math.max(todaySummary.getTime(), Date.now() + 1000), alarmManager: { allowWhileIdle: true } };
      promises.push(
        notifee.createTriggerNotification({
          id: `${SUMMARY_PREFIX}0_${RUN_ID}`,
          title: "Yesterday's Summary \uD83D\uDCCA",
          body: `Your total expense for yesterday was ${currency}${yesterdayTotal}.`,
          android: { channelId: 'daily_accounts', showTimestamp: true, smallIcon: 'ic_notification', pressAction: { id: 'default' } }
        }, trigger).catch(e => console.warn(`Failed to schedule today summary:`, e))
      );
    }

    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    nextMonthDate.setHours(summaryTime.getHours(), summaryTime.getMinutes(), 0, 0);
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentMonthName = monthNames[now.getMonth()];

    const trigger: TimestampTrigger = { type: TriggerType.TIMESTAMP, timestamp: nextMonthDate.getTime(), alarmManager: { allowWhileIdle: true } };
    promises.push(
      notifee.createTriggerNotification({
        id: `${MONTHLY_PREFIX}_${RUN_ID}`,
        title: "Monthly Summary \uD83D\uDCCA",
        body: `Your total expense for ${currentMonthName} was ${currency}${currentMonthTotal}.`,
        android: { channelId: 'daily_accounts', showTimestamp: true, smallIcon: 'ic_notification', pressAction: { id: 'default' } }
      }, trigger).catch(e => console.warn(`Failed to schedule monthly summary:`, e))
    );

    await Promise.all(promises);

  } catch (error) {
    console.log('Error scheduling notifications:', error);
  }
};
