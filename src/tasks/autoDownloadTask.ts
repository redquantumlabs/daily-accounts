import AsyncStorage from '@react-native-async-storage/async-storage';
import SAF from 'react-native-saf-x';
import { Platform } from 'react-native';
import notifee from '@notifee/react-native';
import { generateDashboardPDFHTML, generateAccountTransactionsPDFHTML } from '../utils/pdfGenerator';
import { generatePDF } from 'react-native-html-to-pdf';
import { parseISOYear } from '../utils/dateUtils';

let isPerformingAutoDownload = false;

export const performAutoDownloadTask = async (downloadLabel: string = 'Auto') => {
  if (isPerformingAutoDownload) return;
  isPerformingAutoDownload = true;

  try {
    const downloadPathUri = await AsyncStorage.getItem('@app_download_path');
    if (!downloadPathUri || Platform.OS !== 'android') {
      return;
    }

    const expensesStr = await AsyncStorage.getItem('@app_expenses');
    const categoriesStr = await AsyncStorage.getItem('@app_categories');
    const paymentModesStr = await AsyncStorage.getItem('@app_payment_modes');
    const currency = (await AsyncStorage.getItem('@app_currency')) || '$';


    if (!expensesStr) return;

    const expenses = JSON.parse(expensesStr);
    const categories = categoriesStr ? JSON.parse(categoriesStr) : [];
    const paymentModes = paymentModesStr ? JSON.parse(paymentModesStr) : [];

    // Extract unique years
    const uniqueYears = Array.from(new Set(expenses.map((exp: any) => parseISOYear(exp.date)))).sort((a: any, b: any) => (b as number) - (a as number));

    if (uniqueYears.length === 0) {
      isPerformingAutoDownload = false;
      return;
    }

    for (const year of uniqueYears) {
      const yearExpenses = expenses.filter((exp: any) => parseISOYear(exp.date) === year);

      // 1. Generate Expense Report (Dashboard) for this specific year
      const expenseHtml = generateDashboardPDFHTML(yearExpenses, categories, paymentModes, currency);
      const fileName = `Account - ${year}`;
      const expenseOptions = {
        html: expenseHtml,
        fileName: fileName + `_${new Date().getTime()}`, // temp internal name
        directory: 'Documents',
        base64: true
      };

      const expenseFile = await generatePDF(expenseOptions);

      if (expenseFile.base64) {
        const fullFileName = `${fileName}.pdf`;
        const fileUriString = downloadPathUri + '%2F' + encodeURIComponent(fullFileName);

        // Overwrite if exists
        const fileExists = await SAF.exists(fileUriString);
        if (fileExists) {
          await SAF.unlink(fileUriString);
        }

        const fileUri = await SAF.createFile(downloadPathUri + '%2F' + encodeURIComponent(fullFileName), {
          mimeType: 'application/pdf'
        });
        await SAF.writeFile(fileUri.uri, expenseFile.base64, { encoding: 'base64' });
      }
    }

    const manualAccountsStr = await AsyncStorage.getItem('@app_manual_accounts');
    const accountOrderStr = await AsyncStorage.getItem('@app_account_order');
    const transactionsStr = await AsyncStorage.getItem('@app_account_transactions');

    if (transactionsStr) {
      const manualAccounts = manualAccountsStr ? JSON.parse(manualAccountsStr) : [];
      const accountOrder = accountOrderStr ? JSON.parse(accountOrderStr) : [];
      const allTransactions = JSON.parse(transactionsStr);

      const usedAccounts = new Set([...allTransactions.map((t: any) => t.account), ...manualAccounts]);
      const accountsList = Array.from(usedAccounts);

      accountsList.sort((a: any, b: any) => {
        const idxA = accountOrder.indexOf(a);
        const idxB = accountOrder.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
      });

      const accountGroups = accountsList.map((acc: string) => ({
        accountName: acc,
        transactions: allTransactions.filter((t: any) => t.account === acc)
      })).filter((group: any) => group.transactions.length > 0);

      if (accountGroups.length > 0) {
        const accHtml = generateAccountTransactionsPDFHTML(accountGroups, currency);
        const fileName = 'Transactional Accounts';

        const accOptions = {
          html: accHtml,
          fileName: fileName + `_${new Date().getTime()}`,
          directory: 'Documents',
          base64: true
        };

        const accFile = await generatePDF(accOptions);

        if (accFile.base64) {
          const fullFileName = `${fileName}.pdf`;
          const fileUriString = downloadPathUri + '%2F' + encodeURIComponent(fullFileName);

          const fileExists = await SAF.exists(fileUriString);
          if (fileExists) {
            await SAF.unlink(fileUriString);
          }

          const fileUri = await SAF.createFile(downloadPathUri + '%2F' + encodeURIComponent(fullFileName), {
            mimeType: 'application/pdf'
          });
          await SAF.writeFile(fileUri.uri, accFile.base64, { encoding: 'base64' });
        }
      }
    }

    await notifee.displayNotification({
      title: "Auto Download",
      body: `${downloadLabel} generated successfully.`,
      android: { channelId: 'daily_accounts', showTimestamp: true, smallIcon: 'ic_notification', largeIcon: 'ic_launcher', circularLargeIcon: true }
    });

  } catch (err: any) {
    await AsyncStorage.setItem('@app_pending_auto_download', 'true');
    await notifee.displayNotification({
      title: "Auto Download Paused",
      body: `Auto Download encountered an error: ${err.message}`,
      android: {
        channelId: 'daily_accounts',
        showTimestamp: true,
        smallIcon: 'ic_notification',
        largeIcon: 'ic_launcher',
        circularLargeIcon: true,
        pressAction: { id: 'default' },
        actions: [
          {
            title: 'Retry',
            pressAction: {
              id: 'retry_auto_download'
            }
          }
        ]
      }
    });
  } finally {
    isPerformingAutoDownload = false;
  }
};
