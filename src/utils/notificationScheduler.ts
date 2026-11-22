import { Expense } from '../context/ExpenseContext';
import notifee, { TriggerType, TimestampTrigger, RepeatFrequency } from '@notifee/react-native';
import { BACKUP_TRIGGER_PREFIX } from './backupConstants';
import { DOWNLOAD_TRIGGER_PREFIX } from './autoDownloadConstants';
import { roundAmount } from './format';

const SUMMARY_PREFIX = 'summary_';
const REMINDER_PREFIX = 'reminder_';
const MONTHLY_PREFIX = 'monthly_';
const PREV_MONTH_PREFIX = 'prev_month_';

export const scheduleAllNotifications = async (
  expenses: Expense[],
  currency: string,
  summaryTime: Date,
  monthlySummaryTime: Date,
  prevMonthSummaryDay: number,
  prevMonthSummaryTime: Date,
  reminderTimes: Date[]
) => {
  try {
    const existingIds = await notifee.getTriggerNotificationIds();
    const idsToCancel = existingIds.filter(
      id => id.startsWith(SUMMARY_PREFIX) || id.startsWith(REMINDER_PREFIX) || id.startsWith(MONTHLY_PREFIX) || id.startsWith(PREV_MONTH_PREFIX)
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
    const todayTotal = roundAmount(todayExpenses.reduce((sum, e) => sum + (parseFloat(e.amount as any) || 0), 0));

    const yesterdayExpenses = expenses.filter(e => new Date(e.date).toDateString() === yesterdayStr);
    const yesterdayTotal = roundAmount(yesterdayExpenses.reduce((sum, e) => sum + (parseFloat(e.amount as any) || 0), 0));

    const currentMonthExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const currentMonthTotal = roundAmount(currentMonthExpenses.reduce((sum, e) => sum + (parseFloat(e.amount as any) || 0), 0));

    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === prevMonthDate.getMonth() && d.getFullYear() === prevMonthDate.getFullYear();
    });
    const prevMonthTotal = roundAmount(prevMonthExpenses.reduce((sum, e) => sum + (parseFloat(e.amount as any) || 0), 0));

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentMonthName = monthNames[now.getMonth()];
    const prevMonthName = monthNames[prevMonthDate.getMonth()];

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
    // 3. SCHEDULE CURRENT MONTH SUMMARY (Daily)
    // ==========================================
    const isSameTimeAsDaily = summaryTime.getHours() === monthlySummaryTime.getHours() && summaryTime.getMinutes() === monthlySummaryTime.getMinutes();
    const monthlyOffsetMs = isSameTimeAsDaily ? 3000 : 0;

    const isMonthlySummaryFuture = (now.getHours() < monthlySummaryTime.getHours() || (now.getHours() === monthlySummaryTime.getHours() && now.getMinutes() < monthlySummaryTime.getMinutes()));

    // --- A. TODAY'S RUNNING CURRENT MONTH SUMMARY ---
    if (isMonthlySummaryFuture) {
      const todayMonthly = new Date(now);
      todayMonthly.setHours(monthlySummaryTime.getHours(), monthlySummaryTime.getMinutes(), 0, 0);

      const triggerTodayMonthly: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: Math.max(todayMonthly.getTime() + monthlyOffsetMs, Date.now() + 1500),
        alarmManager: { allowWhileIdle: true }
      };

      promises.push(
        notifee.createTriggerNotification({
          id: `${MONTHLY_PREFIX}0_${RUN_ID}`,
          title: "Current Month's Summary \uD83D\uDCCA",
          body: `Your total expense for ${currentMonthName} is ${currency}${currentMonthTotal}.`,
          android: {
            channelId: 'daily_accounts',
            showTimestamp: true,
            smallIcon: 'ic_notification',
            largeIcon: 'ic_launcher',
            circularLargeIcon: true,
            pressAction: { id: 'default' }
          }
        }, triggerTodayMonthly).catch(e => console.warn(`Failed to schedule today current month summary:`, e))
      );
    }

    // --- B. TOMORROW'S RUNNING CURRENT MONTH SUMMARY ---
    const tomorrowMonthly = new Date(now);
    tomorrowMonthly.setDate(tomorrowMonthly.getDate() + 1);
    tomorrowMonthly.setHours(monthlySummaryTime.getHours(), monthlySummaryTime.getMinutes(), 0, 0);

    const triggerTomorrowMonthly: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: tomorrowMonthly.getTime() + monthlyOffsetMs,
      alarmManager: { allowWhileIdle: true }
    };

    promises.push(
      notifee.createTriggerNotification({
        id: `${MONTHLY_PREFIX}1_${RUN_ID}`,
        title: "Current Month's Summary \uD83D\uDCCA",
        body: `Your total expense for ${currentMonthName} is ${currency}${currentMonthTotal}.`,
        android: {
          channelId: 'daily_accounts',
          showTimestamp: true,
          smallIcon: 'ic_notification',
          largeIcon: 'ic_launcher',
          circularLargeIcon: true,
          pressAction: { id: 'default' }
        }
      }, triggerTomorrowMonthly).catch(e => console.warn(`Failed to schedule tomorrow current month summary:`, e))
    );

    // --- C. REPEATING DAILY CURRENT MONTH SUMMARY (Starting day after tomorrow) ---
    const dayAfterTomorrowMonthly = new Date(now);
    dayAfterTomorrowMonthly.setDate(dayAfterTomorrowMonthly.getDate() + 2);
    dayAfterTomorrowMonthly.setHours(monthlySummaryTime.getHours(), monthlySummaryTime.getMinutes(), 0, 0);

    const repeatingMonthlyTrigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: dayAfterTomorrowMonthly.getTime() + monthlyOffsetMs,
      repeatFrequency: RepeatFrequency.DAILY,
      alarmManager: { allowWhileIdle: true }
    };

    promises.push(
      notifee.createTriggerNotification({
        id: `${MONTHLY_PREFIX}REPEAT_${RUN_ID}`,
        title: "Current Month's Summary \uD83D\uDCCA",
        body: `Your monthly expense summary for ${currentMonthName} is ready. Open the app to view it!`,
        android: {
          channelId: 'daily_accounts',
          showTimestamp: true,
          smallIcon: 'ic_notification',
          largeIcon: 'ic_launcher',
          circularLargeIcon: true,
          pressAction: { id: 'default' }
        }
      }, repeatingMonthlyTrigger).catch(e => console.warn(`Failed to schedule repeating current month summary:`, e))
    );

    // ==========================================
    // 4. SCHEDULE PREVIOUS MONTH SUMMARY (Monthly on chosen date)
    // ==========================================
    const prevMonthOffsetMs = 6000;

    for (let offset = 0; offset < 12; offset++) {
      const targetYear = now.getFullYear();
      const targetMonthIndex = now.getMonth() + offset;
      const tempDate = new Date(targetYear, targetMonthIndex, 1);
      const schedYear = tempDate.getFullYear();
      const schedMonth = tempDate.getMonth();

      // Clamp target day to max days in this month
      const maxDaysInSchedMonth = new Date(schedYear, schedMonth + 1, 0).getDate();
      const targetDay = Math.min(prevMonthSummaryDay, maxDaysInSchedMonth);

      const schedDate = new Date(schedYear, schedMonth, targetDay, prevMonthSummaryTime.getHours(), prevMonthSummaryTime.getMinutes(), 0, 0);

      // Skip if this occurrence is already in the past
      if (schedDate.getTime() <= now.getTime()) {
        continue;
      }

      // The "previous month" relative to schedDate
      const prevMonthRefDate = new Date(schedYear, schedMonth - 1, 1);
      const pMonthName = monthNames[prevMonthRefDate.getMonth()];

      let bodyText = `Your total expense for ${pMonthName} is ready. Open the app to view it!`;
      if (offset === 0) {
        bodyText = `Your total expense for ${pMonthName} was ${currency}${prevMonthTotal}.`;
      } else if (offset === 1) {
        bodyText = `Your total expense for ${pMonthName} was ${currency}${currentMonthTotal}.`;
      }

      const triggerMonthlySummary: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: schedDate.getTime() + prevMonthOffsetMs,
        alarmManager: { allowWhileIdle: true }
      };

      promises.push(
        notifee.createTriggerNotification({
          id: `${PREV_MONTH_PREFIX}${offset}_${RUN_ID}`,
          title: "Previous Month Summary \uD83D\uDCCA",
          body: bodyText,
          android: {
            channelId: 'daily_accounts',
            showTimestamp: true,
            smallIcon: 'ic_notification',
            largeIcon: 'ic_launcher',
            circularLargeIcon: true,
            pressAction: { id: 'default' }
          }
        }, triggerMonthlySummary).catch(e => console.warn(`Failed to schedule previous monthly summary for offset ${offset}:`, e))
      );
    }

    await Promise.all(promises);

  } catch (error) {
    console.log('Error scheduling notifications:', error);
  }
};
