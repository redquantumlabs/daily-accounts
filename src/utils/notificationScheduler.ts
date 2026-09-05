import { Expense } from '../context/ExpenseContext';
import notifee, { TriggerType, TimestampTrigger, RepeatFrequency } from '@notifee/react-native';
import { BACKUP_TRIGGER_PREFIX } from './backupConstants';
import { DOWNLOAD_TRIGGER_PREFIX } from './autoDownloadConstants';

const SUMMARY_PREFIX = 'summary_';
const REMINDER_PREFIX = 'reminder_';
const MONTHLY_PREFIX = 'monthly_';

export const scheduleAllNotifications = async (expenses: Expense[], currency: string, summaryTime: Date, reminderTimes: Date[]) => {
  try {
    const existingIds = await notifee.getTriggerNotificationIds();
    const idsToCancel = existingIds.filter(
      id => !id.startsWith(BACKUP_TRIGGER_PREFIX) && !id.startsWith(DOWNLOAD_TRIGGER_PREFIX)
    );

    if (idsToCancel.length > 0) {
      try {
        await notifee.cancelTriggerNotifications(idsToCancel);
      } catch (err) {
        console.warn('Error cancelling old triggers:', err);
      }
    }

    // We append a unique run ID to all new triggers so we NEVER reuse an ID.
    // Reusing IDs immediately after cancelling them causes a race condition in Android's AlarmManager.
    const RUN_ID = Date.now();

    const now = new Date();
    const todayStr = now.toDateString();
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toDateString();

    const todayExpenses = expenses.filter(e => new Date(e.date).toDateString() === todayStr);
    const todayTotal = todayExpenses.reduce((sum, e) => sum + (parseFloat(e.amount as any) || 0), 0);

    const yesterdayExpenses = expenses.filter(e => new Date(e.date).toDateString() === yesterdayStr);
    const yesterdayTotal = yesterdayExpenses.reduce((sum, e) => sum + (parseFloat(e.amount as any) || 0), 0);

    const currentMonthExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const currentMonthTotal = currentMonthExpenses.reduce((sum, e) => sum + (parseFloat(e.amount as any) || 0), 0);

    const promises: Promise<any>[] = [];

    // ==========================================
    // 1. SCHEDULE DAILY REMINDERS
    // ==========================================
    for (let rIndex = 0; rIndex < reminderTimes.length; rIndex++) {
      const rTime = reminderTimes[rIndex];

      // Determine if today's reminder time has passed
      const isTodayFuture = (now.getHours() < rTime.getHours() || (now.getHours() === rTime.getHours() && now.getMinutes() < rTime.getMinutes()));

      // --- A. TODAY'S ONE-OFF DYNAMIC REMINDER ---
      if (isTodayFuture) {
        const todayReminder = new Date(now);
        todayReminder.setHours(rTime.getHours(), rTime.getMinutes(), 0, 0);

        let reminderBody = "You haven't logged any expenses today. Don't forget to track your spending!";
        if (todayTotal > 0) {
          reminderBody = `You've spent ${currency}${todayTotal} today. Don't forget to log any other expenses!`;
        }

        const triggerToday: TimestampTrigger = { type: TriggerType.TIMESTAMP, timestamp: Math.max(todayReminder.getTime(), Date.now() + 1000), alarmManager: { allowWhileIdle: true } };
        promises.push(
          notifee.createTriggerNotification({
            id: `${REMINDER_PREFIX}0_${rIndex}_${RUN_ID}`,
            title: "Daily Reminder",
            body: reminderBody,
            android: { channelId: 'daily_accounts', showTimestamp: true, smallIcon: 'ic_notification', largeIcon: 'ic_launcher', circularLargeIcon: true, pressAction: { id: 'default' } }
          }, triggerToday).catch(e => console.warn(`Failed to schedule today reminder ${rIndex}:`, e))
        );
      }

      // --- B. REPEATING DAILY REMINDER (Starting tomorrow) ---
      const tomorrowReminder = new Date(now);
      tomorrowReminder.setDate(tomorrowReminder.getDate() + 1);
      tomorrowReminder.setHours(rTime.getHours(), rTime.getMinutes(), 0, 0);

      const repeatingTrigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: tomorrowReminder.getTime(),
        repeatFrequency: RepeatFrequency.DAILY,
        alarmManager: { allowWhileIdle: true }
      };

      promises.push(
        notifee.createTriggerNotification({
          id: `${REMINDER_PREFIX}REPEAT_${rIndex}_${RUN_ID}`,
          title: "Daily Reminder",
          body: "Don't forget to log your daily expenses and track your spending!",
          android: { channelId: 'daily_accounts', showTimestamp: true, smallIcon: 'ic_notification', largeIcon: 'ic_launcher', circularLargeIcon: true, pressAction: { id: 'default' } }
        }, repeatingTrigger).catch(e => console.warn(`Failed to schedule repeating reminder ${rIndex}:`, e))
      );
    }

    // ==========================================
    // 2. SCHEDULE DAILY SUMMARIES
    // ==========================================
    const isSummaryFuture = (now.getHours() < summaryTime.getHours() || (now.getHours() === summaryTime.getHours() && now.getMinutes() < summaryTime.getMinutes()));

    // --- A. TODAY'S ONE-OFF DYNAMIC SUMMARY ---
    if (isSummaryFuture) {
      const todaySummary = new Date(now);
      todaySummary.setHours(summaryTime.getHours(), summaryTime.getMinutes(), 0, 0);

      const triggerTodaySummary: TimestampTrigger = { type: TriggerType.TIMESTAMP, timestamp: Math.max(todaySummary.getTime(), Date.now() + 1000), alarmManager: { allowWhileIdle: true } };
      promises.push(
        notifee.createTriggerNotification({
          id: `${SUMMARY_PREFIX}0_${RUN_ID}`,
          title: "Yesterday's Summary \uD83D\uDCCA",
          body: `Your total expense for yesterday was ${currency}${yesterdayTotal}.`,
          android: { channelId: 'daily_accounts', showTimestamp: true, smallIcon: 'ic_notification', largeIcon: 'ic_launcher', circularLargeIcon: true, pressAction: { id: 'default' } }
        }, triggerTodaySummary).catch(e => console.warn(`Failed to schedule today summary:`, e))
      );
    }

    // --- B. TOMORROW'S ONE-OFF DYNAMIC SUMMARY ---
    // (Uses today's total, because tomorrow, "yesterday" will be today)
    const tomorrowSummary = new Date(now);
    tomorrowSummary.setDate(tomorrowSummary.getDate() + 1);
    tomorrowSummary.setHours(summaryTime.getHours(), summaryTime.getMinutes(), 0, 0);

    const triggerTomorrowSummary: TimestampTrigger = { type: TriggerType.TIMESTAMP, timestamp: tomorrowSummary.getTime(), alarmManager: { allowWhileIdle: true } };
    promises.push(
      notifee.createTriggerNotification({
        id: `${SUMMARY_PREFIX}1_${RUN_ID}`,
        title: "Yesterday's Summary \uD83D\uDCCA",
        body: `Your total expense for yesterday was ${currency}${todayTotal}.`, // Tomorrow, yesterday's total is today's total
        android: { channelId: 'daily_accounts', showTimestamp: true, smallIcon: 'ic_notification', largeIcon: 'ic_launcher', circularLargeIcon: true, pressAction: { id: 'default' } }
      }, triggerTomorrowSummary).catch(e => console.warn(`Failed to schedule tomorrow summary:`, e))
    );

    // --- C. REPEATING DAILY SUMMARY (Starting day after tomorrow) ---
    const dayAfterTomorrowSummary = new Date(now);
    dayAfterTomorrowSummary.setDate(dayAfterTomorrowSummary.getDate() + 2);
    dayAfterTomorrowSummary.setHours(summaryTime.getHours(), summaryTime.getMinutes(), 0, 0);

    const repeatingSummaryTrigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: dayAfterTomorrowSummary.getTime(),
      repeatFrequency: RepeatFrequency.DAILY,
      alarmManager: { allowWhileIdle: true }
    };

    promises.push(
      notifee.createTriggerNotification({
        id: `${SUMMARY_PREFIX}REPEAT_${RUN_ID}`,
        title: "Daily Summary \uD83D\uDCCA",
        body: "Your daily expense summary is ready. Open the app to view it!",
        android: { channelId: 'daily_accounts', showTimestamp: true, smallIcon: 'ic_notification', largeIcon: 'ic_launcher', circularLargeIcon: true, pressAction: { id: 'default' } }
      }, repeatingSummaryTrigger).catch(e => console.warn(`Failed to schedule repeating summary:`, e))
    );

    // ==========================================
    // 3. SCHEDULE MONTHLY SUMMARY
    // ==========================================
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    nextMonthDate.setHours(summaryTime.getHours(), summaryTime.getMinutes(), 0, 0);
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentMonthName = monthNames[now.getMonth()];

    const triggerMonthly: TimestampTrigger = { type: TriggerType.TIMESTAMP, timestamp: nextMonthDate.getTime() + 5000, alarmManager: { allowWhileIdle: true } };
    promises.push(
      notifee.createTriggerNotification({
        id: `${MONTHLY_PREFIX}_${RUN_ID}`,
        title: "Monthly Summary \uD83D\uDCCA",
        body: `Your total expense for ${currentMonthName} was ${currency}${currentMonthTotal}.`,
        android: { channelId: 'daily_accounts', showTimestamp: true, smallIcon: 'ic_notification', largeIcon: 'ic_launcher', circularLargeIcon: true, pressAction: { id: 'default' } }
      }, triggerMonthly).catch(e => console.warn(`Failed to schedule monthly summary:`, e))
    );

    await Promise.all(promises);

  } catch (error) {
    console.log('Error scheduling notifications:', error);
  }
};
