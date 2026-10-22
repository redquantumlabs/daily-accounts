/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import notifee, { EventType } from '@notifee/react-native';
import { performBackgroundTasks } from './src/tasks/backgroundTask';
import { scheduleAutoBackupTriggers } from './src/utils/autoBackupScheduler';
import { BACKUP_TRIGGER_PREFIX } from './src/utils/backupConstants';
import { performAutoDownloadTask } from './src/tasks/autoDownloadTask';
import { scheduleAutoDownloadTriggers } from './src/utils/autoDownloadScheduler';
import { DOWNLOAD_TRIGGER_PREFIX } from './src/utils/autoDownloadConstants';
import { SCHEDULED_EXPENSES_TRIGGER_PREFIX } from './src/utils/scheduledExpenseConstants';
import { performScheduledExpenseTask } from './src/tasks/scheduledExpenseTask';

/**
 * Notifee background event handler.
 *
 * This runs when the app is fully closed (killed) or in the background.
 * Notifee uses Android's AlarmManager to fire exact-time trigger notifications,
 * which reliably wakes the JS engine in release builds — unlike BackgroundFetch.
 *
 * Flow when the backup trigger alarm fires:
 *   1. Android wakes the app via AlarmManager
 *   2. Notifee fires EventType.DELIVERED for our trigger notification
 *   3. We run the actual backup
 *   4. We dismiss the "Running backup..." trigger notification immediately
 *   5. We reschedule both triggers for the next day
 */
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const notificationId = detail.notification?.id;

  if (type === EventType.DELIVERED && notificationId && notificationId.startsWith(BACKUP_TRIGGER_PREFIX)) {
    await notifee.cancelNotification(notificationId).catch(() => {});
    const label = `Auto Backup`;
    await performBackgroundTasks(label);
    await scheduleAutoBackupTriggers();
  } else if (type === EventType.DELIVERED && notificationId && notificationId.startsWith(DOWNLOAD_TRIGGER_PREFIX)) {
    await notifee.cancelNotification(notificationId).catch(() => {});
    const label = `Auto Download`;
    await performAutoDownloadTask(label);
    await scheduleAutoDownloadTriggers();
  } else if (type === EventType.DELIVERED && notificationId && notificationId.startsWith(SCHEDULED_EXPENSES_TRIGGER_PREFIX)) {
    await performScheduledExpenseTask(notificationId);
  } else if (type === EventType.ACTION_PRESS && detail.pressAction?.id === 'retry_auto_download') {
    if (notificationId) {
      await notifee.cancelNotification(notificationId);
    }
    const label = `Auto Download (Retry)`;
    await performAutoDownloadTask(label);
  }
});

AppRegistry.registerComponent(appName, () => App);
