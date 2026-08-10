/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import notifee, { EventType } from '@notifee/react-native';
import { performBackgroundTasks } from './src/tasks/backgroundTask';
import { scheduleAutoBackupTriggers, BACKUP_TRIGGER_IDS } from './src/utils/autoBackupScheduler';

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

  if (type === EventType.DELIVERED && notificationId && BACKUP_TRIGGER_IDS.includes(notificationId)) {
    // 1. Run the backup (shows its own "Backup Complete" notification on success)
    await performBackgroundTasks();

    // 2. Dismiss the trigger notification so users don't see "Running backup..."
    await notifee.cancelNotification(notificationId);

    // 3. Reschedule triggers for the next day
    await scheduleAutoBackupTriggers();
  }
});

AppRegistry.registerComponent(appName, () => App);
