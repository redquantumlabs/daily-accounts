import notifee, { TriggerType, TimestampTrigger, AndroidImportance } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BACKUP_TRIGGER_MORNING_ID = 'auto_backup_trigger_morning';
export const BACKUP_TRIGGER_EVENING_ID = 'auto_backup_trigger_evening';
export const BACKUP_TRIGGER_IDS = [BACKUP_TRIGGER_MORNING_ID, BACKUP_TRIGGER_EVENING_ID];

/**
 * Schedules Notifee TriggerType.TIMESTAMP alarms for morning and evening auto-backup.
 * Android's AlarmManager (used by Notifee triggers) fires reliably even when the app is
 * completely closed — unlike react-native-background-fetch which is killed by Android in
 * release builds on battery-optimized devices.
 *
 * When the trigger fires, Notifee wakes up the JS engine and calls onBackgroundEvent in
 * index.js, which runs the backup and reschedules for the next day.
 */
export const scheduleAutoBackupTriggers = async () => {
  try {
    const backupPathUri = await AsyncStorage.getItem('@app_backup_path');

    // Cancel existing backup triggers regardless — we'll reschedule both
    await notifee.cancelTriggerNotification(BACKUP_TRIGGER_MORNING_ID);
    await notifee.cancelTriggerNotification(BACKUP_TRIGGER_EVENING_ID);

    // If no backup path is configured, nothing to schedule
    if (!backupPathUri) {
      return;
    }

    const morningTimeStr = await AsyncStorage.getItem('@app_auto_backup_time_morning');
    const eveningTimeStr = await AsyncStorage.getItem('@app_auto_backup_time_evening');

    let morningHour = 9, morningMinute = 0;
    let eveningHour = 21, eveningMinute = 0;

    if (morningTimeStr) {
      const d = new Date(morningTimeStr);
      morningHour = d.getHours();
      morningMinute = d.getMinutes();
    }
    if (eveningTimeStr) {
      const d = new Date(eveningTimeStr);
      eveningHour = d.getHours();
      eveningMinute = d.getMinutes();
    }

    const now = new Date();

    // --- Morning trigger ---
    const morningTarget = new Date(now);
    morningTarget.setHours(morningHour, morningMinute, 0, 0);
    if (morningTarget.getTime() <= now.getTime()) {
      morningTarget.setDate(morningTarget.getDate() + 1);
    }

    const morningTrigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: morningTarget.getTime(),
    };

    await notifee.createTriggerNotification(
      {
        id: BACKUP_TRIGGER_MORNING_ID,
        title: 'Auto Backup',
        body: 'Running morning backup...',
        android: {
          channelId: 'daily_accounts',
          importance: AndroidImportance.MIN,
          smallIcon: 'ic_notification',
          showTimestamp: false,
          autoCancel: true,
        },
      },
      morningTrigger,
    );

    // --- Evening trigger ---
    const eveningTarget = new Date(now);
    eveningTarget.setHours(eveningHour, eveningMinute, 0, 0);
    if (eveningTarget.getTime() <= now.getTime()) {
      eveningTarget.setDate(eveningTarget.getDate() + 1);
    }

    const eveningTrigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: eveningTarget.getTime(),
    };

    await notifee.createTriggerNotification(
      {
        id: BACKUP_TRIGGER_EVENING_ID,
        title: 'Auto Backup',
        body: 'Running evening backup...',
        android: {
          channelId: 'daily_accounts',
          importance: AndroidImportance.MIN,
          smallIcon: 'ic_notification',
          showTimestamp: false,
          autoCancel: true,
        },
      },
      eveningTrigger,
    );
  } catch (err) {
    console.warn('[AutoBackupScheduler] Failed to schedule triggers:', err);
  }
};
