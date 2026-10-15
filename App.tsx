import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { ExpenseProvider } from './src/context/ExpenseContext';
import { TransactionProvider } from './src/context/TransactionContext';
import RootNavigator from './src/navigation/RootNavigator';
import BootSplash from 'react-native-bootsplash';
import { AppState } from 'react-native';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { scheduleAutoBackupTriggers, BACKUP_TRIGGER_PREFIX } from './src/utils/autoBackupScheduler';
import { performBackgroundTasks } from './src/tasks/backgroundTask';
import { scheduleAutoDownloadTriggers, DOWNLOAD_TRIGGER_PREFIX } from './src/utils/autoDownloadScheduler';
import { performAutoDownloadTask } from './src/tasks/autoDownloadTask';
import { SCHEDULED_EXPENSES_TRIGGER_PREFIX } from './src/utils/scheduledExpenseConstants';
import { performScheduledExpenseTask } from './src/tasks/scheduledExpenseTask';

export default function App() {
  useEffect(() => {
    const setupNotifee = async () => {
      await notifee.requestPermission();
      await notifee.createChannel({
          id: 'daily_accounts',
          name: 'Alerts & Reminders',
          importance: AndroidImportance.HIGH,
          sound: 'default',
        });
    };
    setupNotifee().catch(console.error);
    scheduleAutoBackupTriggers().catch(console.error);
    scheduleAutoDownloadTriggers().catch(console.error);

    const unsubscribeForeground = notifee.onForegroundEvent(async ({ type, detail }) => {
      const notificationId = detail.notification?.id;
      if (type === EventType.DELIVERED && notificationId && notificationId.startsWith(BACKUP_TRIGGER_PREFIX)) {
        await performBackgroundTasks('Auto Backup', notificationId);
        await scheduleAutoBackupTriggers();
      } else if (type === EventType.DELIVERED && notificationId && notificationId.startsWith(DOWNLOAD_TRIGGER_PREFIX)) {
        await performAutoDownloadTask('Auto Download', notificationId);
        await scheduleAutoDownloadTriggers();
      } else if (type === EventType.DELIVERED && notificationId && notificationId.startsWith(SCHEDULED_EXPENSES_TRIGGER_PREFIX)) {
        await performScheduledExpenseTask(notificationId);
      }
    });

    const subscription = AppState.addEventListener('change', nextAppState => {
      // Background checks or syncing can be added here if needed
    });

    // Hide BootSplash
    BootSplash.hide({ fade: true }).catch(console.error);

    return () => {
      subscription.remove();
      unsubscribeForeground();
    };
  }, []);


  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <ExpenseProvider>
            <TransactionProvider>
              <ThemeProvider>
                <RootNavigator />
              </ThemeProvider>
            </TransactionProvider>
          </ExpenseProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
