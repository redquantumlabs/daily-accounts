import AsyncStorage from '@react-native-async-storage/async-storage';
import SAF from 'react-native-saf-x';
import { Platform } from 'react-native';
import notifee from '@notifee/react-native';

let isPerformingBackgroundTasks = false;

export const performBackgroundTasks = async (backupLabel: string = 'Auto') => {
  if (isPerformingBackgroundTasks) {
    return;
  }
  isPerformingBackgroundTasks = true;
  try {
    const backupPathKey = '@app_backup_path';
    const backupPathUri = await AsyncStorage.getItem(backupPathKey);

    if (!backupPathUri || Platform.OS !== 'android') {
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

    await notifee.displayNotification({
      title: "Backup Complete",
      body: `Auto-backup (${backupLabel}) was successful.`,
      android: { channelId: 'daily_accounts', showTimestamp: true, smallIcon: 'ic_notification', largeIcon: 'ic_launcher', circularLargeIcon: true }
    });

  } catch (err: any) {
    await notifee.displayNotification({
      title: "Backup Failed",
      body: `Auto-backup encountered an error: ${err.message}`,
      android: { channelId: 'daily_accounts', showTimestamp: true, smallIcon: 'ic_notification', largeIcon: 'ic_launcher', circularLargeIcon: true }
    });
  } finally {
    isPerformingBackgroundTasks = false;
  }
};
