import AsyncStorage from '@react-native-async-storage/async-storage';
import SAF from 'react-native-saf-x';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { generateDashboardPDFHTML, generateAccountTransactionsPDFHTML } from '../utils/pdfGenerator';
import { generatePDF } from 'react-native-html-to-pdf';
import { parseISOYear } from '../utils/dateUtils';
import { DOWNLOAD_SILENT_CHANNEL_ID } from '../utils/autoDownloadConstants';

const generatePDFWithTimeout = (options: any, timeoutMs: number = 30000): Promise<any> => {
  let timeoutHandle: any;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error('PDF generation timed out')), timeoutMs);
  });
  return Promise.race([generatePDF(options), timeoutPromise]).finally(() => {
    clearTimeout(timeoutHandle);
  });
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let isPerformingAutoDownload = false;

export const performAutoDownloadTask = async (
  downloadLabel: string = 'Auto',
  progressNotificationId?: string
) => {
  if (isPerformingAutoDownload) return;
  isPerformingAutoDownload = true;

  const targetNotificationId = progressNotificationId || 'daily_accounts_download_progress';

  const updateProgress = async (percent: number, statusText: string) => {
    try {
      await notifee.displayNotification({
        id: targetNotificationId,
        title: 'Auto Download',
        body: `${statusText} (${percent}%)`,
        android: {
          channelId: DOWNLOAD_SILENT_CHANNEL_ID,
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
      console.warn('[performAutoDownloadTask] Failed to update progress notification:', e);
    }
  };

  try {
    const downloadPathUri = await AsyncStorage.getItem('@app_download_path');
    if (!downloadPathUri) {
      if (progressNotificationId) {
        await notifee.cancelNotification(progressNotificationId).catch(() => { });
      }
      return;
    }

    await updateProgress(5, 'Preparing reports');

    const expensesStr = await AsyncStorage.getItem('@app_expenses');
    const categoriesStr = await AsyncStorage.getItem('@app_categories');
    const paymentModesStr = await AsyncStorage.getItem('@app_payment_modes');
    const currency = (await AsyncStorage.getItem('@app_currency')) || '$';

    const expenses = expensesStr ? JSON.parse(expensesStr) : [];
    const categories = categoriesStr ? JSON.parse(categoriesStr) : [];
    const paymentModes = paymentModesStr ? JSON.parse(paymentModesStr) : [];

    // Extract unique years
    const uniqueYears = Array.from(new Set(expenses.map((exp: any) => parseISOYear(exp.date)))).sort((a: any, b: any) => (b as number) - (a as number));

    const manualAccountsStr = await AsyncStorage.getItem('@app_manual_accounts');
    const accountOrderStr = await AsyncStorage.getItem('@app_account_order');
    const transactionsStr = await AsyncStorage.getItem('@app_account_transactions');

    const manualAccounts = manualAccountsStr ? JSON.parse(manualAccountsStr) : [];
    const accountOrder = accountOrderStr ? JSON.parse(accountOrderStr) : [];
    const allTransactions = transactionsStr ? JSON.parse(transactionsStr) : [];

    const usedAccounts = new Set([...allTransactions.map((t: any) => t.account), ...manualAccounts]);
    const accountsList = Array.from(usedAccounts);

    accountsList.sort((a: any, b: any) => {
      const idxA = accountOrder.indexOf(a);
      const idxB = accountOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return (a || '').localeCompare(b || '');
    });

    const accountGroups = accountsList.map((acc: string) => ({
      accountName: acc,
      transactions: allTransactions.filter((t: any) => t.account === acc)
    })).filter((group: any) => group.transactions.length > 0);

    const hasAccountReport = accountGroups.length > 0;
    const totalReports = uniqueYears.length + (hasAccountReport ? 1 : 0);

    if (totalReports === 0) {
      await updateProgress(100, 'Report generation completed');
      await delay(300);
    } else {
      let currentReportIndex = 0;
      const reportWeight = 85 / totalReports;

      // 1. Generate Expense Report for each unique year
      for (const year of uniqueYears) {
        const yearExpenses = expenses.filter((exp: any) => parseISOYear(exp.date) === year);
        const startPercent = Math.round(10 + currentReportIndex * reportWeight);
        await updateProgress(startPercent, `Generating Account - ${year}`);

        const expenseHtml = generateDashboardPDFHTML(yearExpenses, categories, paymentModes, currency);
        const fileName = `Account - ${year}`;
        const expenseOptions = {
          html: expenseHtml,
          fileName: fileName + `_${new Date().getTime()}`,
          directory: 'Documents',
          base64: true
        };

        await delay(300);

        let expenseFile: any = null;
        try {
          expenseFile = await generatePDFWithTimeout(expenseOptions);
        } catch (e) {
          console.warn(`[AutoDownloadTask] Failed to generate PDF for year ${year}:`, e);
          currentReportIndex++;
          continue;
        }

        if (expenseFile && expenseFile.base64) {
          const midPercent = Math.round(10 + (currentReportIndex + 0.6) * reportWeight);
          await updateProgress(midPercent, `Saving Account - ${year}`);

          const fullFileName = `${fileName}.pdf`;
          const fileUriString = downloadPathUri + '%2F' + encodeURIComponent(fullFileName);

          const fileExists = await SAF.exists(fileUriString);
          if (fileExists) {
            await SAF.unlink(fileUriString);
          }

          const fileUri = await SAF.createFile(downloadPathUri + '%2F' + encodeURIComponent(fullFileName), {
            mimeType: 'application/pdf'
          });
          await SAF.writeFile(fileUri.uri, expenseFile.base64, { encoding: 'base64' });
        }

        currentReportIndex++;
        const donePercent = Math.round(10 + currentReportIndex * reportWeight);
        await updateProgress(donePercent, `Completed Account - ${year}`);
      }

      // 2. Generate Transactional Accounts report
      if (hasAccountReport) {
        const startPercent = Math.round(10 + currentReportIndex * reportWeight);
        await updateProgress(startPercent, `Generating Transactional Accounts`);

        const accHtml = generateAccountTransactionsPDFHTML(accountGroups, currency);
        const fileName = 'Transactional Accounts';

        const accOptions = {
          html: accHtml,
          fileName: fileName + `_${new Date().getTime()}`,
          directory: 'Documents',
          base64: true
        };

        await delay(300);

        let accFile: any = null;
        try {
          accFile = await generatePDFWithTimeout(accOptions);
        } catch (e) {
          console.warn(`[AutoDownloadTask] Failed to generate Transactional Accounts PDF:`, e);
        }

        if (accFile && accFile.base64) {
          const midPercent = Math.round(10 + (currentReportIndex + 0.6) * reportWeight);
          await updateProgress(midPercent, `Saving Transactional Accounts`);

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

        currentReportIndex++;
      }

      await updateProgress(100, 'Report generation completed');
      await delay(300);
    }

    // Dismiss the progress notification
    await notifee.cancelNotification(targetNotificationId).catch(() => { });

    // Show generated final notification
    await notifee.displayNotification({
      title: "Auto Download",
      body: `${downloadLabel} generated successfully.`,
      android: {
        channelId: 'daily_accounts',
        showTimestamp: true,
        smallIcon: 'ic_notification',
        largeIcon: 'ic_launcher',
        circularLargeIcon: true,
      }
    });

  } catch (err: any) {
    if (targetNotificationId) {
      await notifee.cancelNotification(targetNotificationId).catch(() => { });
    }
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

