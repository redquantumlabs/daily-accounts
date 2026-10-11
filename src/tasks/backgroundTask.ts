import AsyncStorage from '@react-native-async-storage/async-storage';
import SAF from 'react-native-saf-x';
import { Platform } from 'react-native';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { BACKUP_SILENT_CHANNEL_ID } from '../utils/backupConstants';

let isPerformingBackgroundTasks = false;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const performBackgroundTasks = async (
  backupLabel: string = 'Auto Backup',
  progressNotificationId?: string
) => {
  if (isPerformingBackgroundTasks) {
    return;
  }
  isPerformingBackgroundTasks = true;

  const targetNotificationId = progressNotificationId || 'daily_accounts_backup_progress';

  const updateProgress = async (percent: number, statusText: string) => {
    try {
      await notifee.displayNotification({
        id: targetNotificationId,
        title: 'Auto Backup',
        body: `${statusText} (${percent}%)`,
        android: {
          channelId: BACKUP_SILENT_CHANNEL_ID,
          importance: AndroidImportance.LOW,
          smallIcon: 'ic_notification',
          largeIcon: 'ic_launcher',
          circularLargeIcon: true,
          showTimestamp: true,
          ongoing: true,
          onlyAlertOnce: true,
          progress: {
            max: 100,
            current: Math.min(100, Math.max(0, percent)),
            indeterminate: false,
          },
        },
      });
    } catch (e) {
      console.warn('[performBackgroundTasks] Failed to update progress notification:', e);
    }
  };

  try {
    const backupPathKey = '@app_backup_path';
    const backupPathUri = await AsyncStorage.getItem(backupPathKey);

    if (!backupPathUri || Platform.OS !== 'android') {
      if (progressNotificationId) {
        await notifee.cancelNotification(progressNotificationId).catch(() => {});
      }
      return;
    }

    // Step 1: Initialize
    await updateProgress(10, 'Initializing backup');
    await delay(300);

    // Step 2: Read data
    await updateProgress(25, 'Reading data');
    const keys = await AsyncStorage.getAllKeys();
    const backupData = await AsyncStorage.getMany(keys);
    await delay(250);

    // Step 3: Prepare backup file
    await updateProgress(50, 'Preparing backup file');
    const backupString = JSON.stringify(backupData);
    const timestamp = new Date().getTime();
    const filename = `DailyAccountsBackup_${timestamp}.json`;
    await delay(250);

    // Step 4: Write to storage
    await updateProgress(75, 'Saving backup file');
    const fileUri = await SAF.createFile(backupPathUri + '%2F' + encodeURIComponent(filename), {
      mimeType: 'application/json',
    });
    await SAF.writeFile(fileUri.uri, backupString);
    await delay(250);

    // Step 5: Clean old backups
    await updateProgress(90, 'Cleaning old backups');
    const allFiles = await SAF.listFiles(backupPathUri!);
    const backupFiles = allFiles.filter((file: any) => {
      return file.name && file.name.includes('DailyAccountsBackup_') && file.name.endsWith('.json');
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
      await Promise.all(
        filesToDelete.map(async (fileToDelete) => {
          try {
            await SAF.unlink(fileToDelete.uri);
          } catch (e) {
            console.warn('Failed to delete old backup file:', e);
          }
        })
      );
    }
    await delay(200);

    // Step 6: Complete
    await updateProgress(100, 'Backup complete');
    await delay(300);

    // Dismiss the progress notification
    await notifee.cancelNotification(targetNotificationId).catch(() => {});

    // Show generated final notification
    await notifee.displayNotification({
      title: 'Auto Backup',
      body: `${backupLabel} was successful.`,
      android: {
        channelId: 'daily_accounts',
        showTimestamp: true,
        smallIcon: 'ic_notification',
        largeIcon: 'ic_launcher',
        circularLargeIcon: true,
      },
    });

  } catch (err: any) {
    if (targetNotificationId) {
      await notifee.cancelNotification(targetNotificationId).catch(() => {});
    }
    await notifee.displayNotification({
      title: 'Backup Failed',
      body: `Auto Backup encountered an error: ${err.message}`,
      android: {
        channelId: 'daily_accounts',
        showTimestamp: true,
        smallIcon: 'ic_notification',
        largeIcon: 'ic_launcher',
        circularLargeIcon: true,
      },
    });
  } finally {
    isPerformingBackgroundTasks = false;
  }
};

