import notifee, { TriggerType, TimestampTrigger, AndroidImportance } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DOWNLOAD_TRIGGER_PREFIX } from './autoDownloadConstants';

export { DOWNLOAD_TRIGGER_PREFIX } from './autoDownloadConstants';

const DOWNLOAD_SILENT_CHANNEL_ID = 'daily_accounts_download_silent';

export const scheduleAutoDownloadTriggers = async () => {
  try {
    const downloadPathUri = await AsyncStorage.getItem('@app_download_path');

    // Fetch all current triggers and cancel download ones
    const triggerIds = await notifee.getTriggerNotificationIds();
    const downloadTriggers = triggerIds.filter(id => id.startsWith(DOWNLOAD_TRIGGER_PREFIX));
    for (const id of downloadTriggers) {
      await notifee.cancelTriggerNotification(id);
    }

    if (!downloadPathUri) return;

    await notifee.createChannel({
      id: DOWNLOAD_SILENT_CHANNEL_ID,
      name: 'Auto Download (Silent)',
      importance: AndroidImportance.MIN,
      sound: '',
    });

    const timesStr = await AsyncStorage.getItem('@app_auto_download_times');
    let times: Date[] = [];
    if (timesStr) {
      try {
        times = JSON.parse(timesStr).map((d: string) => new Date(d));
      } catch (e) {
        times = [new Date(new Date().setHours(10, 0, 0, 0)), new Date(new Date().setHours(22, 0, 0, 0))];
      }
    } else {
      times = [new Date(new Date().setHours(10, 0, 0, 0)), new Date(new Date().setHours(22, 0, 0, 0))];
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
          id: `${DOWNLOAD_TRIGGER_PREFIX}${i}`,
          title: 'Auto Download',
          body: `Running report generation...`,
          android: {
            channelId: DOWNLOAD_SILENT_CHANNEL_ID,
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
    console.warn('[AutoDownloadScheduler] Failed to schedule triggers:', err);
  }
};
