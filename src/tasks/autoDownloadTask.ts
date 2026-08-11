import AsyncStorage from '@react-native-async-storage/async-storage';
import SAF from 'react-native-saf-x';
import { Platform } from 'react-native';
import notifee from '@notifee/react-native';
import { generateDashboardPDFHTML } from '../utils/pdfGenerator';
import { generatePDF } from 'react-native-html-to-pdf';

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

    // 1. Generate Expense Report (Dashboard)
    const expenseHtml = generateDashboardPDFHTML(expenses, categories, paymentModes, currency);
    const expenseOptions = {
      html: expenseHtml,
      fileName: `Auto_Expense_Report_${downloadLabel.replace(/\s+/g, '_')}_${new Date().getTime()}`,
      directory: 'Documents',
      base64: true
    };
    const expenseFile = await generatePDF(expenseOptions);

    if (expenseFile.base64) {
      const fileName = `Auto_Expense_Report_${downloadLabel.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
      const fileUri = await SAF.createFile(downloadPathUri + '%2F' + encodeURIComponent(fileName), {
        mimeType: 'application/pdf'
      });
      await SAF.writeFile(fileUri.uri, expenseFile.base64, { encoding: 'base64' });
    }


    await notifee.displayNotification({
      title: "Auto Download",
      body: `${downloadLabel} generated successfully.`,
      android: { channelId: 'daily_accounts', showTimestamp: true, smallIcon: 'ic_notification', largeIcon: 'ic_launcher', circularLargeIcon: true }
    });

  } catch (err: any) {
    await notifee.displayNotification({
      title: "Auto Download Failed",
      body: `Auto Download encountered an error: ${err.message}`,
      android: { channelId: 'daily_accounts', showTimestamp: true, smallIcon: 'ic_notification', largeIcon: 'ic_launcher', circularLargeIcon: true }
    });
  } finally {
    isPerformingAutoDownload = false;
  }
};
