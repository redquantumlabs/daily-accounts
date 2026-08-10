import React, { useState } from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import { View, StyleSheet, Switch, TouchableOpacity, Alert, ScrollView, Platform, ActivityIndicator, Modal } from 'react-native';
import AppText from '../components/AppText';
import { useThemeContext, ACCENT_COLORS } from '../context/ThemeContext';
import { useAuthContext } from '../context/AuthContext';
import ImportSheetModal from '../components/ImportSheetModal';
import ImportTransactionalSheetModal from '../components/ImportTransactionalSheetModal';
import { useExpenseContext } from '../context/ExpenseContext';
import { useTransactionContext } from '../context/TransactionContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import DocumentPicker from 'react-native-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import SAF from 'react-native-saf-x';
import notifee from '@notifee/react-native';

export default function SettingsScreen({ navigation }: any) {
  const colors = useThemeColors();
  const { isDarkTheme, toggleTheme, refreshTheme, accentColor, setAccentColor } = useThemeContext();
  const { profileName, refreshAuth } = useAuthContext();
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [isImportTxModalVisible, setIsImportTxModalVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<number | null>(null);
  const [isAccentExpanded, setIsAccentExpanded] = useState(false);
  const [isTotalBalanceExpanded, setIsTotalBalanceExpanded] = useState(false);
  const [isRemindersExpanded, setIsRemindersExpanded] = useState(false);
  const [activePicker, setActivePicker] = useState<'summary' | 'reminder' | 'backupMorning' | 'backupEvening' | null>(null);

  const formatPath = (uri: string | null) => {
    if (!uri) return 'Not Set';
    try {
      const decoded = decodeURIComponent(uri);
      if (decoded.includes('primary:')) {
        const path = decoded.split('primary:')[1];
        return path ? path : 'Internal Storage Root';
      } else if (decoded.includes(':')) {
        const path = decoded.split(':').pop();
        return path ? path : 'Storage Root';
      } else {
        const parts = decoded.split('/');
        return parts.pop() || 'Custom Path';
      }
    } catch (_e) {
      return 'Custom Path';
    }
  };

  const handleSetDownloadPath = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Unsupported', 'Setting a default download path is only available on Android devices due to system limitations.');
      return;
    }
    try {
      const doc = await SAF.openDocumentTree(true);
      if (doc && doc.uri) {
        await updateDownloadPath(doc.uri);
        Alert.alert('Success', 'Download path set successfully! Future PDF reports will be saved here automatically.');
      }
    } catch (e: any) {
      Alert.alert('Error', 'Failed to set download path: ' + e.message);
    }
  };

  const handleSetBackupPath = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Unsupported', 'Setting a default backup path is only available on Android devices due to system limitations.');
      return;
    }
    try {
      const doc = await SAF.openDocumentTree(true);
      if (doc && doc.uri) {
        await updateBackupPath(doc.uri);
        Alert.alert('Success', 'Backup path set successfully! Future backups will be saved here automatically (keeping the last 5).');
      }
    } catch (e: any) {
      Alert.alert('Error', 'Failed to set backup path: ' + e.message);
    }
  };

  const handleBackup = async () => {
    try {
      setIsProcessing(true);
      const keys = await AsyncStorage.getAllKeys();
      const backupData = await AsyncStorage.getMany(keys);
      const backupString = JSON.stringify(backupData);

      if (backupPathUri && Platform.OS === 'android') {
        const timestamp = new Date().getTime();
        const filename = `DailyAccountsBackup_${timestamp}.json`;
        const fileUri = await SAF.createFile(backupPathUri + '%2F' + encodeURIComponent(filename), {
          mimeType: 'application/json'
        });
        await SAF.writeFile(fileUri.uri, backupString);

        const allFiles = await SAF.listFiles(backupPathUri);
        const backupFiles = allFiles.filter(f => f.name.includes('DailyAccountsBackup_') && f.name.endsWith('.json'));

        backupFiles.sort((a, b) => {
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
            await SAF.unlink(fileToDelete.uri);
          }
        }

        await notifee.displayNotification({
          title: "Backup Complete",
          body: "Manual backup saved successfully to your chosen folder.",
          android: { channelId: 'daily_accounts', showTimestamp: true }
        });
        Alert.alert('Success', 'Backup saved successfully to your chosen folder.');
      } else {
        const timestamp = new Date().getTime();
        const fileUri = RNFS.DocumentDirectoryPath + `/DailyAccountsBackup_${timestamp}.json`;
        await RNFS.writeFile(fileUri, backupString, 'utf8');

        await Share.open({
          url: `file://${fileUri}`,
          type: 'application/json',
          title: 'Save Backup'
        });
      }
    } catch (e: any) {
      await notifee.displayNotification({
        title: "Backup Failed",
        body: `Manual backup failed: ${e.message}`,
        android: { channelId: 'daily_accounts', showTimestamp: true }
      });
      Alert.alert('Error', 'Backup failed: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setIsProcessing(true);
      const result = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.json],
        copyTo: 'cachesDirectory'
      });

      if (!result) {
        setIsProcessing(false);
        return;
      }

      const fileUri = result.fileCopyUri || result.uri;
      const fileContent = await RNFS.readFile(fileUri, 'utf8');
      const parsedData = JSON.parse(fileContent);

      if (typeof parsedData !== 'object' || parsedData === null) {
        throw new Error('Invalid backup file format');
      }

      const kvPairs: [string, string][] = Object.entries(parsedData).map(([k, v]) => [k, String(v)]);

      await AsyncStorage.clear();

      setRestoreProgress(0);
      let completed = 0;
      for (const pair of kvPairs) {
        await AsyncStorage.setItem(pair[0], pair[1]);
        completed++;
        setRestoreProgress(Math.round((completed / kvPairs.length) * 100));
        await new Promise(r => setTimeout(r, 0));
      }

      await refreshAuth();
      await refreshTheme();
      await refreshExpenseData();
      await refreshTransactionData();

      await notifee.displayNotification({
        title: "Restore Complete",
        body: "Your data has been successfully restored.",
        android: { channelId: 'daily_accounts', showTimestamp: true }
      });
      Alert.alert('Success', 'Restore Successful! Your data has been loaded instantly.');
    } catch (e: any) {
      await notifee.displayNotification({
        title: "Restore Failed",
        body: `Failed to restore data: ${e.message}`,
        android: { channelId: 'daily_accounts', showTimestamp: true }
      });
      Alert.alert('Restore Failed', 'Restore failed: ' + e.message);
    } finally {
      setIsProcessing(false);
      setRestoreProgress(null);
    }
  };

  const { currency, refreshExpenseData, downloadPathUri, updateDownloadPath, backupPathUri, updateBackupPath, analyticsChartType, summaryTime, updateSummaryTime, reminderTimes, addReminderTime, removeReminderTime, autoBackupTimeMorning, updateAutoBackupTimeMorning, autoBackupTimeEvening, updateAutoBackupTimeEvening, isAmountsVisible, toggleAmountsVisibility } = useExpenseContext();
  const { accounts, excludedFromTotal, toggleAccountInTotal, refreshTransactionData, showCardStats, toggleShowCardStats } = useTransactionContext();

  const handleNav = (screen: string) => {
    requestAnimationFrame(() => {
      navigation.navigate(screen);
    });
  };



  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.group, { backgroundColor: colors.card }]}>
        <AppText style={[styles.sectionTitle, { color: colors.text }]}>Profile</AppText>
        <TouchableOpacity
          style={styles.row}
          onPress={() => handleNav('Profile')}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="person-outline" size={22} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.text, { color: colors.text }]}>
              {profileName?.firstName ? `${profileName.firstName} ${profileName.lastName || ''}`.trim() : 'Set Name'}
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={[styles.group, { backgroundColor: colors.card }]}>
        <AppText style={[styles.sectionTitle, { color: colors.text }]}>Appearance</AppText>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Ionicons name="moon-outline" size={22} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.text, { color: colors.text }]}>Dark Mode</AppText>
          </View>
          <Switch
            trackColor={{ false: '#767577', true: colors.primary }}
            thumbColor={isDarkTheme ? '#ffffff' : '#f4f3f4'}
            onValueChange={toggleTheme}
            value={isDarkTheme}
          />
        </View>

        <View style={styles.divider} />

        <View style={{ padding: 16 }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: isAccentExpanded ? 16 : 0 }}
            onPress={() => setIsAccentExpanded(!isAccentExpanded)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="color-palette-outline" size={22} color={colors.primary} style={styles.icon} />
              <AppText style={[styles.text, { color: colors.text }]}>Accent Color</AppText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {!isAccentExpanded && (
                <View style={[styles.colorSwatch, { width: 24, height: 24, borderRadius: 12, marginRight: 8, backgroundColor: accentColor }]} />
              )}
              <Ionicons name={isAccentExpanded ? "chevron-up" : "chevron-down"} size={20} color={colors.text} />
            </View>
          </TouchableOpacity>

          {isAccentExpanded && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {ACCENT_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  onPress={() => setAccentColor(color)}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color, marginRight: 0 },
                    accentColor === color && { borderWidth: 3, borderColor: colors.text }
                  ]}
                >
                  {accentColor === color && (
                    <Ionicons name="checkmark" size={16} color="#FFF" style={{ textShadowColor: 'rgba(0,0,0,0.3)', textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 } }} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={[styles.group, { backgroundColor: colors.card }]}>
        <AppText style={[styles.sectionTitle, { color: colors.text }]}>Preferences</AppText>
        <TouchableOpacity
          style={styles.row}
          onPress={() => handleNav('Currency')}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="cash-outline" size={22} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.text, { color: colors.text }]}>Currency</AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AppText style={{ color: colors.primary, fontSize: 16, fontWeight: 'bold', marginRight: 8 }}>{currency}</AppText>
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </View>
        </TouchableOpacity>

        <View style={styles.divider} />
        <View style={[styles.row, { paddingVertical: 12 }]}>
          <View style={styles.rowLeft}>
            <Ionicons name="eye-outline" size={22} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.text, { color: colors.text }]}>Show All Amounts</AppText>
          </View>
          <Switch
            value={isAmountsVisible}
            onValueChange={toggleAmountsVisibility}
            trackColor={{ false: '#767577', true: colors.primary }}
            thumbColor={isAmountsVisible ? '#fff' : '#f4f3f4'}
          />
        </View>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.row}
          onPress={() => handleNav('Budget')}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="wallet-outline" size={22} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.text, { color: colors.text }]}>Budget</AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.row}
          onPress={() => handleNav('Income')}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="calendar-outline" size={22} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.text, { color: colors.text }]}>Monthly Income</AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.row}
          onPress={() => handleNav('Categories')}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="pricetag-outline" size={22} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.text, { color: colors.text }]}>Manage Categories</AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.row}
          onPress={() => handleNav('PaymentModes')}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="card-outline" size={22} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.text, { color: colors.text }]}>Payment Modes</AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.row}
          onPress={() => handleNav('AnalyticsChartSettings')}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="bar-chart-outline" size={22} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.text, { color: colors.text }]}>Analytics Chart</AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AppText style={{ color: colors.text, fontSize: 14, marginRight: 8, opacity: 0.7 }}>{analyticsChartType}</AppText>
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </View>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.row}
          onPress={() => handleNav('ManageAccounts')}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="business-outline" size={22} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.text, { color: colors.text }]}>Manage Accounts</AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.row}
          onPress={() => setIsTotalBalanceExpanded(!isTotalBalanceExpanded)}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="calculator-outline" size={22} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.text, { color: colors.text }]}>Include in Total Balance</AppText>
          </View>
          <Ionicons name={isTotalBalanceExpanded ? "chevron-up" : "chevron-down"} size={20} color={colors.text} />
        </TouchableOpacity>

        {isTotalBalanceExpanded && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <AppText style={{ color: colors.textMuted, fontSize: 13, marginBottom: 12 }}>
              Select which accounts should be included in the Total Balance card on the Home screen.
            </AppText>
            {accounts.map(acc => {
              const isIncluded = !excludedFromTotal.includes(acc);
              return (
                <View key={acc} style={[styles.row, { paddingVertical: 8, paddingHorizontal: 0 }]}>
                  <View style={styles.rowLeft}>
                    <Ionicons name="card-outline" size={20} color={colors.text} style={styles.icon} />
                    <AppText style={[styles.text, { color: colors.text }]}>{acc}</AppText>
                  </View>
                  <Switch
                    value={isIncluded}
                    onValueChange={() => toggleAccountInTotal(acc)}
                    trackColor={{ false: '#767577', true: colors.primary }}
                    thumbColor={isIncluded ? '#fff' : '#f4f3f4'}
                  />
                </View>
              );
            })}
            {accounts.length === 0 && (
              <AppText style={{ color: colors.textMuted, fontStyle: 'italic', marginTop: 8 }}>No accounts available.</AppText>
            )}
          </View>
        )}
        <View style={styles.divider} />
        <View style={[styles.row, { paddingVertical: 12 }]}>
          <View style={styles.rowLeft}>
            <Ionicons name="stats-chart-outline" size={22} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.text, { color: colors.text }]}>Show Credit/Debit on Cards</AppText>
          </View>
          <Switch
            value={showCardStats}
            onValueChange={toggleShowCardStats}
            trackColor={{ false: '#767577', true: colors.primary }}
            thumbColor={showCardStats ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={[styles.group, { backgroundColor: colors.card }]}>
        <AppText style={[styles.sectionTitle, { color: colors.text }]}>Automation & Notifications</AppText>

        <TouchableOpacity style={styles.row} onPress={() => setActivePicker('summary')}>
          <View style={styles.rowLeft}>
            <Ionicons name="notifications-outline" size={22} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.text, { color: colors.text }]}>Summary Notification</AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AppText style={{ color: colors.primary, fontSize: 16, fontWeight: 'bold', marginRight: 8 }}>
              {summaryTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </AppText>
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </View>
        </TouchableOpacity>
        <View style={styles.divider} />

        <TouchableOpacity style={styles.row} onPress={() => setIsRemindersExpanded(!isRemindersExpanded)}>
          <View style={styles.rowLeft}>
            <Ionicons name="alarm-outline" size={22} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.text, { color: colors.text }]}>Daily Reminders</AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AppText style={{ color: colors.text, fontSize: 14, marginRight: 8 }}>
              {reminderTimes.length} active
            </AppText>
            <Ionicons name={isRemindersExpanded ? "chevron-down" : "chevron-forward"} size={20} color={colors.text} />
          </View>
        </TouchableOpacity>
        
        {isRemindersExpanded && (
          <View style={{ backgroundColor: isDarkTheme ? '#1e293b' : '#f8fafc', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12, marginHorizontal: 16, marginBottom: 16 }}>
            {reminderTimes.map((rTime, index) => (
              <View key={index} style={[styles.row, { paddingHorizontal: 0, paddingVertical: 12, borderBottomWidth: index < reminderTimes.length - 1 ? 1 : 0, borderBottomColor: colors.border, marginBottom: 0 }]}>
                <View style={styles.rowLeft}>
                  <AppText style={[styles.text, { color: colors.text, fontSize: 15 }]}>Reminder {index + 1}</AppText>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AppText style={{ color: colors.primary, fontSize: 16, fontWeight: 'bold', marginRight: 16 }}>
                    {rTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </AppText>
                  <TouchableOpacity onPress={() => removeReminderTime(index)}>
                    <Ionicons name="trash-outline" size={20} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity style={[styles.row, { paddingHorizontal: 0, paddingBottom: 4, paddingTop: reminderTimes.length > 0 ? 12 : 4, borderTopWidth: reminderTimes.length > 0 ? 1 : 0, borderTopColor: colors.border, marginBottom: 0 }]} onPress={() => setActivePicker('reminder')}>
              <View style={styles.rowLeft}>
                <Ionicons name="add-circle-outline" size={22} color={colors.primary} style={[styles.icon, { marginLeft: 0 }]} />
                <AppText style={[styles.text, { color: colors.primary, fontWeight: 'bold', fontSize: 15 }]}>Add Reminder Time</AppText>
              </View>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.divider} />

        <TouchableOpacity style={styles.row} onPress={() => setActivePicker('backupMorning')}>
          <View style={styles.rowLeft}>
            <Ionicons name="cloud-upload-outline" size={22} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.text, { color: colors.text }]}>Morning Auto Backup</AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AppText style={{ color: colors.primary, fontSize: 16, fontWeight: 'bold', marginRight: 8 }}>
              {autoBackupTimeMorning.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </AppText>
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </View>
        </TouchableOpacity>
        <View style={styles.divider} />

        <TouchableOpacity style={styles.row} onPress={() => setActivePicker('backupEvening')}>
          <View style={styles.rowLeft}>
            <Ionicons name="cloud-upload-outline" size={22} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.text, { color: colors.text }]}>Evening Auto Backup</AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AppText style={{ color: colors.primary, fontSize: 16, fontWeight: 'bold', marginRight: 8 }}>
              {autoBackupTimeEvening.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </AppText>
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </View>
        </TouchableOpacity>

      </View>

      <View style={[styles.group, { backgroundColor: colors.card }]}>
        <AppText style={[styles.sectionTitle, { color: colors.text }]}>Data Management</AppText>
        <TouchableOpacity
          style={styles.row}
          onPress={() => setIsImportModalVisible(true)}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="document-text-outline" size={22} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.text, { color: colors.text }]}>Import from Google Sheets</AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.row}
          onPress={() => setIsImportTxModalVisible(true)}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="layers-outline" size={22} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.text, { color: colors.text }]}>Import Transactional Data</AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={[styles.row, { opacity: isProcessing ? 0.5 : 1 }]}
          onPress={handleBackup}
          disabled={isProcessing}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="save-outline" size={22} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.text, { color: colors.text }]}>Backup Data</AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={[styles.row, { opacity: isProcessing ? 0.5 : 1 }]}
          onPress={() => {
            Alert.alert(
              "Restore Data",
              "WARNING: This will completely overwrite all current expenses, categories, settings, and profile data with the backup file. This cannot be undone.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Proceed", style: "destructive", onPress: handleRestore }
              ]
            );
          }}
          disabled={isProcessing}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="cloud-download-outline" size={22} color={colors.primary} style={styles.icon} />
            <AppText style={[styles.text, { color: colors.text }]}>Restore Data</AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
        {Platform.OS === 'android' && (
          <>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.row}
              onPress={handleSetDownloadPath}
            >
              <View style={styles.rowLeft}>
                <Ionicons name="folder-outline" size={22} color={colors.primary} style={styles.icon} />
                <AppText style={[styles.text, { color: colors.text }]}>Download Path</AppText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end', marginLeft: 20 }}>
                <AppText style={{ color: colors.primary, fontSize: 12, marginRight: 8, flexShrink: 1 }} numberOfLines={1} ellipsizeMode="middle">
                  {formatPath(downloadPathUri)}
                </AppText>
                {downloadPathUri ? (
                  <TouchableOpacity onPress={() => updateDownloadPath(null)} style={{ padding: 4 }}>
                    <Ionicons name="close-circle" size={20} color="#ff4444" />
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={colors.text} />
                )}
              </View>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.row}
              onPress={handleSetBackupPath}
            >
              <View style={styles.rowLeft}>
                <Ionicons name="folder-outline" size={22} color={colors.primary} style={styles.icon} />
                <AppText style={[styles.text, { color: colors.text }]}>Backup Path</AppText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end', marginLeft: 20 }}>
                <AppText style={{ color: colors.primary, fontSize: 12, marginRight: 8, flexShrink: 1 }} numberOfLines={1} ellipsizeMode="middle">
                  {formatPath(backupPathUri)}
                </AppText>
                {backupPathUri ? (
                  <TouchableOpacity onPress={() => updateBackupPath(null)} style={{ padding: 4 }}>
                    <Ionicons name="close-circle" size={20} color="#ff4444" />
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={colors.text} />
                )}
              </View>
            </TouchableOpacity>
          </>
        )}
      </View>

      <ImportSheetModal
        visible={isImportModalVisible}
        onClose={() => setIsImportModalVisible(false)}
      />

      <ImportTransactionalSheetModal
        visible={isImportTxModalVisible}
        onClose={() => setIsImportTxModalVisible(false)}
      />

      <Modal visible={isProcessing} transparent animationType="fade">
        <View style={styles.processingOverlay}>
          <View style={[styles.processingBox, { backgroundColor: colors.card }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <AppText style={[styles.processingText, { color: colors.text }]}>
              {restoreProgress !== null ? `Restoring... ${restoreProgress}%` : 'Processing...'}
            </AppText>
          </View>
        </View>
      </Modal>

      {activePicker && (
        <DateTimePicker
          value={
            activePicker === 'summary' ? summaryTime :
              activePicker === 'reminder' ? new Date() :
                activePicker === 'backupMorning' ? autoBackupTimeMorning :
                  autoBackupTimeEvening
          }
          mode="time"
          is24Hour={false}
          display="default"
          onChange={(event, selectedDate) => {
            const currentPicker = activePicker;
            setActivePicker(null);
            if (selectedDate && event.type !== 'dismissed') {
              if (currentPicker === 'summary') updateSummaryTime(selectedDate);
              else if (currentPicker === 'reminder') addReminderTime(selectedDate);
              else if (currentPicker === 'backupMorning') updateAutoBackupTimeMorning(selectedDate);
              else if (currentPicker === 'backupEvening') updateAutoBackupTimeEvening(selectedDate);
            }
          }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
  },
  group: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    height: 52,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 16,
    width: 24,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#888',
    opacity: 0.3,
    marginLeft: 54,
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 15,
    marginTop: 15,
    marginBottom: 5,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingBox: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  processingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: 'bold',
  },
});




