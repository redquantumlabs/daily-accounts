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
import { Platform, AppState } from 'react-native';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { scheduleAutoBackupTriggers } from './src/utils/autoBackupScheduler';
import { performBackgroundTasks } from './src/tasks/backgroundTask';



export default function App() {
  useEffect(() => {
    const setupNotifee = async () => {
      await notifee.requestPermission();
      if (Platform.OS === 'android') {
        await notifee.createChannel({
          id: 'daily_accounts',
          name: 'Alerts & Reminders',
          importance: AndroidImportance.HIGH,
          sound: 'default',
        });
      }
    };
    setupNotifee().catch(console.error);
    scheduleAutoBackupTriggers().catch(console.error);

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        performBackgroundTasks().catch(console.error);
      }
    });

    // Hide BootSplash
    BootSplash.hide({ fade: true }).catch(console.error);

    return () => {
      subscription.remove();
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
