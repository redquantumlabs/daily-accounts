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
    const triggerIndex = notificationId.replace(BACKUP_TRIGGER_PREFIX, '');
    const label = `Auto Backup ${parseInt(triggerIndex, 10) + 1}`;
    await performBackgroundTasks(label);
    await notifee.cancelNotification(notificationId);
    await scheduleAutoBackupTriggers();
  } else if (type === EventType.DELIVERED && notificationId && notificationId.startsWith(DOWNLOAD_TRIGGER_PREFIX)) {
    const triggerIndex = notificationId.replace(DOWNLOAD_TRIGGER_PREFIX, '');
    const label = `Auto Download ${parseInt(triggerIndex, 10) + 1}`;
    await performAutoDownloadTask(label);
    await notifee.cancelNotification(notificationId);
    await scheduleAutoDownloadTriggers();
  }
});

AppRegistry.registerComponent(appName, () => App);
