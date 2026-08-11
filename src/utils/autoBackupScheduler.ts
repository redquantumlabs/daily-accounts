import notifee, { TriggerType, TimestampTrigger, AndroidImportance } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKUP_TRIGGER_PREFIX } from './backupConstants';

export { BACKUP_TRIGGER_PREFIX } from './backupConstants';

const BACKUP_SILENT_CHANNEL_ID = 'daily_accounts_backup_silent';

export const scheduleAutoBackupTriggers = async () => {
  try {
    const backupPathUri = await AsyncStorage.getItem('@app_backup_path');

    // Fetch all current triggers and cancel backup ones
    const triggerIds = await notifee.getTriggerNotificationIds();
    const backupTriggers = triggerIds.filter(id => id.startsWith(BACKUP_TRIGGER_PREFIX));
    for (const id of backupTriggers) {
      await notifee.cancelTriggerNotification(id);
    }

    if (!backupPathUri) return;

    await notifee.createChannel({
      id: BACKUP_SILENT_CHANNEL_ID,
      name: 'Auto Backup (Silent)',
      importance: AndroidImportance.MIN,
      sound: '',
    });

    const timesStr = await AsyncStorage.getItem('@app_auto_backup_times');
    let times: Date[] = [];
    if (timesStr) {
      try {
        times = JSON.parse(timesStr).map((d: string) => new Date(d));
      } catch (e) {
        times = [new Date(new Date().setHours(9, 0, 0, 0)), new Date(new Date().setHours(21, 0, 0, 0))];
      }
    } else {
      times = [new Date(new Date().setHours(9, 0, 0, 0)), new Date(new Date().setHours(21, 0, 0, 0))];
    }

    const now = new Date();

    for (let i = 0; i < times.length; i++) {
      const time = times[i];
      const target = new Date(now);
      target.setHours(time.getHours(), time.getMinutes(), 0, 0);
      // Add a 60-second buffer to prevent immediate looping if the alarm fires slightly early
      if (target.getTime() <= now.getTime() + 60000) {
        target.setDate(target.getDate() + 1);
      }

      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: target.getTime(),
        alarmManager: true,
      };

      await notifee.createTriggerNotification(
        {
          id: `${BACKUP_TRIGGER_PREFIX}${i}`,
          title: 'Auto Backup',
          body: `Running backup...`,
          android: {
            channelId: BACKUP_SILENT_CHANNEL_ID,
            importance: AndroidImportance.MIN,
            smallIcon: 'ic_notification',
            largeIcon: 'ic_launcher',
            circularLargeIcon: true,
            showTimestamp: true,
            autoCancel: true,
          },
        },
        trigger,
      );
    }
  } catch (err) {
    console.warn('[AutoBackupScheduler] Failed to schedule triggers:', err);
  }
};
