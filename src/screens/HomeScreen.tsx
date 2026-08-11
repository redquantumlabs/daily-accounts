import React, { useState } from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import AppText from '../components/AppText';
import { useTransactionContext } from '../context/TransactionContext';
import { useExpenseContext } from '../context/ExpenseContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { formatAmount } from '../utils/format';
import AddTransactionModal from '../components/AddTransactionModal';
import PremiumCardBackground from '../components/PremiumCardBackground';
import EmptyState from '../components/EmptyState';
import { generateAccountTransactionsPDFHTML } from '../utils/pdfGenerator';
import { generatePDF } from 'react-native-html-to-pdf';
import SAF from 'react-native-saf-x';
import notifee from '@notifee/react-native';
import { Platform } from 'react-native';
import { useAlert } from '../context/AlertContext';

export default function HomeScreen({ navigation }: any) {
  const { showAlert } = useAlert();
  const colors = useThemeColors();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const { accounts, getAccountStats, updateAccountOrder, deleteAccount, excludedFromTotal, showCardStats, transactions } = useTransactionContext();
  const { currency, isAmountsVisible, downloadPathUri } = useExpenseContext();

  const [isTotalBalanceHidden, setIsTotalBalanceHidden] = React.useState(!isAmountsVisible);
  const [hiddenAccounts, setHiddenAccounts] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    setIsTotalBalanceHidden(!isAmountsVisible);
    setHiddenAccounts({});
  }, [isAmountsVisible]);

  const toggleAccountHidden = (acc: string) => {
    setHiddenAccounts(prev => {
      const current = prev[acc] ?? !isAmountsVisible;
      return { ...prev, [acc]: !current };
    });
  };


  let totalBalance = 0;
  let totalCredit = 0;
  let totalDebit = 0;

  accounts.forEach(acc => {
    if (!excludedFromTotal.includes(acc)) {
      const stats = getAccountStats(acc);
      totalBalance += stats.balance;
      totalCredit += stats.totalCredit;
      totalDebit += stats.totalDebit;
    }
  });

  const handleDragEnd = async ({ data }: { data: string[] }) => {
    await updateAccountOrder(data);
  };

  const handleDeleteAccount = (accountName: string) => {
    setActiveDropdown(null);
    showAlert(
      "Delete Account",
      `Are you sure you want to delete "${accountName}" and ALL of its transactions? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteAccount(accountName) }
      ]
    );
  };

  const handleDownloadAllAccountsPDF = async () => {
    setActiveDropdown(null);
    try {
      const accountGroups = accounts.map((acc: string) => ({
        accountName: acc,
        transactions: transactions.filter((t: any) => t.account === acc)
      })).filter(group => group.transactions.length > 0);

      if (accountGroups.length === 0) {
        showAlert('No Transactions', 'There are no transactions to download.');
        return;
      }

      const html = generateAccountTransactionsPDFHTML(accountGroups, currency);
      const fileName = 'Transactional Accounts';

      const options = {
        html,
        fileName: fileName + `_${new Date().getTime()}`,
        directory: 'Documents',
        base64: true
      };

      const file = await generatePDF(options);

      if (file.base64 && downloadPathUri && Platform.OS === 'android') {
        const fullFileName = `${fileName}.pdf`;
        const fileUriString = downloadPathUri + '%2F' + encodeURIComponent(fullFileName);

        const fileExists = await SAF.exists(fileUriString);
        if (fileExists) {
          await SAF.unlink(fileUriString);
        }

        const fileUri = await SAF.createFile(downloadPathUri + '%2F' + encodeURIComponent(fullFileName), {
          mimeType: 'application/pdf'
        });
        await SAF.writeFile(fileUri.uri, file.base64, { encoding: 'base64' });

        if (notifee) {
          await notifee.displayNotification({
            title: "Download Complete",
            body: "Account report saved.",
            android: { channelId: 'daily_accounts', showTimestamp: true, smallIcon: 'ic_notification', largeIcon: 'ic_launcher', circularLargeIcon: true }
          });
        }
        showAlert('Success', 'PDF saved successfully.');
      } else {
        throw new Error("Failed to generate PDF or download path not set.");
      }
    } catch (error) {
      showAlert('Error', 'Failed to generate or save PDF report. ' + error);
    }
  };

  const handleDownloadSingleAccountPDF = async (accountName: string) => {
    setActiveDropdown(null);
    try {
      const accountTransactions = transactions.filter((t: any) => t.account === accountName);
      if (accountTransactions.length === 0) {
        showAlert('No Transactions', `There are no transactions in ${accountName} to download.`);
        return;
      }

      const accountGroups = [{
        accountName,
        transactions: accountTransactions
      }];

      const html = generateAccountTransactionsPDFHTML(accountGroups, currency);
      const fileName = `Account_${accountName}`;

      const options = {
        html,
        fileName: fileName + `_${new Date().getTime()}`,
        directory: 'Documents',
        base64: true
      };

      const file = await generatePDF(options);

      if (file.base64 && downloadPathUri && Platform.OS === 'android') {
        const fullFileName = `${fileName}.pdf`;
        const fileUriString = downloadPathUri + '%2F' + encodeURIComponent(fullFileName);

        const fileExists = await SAF.exists(fileUriString);
        if (fileExists) {
          await SAF.unlink(fileUriString);
        }

        const fileUri = await SAF.createFile(downloadPathUri + '%2F' + encodeURIComponent(fullFileName), {
          mimeType: 'application/pdf'
        });
        await SAF.writeFile(fileUri.uri, file.base64, { encoding: 'base64' });

        if (notifee) {
          await notifee.displayNotification({
            title: "Download Complete",
            body: `${accountName} report saved.`,
            android: { channelId: 'daily_accounts', showTimestamp: true, smallIcon: 'ic_notification', largeIcon: 'ic_launcher', circularLargeIcon: true }
          });
        }
        showAlert('Success', 'PDF saved successfully.');
      } else {
        throw new Error("Failed to generate PDF or download path not set.");
      }
    } catch (error) {
      showAlert('Error', 'Failed to generate or save PDF report. ' + error);
    }
  };

  const renderItem = ({ item: acc, drag, isActive }: RenderItemParams<string>) => {
    const stats = getAccountStats(acc);
    return (
      <ScaleDecorator>
        <TouchableOpacity
          style={[isActive && { transform: [{ scale: 1.05 }], elevation: 8, zIndex: activeDropdown === acc ? 100 : 1 }]}
          onPress={() => {
            if (activeDropdown) {
              setActiveDropdown(null);
            } else {
              navigation.navigate('AccountTransactions', { account: acc });
            }
          }}
          onLongPress={drag}
          activeOpacity={0.8}
        >
          <PremiumCardBackground color={colors.primary}>
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Ionicons name="card" size={24} color="#fff" style={{ marginRight: 8 }} />
                <AppText style={[styles.cardTitle, { color: '#fff' }]}>{acc}</AppText>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => toggleAccountHidden(acc)} style={{ padding: 4, marginRight: 8 }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name={(hiddenAccounts[acc] ?? !isAmountsVisible) ? 'eye-off-outline' : 'eye-outline'} size={20} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setActiveDropdown(activeDropdown === acc ? null : acc)}
                  style={{ padding: 4 }}
                >
                  <Ionicons name="ellipsis-vertical" size={20} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>

                {activeDropdown === acc && (
                  <View style={[styles.dropdownMenu, { backgroundColor: colors.surface }]}>
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        setActiveDropdown(null);
                        navigation.navigate('AccountTransactions', { account: acc });
                      }}
                    >
                      <Ionicons name="eye-outline" size={18} color={colors.text} style={{ marginRight: 8 }} />
                      <AppText style={{ color: colors.text }}>View</AppText>
                    </TouchableOpacity>

                    <View style={{ height: 1, backgroundColor: colors.border }} />

                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => handleDownloadSingleAccountPDF(acc)}
                    >
                      <Ionicons name="download-outline" size={18} color={colors.text} style={{ marginRight: 8 }} />
                      <AppText style={{ color: colors.text }}>Download</AppText>
                    </TouchableOpacity>

                    <View style={{ height: 1, backgroundColor: colors.border }} />

                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => handleDeleteAccount(acc)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ff4444" style={{ marginRight: 8 }} />
                      <AppText style={{ color: '#ff4444' }}>Delete</AppText>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.cardBody}>
              <AppText style={[styles.balanceLabel, { color: 'rgba(255,255,255,0.8)' }]}>Available Balance</AppText>
              <AppText style={[styles.balanceAmount, { color: '#fff' }]}>
                {(hiddenAccounts[acc] ?? !isAmountsVisible) ? '••••••' : `${currency}${formatAmount(stats.balance)}`}
              </AppText>

              {showCardStats && (
                <View style={{ flexDirection: 'row', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Ionicons name="arrow-down-circle" size={16} color="#4CAF50" style={{ marginRight: 4 }} />
                      <AppText style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>CREDIT</AppText>
                    </View>
                    <AppText style={{ fontSize: 16, fontWeight: 'bold', color: '#4CAF50' }}>{(hiddenAccounts[acc] ?? !isAmountsVisible) ? '••••' : `${currency}${formatAmount(stats.totalCredit)}`}</AppText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Ionicons name="arrow-up-circle" size={16} color="#F44336" style={{ marginRight: 4 }} />
                      <AppText style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>DEBIT</AppText>
                    </View>
                    <AppText style={{ fontSize: 16, fontWeight: 'bold', color: '#F44336' }}>{(hiddenAccounts[acc] ?? !isAmountsVisible) ? '••••' : `${currency}${formatAmount(stats.totalDebit)}`}</AppText>
                  </View>
                </View>
              )}
            </View>
          </PremiumCardBackground>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  const listHeader = accounts.length > 0 ? (
    <View style={{ marginBottom: 20 }}>
      <PremiumCardBackground color={colors.primary} style={{ marginBottom: 20 }}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Ionicons name="wallet" size={24} color="#fff" style={{ marginRight: 8 }} />
            <AppText style={[styles.cardTitle, { color: '#fff' }]}>Total Balance</AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setIsTotalBalanceHidden(!isTotalBalanceHidden)} style={{ padding: 4, marginRight: 8 }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name={isTotalBalanceHidden ? 'eye-off-outline' : 'eye-outline'} size={20} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveDropdown(activeDropdown === 'TOTAL_CARD' ? null : 'TOTAL_CARD')} style={{ padding: 4 }}>
              <Ionicons name="ellipsis-vertical" size={20} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>

            {activeDropdown === 'TOTAL_CARD' && (
              <View style={[styles.dropdownMenu, { backgroundColor: colors.surface }]}>
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={handleDownloadAllAccountsPDF}
                >
                  <Ionicons name="download-outline" size={18} color={colors.text} style={{ marginRight: 8 }} />
                  <AppText style={{ color: colors.text }}>Download</AppText>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
        <View style={styles.cardBody}>
          <AppText style={[styles.balanceLabel, { color: 'rgba(255,255,255,0.8)' }]}>Overall Available Balance</AppText>
          <AppText style={[styles.balanceAmount, { color: '#fff', fontSize: 32 }]}>
            {isTotalBalanceHidden ? '••••••' : `${currency}${formatAmount(totalBalance)}`}
          </AppText>

          {showCardStats && (
            <View style={{ flexDirection: 'row', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Ionicons name="arrow-down-circle" size={16} color="#4CAF50" style={{ marginRight: 4 }} />
                  <AppText style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>TOTAL CREDIT</AppText>
                </View>
                <AppText style={{ fontSize: 16, fontWeight: 'bold', color: '#4CAF50' }}>{isTotalBalanceHidden ? '••••' : `${currency}${formatAmount(totalCredit)}`}</AppText>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Ionicons name="arrow-up-circle" size={16} color="#F44336" style={{ marginRight: 4 }} />
                  <AppText style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>TOTAL DEBIT</AppText>
                </View>
                <AppText style={{ fontSize: 16, fontWeight: 'bold', color: '#F44336' }}>{isTotalBalanceHidden ? '••••' : `${currency}${formatAmount(totalDebit)}`}</AppText>
              </View>
            </View>
          )}
        </View>
      </PremiumCardBackground>
      <View style={{ height: 2, backgroundColor: colors.accent, borderRadius: 1 }} />
    </View>
  ) : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      <DraggableFlatList
        data={accounts}
        keyExtractor={item => item}
        onDragEnd={handleDragEnd}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <EmptyState
            icon="business-outline"
            title="No Accounts"
            message="You don't have any accounts set up yet. Accounts are automatically created when you add your first transaction!"
          />
        }
        contentContainerStyle={styles.scrollContent}
        activationDistance={20}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollContent: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 100, // padding for FAB
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardBody: {
    marginTop: 4,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 30,
    right: 0,
    borderRadius: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    minWidth: 120,
    zIndex: 1000,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
  },
});
