import AsyncStorage from '@react-native-async-storage/async-storage';
import SAF from 'react-native-saf-x';
import notifee, { AndroidImportance, AndroidStyle } from '@notifee/react-native';
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

const savePdfFileSafely = async (
  downloadPathUri: string,
  fileName: string,
  base64Data: string
) => {
  const fullFileName = `${fileName}.pdf`;
  const fileUriString = downloadPathUri + '%2F' + encodeURIComponent(fullFileName);

  try {
    const fileExists = await SAF.exists(fileUriString);
    if (fileExists) {
      await SAF.unlink(fileUriString).catch(() => {});
    }
  } catch (e) {}

  let fileUri: any;
  try {
    fileUri = await SAF.createFile(fileUriString, {
      mimeType: 'application/pdf',
    });
  } catch (createErr) {
    try {
      await SAF.unlink(fileUriString).catch(() => {});
      fileUri = await SAF.createFile(fileUriString, {
        mimeType: 'application/pdf',
      });
    } catch (retryErr) {
      fileUri = { uri: fileUriString };
    }
  }

  await SAF.writeFile(fileUri.uri, base64Data, { encoding: 'base64' });
};

let isPerformingAutoDownload = false;

export const performAutoDownloadTask = async (
  downloadLabel: string = 'Auto',
  progressNotificationId?: string,
  targetReports?: string[]
) => {
  if (isPerformingAutoDownload) return;
  isPerformingAutoDownload = true;

  // Never use a trigger prefix ID for ongoing progress notifications to prevent recursive trigger delivery loops
  const targetNotificationId = (progressNotificationId && !progressNotificationId.startsWith('daily_accounts_download_trigger_'))
    ? progressNotificationId
    : 'daily_accounts_download_progress';

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
          autoCancel: false,
          pressAction: {
            id: 'default',
          },
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
      await notifee.stopForegroundService().catch(() => {});
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

    let activeTargetReports = targetReports;
    if (!activeTargetReports && downloadLabel.toLowerCase().includes('retry')) {
      try {
        const saved = await AsyncStorage.getItem('@app_skipped_auto_download_reports');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            activeTargetReports = parsed;
          }
        }
      } catch (e) {
        console.warn('[AutoDownloadTask] Failed to read saved skipped reports:', e);
      }
    }

    const yearsToRun = uniqueYears.filter((year: any) =>
      !activeTargetReports || activeTargetReports.includes(`Account - ${year}`)
    );

    const shouldRunAccountReport = hasAccountReport && (
      !activeTargetReports || activeTargetReports.includes('Transactional Accounts')
    );

    const totalReportsToRun = yearsToRun.length + (shouldRunAccountReport ? 1 : 0);
    const skippedReports: string[] = [];
    let generatedCount = 0;

    if (totalReportsToRun === 0) {
      await updateProgress(100, 'Report generation completed');
      await delay(300);
      await notifee.stopForegroundService().catch(() => { });
      await notifee.cancelNotification(targetNotificationId).catch(() => { });
      await AsyncStorage.removeItem('@app_pending_auto_download').catch(() => { });
      await AsyncStorage.removeItem('@app_skipped_auto_download_reports').catch(() => { });
      return;
    }

    let currentReportIndex = 0;
    const reportWeight = 85 / totalReportsToRun;

    // 1. Generate Expense Report for each targeted unique year
    for (const year of yearsToRun) {
      const reportName = `Account - ${year}`;
      const yearExpenses = expenses.filter((exp: any) => parseISOYear(exp.date) === year);
      const startPercent = Math.round(10 + currentReportIndex * reportWeight);
      await updateProgress(startPercent, `Generating ${reportName}`);

      const expenseHtml = generateDashboardPDFHTML(yearExpenses, categories, paymentModes, currency);
      const fileName = reportName;
      const expenseOptions = {
        html: expenseHtml,
        fileName: fileName + `_${new Date().getTime()}`,
        directory: 'Documents',
        base64: true,
        forceReset: true,
      };

      await delay(300);

      let expenseFile: any = null;
      try {
        expenseFile = await generatePDFWithTimeout(expenseOptions, 30000);
      } catch (e) {
        console.warn(`[AutoDownloadTask] Failed to generate PDF for ${reportName}:`, e);
      }

      let isSaved = false;
      if (expenseFile && expenseFile.base64) {
        try {
          const midPercent = Math.round(10 + (currentReportIndex + 0.6) * reportWeight);
          await updateProgress(midPercent, `Saving ${reportName}`);
          await savePdfFileSafely(downloadPathUri, fileName, expenseFile.base64);
          isSaved = true;
          generatedCount++;
        } catch (saveErr) {
          console.warn(`[AutoDownloadTask] Failed to save PDF for ${reportName}:`, saveErr);
        }
      }

      if (!isSaved) {
        skippedReports.push(reportName);
      }

      currentReportIndex++;
      const donePercent = Math.round(10 + currentReportIndex * reportWeight);
      await updateProgress(donePercent, isSaved ? `Completed ${reportName}` : `Skipped ${reportName}`);
      await delay(300);
    }

    // 2. Generate Transactional Accounts report
    if (shouldRunAccountReport) {
      const reportName = 'Transactional Accounts';
      const startPercent = Math.round(10 + currentReportIndex * reportWeight);
      await updateProgress(startPercent, `Generating ${reportName}`);

      const accHtml = generateAccountTransactionsPDFHTML(accountGroups, currency);
      const fileName = reportName;

      const accOptions = {
        html: accHtml,
        fileName: fileName + `_${new Date().getTime()}`,
        directory: 'Documents',
        base64: true,
        forceReset: true,
      };

      await delay(300);

      let accFile: any = null;
      try {
        accFile = await generatePDFWithTimeout(accOptions, 30000);
      } catch (e) {
        console.warn(`[AutoDownloadTask] Failed to generate ${reportName} PDF:`, e);
      }

      let isSaved = false;
      if (accFile && accFile.base64) {
        try {
          const midPercent = Math.round(10 + (currentReportIndex + 0.6) * reportWeight);
          await updateProgress(midPercent, `Saving ${reportName}`);
          await savePdfFileSafely(downloadPathUri, fileName, accFile.base64);
          isSaved = true;
          generatedCount++;
        } catch (saveErr) {
          console.warn(`[AutoDownloadTask] Failed to save ${reportName} PDF:`, saveErr);
        }
      }

      if (!isSaved) {
        skippedReports.push(reportName);
      }

      currentReportIndex++;
      const donePercent = Math.round(10 + currentReportIndex * reportWeight);
      await updateProgress(donePercent, isSaved ? `Completed ${reportName}` : `Skipped ${reportName}`);
      await delay(300);
    }

    await updateProgress(100, 'Report generation completed');
    await delay(300);

    // Stop foreground service and dismiss the progress notification
    await notifee.stopForegroundService().catch(() => { });
    await notifee.cancelNotification(targetNotificationId).catch(() => { });

    if (skippedReports.length === 0) {
      await AsyncStorage.removeItem('@app_pending_auto_download').catch(() => { });
      await AsyncStorage.removeItem('@app_skipped_auto_download_reports').catch(() => { });

      const successBody = activeTargetReports && activeTargetReports.length > 0
        ? `${activeTargetReports.join(', ')} generated successfully.`
        : `${downloadLabel} generated successfully.`;

      await notifee.displayNotification({
        title: "Auto Download",
        body: successBody,
        android: {
          channelId: 'daily_accounts',
          showTimestamp: true,
          smallIcon: 'ic_notification',
          largeIcon: 'ic_launcher',
          circularLargeIcon: true,
          pressAction: { id: 'default' },
        }
      });
    } else {
      await AsyncStorage.setItem('@app_pending_auto_download', 'true');
      await AsyncStorage.setItem('@app_skipped_auto_download_reports', JSON.stringify(skippedReports));

      const skippedListStr = skippedReports.join(', ');
      const notifBody = generatedCount > 0
        ? `Generated ${generatedCount}/${totalReportsToRun} reports. Skipped: ${skippedListStr}.`
        : `Could not generate reports. Skipped: ${skippedListStr}.`;

      const bigText = generatedCount > 0
        ? `${downloadLabel} completed with ${generatedCount} of ${totalReportsToRun} reports generated successfully.\n\nSkipped: ${skippedListStr}.\nTap Retry to download the skipped report.`
        : `Failed to generate reports.\n\nSkipped: ${skippedListStr}.\nTap Retry to download the skipped report.`;

      await notifee.displayNotification({
        title: "Auto Download",
        body: notifBody,
        data: {
          label: 'Auto Download (Retry)',
          skippedReports: JSON.stringify(skippedReports),
        },
        android: {
          channelId: 'daily_accounts',
          showTimestamp: true,
          smallIcon: 'ic_notification',
          largeIcon: 'ic_launcher',
          circularLargeIcon: true,
          pressAction: { id: 'default' },
          style: {
            type: AndroidStyle.BIGTEXT,
            text: bigText,
          },
          actions: [
            {
              title: 'Retry',
              pressAction: {
                id: 'retry_auto_download',
              },
            },
          ],
        },
      });
    }

  } catch (err: any) {
    await notifee.stopForegroundService().catch(() => { });
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
