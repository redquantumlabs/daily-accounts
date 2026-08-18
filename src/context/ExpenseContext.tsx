import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthContext } from './AuthContext';
import { parseISOYear, parseISOMonth } from '../utils/dateUtils';
import { scheduleAllNotifications } from '../utils/notificationScheduler';

export interface Expense {
  id: string;
  amount: number;
  description: string;
  date: string; // ISO string
  categoryId?: string;
  paymentModeId?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  yearlyBudget?: number;
}

export interface PaymentMode {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface ExpenseContextType {
  expenses: Expense[];
  categories: Category[];
  paymentModes: PaymentMode[];
  currency: string;
  monthlyBudget: number;
  yearlyBudget: number;
  showMonthlyBudget: boolean;
  showYearlyBudget: boolean;
  showYearCard: boolean;
  analyticsChartType: 'Pie' | 'Donut';
  chartStyle: 'Classic' | '3D' | 'Spaced' | 'Semi-Circle';
  isPreciseTimeElapsed: boolean;
  togglePreciseTimeElapsed: (val: boolean) => Promise<void>;
  monthlyIncomes: Record<string, number>;
  addExpense: (amount: number, description: string, date: Date, categoryId?: string, paymentModeId?: string) => Promise<void>;
  updateExpense: (id: string, amount: number, description: string, date: Date, categoryId?: string, paymentModeId?: string) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  bulkDeleteExpenses: (ids: string[]) => Promise<void>;
  reorderExpensesByDate: (dateStr: string, reorderedDayExpenses: Expense[]) => Promise<void>;
  
  updateMonthlyIncome: (monthYear: string, amount: number) => Promise<void>;
  
  addCategory: (name: string, icon: string, color: string) => Promise<void>;
  updateCategory: (id: string, name: string, icon: string, color: string) => Promise<void>;
  updateCategoryBudget: (id: string, yearlyBudget: number) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  bulkDeleteCategories: (ids: string[]) => Promise<void>;

  addPaymentMode: (name: string, icon: string, color: string) => Promise<void>;
  updatePaymentMode: (id: string, name: string, icon: string, color: string) => Promise<void>;
  deletePaymentMode: (id: string) => Promise<void>;
  bulkDeletePaymentModes: (ids: string[]) => Promise<void>;

  bulkImport: (newExpenses: Expense[], newCategories: Category[], newPaymentModes: PaymentMode[]) => Promise<void>;

  updateCurrency: (newCurrency: string) => Promise<void>;
  updateBudgets: (monthly: number, yearly: number) => Promise<void>;
  toggleShowMonthlyBudget: (val: boolean) => Promise<void>;
  isAmountsVisible: boolean;
  toggleAmountsVisibility: (val: boolean) => Promise<void>;
  toggleShowYearlyBudget: (val: boolean) => Promise<void>;
  toggleShowYearCard: (val: boolean) => Promise<void>;
  updateAnalyticsChartType: (type: 'Pie' | 'Donut') => Promise<void>;
  updateChartStyle: (style: 'Classic' | '3D' | 'Spaced' | 'Semi-Circle') => Promise<void>;
  getCurrentMonthTotal: () => number;
  getPreviousMonthTotal: () => number;
  refreshExpenseData: () => Promise<void>;
  isLoading: boolean;
  downloadPathUri: string | null;
  updateDownloadPath: (uri: string | null) => Promise<void>;
  backupPathUri: string | null;
  updateBackupPath: (uri: string | null) => Promise<void>;
  migrateUserEmail: (oldEmail: string, newEmail: string) => Promise<void>;
  summaryTime: Date;
  reminderTimes: Date[];
  autoBackupTimes: Date[];
  autoDownloadTimes: Date[];
  updateSummaryTime: (date: Date) => Promise<void>;
  addReminderTime: (date: Date) => Promise<void>;
  removeReminderTime: (index: number) => Promise<void>;
  addAutoBackupTime: (date: Date) => Promise<void>;
  removeAutoBackupTime: (index: number) => Promise<void>;
  addAutoDownloadTime: (date: Date) => Promise<void>;
  removeAutoDownloadTime: (index: number) => Promise<void>;
}

const ExpenseContext = createContext<ExpenseContextType>({
  expenses: [],
  categories: [],
  paymentModes: [],
  currency: '$',
  monthlyBudget: 0,
  yearlyBudget: 0,
  showMonthlyBudget: true,
  showYearlyBudget: true,
  showYearCard: true,
  isAmountsVisible: false,
  analyticsChartType: 'Pie',
  chartStyle: 'Classic',
  isPreciseTimeElapsed: false,
  togglePreciseTimeElapsed: async () => {},
  monthlyIncomes: {},
  addExpense: async () => {},
  updateExpense: async () => {},
  deleteExpense: async () => {},
  bulkDeleteExpenses: async () => {},
  reorderExpensesByDate: async () => {},
  updateMonthlyIncome: async () => {},
  addCategory: async () => {},
  updateCategory: async () => {},
  updateCategoryBudget: async () => {},
  deleteCategory: async () => {},
  bulkDeleteCategories: async () => {},
  addPaymentMode: async () => {},
  updatePaymentMode: async () => {},
  deletePaymentMode: async () => {},
  bulkDeletePaymentModes: async () => {},
  bulkImport: async () => {},
  updateCurrency: async () => {},
  updateBudgets: async () => {},
  toggleShowMonthlyBudget: async () => {},
  toggleAmountsVisibility: async () => {},
  toggleShowYearlyBudget: async () => {},
  toggleShowYearCard: async () => {},
  updateAnalyticsChartType: async () => {},
  updateChartStyle: async () => {},
  getCurrentMonthTotal: () => 0,
  getPreviousMonthTotal: () => 0,
  refreshExpenseData: async () => {},
  isLoading: true,
  downloadPathUri: null,
  updateDownloadPath: async () => {},
  backupPathUri: null,
  updateBackupPath: async () => {},
  migrateUserEmail: async () => {},
  summaryTime: new Date(new Date().setHours(8, 0, 0, 0)),
  reminderTimes: [new Date(new Date().setHours(18, 0, 0, 0))],
  autoBackupTimes: [new Date(new Date().setHours(9, 0, 0, 0)), new Date(new Date().setHours(21, 0, 0, 0))],
  autoDownloadTimes: [new Date(new Date().setHours(10, 0, 0, 0)), new Date(new Date().setHours(22, 0, 0, 0))],
  updateSummaryTime: async () => {},
  addReminderTime: async () => {},
  removeReminderTime: async () => {},
  addAutoBackupTime: async () => {},
  removeAutoBackupTime: async () => {},
  addAutoDownloadTime: async () => {},
  removeAutoDownloadTime: async () => {},
});

export const useExpenseContext = () => useContext(ExpenseContext);

const EXPENSES_KEY = '@app_expenses';
const CATEGORIES_KEY = '@app_categories';
const PAYMENT_MODES_KEY = '@app_payment_modes';
const AMOUNTS_VISIBLE_KEY = '@app_amounts_visible';
const CURRENCY_KEY = '@app_currency';
const BUDGET_KEY = '@app_budgets';
const SHOW_MONTHLY_BUDGET_KEY = '@app_show_monthly_budget';
const SHOW_YEARLY_BUDGET_KEY = '@app_show_yearly_budget';
const SHOW_YEAR_CARD_KEY = '@app_show_year_card';
const ANALYTICS_CHART_TYPE_KEY = '@app_analytics_chart_type';
const CHART_STYLE_KEY = '@app_chart_style';
const DOWNLOAD_PATH_KEY = '@app_download_path';
const BACKUP_PATH_KEY = '@app_backup_path';
const SUMMARY_TIME_KEY = '@app_summary_time';
const REMINDER_TIME_KEY = '@app_reminder_time';
const AUTO_BACKUP_TIMES_KEY = '@app_auto_backup_times';
const AUTO_DOWNLOAD_TIMES_KEY = '@app_auto_download_times';
const PRECISE_TIME_ELAPSED_KEY = '@app_precise_time_elapsed';

export const ExpenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [currency, setCurrency] = useState('$');
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [yearlyBudget, setYearlyBudget] = useState(0);
  const [showMonthlyBudget, setShowMonthlyBudget] = useState(true);
  const [showYearlyBudget, setShowYearlyBudget] = useState(true);
  const [showYearCard, setShowYearCard] = useState(true);
  const [isAmountsVisible, setIsAmountsVisible] = useState(false);
  const [analyticsChartType, setAnalyticsChartType] = useState<'Pie' | 'Donut'>('Pie');
  const [chartStyle, setChartStyle] = useState<'Classic' | '3D' | 'Spaced' | 'Semi-Circle'>('Classic');
  const [isPreciseTimeElapsed, setIsPreciseTimeElapsed] = useState(false);
  const [downloadPathUri, setDownloadPathUri] = useState<string | null>(null);
  const [backupPathUri, setBackupPathUri] = useState<string | null>(null);
  const [monthlyIncomes, setMonthlyIncomes] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [summaryTime, setSummaryTime] = useState<Date>(new Date(new Date().setHours(8, 0, 0, 0)));
  const [reminderTimes, setReminderTimes] = useState<Date[]>([new Date(new Date().setHours(18, 0, 0, 0))]);
  const [autoBackupTimes, setAutoBackupTimes] = useState<Date[]>([new Date(new Date().setHours(9, 0, 0, 0)), new Date(new Date().setHours(21, 0, 0, 0))]);
  const [autoDownloadTimes, setAutoDownloadTimes] = useState<Date[]>([new Date(new Date().setHours(10, 0, 0, 0)), new Date(new Date().setHours(22, 0, 0, 0))]);
  const { user } = useAuthContext();

  const storageKey = EXPENSES_KEY;
  const categoriesStorageKey = CATEGORIES_KEY;
  const paymentModesStorageKey = PAYMENT_MODES_KEY;
  const currencyStorageKey = CURRENCY_KEY;
  const budgetStorageKey = BUDGET_KEY;
  const showMonthlyBudgetStorageKey = SHOW_MONTHLY_BUDGET_KEY;
  const showYearlyBudgetStorageKey = SHOW_YEARLY_BUDGET_KEY;
  const showYearCardStorageKey = SHOW_YEAR_CARD_KEY;
  const amountsVisibleStorageKey = AMOUNTS_VISIBLE_KEY;
  const analyticsChartTypeStorageKey = ANALYTICS_CHART_TYPE_KEY;
  const chartStyleStorageKey = CHART_STYLE_KEY;
  const downloadPathStorageKey = DOWNLOAD_PATH_KEY;
  const backupPathStorageKey = BACKUP_PATH_KEY;
  const monthlyIncomesStorageKey = '@app_monthly_incomes';
  
  const summaryTimeStorageKey = SUMMARY_TIME_KEY;
  const reminderTimeStorageKey = REMINDER_TIME_KEY;
  const autoBackupTimesStorageKey = AUTO_BACKUP_TIMES_KEY;
  const autoDownloadTimesStorageKey = AUTO_DOWNLOAD_TIMES_KEY;
  const preciseTimeElapsedStorageKey = PRECISE_TIME_ELAPSED_KEY;

  const loadData = async () => {
    try {
      setIsLoading(true);
      const keys = [storageKey, categoriesStorageKey, paymentModesStorageKey, currencyStorageKey, budgetStorageKey, showMonthlyBudgetStorageKey, amountsVisibleStorageKey, showYearlyBudgetStorageKey, showYearCardStorageKey, analyticsChartTypeStorageKey, chartStyleStorageKey, downloadPathStorageKey, backupPathStorageKey, monthlyIncomesStorageKey, summaryTimeStorageKey, reminderTimeStorageKey, autoBackupTimesStorageKey, autoDownloadTimesStorageKey, preciseTimeElapsedStorageKey, '@app_auto_backup_time_morning', '@app_auto_backup_time_evening'];
      const data = await AsyncStorage.getMany(keys);
      const storedExpenses = data[storageKey];
      if (storedExpenses) {
        setExpenses(JSON.parse(storedExpenses));
      } else {
        setExpenses([]);
      }

      const storedCategories = data[categoriesStorageKey];
      if (storedCategories) {
        const parsed = JSON.parse(storedCategories);
        parsed.sort((a: Category, b: Category) => a.name.localeCompare(b.name));
        setCategories(parsed);
      } else {
        setCategories([]);
      }

      const storedPaymentModes = data[paymentModesStorageKey];
      if (storedPaymentModes) {
        const parsed = JSON.parse(storedPaymentModes);
        parsed.sort((a: PaymentMode, b: PaymentMode) => a.name.localeCompare(b.name));
        setPaymentModes(parsed);
      } else {
        setPaymentModes([]);
      }

      const storedCurrency = data[currencyStorageKey];
      if (storedCurrency) {
        setCurrency(storedCurrency);
      } else {
        setCurrency('$');
      }

      const storedBudgets = data[budgetStorageKey];
      if (storedBudgets) {
        const parsed = JSON.parse(storedBudgets);
        if (parsed.monthly) setMonthlyBudget(parsed.monthly);
        if (parsed.yearly) setYearlyBudget(parsed.yearly);
      } else {
        setMonthlyBudget(0);
        setYearlyBudget(0);
      }

      const storedShowMonthly = data[showMonthlyBudgetStorageKey];
      if (storedShowMonthly !== null) {
        setShowMonthlyBudget(storedShowMonthly === 'true');
      } else {
        setShowMonthlyBudget(true);
      }

      const storedAmountsVisible = data[amountsVisibleStorageKey];
      if (storedAmountsVisible !== null) {
        setIsAmountsVisible(storedAmountsVisible === 'true');
      } else {
        setIsAmountsVisible(false);
      }

      const storedShowYearly = data[showYearlyBudgetStorageKey];
      if (storedShowYearly !== null) {
        setShowYearlyBudget(storedShowYearly === 'true');
      } else {
        setShowYearlyBudget(true);
      }

      const storedShowYearCard = data[showYearCardStorageKey];
      if (storedShowYearCard !== null) {
        setShowYearCard(storedShowYearCard === 'true');
      } else {
        setShowYearCard(true);
      }

      const storedChartType = data[analyticsChartTypeStorageKey];
      if (storedChartType === 'Pie' || storedChartType === 'Donut') {
        setAnalyticsChartType(storedChartType);
      } else {
        setAnalyticsChartType('Pie');
      }

      const storedChartStyle = data[chartStyleStorageKey];
      if (storedChartStyle === 'Classic' || storedChartStyle === '3D' || storedChartStyle === 'Spaced' || storedChartStyle === 'Semi-Circle') {
        setChartStyle(storedChartStyle);
      } else {
        setChartStyle('Classic');
      }

      const storedPreciseTime = data[preciseTimeElapsedStorageKey];
      if (storedPreciseTime !== null && storedPreciseTime !== undefined) {
        setIsPreciseTimeElapsed(storedPreciseTime === 'true');
      } else {
        setIsPreciseTimeElapsed(false);
      }

      const storedDownloadPath = data[downloadPathStorageKey];
      if (storedDownloadPath !== null) {
        setDownloadPathUri(storedDownloadPath);
      } else {
        setDownloadPathUri(null);
      }

      const storedBackupPath = data[backupPathStorageKey];
      if (storedBackupPath !== null) {
        setBackupPathUri(storedBackupPath);
      } else {
        setBackupPathUri(null);
      }

      const storedMonthlyIncomes = data[monthlyIncomesStorageKey];
      if (storedMonthlyIncomes !== null) {
        setMonthlyIncomes(JSON.parse(storedMonthlyIncomes));
      } else {
        setMonthlyIncomes({});
      }

      const storedSummaryTime = data[summaryTimeStorageKey];
      if (storedSummaryTime) setSummaryTime(new Date(storedSummaryTime));
      else setSummaryTime(new Date(new Date().setHours(8, 0, 0, 0)));

      const storedReminderTime = data[reminderTimeStorageKey];
      if (storedReminderTime) {
        try {
          const parsed = JSON.parse(storedReminderTime);
          if (Array.isArray(parsed)) {
            setReminderTimes(parsed.map((d: string) => new Date(d)));
          } else {
            setReminderTimes([new Date(storedReminderTime)]);
          }
        } catch (e) {
          setReminderTimes([new Date(storedReminderTime)]);
        }
      } else {
        setReminderTimes([new Date(new Date().setHours(18, 0, 0, 0))]);
      }

      const storedBackupTimes = data[autoBackupTimesStorageKey];
      if (storedBackupTimes) {
        try {
          const parsed = JSON.parse(storedBackupTimes);
          setAutoBackupTimes(parsed.map((d: string) => new Date(d)));
        } catch(e) {
          setAutoBackupTimes([new Date(new Date().setHours(9, 0, 0, 0)), new Date(new Date().setHours(21, 0, 0, 0))]);
        }
      } else {
        const oldMorning = data['@app_auto_backup_time_morning'];
        const oldEvening = data['@app_auto_backup_time_evening'];
        if (oldMorning || oldEvening) {
          const newTimes: Date[] = [];
          if (oldMorning) newTimes.push(new Date(oldMorning));
          else newTimes.push(new Date(new Date().setHours(9, 0, 0, 0)));
          if (oldEvening) newTimes.push(new Date(oldEvening));
          else newTimes.push(new Date(new Date().setHours(21, 0, 0, 0)));
          setAutoBackupTimes(newTimes);
          await AsyncStorage.setItem(autoBackupTimesStorageKey, JSON.stringify(newTimes.map(d => d.toISOString())));
          await AsyncStorage.removeItem('@app_auto_backup_time_morning');
          await AsyncStorage.removeItem('@app_auto_backup_time_evening');
        } else {
          setAutoBackupTimes([new Date(new Date().setHours(9, 0, 0, 0)), new Date(new Date().setHours(21, 0, 0, 0))]);
        }
      }

      const storedDownloadTimes = data[autoDownloadTimesStorageKey];
      if (storedDownloadTimes) {
        try {
          const parsed = JSON.parse(storedDownloadTimes);
          setAutoDownloadTimes(parsed.map((d: string) => new Date(d)));
        } catch(e) {
          setAutoDownloadTimes([new Date(new Date().setHours(10, 0, 0, 0)), new Date(new Date().setHours(22, 0, 0, 0))]);
        }
      } else {
        setAutoDownloadTimes([new Date(new Date().setHours(10, 0, 0, 0)), new Date(new Date().setHours(22, 0, 0, 0))]);
      }

    } catch (e) {
      console.error('Failed to load data', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [storageKey, categoriesStorageKey, paymentModesStorageKey, currencyStorageKey, budgetStorageKey, showMonthlyBudgetStorageKey, showYearlyBudgetStorageKey, showYearCardStorageKey, analyticsChartTypeStorageKey, chartStyleStorageKey, downloadPathStorageKey, backupPathStorageKey, summaryTimeStorageKey, reminderTimeStorageKey, autoBackupTimesStorageKey, autoDownloadTimesStorageKey, amountsVisibleStorageKey, preciseTimeElapsedStorageKey]);

  useEffect(() => {
    if (isLoading) return;

    const timeoutId = setTimeout(() => {
      scheduleAllNotifications(expenses, currency, summaryTime, reminderTimes);
      
      const { scheduleAutoBackupTriggers } = require('../utils/autoBackupScheduler');
      const { scheduleAutoDownloadTriggers } = require('../utils/autoDownloadScheduler');
      
      scheduleAutoBackupTriggers().catch(console.warn);
      scheduleAutoDownloadTriggers().catch(console.warn);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [expenses, currency, isLoading, summaryTime, reminderTimes]);

  const addExpense = async (amount: number, description: string, date: Date, categoryId?: string, paymentModeId?: string) => {
    const newExpense: Expense = {
      id: Date.now().toString(),
      amount,
      description,
      date: date.toISOString(),
      categoryId,
      paymentModeId,
    };

    const newExpenses = [newExpense, ...expenses];
    newExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setExpenses(newExpenses);
    await AsyncStorage.setItem(storageKey, JSON.stringify(newExpenses));
  };

  const updateExpense = async (id: string, amount: number, description: string, date: Date, categoryId?: string, paymentModeId?: string) => {
    const updatedExpenses = expenses.map(exp => 
      exp.id === id 
        ? { ...exp, amount, description, date: date.toISOString(), categoryId, paymentModeId } 
        : exp
    );
    
    // Sort by date descending in case the date was changed
    updatedExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setExpenses(updatedExpenses);
    await AsyncStorage.setItem(storageKey, JSON.stringify(updatedExpenses));
  };

  const deleteExpense = async (id: string) => {
    const updatedExpenses = expenses.filter(exp => exp.id !== id);
    setExpenses(updatedExpenses);
    await AsyncStorage.setItem(storageKey, JSON.stringify(updatedExpenses));
  };

  const bulkDeleteExpenses = async (ids: string[]) => {
    const updatedExpenses = expenses.filter(exp => !ids.includes(exp.id));
    setExpenses(updatedExpenses);
    await AsyncStorage.setItem(storageKey, JSON.stringify(updatedExpenses));
  };

  const reorderExpensesByDate = async (dateStr: string, reorderedDayExpenses: Expense[]) => {
    const otherExpenses = expenses.filter(e => new Date(e.date).toDateString() !== dateStr);
    
    if (reorderedDayExpenses.length === 0) return;
    
    const baseDate = new Date(reorderedDayExpenses[0].date);
    
    const updatedReordered = reorderedDayExpenses.map((exp, index) => {
      const newDate = new Date(baseDate);
      newDate.setHours(23, 59, 59, 0);
      newDate.setSeconds(newDate.getSeconds() - index);
      
      return {
        ...exp,
        date: newDate.toISOString(),
      };
    });

    const newExpenses = [...updatedReordered, ...otherExpenses];
    newExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    setExpenses(newExpenses);
    await AsyncStorage.setItem(storageKey, JSON.stringify(newExpenses));
  };

  const updateMonthlyIncome = async (monthYear: string, amount: number) => {
    const updated = { ...monthlyIncomes, [monthYear]: amount };
    setMonthlyIncomes(updated);
    await AsyncStorage.setItem(monthlyIncomesStorageKey, JSON.stringify(updated));
  };

  const addCategory = async (name: string, icon: string, color: string) => {
    const newCat: Category = { id: Date.now().toString(), name, icon, color };
    const updated = [...categories, newCat].sort((a, b) => a.name.localeCompare(b.name));
    setCategories(updated);
    await AsyncStorage.setItem(categoriesStorageKey, JSON.stringify(updated));
  };

  const updateCategory = async (id: string, name: string, icon: string, color: string) => {
    const updatedCategories = categories.map(cat => 
      cat.id === id ? { ...cat, name, icon, color } : cat
    );
    setCategories(updatedCategories);
    await AsyncStorage.setItem(categoriesStorageKey, JSON.stringify(updatedCategories));
  };

  const updateCategoryBudget = async (id: string, yearlyBudget: number) => {
    const updatedCategories = categories.map(cat => 
      cat.id === id ? { ...cat, yearlyBudget } : cat
    );
    setCategories(updatedCategories);
    await AsyncStorage.setItem(categoriesStorageKey, JSON.stringify(updatedCategories));
  };

  const deleteCategory = async (id: string) => {
    const updated = categories.filter(cat => cat.id !== id);
    setCategories(updated);
    await AsyncStorage.setItem(categoriesStorageKey, JSON.stringify(updated));
  };

  const bulkDeleteCategories = async (ids: string[]) => {
    const updated = categories.filter(cat => !ids.includes(cat.id));
    setCategories(updated);
    await AsyncStorage.setItem(categoriesStorageKey, JSON.stringify(updated));
  };

  const addPaymentMode = async (name: string, icon: string, color: string) => {
    const newMode: PaymentMode = { id: Date.now().toString(), name, icon, color };
    const updated = [...paymentModes, newMode].sort((a, b) => a.name.localeCompare(b.name));
    setPaymentModes(updated);
    await AsyncStorage.setItem(paymentModesStorageKey, JSON.stringify(updated));
  };

  const updatePaymentMode = async (id: string, name: string, icon: string, color: string) => {
    const updated = paymentModes.map(mode => mode.id === id ? { ...mode, name, icon, color } : mode).sort((a, b) => a.name.localeCompare(b.name));
    setPaymentModes(updated);
    await AsyncStorage.setItem(paymentModesStorageKey, JSON.stringify(updated));
  };

  const deletePaymentMode = async (id: string) => {
    const updated = paymentModes.filter(mode => mode.id !== id);
    setPaymentModes(updated);
    await AsyncStorage.setItem(paymentModesStorageKey, JSON.stringify(updated));
  };

  const bulkDeletePaymentModes = async (ids: string[]) => {
    const updated = paymentModes.filter(mode => !ids.includes(mode.id));
    setPaymentModes(updated);
    await AsyncStorage.setItem(paymentModesStorageKey, JSON.stringify(updated));
  };

  const bulkImport = async (newExpenses: Expense[], newCategories: Category[], newPaymentModes: PaymentMode[]) => {
    // Merge categories
    const mergedCategories = [...categories];
    for (const cat of newCategories) {
      if (!mergedCategories.some(c => c.name.toLowerCase() === cat.name.toLowerCase())) {
        mergedCategories.push(cat);
      }
    }
    mergedCategories.sort((a, b) => a.name.localeCompare(b.name));
    setCategories(mergedCategories);
    await AsyncStorage.setItem(categoriesStorageKey, JSON.stringify(mergedCategories));

    // Merge payment modes
    const mergedPaymentModes = [...paymentModes];
    for (const mode of newPaymentModes) {
      if (!mergedPaymentModes.some(m => m.name.toLowerCase() === mode.name.toLowerCase())) {
        mergedPaymentModes.push(mode);
      }
    }
    mergedPaymentModes.sort((a, b) => a.name.localeCompare(b.name));
    setPaymentModes(mergedPaymentModes);
    await AsyncStorage.setItem(paymentModesStorageKey, JSON.stringify(mergedPaymentModes));

    // Merge expenses
    const mergedExpenses = [...expenses];
    for (const newExp of newExpenses) {
      const newExpDateStr = new Date(newExp.date).toDateString();
      const existingIndex = mergedExpenses.findIndex(e => 
        new Date(e.date).toDateString() === newExpDateStr &&
        e.amount === newExp.amount &&
        e.categoryId === newExp.categoryId &&
        e.paymentModeId === newExp.paymentModeId &&
        e.description.trim().toLowerCase() === newExp.description.trim().toLowerCase()
      );

      if (existingIndex !== -1) {
        // Update existing record
        mergedExpenses[existingIndex] = { ...mergedExpenses[existingIndex], description: newExp.description };
      } else {
        // Add new record
        mergedExpenses.push(newExp);
      }
    }

    mergedExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setExpenses(mergedExpenses);
    await AsyncStorage.setItem(storageKey, JSON.stringify(mergedExpenses));
  };

  const updateCurrency = async (newCurrency: string) => {
    setCurrency(newCurrency);
    await AsyncStorage.setItem(currencyStorageKey, newCurrency);
  };

  const updateBudgets = async (monthly: number, yearly: number) => {
    setMonthlyBudget(monthly);
    setYearlyBudget(yearly);
    await AsyncStorage.setItem(budgetStorageKey, JSON.stringify({ monthly, yearly }));
  };

  const toggleShowMonthlyBudget = async (val: boolean) => {
    setShowMonthlyBudget(val);
    await AsyncStorage.setItem(showMonthlyBudgetStorageKey, val.toString());
  };

  const toggleAmountsVisibility = async (val: boolean) => {
    setIsAmountsVisible(val);
    await AsyncStorage.setItem(amountsVisibleStorageKey, val.toString());
  };

  const toggleShowYearlyBudget = async (val: boolean) => {
    setShowYearlyBudget(val);
    await AsyncStorage.setItem(showYearlyBudgetStorageKey, val.toString());
  };

  const toggleShowYearCard = async (val: boolean) => {
    setShowYearCard(val);
    await AsyncStorage.setItem(showYearCardStorageKey, val.toString());
  };

  const togglePreciseTimeElapsed = async (val: boolean) => {
    setIsPreciseTimeElapsed(val);
    await AsyncStorage.setItem(preciseTimeElapsedStorageKey, val.toString());
  };

  const updateAnalyticsChartType = async (type: 'Pie' | 'Donut') => {
    setAnalyticsChartType(type);
    await AsyncStorage.setItem(analyticsChartTypeStorageKey, type);
  };

  const updateChartStyle = async (style: 'Classic' | '3D' | 'Spaced' | 'Semi-Circle') => {
    setChartStyle(style);
    await AsyncStorage.setItem(chartStyleStorageKey, style);
  };

  const updateDownloadPath = async (uri: string | null) => {
    setDownloadPathUri(uri);
    if (uri) {
      await AsyncStorage.setItem(downloadPathStorageKey, uri);
    } else {
      await AsyncStorage.removeItem(downloadPathStorageKey);
    }
  };

  const updateBackupPath = async (uri: string | null) => {
    setBackupPathUri(uri);
    if (uri) {
      await AsyncStorage.setItem(backupPathStorageKey, uri);
    } else {
      await AsyncStorage.removeItem(backupPathStorageKey);
    }
  };

  const updateSummaryTime = async (date: Date) => {
    setSummaryTime(date);
    await AsyncStorage.setItem(summaryTimeStorageKey, date.toISOString());
  };

  const addReminderTime = async (date: Date) => {
    const newTimes = [...reminderTimes, date];
    newTimes.sort((a, b) => {
      if (a.getHours() !== b.getHours()) return a.getHours() - b.getHours();
      return a.getMinutes() - b.getMinutes();
    });
    setReminderTimes(newTimes);
    await AsyncStorage.setItem(reminderTimeStorageKey, JSON.stringify(newTimes.map(d => d.toISOString())));
  };

  const removeReminderTime = async (index: number) => {
    const newTimes = reminderTimes.filter((_, i) => i !== index);
    setReminderTimes(newTimes);
    await AsyncStorage.setItem(reminderTimeStorageKey, JSON.stringify(newTimes.map(d => d.toISOString())));
  };

  const addAutoBackupTime = async (date: Date) => {
    const newTimes = [...autoBackupTimes, date];
    newTimes.sort((a, b) => {
      if (a.getHours() !== b.getHours()) return a.getHours() - b.getHours();
      return a.getMinutes() - b.getMinutes();
    });
    setAutoBackupTimes(newTimes);
    await AsyncStorage.setItem(autoBackupTimesStorageKey, JSON.stringify(newTimes.map(d => d.toISOString())));
    const { scheduleAutoBackupTriggers } = require('../utils/autoBackupScheduler');
    scheduleAutoBackupTriggers().catch(console.warn);
  };

  const removeAutoBackupTime = async (index: number) => {
    const newTimes = autoBackupTimes.filter((_, i) => i !== index);
    setAutoBackupTimes(newTimes);
    await AsyncStorage.setItem(autoBackupTimesStorageKey, JSON.stringify(newTimes.map(d => d.toISOString())));
    const { scheduleAutoBackupTriggers } = require('../utils/autoBackupScheduler');
    scheduleAutoBackupTriggers().catch(console.warn);
  };

  const addAutoDownloadTime = async (date: Date) => {
    const newTimes = [...autoDownloadTimes, date];
    newTimes.sort((a, b) => {
      if (a.getHours() !== b.getHours()) return a.getHours() - b.getHours();
      return a.getMinutes() - b.getMinutes();
    });
    setAutoDownloadTimes(newTimes);
    await AsyncStorage.setItem(autoDownloadTimesStorageKey, JSON.stringify(newTimes.map(d => d.toISOString())));
    const { scheduleAutoDownloadTriggers } = require('../utils/autoDownloadScheduler');
    scheduleAutoDownloadTriggers().catch(console.warn);
  };

  const removeAutoDownloadTime = async (index: number) => {
    const newTimes = autoDownloadTimes.filter((_, i) => i !== index);
    setAutoDownloadTimes(newTimes);
    await AsyncStorage.setItem(autoDownloadTimesStorageKey, JSON.stringify(newTimes.map(d => d.toISOString())));
    const { scheduleAutoDownloadTriggers } = require('../utils/autoDownloadScheduler');
    scheduleAutoDownloadTriggers().catch(console.warn);
  };

  const getCurrentMonthTotal = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return expenses
      .filter((expense) => {
        return parseISOMonth(expense.date) === currentMonth && parseISOYear(expense.date) === currentYear;
      })
      .reduce((total, expense) => total + expense.amount, 0);
  };

  const getPreviousMonthTotal = () => {
    const now = new Date();
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = prevMonthDate.getMonth();
    const prevYear = prevMonthDate.getFullYear();

    return expenses
      .filter((expense) => {
        return parseISOMonth(expense.date) === prevMonth && parseISOYear(expense.date) === prevYear;
      })
      .reduce((total, expense) => total + expense.amount, 0);
  };

  const migrateUserEmail = async (oldEmail: string, newEmail: string) => {
    const keys = [
      EXPENSES_KEY, CATEGORIES_KEY, PAYMENT_MODES_KEY, CURRENCY_KEY,
      BUDGET_KEY, SHOW_MONTHLY_BUDGET_KEY, SHOW_YEARLY_BUDGET_KEY, SHOW_YEAR_CARD_KEY,
      ANALYTICS_CHART_TYPE_KEY, CHART_STYLE_KEY, DOWNLOAD_PATH_KEY, BACKUP_PATH_KEY,
      SUMMARY_TIME_KEY, REMINDER_TIME_KEY, AUTO_BACKUP_TIMES_KEY, AUTO_DOWNLOAD_TIMES_KEY,
      AMOUNTS_VISIBLE_KEY, PRECISE_TIME_ELAPSED_KEY
    ];

    for (const key of keys) {
      const oldKey = `${key}_${oldEmail}`;
      const newKey = `${key}_${newEmail}`;
      const data = await AsyncStorage.getItem(oldKey);
      if (data !== null) {
        await AsyncStorage.setItem(newKey, data);
        await AsyncStorage.removeItem(oldKey);
      }
    }
  };

  return (
    <ExpenseContext.Provider value={{ 
      expenses, categories, paymentModes, currency, monthlyBudget, yearlyBudget, 
      showMonthlyBudget, showYearlyBudget, showYearCard, isAmountsVisible, analyticsChartType, chartStyle,
      isPreciseTimeElapsed, togglePreciseTimeElapsed,
      monthlyIncomes,
      addExpense, updateExpense, deleteExpense, bulkDeleteExpenses, reorderExpensesByDate,
      updateMonthlyIncome,
      addCategory, updateCategory, updateCategoryBudget, deleteCategory, bulkDeleteCategories,
      addPaymentMode, updatePaymentMode, deletePaymentMode, bulkDeletePaymentModes,
      bulkImport,
      updateCurrency, updateBudgets, toggleShowMonthlyBudget, toggleAmountsVisibility, toggleShowYearlyBudget, toggleShowYearCard, updateAnalyticsChartType, updateChartStyle,
      getCurrentMonthTotal, getPreviousMonthTotal, 
      refreshExpenseData: loadData, isLoading,
      downloadPathUri, updateDownloadPath,
      backupPathUri, updateBackupPath,
      migrateUserEmail,
      summaryTime, reminderTimes, autoBackupTimes, autoDownloadTimes,
      updateSummaryTime, addReminderTime, removeReminderTime, addAutoBackupTime, removeAutoBackupTime, addAutoDownloadTime, removeAutoDownloadTime
    }}>
      {children}
    </ExpenseContext.Provider>
  );
};

