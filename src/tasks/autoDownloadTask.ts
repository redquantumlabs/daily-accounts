import AsyncStorage from '@react-native-async-storage/async-storage';
import SAF from 'react-native-saf-x';
import { Platform } from 'react-native';
import notifee from '@notifee/react-native';
import { generateDashboardPDFHTML, generateAnalyticsPDFHTML } from '../utils/pdfGenerator';
import { generatePDF } from 'react-native-html-to-pdf';
import { parseISOYear, parseISOMonth } from '../utils/dateUtils';

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
    
    const chartType = (await AsyncStorage.getItem('@app_analytics_chart_type')) as any || 'Pie';
    const chartStyle = (await AsyncStorage.getItem('@app_chart_style')) as any || 'Classic';

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

    // 2. Generate Analytics Report (Filtered for This Month)
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthExpenses = expenses.filter((exp: any) => {
      return parseISOMonth(exp.date) === currentMonth && parseISOYear(exp.date) === currentYear;
    });

    const totalSpent = currentMonthExpenses.reduce((sum: number, exp: any) => sum + exp.amount, 0);

    const categoryTotals: Record<string, number> = {};
    let categoryTotalSum = 0;
    currentMonthExpenses.forEach((exp: any) => {
      const catId = exp.categoryId || 'uncategorized';
      categoryTotals[catId] = (categoryTotals[catId] || 0) + exp.amount;
      categoryTotalSum += exp.amount;
    });

    const categoryData = Object.keys(categoryTotals).map(catId => {
      const cat = categories.find((c: any) => c.id === catId);
      const percentage = categoryTotalSum > 0 ? ((categoryTotals[catId] / categoryTotalSum) * 100).toFixed(2) + '%' : '0.00%';
      return {
        value: categoryTotals[catId],
        color: cat ? cat.color : '#888',
        text: percentage,
        name: cat ? cat.name : '',
        amount: categoryTotals[catId]
      };
    }).sort((a, b) => b.value - a.value);

    const modeTotals: Record<string, number> = {};
    let modeTotalSum = 0;
    currentMonthExpenses.forEach((exp: any) => {
      const modeId = exp.paymentModeId || 'unknown';
      modeTotals[modeId] = (modeTotals[modeId] || 0) + exp.amount;
      modeTotalSum += exp.amount;
    });

    const paymentModeData = Object.keys(modeTotals).map(modeId => {
      const mode = paymentModes.find((m: any) => m.id === modeId);
      const percentage = modeTotalSum > 0 ? ((modeTotals[modeId] / modeTotalSum) * 100).toFixed(2) + '%' : '0.00%';
      return {
        value: modeTotals[modeId],
        name: mode ? mode.name : '',
        amount: modeTotals[modeId],
        color: mode ? mode.color : '#888',
        text: percentage
      };
    }).sort((a, b) => b.amount - a.amount);

    const analyticsHtml = generateAnalyticsPDFHTML('This Month', totalSpent, categoryData, paymentModeData, currency, chartType, chartStyle);
    
    const analyticsOptions = {
      html: analyticsHtml,
      fileName: `Auto_Analytics_Report_${downloadLabel.replace(/\s+/g, '_')}_${new Date().getTime()}`,
      directory: 'Documents',
      base64: true
    };
    const analyticsFile = await generatePDF(analyticsOptions);

    if (analyticsFile.base64) {
      const fileName = `Auto_Analytics_Report_${downloadLabel.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
      const fileUri = await SAF.createFile(downloadPathUri + '%2F' + encodeURIComponent(fileName), {
        mimeType: 'application/pdf'
      });
      await SAF.writeFile(fileUri.uri, analyticsFile.base64, { encoding: 'base64' });
    }

    await notifee.displayNotification({
      title: "Auto Download Complete",
      body: `Daily auto-download (${downloadLabel}) generated successfully.`,
      android: { channelId: 'daily_accounts', showTimestamp: true, smallIcon: 'ic_notification', largeIcon: 'ic_launcher', circularLargeIcon: true }
    });

  } catch (err: any) {
    await notifee.displayNotification({
      title: "Auto Download Failed",
      body: `Auto-download encountered an error: ${err.message}`,
      android: { channelId: 'daily_accounts', showTimestamp: true, smallIcon: 'ic_notification', largeIcon: 'ic_launcher', circularLargeIcon: true }
    });
  } finally {
    isPerformingAutoDownload = false;
  }
};
