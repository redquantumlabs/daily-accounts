import AsyncStorage from '@react-native-async-storage/async-storage';
import SAF from 'react-native-saf-x';
import { Platform } from 'react-native';
import notifee from '@notifee/react-native';

let isPerformingBackgroundTasks = false;

export const performBackgroundTasks = async () => {
  if (isPerformingBackgroundTasks) {
    return;
  }
  isPerformingBackgroundTasks = true;
  try {
    const backupPathKey = '@app_backup_path';
    const backupPathUri = await AsyncStorage.getItem(backupPathKey);

    let backupSkipped = false;
    if (!backupPathUri || Platform.OS !== 'android') {
      backupSkipped = true;
    }

    const last9amKey = '@last_backup_9am';
    const last9pmKey = '@last_backup_9pm';

    const last9AM = await AsyncStorage.getItem(last9amKey);
    const last9PM = await AsyncStorage.getItem(last9pmKey);

    const morningKey = '@app_auto_backup_time_morning';
    const eveningKey = '@app_auto_backup_time_evening';
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
      android: { channelId: 'daily_accounts', showTimestamp: true, smallIcon: 'ic_notification' }
    });

    return;
  } catch (err: any) {
    await notifee.displayNotification({
      title: "Backup Failed",
      body: `Auto-backup encountered an error: ${err.message}`,
      android: { channelId: 'daily_accounts', showTimestamp: true, smallIcon: 'ic_notification' }
    });
    return;
  } finally {
    isPerformingBackgroundTasks = false;
  }
};
