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
import AsyncStorage from '@react-native-async-storage/async-storage';
import SAF from 'react-native-saf-x';
import { Platform, AppState } from 'react-native';
import notifee, { AndroidImportance } from '@notifee/react-native';
import BackgroundFetch from 'react-native-background-fetch';

const BACKGROUND_BACKUP_TASK = 'com.rql.dailyaccounts.BACKGROUND_BACKUP_TASK';

let isPerformingBackgroundTasks = false;

export const performBackgroundTasks = async () => {
  if (isPerformingBackgroundTasks) {
    return;
  }
  isPerformingBackgroundTasks = true;
  try {
    const userCredentialsStr = await AsyncStorage.getItem('@app_user_credentials');
    let userEmail = '';
    if (userCredentialsStr) {
      try {
        const user = JSON.parse(userCredentialsStr);
        if (user && user.email) {
          userEmail = user.email;
        }
      } catch (e) { }
    }

    const backupPathKey = userEmail ? `@app_backup_path_${userEmail}` : '@app_backup_path';
    const backupPathUri = await AsyncStorage.getItem(backupPathKey);

    let backupSkipped = false;
    if (!backupPathUri || Platform.OS !== 'android') {
      backupSkipped = true;
    }

    const last9amKey = userEmail ? `@last_backup_9am_${userEmail}` : '@last_backup_9am';
    const last9pmKey = userEmail ? `@last_backup_9pm_${userEmail}` : '@last_backup_9pm';
    
    const last9AM = await AsyncStorage.getItem(last9amKey);
    const last9PM = await AsyncStorage.getItem(last9pmKey);

    const morningKey = userEmail ? `@app_auto_backup_time_morning_${userEmail}` : '@app_auto_backup_time_morning';
    const eveningKey = userEmail ? `@app_auto_backup_time_evening_${userEmail}` : '@app_auto_backup_time_evening';
    const morningTimeStr = await AsyncStorage.getItem(morningKey);
    const eveningTimeStr = await AsyncStorage.getItem(eveningKey);
    
    let morningTime = new Date();
    morningTime.setHours(9, 0, 0, 0);
    if (morningTimeStr) morningTime = new Date(morningTimeStr);

    let eveningTime = new Date();
    eveningTime.setHours(21, 0, 0, 0);
    if (eveningTimeStr) eveningTime = new Date(eveningTimeStr);

    const now = new Date();
    const todayStr = now.toDateString();
    
    const isPast = (target: Date) => now.getHours() > target.getHours() || (now.getHours() === target.getHours() && now.getMinutes() >= target.getMinutes());

    let shouldBackup = false;
    let backupType = '';
    let backupTypeKey = '';

    if (!backupSkipped) {
      if (isPast(morningTime) && !isPast(eveningTime)) {
        if (last9AM !== todayStr) {
          shouldBackup = true;
          backupType = 'Morning';
          backupTypeKey = last9amKey;
        }
      } else if (isPast(eveningTime)) {
        if (last9PM !== todayStr) {
          shouldBackup = true;
          backupType = 'Evening';
          backupTypeKey = last9pmKey;
        }
      } else if (!isPast(morningTime)) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();
        if (last9PM !== yesterdayStr) {
          shouldBackup = true;
          backupType = 'Evening';
          backupTypeKey = last9pmKey;
        }
      }
    }

    if (!shouldBackup) {
      return;
    }

    const keys = await AsyncStorage.getAllKeys();
    const backupData = await AsyncStorage.getMany(keys);
    const backupString = JSON.stringify(backupData);

    const timestamp = new Date().getTime();
    const filename = `DailyAccountsBackup_${timestamp}.json`;

    // Write to SAF
    const fileUri = await SAF.createFile(backupPathUri + '%2F' + encodeURIComponent(filename), {
      mimeType: 'application/json'
    });
    await SAF.writeFile(fileUri.uri, backupString);

    const allFiles = await SAF.listFiles(backupPathUri!);
    const backupFiles = allFiles.filter((file: any) => {
      return file.name.includes('DailyAccountsBackup_') && file.name.endsWith('.json');
    });

    backupFiles.sort((a: any, b: any) => {
      const getTimestamp = (name: string) => {
        const match = name.match(/DailyAccountsBackup_(\d+)\.json/);
        return match ? parseInt(match[1], 10) : 0;
      };
      return getTimestamp(a.name) - getTimestamp(b.name);
    });

    const maxBackups = 5;
    if (backupFiles.length > maxBackups) {
      const filesToDelete = backupFiles.slice(0, backupFiles.length - maxBackups);
      for (const fileToDelete of filesToDelete) {
        try {
          await SAF.unlink(fileToDelete.uri);
        } catch (e) {
          console.warn('Failed to delete old backup file:', e);
        }
      }
    }

    if (backupType === 'Evening' && !isPast(morningTime)) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      await AsyncStorage.setItem(backupTypeKey, yesterday.toDateString());
    } else {
      await AsyncStorage.setItem(backupTypeKey, todayStr);
    }

    await notifee.displayNotification({
      title: "Backup Complete",
      body: `Daily auto-backup (${backupType}) was successful.`,
      android: { channelId: 'default' }
    });

    return;
  } catch (err: any) {
    await notifee.displayNotification({
      title: "Backup Failed",
      body: `Auto-backup encountered an error: ${err.message}`,
      android: { channelId: 'default' }
    });
    return;
  } finally {
    isPerformingBackgroundTasks = false;
  }
};

async function initBackgroundFetch() {
  await BackgroundFetch.configure({
    minimumFetchInterval: 15,
    stopOnTerminate: false,
    startOnBoot: true,
  }, async (taskId) => {
    await performBackgroundTasks();
    BackgroundFetch.finish(taskId);
  }, (taskId) => {
    BackgroundFetch.finish(taskId);
  });
}

export default function App() {
  useEffect(() => {
    const setupNotifee = async () => {
      await notifee.requestPermission();
      if (Platform.OS === 'android') {
        await notifee.createChannel({
          id: 'default',
          name: 'Default Channel',
          importance: AndroidImportance.HIGH,
        });
      }
    };
    setupNotifee().catch(console.error);
    initBackgroundFetch().catch(console.error);

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
