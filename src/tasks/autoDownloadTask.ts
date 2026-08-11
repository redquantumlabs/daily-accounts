import AsyncStorage from '@react-native-async-storage/async-storage';
import SAF from 'react-native-saf-x';
import { Platform } from 'react-native';
import notifee from '@notifee/react-native';
import { generateDashboardPDFHTML } from '../utils/pdfGenerator';
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
