import React, { useState, useMemo } from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import { View, StyleSheet, TouchableOpacity, ScrollView, Animated, ActivityIndicator, Image, Platform, TextInput, Modal, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../components/AppText';
import { useThemeContext } from '../context/ThemeContext';
import { useExpenseContext } from '../context/ExpenseContext';
import { formatAmount } from '../utils/format';
import Svg, { Circle, G, Line } from 'react-native-svg';
import PremiumCardBackground from '../components/PremiumCardBackground';
import { parseISOYear, parseISOMonth } from '../utils/dateUtils';
import SingleFilterModal from '../components/SingleFilterModal';
import DayExpensesModal from '../components/DayExpensesModal';
import MonthExpensesModal from '../components/MonthExpensesModal';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { useTransactionContext } from '../context/TransactionContext';
import EmptyState from '../components/EmptyState';
import { generateAccountTransactionsPDFHTML } from '../utils/pdfGenerator';
import { generatePDF } from 'react-native-html-to-pdf';
import SAF from 'react-native-saf-x';
import notifee from '@notifee/react-native';
import { useAlert } from '../context/AlertContext';
import DownloadProgressModal from '../components/DownloadProgressModal';
import { getCustomCardStyle } from '../utils/customCardStyles';

const INCOME_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const formatCompact = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(2) + 'k';
  return Number(num).toFixed(2);
};



const MonthlySpendingCalendar = ({ expenses, selectedMonth, selectedYear, colors, onPrevMonth, onNextMonth, onDayPress, isCalendarHidden, setIsCalendarHidden, currency }: any) => {
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay();

  const today = new Date();
  const isCurrentMonth = today.getMonth() === selectedMonth && today.getFullYear() === selectedYear;
  const currentDay = today.getDate();

  const dayTotals = useMemo(() => {
    const totals: Record<number, number> = {};
    expenses.forEach((e: any) => {
      const d = new Date(e.date);
      if (d.getMonth() === selectedMonth && d.getFullYear() === selectedYear) {
        const day = d.getDate();
        totals[day] = (totals[day] || 0) + e.amount;
      }
    });
    return totals;
  }, [expenses, selectedMonth, selectedYear]);

  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const gridCells = [];

  // Padding for first row
  for (let i = 0; i < firstDayOfMonth; i++) {
    gridCells.push(<View key={`pad-${i}`} style={{ width: '14.28%', aspectRatio: 1, padding: 2 }} />);
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = isCurrentMonth && day === currentDay;
    const total = dayTotals[day] || 0;

    const cellDate = new Date(selectedYear, selectedMonth, day);
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const isFutureDay = cellDate > todayDateOnly;

    gridCells.push(
      <TouchableOpacity
        key={`day-${day}`}
        style={{ width: '14.28%', aspectRatio: 1, padding: 2 }}
        onPress={() => onDayPress && onDayPress(day, total)}
      >
        <View style={{
          flex: 1,
          backgroundColor: isToday ? 'rgba(255,255,255,0.2)' : 'transparent',
          borderRadius: 6,
          padding: 2,
          borderWidth: 1,
          borderColor: isToday ? '#FFF' : 'rgba(255,255,255,0.2)',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <AppText style={{ fontSize: 10, color: isToday ? '#FFF' : 'rgba(255,255,255,0.8)', position: 'absolute', top: 2, left: 4, fontWeight: isToday ? 'bold' : 'normal' }}>
            {day}
          </AppText>
          {isFutureDay && total === 0 ? (
            <View style={{ marginTop: 8, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <Ionicons name="lock-closed-outline" size={12} color="rgba(255,255,255,0.5)" />
            </View>
          ) : (
            <View style={{ marginTop: 8, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <AppText style={{ fontSize: 9, color: total > 0 ? colors.notification : '#FFF', fontWeight: total > 0 ? 'bold' : 'normal', textAlign: 'center' }} numberOfLines={1} adjustsFontSizeToFit>
                {isCalendarHidden ? '•••••' : `${currency}${formatCompact(total)}`}
              </AppText>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <PremiumCardBackground color={colors.primary}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginLeft: 4, marginRight: 4 }}>
        <AppText style={{ fontSize: 16, fontWeight: 'bold', color: '#FFF' }}>
          Daily Spending
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <AppText style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginRight: 8 }}>
            {MONTHS[selectedMonth]} {selectedYear}
          </AppText>
          <TouchableOpacity onPress={() => setIsCalendarHidden(!isCalendarHidden)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name={isCalendarHidden ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={{ position: 'relative' }}>
        <TouchableOpacity style={{ position: 'absolute', top: -4, left: -4, padding: 4, zIndex: 10 }} onPress={onPrevMonth}>
          <Ionicons name="chevron-back" size={16} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity style={{ position: 'absolute', top: -4, right: -4, padding: 4, zIndex: 10 }} onPress={onNextMonth}>
          <Ionicons name="chevron-forward" size={16} color="#FFF" />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          {daysOfWeek.map((d, i) => (
            <AppText key={i} style={{ flex: 1, textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>
              {d}
            </AppText>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {gridCells}
        </View>
      </View>
    </PremiumCardBackground>
  );
};

const YearlySpendingCalendar = ({ expenses, selectedYear, colors, onMonthPress, onPrevYear, onNextYear, isCalendarHidden, setIsCalendarHidden, currency }: any) => {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYearVal = today.getFullYear();

  const monthTotals = useMemo(() => {
    const totals: Record<number, number> = {};
    expenses.forEach((e: any) => {
      const d = new Date(e.date);
      if (d.getFullYear() === selectedYear) {
        const m = d.getMonth();
        totals[m] = (totals[m] || 0) + e.amount;
      }
    });
    return totals;
  }, [expenses, selectedYear]);

  const gridCells = [];

  for (let m = 0; m < 12; m++) {
    const total = monthTotals[m] || 0;

    const isFutureMonth = selectedYear > currentYearVal || (selectedYear === currentYearVal && m > currentMonth);
    const isCurrentMonth = selectedYear === currentYearVal && m === currentMonth;

    gridCells.push(
      <TouchableOpacity
        key={`month-${m}`}
        style={{ width: '25%', aspectRatio: 1.5, padding: 4 }}
        onPress={() => onMonthPress && onMonthPress(m, selectedYear, total)}
      >
        <View style={{
          flex: 1,
          backgroundColor: isCurrentMonth ? 'rgba(255,255,255,0.2)' : 'transparent',
          borderRadius: 8,
          padding: 4,
          borderWidth: 1,
          borderColor: isCurrentMonth ? '#FFF' : 'rgba(255,255,255,0.2)',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <AppText style={{ fontSize: 12, color: isCurrentMonth ? '#FFF' : 'rgba(255,255,255,0.8)', fontWeight: isCurrentMonth ? 'bold' : 'normal', marginBottom: 4 }}>
            {MONTHS[m]}
          </AppText>
          {isFutureMonth && total === 0 ? (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="lock-closed-outline" size={14} color="rgba(255,255,255,0.5)" />
            </View>
          ) : (
            <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <AppText style={{ fontSize: 10, color: total > 0 ? colors.notification : '#FFF', fontWeight: total > 0 ? 'bold' : 'normal', textAlign: 'center' }} numberOfLines={1} adjustsFontSizeToFit>
                {isCalendarHidden ? '•••••' : `${currency}${formatCompact(total)}`}
              </AppText>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <PremiumCardBackground color={colors.primary}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginLeft: 4, marginRight: 4 }}>
        <AppText style={{ fontSize: 16, fontWeight: 'bold', color: '#FFF' }}>
          Monthly Spending
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <AppText style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginRight: 8 }}>
            {selectedYear}
          </AppText>
          <TouchableOpacity onPress={() => setIsCalendarHidden(!isCalendarHidden)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name={isCalendarHidden ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={{ position: 'relative' }}>
        <TouchableOpacity style={{ position: 'absolute', top: -4, left: -4, padding: 4, zIndex: 10 }} onPress={onPrevYear}>
          <Ionicons name="chevron-back" size={16} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity style={{ position: 'absolute', top: -4, right: -4, padding: 4, zIndex: 10 }} onPress={onNextYear}>
          <Ionicons name="chevron-forward" size={16} color="#FFF" />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 24 }}>
          {gridCells}
        </View>
      </View>
    </PremiumCardBackground>
  );
};

const AllYearsSpendingCalendar = ({ expenses, availableYears, colors, onYearPress, isCalendarHidden, setIsCalendarHidden, currency }: any) => {
  const currentYearVal = new Date().getFullYear();

  const yearTotals = useMemo(() => {
    const totals: Record<number, number> = {};
    expenses.forEach((e: any) => {
      const d = new Date(e.date);
      const y = d.getFullYear();
      totals[y] = (totals[y] || 0) + e.amount;
    });
    return totals;
  }, [expenses]);

  const orderedYears = [...availableYears].sort((a: number, b: number) => a - b);

  const gridCells = orderedYears.map((year: number) => {
    const isCurrentYear = year === currentYearVal;
    const total = yearTotals[year] || 0;

    return (
      <TouchableOpacity
        key={`year-${year}`}
        style={{ width: '25%', aspectRatio: 1, padding: 4 }}
        onPress={() => onYearPress && onYearPress(year, total)}
      >
        <View style={{
          flex: 1,
          backgroundColor: isCurrentYear ? 'rgba(255,255,255,0.2)' : 'transparent',
          borderRadius: 8,
          padding: 4,
          borderWidth: 1,
          borderColor: isCurrentYear ? '#FFF' : 'rgba(255,255,255,0.2)',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <AppText style={{ fontSize: 12, color: isCurrentYear ? '#FFF' : 'rgba(255,255,255,0.8)', fontWeight: isCurrentYear ? 'bold' : 'normal', marginBottom: 4 }}>
            {year}
          </AppText>
          <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            <AppText style={{ fontSize: 10, color: total > 0 ? colors.notification : '#FFF', fontWeight: total > 0 ? 'bold' : 'normal', textAlign: 'center' }} numberOfLines={1} adjustsFontSizeToFit>
              {isCalendarHidden ? '•••••' : `${currency}${formatCompact(total)}`}
            </AppText>
          </View>
        </View>
      </TouchableOpacity>
    );
  });

  return (
    <PremiumCardBackground color={colors.primary}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginLeft: 4, marginRight: 4 }}>
        <AppText style={{ fontSize: 16, fontWeight: 'bold', color: '#FFF' }}>
          Yearly Spending
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setIsCalendarHidden(!isCalendarHidden)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name={isCalendarHidden ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={{ position: 'relative' }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {gridCells}
        </View>
      </View>
    </PremiumCardBackground>
  );
};

export default function DashboardScreen({ navigation }: any) {
  const colors = useThemeColors();
  const { isDarkTheme, useCustomCardUI } = useThemeContext();
  const { expenses, currency, monthlyBudget, yearlyBudget, showMonthlyBudget, showYearlyBudget, showYearCard, isAmountsVisible, isPreciseTimeElapsed, categories, downloadPathUri, monthlyIncomes, updateMonthlyIncome } = useExpenseContext();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();

  const [activeView, setActiveView] = useState<'expenses' | 'accounts' | 'income'>('expenses');

  const handleTabPress = (view: 'expenses' | 'accounts' | 'income') => {
    setActiveView(view);
  };

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const incomeStartYear = 2022;
  const incomeCurrentYearVal = new Date().getFullYear();
  const incomeYears = Array.from({ length: incomeCurrentYearVal - incomeStartYear + 1 }, (_, i) => incomeCurrentYearVal - i);

  const [incomeSelectedYear, setIncomeSelectedYear] = useState<number | 'All'>(incomeCurrentYearVal);
  const [isIncomeModalVisible, setIsIncomeModalVisible] = useState(false);
  const [incomeSelectedMonth, setIncomeSelectedMonth] = useState<{ monthIndex: number; monthName: string } | null>(null);

  const [isIncomeSummaryHidden, setIsIncomeSummaryHidden] = React.useState(!isAmountsVisible);
  const [hiddenIncomeItems, setHiddenIncomeItems] = React.useState<Record<string, boolean>>({});

  const toggleHiddenIncomeItem = (key: string) => {
    setHiddenIncomeItems(prev => {
      const current = prev[key] ?? !isAmountsVisible;
      return { ...prev, [key]: !current };
    });
  };

  const [grossIncomeInput, setGrossIncomeInput] = useState('');
  const [deductionInput, setDeductionInput] = useState('');
  const [incomeError, setIncomeError] = useState('');
  const incomeMonthlyStats = useMemo(() => {
    if (incomeSelectedYear === 'All') return [];
    return INCOME_MONTHS.map((monthName, index) => {
      const monthNumber = index + 1;
      const key = `${incomeSelectedYear}-${String(monthNumber).padStart(2, '0')}`;

      const incomeObj = monthlyIncomes[key] || { gross: 0, deduction: 0 };
      const gross = incomeObj.gross || 0;
      const deduction = incomeObj.deduction || 0;
      const net = gross - deduction;

      const expense = expenses
        .filter(e => {
          return parseISOYear(e.date) === incomeSelectedYear && parseISOMonth(e.date) === index;
        })
        .reduce((sum, e) => sum + e.amount, 0);

      const balance = net - expense;

      let daysToConsider = new Date(incomeSelectedYear as number, monthNumber, 0).getDate();
      if (incomeSelectedYear === new Date().getFullYear() && index === new Date().getMonth()) {
        daysToConsider = new Date().getDate();
      } else if ((incomeSelectedYear as number) === new Date().getFullYear() && index > new Date().getMonth()) {
        daysToConsider = 1;
      }

      const dailyAverage = expense / daysToConsider;

      return {
        monthIndex: monthNumber,
        monthName,
        gross,
        deduction,
        net,
        expense,
        balance,
        dailyAverage
      };
    });
  }, [incomeSelectedYear, expenses, monthlyIncomes]);

  const incomeYearlyTotals = useMemo(() => {
    if (incomeSelectedYear === 'All') return { gross: 0, deduction: 0, net: 0, expense: 0, balance: 0, monthlyAverage: 0 };
    const totals = incomeMonthlyStats.reduce(
      (acc, curr) => {
        acc.gross += curr.gross;
        acc.deduction += curr.deduction;
        acc.net += curr.net;
        acc.expense += curr.expense;
        acc.balance += curr.balance;
        return acc;
      },
      { gross: 0, deduction: 0, net: 0, expense: 0, balance: 0 }
    );

    const now = new Date();
    let monthsToConsider = 12;
    if (incomeSelectedYear === now.getFullYear()) {
      monthsToConsider = Math.max(now.getMonth(), 1);
    } else if ((incomeSelectedYear as number) < now.getFullYear()) {
      monthsToConsider = 12;
    }
    const monthlyAverage = totals.expense / monthsToConsider;

    return { ...totals, monthlyAverage };
  }, [incomeMonthlyStats, incomeSelectedYear]);

  const incomeAllYearsStats = useMemo(() => {
    if (incomeSelectedYear !== 'All') return [];

    return incomeYears.map(year => {
      let gross = 0;
      let deduction = 0;
      let net = 0;
      let expense = 0;

      expense = expenses
        .filter(e => parseISOYear(e.date) === year)
        .reduce((sum, e) => sum + e.amount, 0);

      for (let i = 1; i <= 12; i++) {
        const key = `${year}-${String(i).padStart(2, '0')}`;
        const incomeObj = monthlyIncomes[key] || { gross: 0, deduction: 0 };
        gross += incomeObj.gross || 0;
        deduction += incomeObj.deduction || 0;
      }

      net = gross - deduction;
      const balance = net - expense;

      const now = new Date();
      let monthsToConsider = 12;
      if (year === now.getFullYear()) {
        monthsToConsider = Math.max(now.getMonth(), 1);
      }
      const monthlyAverage = expense / monthsToConsider;

      return {
        year,
        gross,
        deduction,
        net,
        expense,
        balance,
        monthlyAverage
      };
    });
  }, [incomeSelectedYear, incomeYears, expenses, monthlyIncomes]);

  const incomeOverallTotals = useMemo(() => {
    if (incomeSelectedYear !== 'All') return { gross: 0, deduction: 0, net: 0, expense: 0, balance: 0, yearlyAverage: 0 };
    const totals = incomeAllYearsStats.reduce((acc, curr) => {
      acc.gross += curr.gross;
      acc.deduction += curr.deduction;
      acc.net += curr.net;
      acc.expense += curr.expense;
      acc.balance += curr.balance;
      return acc;
    }, { gross: 0, deduction: 0, net: 0, expense: 0, balance: 0 });

    const yearlyAverage = totals.expense / Math.max(incomeAllYearsStats.length - 1, 1);

    return { ...totals, yearlyAverage };
  }, [incomeAllYearsStats, incomeSelectedYear]);

  React.useEffect(() => {
    setIsIncomeSummaryHidden(!isAmountsVisible);
    setHiddenIncomeItems({});
  }, [isAmountsVisible]);

  const handleOpenIncomeModal = (monthIndex: number, monthName: string, currentGross: number, currentDeduction: number) => {
    setIncomeSelectedMonth({ monthIndex, monthName });
    setGrossIncomeInput(currentGross > 0 ? currentGross.toString() : '');
    setDeductionInput(currentDeduction > 0 ? currentDeduction.toString() : '');
    setIncomeError('');
    setIsIncomeModalVisible(true);
  };

  const handleSaveIncome = async () => {
    if (!incomeSelectedMonth || incomeSelectedYear === 'All') return;

    const grossStr = grossIncomeInput.trim();
    const dedStr = deductionInput.trim();

    if (!grossStr && !dedStr) {
      const monthYearKey = `${incomeSelectedYear}-${String(incomeSelectedMonth.monthIndex).padStart(2, '0')}`;
      await updateMonthlyIncome(monthYearKey, 0, 0);
      setIsIncomeModalVisible(false);
      return;
    }

    let parsedGross = 0;
    if (grossStr) {
      parsedGross = parseFloat(grossStr);
      if (isNaN(parsedGross) || parsedGross < 0) {
        setIncomeError('Please enter a valid positive gross income.');
        return;
      }
    }

    let parsedDed = 0;
    if (dedStr) {
      parsedDed = parseFloat(dedStr);
      if (isNaN(parsedDed) || parsedDed < 0) {
        setIncomeError('Please enter a valid positive deduction.');
        return;
      }
    }

    const monthYearKey = `${incomeSelectedYear}-${String(incomeSelectedMonth.monthIndex).padStart(2, '0')}`;
    await updateMonthlyIncome(monthYearKey, parsedGross, parsedDed);
    setIsIncomeModalVisible(false);
  };

  const renderIncomeProgressBar = (income: number, expense: number, balance: number, averageText?: string) => {
    const expensePercent = income > 0 ? (expense / income) * 100 : (expense > 0 ? 100 : 0);
    const availablePercent = income > 0 ? (balance / income) * 100 : (balance > 0 ? 100 : 0);

    return (
      <View style={{ marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <AppText style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 'bold' }}>
            EXPENSE {String(expensePercent.toFixed(2)).padStart(5, '0')}%
          </AppText>
          <AppText style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 'bold' }}>
            AVAILABLE BALANCE {String(availablePercent.toFixed(2)).padStart(5, '0')}%
          </AppText>
        </View>
        <View style={{ height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, flexDirection: 'row', overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${Math.min(100, expensePercent)}%`, backgroundColor: '#ff4444' }} />
          <View style={{ height: '100%', width: `${Math.max(0, 100 - expensePercent)}%`, backgroundColor: income > 0 && balance > 0 ? '#00C851' : 'transparent' }} />
        </View>
        {averageText && (
          <AppText style={{ fontSize: 13, color: '#FFF', opacity: 0.8, marginTop: 12 }}>
            {averageText}
          </AppText>
        )}
      </View>
    );
  };
  const [isDownloading, setIsDownloading] = useState(false);
  const { accounts, getAccountStats, updateAccountOrder, deleteAccount, excludedFromTotal, showCardStats, transactions } = useTransactionContext();

  const [isTotalBalanceHidden, setIsTotalBalanceHidden] = React.useState(!isAmountsVisible);
  const [hiddenAccounts, setHiddenAccounts] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    setIsTotalBalanceHidden(!isAmountsVisible);
    setHiddenAccounts({});
  }, [isAmountsVisible]);

  React.useEffect(() => {
    const checkPendingAutoDownload = async () => {
      try {
        const pending = await AsyncStorage.getItem('@app_pending_auto_download');
        if (pending === 'true') {
          await AsyncStorage.removeItem('@app_pending_auto_download');
          const { performAutoDownloadTask } = require('../tasks/autoDownloadTask');
          await performAutoDownloadTask('Auto');
        }
      } catch (e) {
        console.warn('Error checking pending auto download:', e);
      }
    };
    checkPendingAutoDownload();
  }, []);

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
    setIsDownloading(true);
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
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadSingleAccountPDF = async (accountName: string) => {
    setActiveDropdown(null);
    setIsDownloading(true);
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
    } finally {
      setIsDownloading(false);
    }
  };

  const renderAccountItem = ({ item: acc, drag, isActive }: RenderItemParams<string>) => {
    const stats = getAccountStats(acc);
    const customCardStyle = getCustomCardStyle(useCustomCardUI ? acc : '', colors.primary);
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
          <PremiumCardBackground color={colors.primary} customGradient={customCardStyle.colors || undefined}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                {customCardStyle.icon.type === 'image' ? (
                  <View style={{ width: 28, height: 28, marginRight: 8, borderRadius: 14, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                    <Image source={typeof customCardStyle.icon.source === 'string' ? { uri: customCardStyle.icon.source } : customCardStyle.icon.source} style={{ width: 20, height: 20 }} resizeMode="contain" />
                  </View>
                ) : (
                  <Ionicons name={customCardStyle.icon.source} size={24} color="#fff" style={{ marginRight: 8 }} />
                )}
                <AppText style={[{ fontSize: 18, fontWeight: 'bold' }, { color: '#fff' }]}>{acc}</AppText>
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
                  <View style={[{ position: 'absolute', top: 30, right: 0, borderRadius: 8, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, minWidth: 120, zIndex: 1000 }, { backgroundColor: colors.surface }]}>
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', padding: 12, paddingHorizontal: 16 }}
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
                      style={{ flexDirection: 'row', alignItems: 'center', padding: 12, paddingHorizontal: 16 }}
                      onPress={() => handleDownloadSingleAccountPDF(acc)}
                      disabled={isDownloading}
                    >
                      {isDownloading ? (
                        <ActivityIndicator size="small" color={colors.text} style={{ marginRight: 8 }} />
                      ) : (
                        <Ionicons name="download-outline" size={18} color={colors.text} style={{ marginRight: 8 }} />
                      )}
                      <AppText style={{ color: colors.text }}>Download</AppText>
                    </TouchableOpacity>

                    <View style={{ height: 1, backgroundColor: colors.border }} />

                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', padding: 12, paddingHorizontal: 16 }}
                      onPress={() => handleDeleteAccount(acc)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ff4444" style={{ marginRight: 8 }} />
                      <AppText style={{ color: '#ff4444' }}>Delete</AppText>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
            <View style={{ marginTop: 4 }}>
              <AppText style={[{ fontSize: 14, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }, { color: 'rgba(255,255,255,0.8)' }]}>Available Balance</AppText>
              <AppText style={[{ fontSize: 28, fontWeight: 'bold' }, { color: '#fff' }]}>
                {(hiddenAccounts[acc] ?? !isAmountsVisible) ? '••••••' : `${currency}${formatAmount(stats.balance)}`}
              </AppText>

              {showCardStats && (
                <View style={{ flexDirection: 'row', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Ionicons name="arrow-down-circle" size={16} color="#4CAF50" style={{ marginRight: 4 }} />
                      <AppText style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>CREDIT</AppText>
                    </View>
                    <AppText style={{ fontSize: 16, fontWeight: 'bold', color: '#4CAF50' }}>{(hiddenAccounts[acc] ?? !isAmountsVisible) ? '•••••' : `${currency}${formatAmount(stats.totalCredit)}`}</AppText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Ionicons name="arrow-up-circle" size={16} color="#F44336" style={{ marginRight: 4 }} />
                      <AppText style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>DEBIT</AppText>
                    </View>
                    <AppText style={{ fontSize: 16, fontWeight: 'bold', color: '#F44336' }}>{(hiddenAccounts[acc] ?? !isAmountsVisible) ? '•••••' : `${currency}${formatAmount(stats.totalDebit)}`}</AppText>
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Ionicons name="wallet" size={24} color="#fff" style={{ marginRight: 8 }} />
            <AppText style={[{ fontSize: 18, fontWeight: 'bold' }, { color: '#fff' }]}>Total Balance</AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setIsTotalBalanceHidden(!isTotalBalanceHidden)} style={{ padding: 4, marginRight: 8 }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name={isTotalBalanceHidden ? 'eye-off-outline' : 'eye-outline'} size={20} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveDropdown(activeDropdown === 'TOTAL_CARD' ? null : 'TOTAL_CARD')} style={{ padding: 4 }}>
              <Ionicons name="ellipsis-vertical" size={20} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>

            {activeDropdown === 'TOTAL_CARD' && (
              <View style={[{ position: 'absolute', top: 30, right: 0, borderRadius: 8, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, minWidth: 120, zIndex: 1000 }, { backgroundColor: colors.surface }]}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 12, paddingHorizontal: 16 }}
                  onPress={handleDownloadAllAccountsPDF}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <ActivityIndicator size="small" color={colors.text} style={{ marginRight: 8 }} />
                  ) : (
                    <Ionicons name="download-outline" size={18} color={colors.text} style={{ marginRight: 8 }} />
                  )}
                  <AppText style={{ color: colors.text }}>Download</AppText>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
        <View style={{ marginTop: 4 }}>
          <AppText style={[{ fontSize: 14, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }, { color: 'rgba(255,255,255,0.8)' }]}>Overall Available Balance</AppText>
          <AppText style={[{ fontSize: 28, fontWeight: 'bold' }, { color: '#fff', fontSize: 32 }]}>
            {isTotalBalanceHidden ? '••••••' : `${currency}${formatAmount(totalBalance)}`}
          </AppText>

          {showCardStats && (
            <View style={{ flexDirection: 'row', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Ionicons name="arrow-down-circle" size={16} color="#4CAF50" style={{ marginRight: 4 }} />
                  <AppText style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>TOTAL CREDIT</AppText>
                </View>
                <AppText style={{ fontSize: 16, fontWeight: 'bold', color: '#4CAF50' }}>{isTotalBalanceHidden ? '•••••' : `${currency}${formatAmount(totalCredit)}`}</AppText>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Ionicons name="arrow-up-circle" size={16} color="#F44336" style={{ marginRight: 4 }} />
                  <AppText style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>TOTAL DEBIT</AppText>
                </View>
                <AppText style={{ fontSize: 16, fontWeight: 'bold', color: '#F44336' }}>{isTotalBalanceHidden ? '•••••' : `${currency}${formatAmount(totalDebit)}`}</AppText>
              </View>
            </View>
          )}
        </View>
      </PremiumCardBackground>
      <View style={{ height: 2, backgroundColor: colors.accent, borderRadius: 1 }} />
    </View>
  ) : null;

  const currentMonthIndex = new Date().getMonth();
  const currentYearVal = new Date().getFullYear();

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthIndex);
  const [selectedYear, setSelectedYear] = useState<number>(currentYearVal);

  const [isMonthFilterVisible, setIsMonthFilterVisible] = useState(false);
  const [isYearFilterVisible, setIsYearFilterVisible] = useState(false);

  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);
  const [isDayModalVisible, setIsDayModalVisible] = useState(false);

  const [selectedMonthForModal, setSelectedMonthForModal] = useState<number | null>(null);
  const [isMonthModalVisible, setIsMonthModalVisible] = useState(false);

  const [isMonthlyCardHidden, setIsMonthlyCardHidden] = React.useState(!isAmountsVisible);
  const [isYearlyCardHidden, setIsYearlyCardHidden] = React.useState(!isAmountsVisible);
  const [isMonthlyCalendarHidden, setIsMonthlyCalendarHidden] = React.useState(!isAmountsVisible);
  const [isYearlyCalendarHidden, setIsYearlyCalendarHidden] = React.useState(!isAmountsVisible);
  const [isYearlyBarChartHidden, setIsYearlyBarChartHidden] = React.useState(!isAmountsVisible);
  const [isAllYearsBarChartHidden, setIsAllYearsBarChartHidden] = React.useState(!isAmountsVisible);
  const [isAllYearsCalendarHidden, setIsAllYearsCalendarHidden] = React.useState(!isAmountsVisible);

  React.useEffect(() => {
    setIsMonthlyCardHidden(!isAmountsVisible);
    setIsYearlyCardHidden(!isAmountsVisible);
    setIsMonthlyCalendarHidden(!isAmountsVisible);
    setIsYearlyCalendarHidden(!isAmountsVisible);
    setIsYearlyBarChartHidden(!isAmountsVisible);
    setIsAllYearsBarChartHidden(!isAmountsVisible);
    setIsAllYearsCalendarHidden(!isAmountsVisible);
  }, [isAmountsVisible]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastOpacity] = useState(new Animated.Value(0));

  const showToast = (message: string) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToastMessage(null));
  };

  const availableYears = useMemo(() => {
    const years = new Set(expenses.map(e => parseISOYear(e.date)));
    if (!years.has(currentYearVal)) years.add(currentYearVal);
    return Array.from(years).sort((a, b) => b - a);
  }, [expenses, currentYearVal]);

  const availableMonths = useMemo(() => {
    const months = new Set(expenses.map(e => parseISOMonth(e.date)));
    if (!months.has(currentMonthIndex)) months.add(currentMonthIndex);
    return Array.from(months).sort((a, b) => a - b);
  }, [expenses, currentMonthIndex]);

  const total = useMemo(() => {
    return expenses
      .filter((expense) => {
        return parseISOMonth(expense.date) === selectedMonth && parseISOYear(expense.date) === selectedYear;
      })
      .reduce((sum, expense) => sum + expense.amount, 0);
  }, [expenses, selectedMonth, selectedYear]);

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const currentMonthName = `${MONTHS[selectedMonth]} ${selectedYear}`;

  const daysToConsiderMonthly = useMemo(() => {
    const now = new Date();
    if (selectedYear === now.getFullYear() && selectedMonth === now.getMonth()) {
      return Math.max(now.getDate() - 1, 1);
    } else {
      return new Date(selectedYear, selectedMonth + 1, 0).getDate();
    }
  }, [selectedYear, selectedMonth]);

  const monthlyDailyAverage = total / daysToConsiderMonthly;

  const currentYearTotal = useMemo(() => {
    return expenses
      .filter(exp => parseISOYear(exp.date) === selectedYear)
      .reduce((sum, exp) => sum + exp.amount, 0);
  }, [expenses, selectedYear]);

  const monthsToConsider = useMemo(() => {
    const now = new Date();
    if (selectedYear === now.getFullYear()) {
      return Math.max(now.getMonth(), 1);
    } else if (selectedYear < now.getFullYear()) {
      return 12;
    }
    return 1;
  }, [selectedYear]);

  const yearlyMonthlyAverage = currentYearTotal / monthsToConsider;

  const remainingDaysInMonth = useMemo(() => {
    const now = new Date();
    if (selectedYear === now.getFullYear() && selectedMonth === now.getMonth()) {
      const totalDays = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      return totalDays - now.getDate() + 1;
    } else if (selectedYear > now.getFullYear() || (selectedYear === now.getFullYear() && selectedMonth > now.getMonth())) {
      return new Date(selectedYear, selectedMonth + 1, 0).getDate();
    }
    return 0;
  }, [selectedYear, selectedMonth]);

  const remainingDailyBudget = monthlyBudget > 0 && remainingDaysInMonth > 0 ? (monthlyBudget - total) / remainingDaysInMonth : 0;

  const remainingMonthsInYear = useMemo(() => {
    const now = new Date();
    if (selectedYear === now.getFullYear()) {
      return 12 - now.getMonth();
    } else if (selectedYear > now.getFullYear()) {
      return 12;
    }
    return 0;
  }, [selectedYear]);

  const remainingMonthlyBudget = yearlyBudget > 0 && remainingMonthsInYear > 0 ? (yearlyBudget - currentYearTotal) / remainingMonthsInYear : 0;

  const monthlyTimeProgress = useMemo(() => {
    const now = new Date();
    const totalDays = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    if (selectedYear < now.getFullYear() || (selectedYear === now.getFullYear() && selectedMonth < now.getMonth())) {
      return 1;
    }
    if (selectedYear > now.getFullYear() || (selectedYear === now.getFullYear() && selectedMonth > now.getMonth())) {
      return 0;
    }
    if (isPreciseTimeElapsed) {
      const elapsedHours = (now.getDate() - 1) * 24 + now.getHours() + (now.getMinutes() / 60);
      const totalHours = totalDays * 24;
      return elapsedHours / totalHours;
    }
    return Math.max(0, now.getDate() - 1) / totalDays;
  }, [selectedYear, selectedMonth, isPreciseTimeElapsed]);

  const yearlyTimeProgress = useMemo(() => {
    const now = new Date();
    if (selectedYear < now.getFullYear()) return 1;
    if (selectedYear > now.getFullYear()) return 0;

    if (isPreciseTimeElapsed) {
      const startOfYear = new Date(selectedYear, 0, 1);
      const diffTime = now.getTime() - startOfYear.getTime();
      const elapsedDays = diffTime / (1000 * 60 * 60 * 24);
      const isLeapYear = (selectedYear % 4 === 0 && selectedYear % 100 !== 0) || (selectedYear % 400 === 0);
      const totalYearDays = isLeapYear ? 366 : 365;
      return Math.min(1, elapsedDays / totalYearDays);
    }

    return now.getMonth() / 12;
  }, [selectedYear, isPreciseTimeElapsed]);

  const budgetSpentRatio = monthlyBudget > 0 ? total / monthlyBudget : 0;



  const categoryExpenses = useMemo(() => {
    const expensesMap: Record<string, number> = {};
    expenses
      .filter(exp => parseISOYear(exp.date) === selectedYear)
      .forEach(exp => {
        if (exp.categoryId) {
          expensesMap[exp.categoryId] = (expensesMap[exp.categoryId] || 0) + exp.amount;
        }
      });
    return expensesMap;
  }, [expenses, selectedYear]);

  const monthlyData = useMemo(() => {
    const data = new Array(12).fill(0);
    expenses.forEach(exp => {
      if (parseISOYear(exp.date) === selectedYear) {
        data[parseISOMonth(exp.date)] += exp.amount;
      }
    });
    return data;
  }, [expenses, selectedYear]);

  const maxExpense = Math.max(...monthlyData, 1);

  const yearlyDataForChart = useMemo(() => {
    const orderedYears = [...availableYears].sort((a, b) => a - b);
    return orderedYears.map(year => {
      const amount = expenses
        .filter(exp => parseISOYear(exp.date) === year)
        .reduce((sum, exp) => sum + exp.amount, 0);
      return { year, amount };
    });
  }, [availableYears, expenses]);

  const maxYearExpense = Math.max(...yearlyDataForChart.map(d => d.amount), 1);
  const renderCards = () => (
    <View>
      {/* Monthly Spending Card */}
      <PremiumCardBackground color={colors.primary}>
        <TouchableOpacity style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }} onPress={() => setIsMonthlyCardHidden(!isMonthlyCardHidden)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name={isMonthlyCardHidden ? 'eye-off-outline' : 'eye-outline'} size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <TouchableOpacity onPress={() => setIsMonthFilterVisible(true)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppText style={{ fontSize: 14, color: '#FFF', opacity: 0.9, fontWeight: '600', textTransform: 'uppercase' }} numberOfLines={1} adjustsFontSizeToFit>{currentMonthName} Spending</AppText>
                <Ionicons name="chevron-down" size={14} color="#FFF" style={{ marginLeft: 4, opacity: 0.9 }} />
              </TouchableOpacity>
            </View>
            <AppText style={{ fontSize: 32, fontWeight: 'bold', color: monthlyBudget > 0 ? (total > monthlyBudget ? '#ff4444' : (total >= monthlyBudget * 0.8 ? '#ffbb33' : '#FFF')) : '#FFF', marginBottom: monthlyBudget > 0 && showMonthlyBudget ? 12 : 0 }} numberOfLines={1} adjustsFontSizeToFit>
              {isMonthlyCardHidden ? '••••••' : `${currency}${formatAmount(total)}`}
            </AppText>
            {monthlyBudget > 0 && showMonthlyBudget && (
              <View style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <AppText style={{ fontSize: 10, color: '#FFF', opacity: 0.8, textTransform: 'uppercase', fontWeight: '600' }}>Time Elapsed</AppText>
                  <AppText style={{ fontSize: 10, color: '#FFF', opacity: 0.8, fontWeight: '600' }}>{(monthlyTimeProgress * 100).toFixed(2).padStart(5, '0')}%</AppText>
                </View>
                <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, width: '100%', overflow: 'hidden', position: 'relative' }}>
                  <View style={{ height: '100%', backgroundColor: '#FFF', width: `${monthlyTimeProgress * 100}%` }} />
                </View>
              </View>
            )}
            <AppText style={{ fontSize: 13, color: '#FFF', opacity: 0.8 }}>
              Daily Avg: {isMonthlyCardHidden ? '•••••' : `${currency}${formatAmount(monthlyDailyAverage)}`}
            </AppText>
            {monthlyBudget > 0 && remainingDaysInMonth > 0 && (
              <AppText style={{ fontSize: 13, color: '#FFF', opacity: 0.8, marginTop: 4 }}>
                Daily Left: {isMonthlyCardHidden ? '•••••' : `${currency}${formatAmount(remainingDailyBudget)}`}
              </AppText>
            )}
            {monthlyBudget > 0 && remainingDaysInMonth === 0 && (
              <AppText style={{ fontSize: 13, color: '#FFF', opacity: 0.8, marginTop: 4 }}>
                {total > monthlyBudget ? 'Overspent: ' : 'Left: '}{isMonthlyCardHidden ? '•••••' : `${currency}${formatAmount(Math.abs(monthlyBudget - total))}`}
              </AppText>
            )}
          </View>

          {monthlyBudget > 0 && showMonthlyBudget && (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={120} height={120}>
                <Circle stroke="rgba(255,255,255,0.2)" cx={60} cy={60} r={56} strokeWidth={8} fill="none" />
                <Circle
                  stroke={total >= monthlyBudget * 0.8 ? '#ffbb33' : '#FFF'}
                  cx={60} cy={60} r={56} strokeWidth={8}
                  strokeDasharray={`${2 * Math.PI * 56} ${2 * Math.PI * 56}`}
                  strokeDashoffset={2 * Math.PI * 56 - (Math.min((total / monthlyBudget) * 100, 100) / 100) * 2 * Math.PI * 56}
                  strokeLinecap="round" fill="none" transform="rotate(-90 60 60)"
                />
                {total > monthlyBudget && (
                  <Circle
                    stroke="#ff4444"
                    cx={60} cy={60} r={56} strokeWidth={8}
                    strokeDasharray={`${2 * Math.PI * 56} ${2 * Math.PI * 56}`}
                    strokeDashoffset={2 * Math.PI * 56 - (Math.min(((total - monthlyBudget) / monthlyBudget) * 100, 100) / 100) * 2 * Math.PI * 56}
                    strokeLinecap="round" fill="none" transform="rotate(-90 60 60)"
                  />
                )}
              </Svg>
              <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
                <AppText style={{ fontSize: 15, fontWeight: 'bold', color: total > monthlyBudget ? '#ff4444' : (total >= monthlyBudget * 0.8 ? '#ffbb33' : '#FFF') }}>
                  {isMonthlyCardHidden ? '•••%' : `${String(((total / monthlyBudget) * 100).toFixed(2)).padStart(5, '0')}%`}
                </AppText>
                <AppText style={{ fontSize: 10, color: '#FFF', opacity: 0.8, marginTop: 2 }}>
                  of {isMonthlyCardHidden ? '•••••' : `${currency}${formatAmount(monthlyBudget)}`}
                </AppText>
              </View>
            </View>
          )}
        </View>
      </PremiumCardBackground>

      {/* Yearly Spending Card */}
      {showYearCard && (
        <PremiumCardBackground color={colors.primary}>
          <TouchableOpacity style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }} onPress={() => setIsYearlyCardHidden(!isYearlyCardHidden)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name={isYearlyCardHidden ? 'eye-off-outline' : 'eye-outline'} size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <TouchableOpacity onPress={() => setIsYearFilterVisible(true)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AppText style={{ fontSize: 14, color: '#FFF', opacity: 0.9, fontWeight: '600', textTransform: 'uppercase' }} numberOfLines={1} adjustsFontSizeToFit>{selectedYear} Total Spending</AppText>
                  <Ionicons name="chevron-down" size={14} color="#FFF" style={{ marginLeft: 4, opacity: 0.9 }} />
                </TouchableOpacity>
              </View>
              <AppText style={{ fontSize: 32, fontWeight: 'bold', color: yearlyBudget > 0 ? (currentYearTotal > yearlyBudget ? '#ff4444' : (currentYearTotal >= yearlyBudget * 0.8 ? '#ffbb33' : '#FFF')) : '#FFF', marginBottom: yearlyBudget > 0 && showYearlyBudget ? 12 : 0 }} numberOfLines={1} adjustsFontSizeToFit>
                {isYearlyCardHidden ? '••••••' : `${currency}${formatAmount(currentYearTotal)}`}
              </AppText>
              {yearlyBudget > 0 && showYearlyBudget && (
                <View style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <AppText style={{ fontSize: 10, color: '#FFF', opacity: 0.8, textTransform: 'uppercase', fontWeight: '600' }}>Time Elapsed</AppText>
                    <AppText style={{ fontSize: 10, color: '#FFF', opacity: 0.8, fontWeight: '600' }}>{(yearlyTimeProgress * 100).toFixed(2).padStart(5, '0')}%</AppText>
                  </View>
                  <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, width: '100%', overflow: 'hidden', position: 'relative' }}>
                    <View style={{ height: '100%', backgroundColor: '#FFF', width: `${yearlyTimeProgress * 100}%` }} />
                  </View>
                </View>
              )}
              <AppText style={{ fontSize: 13, color: '#FFF', opacity: 0.8 }}>
                Monthly Avg: {isYearlyCardHidden ? '•••••' : `${currency}${formatAmount(yearlyMonthlyAverage)}`}
              </AppText>
              {yearlyBudget > 0 && remainingMonthsInYear > 0 && (
                <AppText style={{ fontSize: 13, color: '#FFF', opacity: 0.8, marginTop: 4 }}>
                  Monthly Left: {isYearlyCardHidden ? '•••••' : `${currency}${formatAmount(remainingMonthlyBudget)}`}
                </AppText>
              )}
              {yearlyBudget > 0 && remainingMonthsInYear === 0 && (
                <AppText style={{ fontSize: 13, color: '#FFF', opacity: 0.8, marginTop: 4 }}>
                  {currentYearTotal > yearlyBudget ? 'Overspent: ' : 'Left: '}{isYearlyCardHidden ? '•••••' : `${currency}${formatAmount(Math.abs(yearlyBudget - currentYearTotal))}`}
                </AppText>
              )}
            </View>

            {yearlyBudget > 0 && showYearlyBudget && (
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Svg width={120} height={120}>
                  <Circle stroke="rgba(255,255,255,0.2)" cx={60} cy={60} r={56} strokeWidth={8} fill="none" />
                  <Circle
                    stroke={currentYearTotal >= yearlyBudget * 0.8 ? '#ffbb33' : '#FFF'}
                    cx={60} cy={60} r={56} strokeWidth={8}
                    strokeDasharray={`${2 * Math.PI * 56} ${2 * Math.PI * 56}`}
                    strokeDashoffset={2 * Math.PI * 56 - (Math.min((currentYearTotal / yearlyBudget) * 100, 100) / 100) * 2 * Math.PI * 56}
                    strokeLinecap="round" fill="none" transform="rotate(-90 60 60)"
                  />
                  {currentYearTotal > yearlyBudget && (
                    <Circle
                      stroke="#ff4444"
                      cx={60} cy={60} r={56} strokeWidth={8}
                      strokeDasharray={`${2 * Math.PI * 56} ${2 * Math.PI * 56}`}
                      strokeDashoffset={2 * Math.PI * 56 - (Math.min(((currentYearTotal - yearlyBudget) / yearlyBudget) * 100, 100) / 100) * 2 * Math.PI * 56}
                      strokeLinecap="round" fill="none" transform="rotate(-90 60 60)"
                    />
                  )}
                </Svg>
                <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
                  <AppText style={{ fontSize: 15, fontWeight: 'bold', color: currentYearTotal > yearlyBudget ? '#ff4444' : (currentYearTotal >= yearlyBudget * 0.8 ? '#ffbb33' : '#FFF') }}>
                    {isYearlyCardHidden ? '•••%' : `${String(((currentYearTotal / yearlyBudget) * 100).toFixed(2)).padStart(5, '0')}%`}
                  </AppText>
                  <AppText style={{ fontSize: 10, color: '#FFF', opacity: 0.8, marginTop: 2 }}>
                    of {isYearlyCardHidden ? '•••••' : `${currency}${formatAmount(yearlyBudget)}`}
                  </AppText>
                </View>
              </View>
            )}
          </View>
        </PremiumCardBackground>
      )}


      <SingleFilterModal
        visible={isMonthFilterVisible}
        onClose={() => setIsMonthFilterVisible(false)}
        availableYears={availableYears}
        availableMonths={availableMonths}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        onClearAll={() => {
          setSelectedMonth(currentMonthIndex);
          setSelectedYear(currentYearVal);
        }}
      />

      <SingleFilterModal
        visible={isYearFilterVisible}
        onClose={() => setIsYearFilterVisible(false)}
        availableYears={availableYears}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        onClearAll={() => {
          setSelectedYear(currentYearVal);
        }}
      />
    </View>
  );

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleDayPress = (day: number, total: number) => {
    if (total > 0) {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      setSelectedDayDate(dateStr);
      setIsDayModalVisible(true);
    } else {
      showToast('No transaction found.');
    }
  };

  const handleMonthPress = (month: number, year: number, total: number) => {
    if (total > 0) {
      setSelectedMonthForModal(month);
      setIsMonthModalVisible(true);
    } else {
      showToast('No transaction found.');
    }
  };

  const handlePrevYear = () => {
    setSelectedYear(selectedYear - 1);
  };

  const handleNextYear = () => {
    setSelectedYear(selectedYear + 1);
  };

  const renderContent = () => {
    return (
      <View style={{ flex: 1 }}>
        {/* Accounts View */}
        <View style={{ flex: 1, display: activeView === 'accounts' ? 'flex' : 'none' }}>
          <>
            <DownloadProgressModal visible={isDownloading} message="Generating PDF report…" />
            <DraggableFlatList
              data={accounts}
              keyExtractor={item => item}
              onDragEnd={handleDragEnd}
              renderItem={renderAccountItem}
              ListHeaderComponent={listHeader}
              ListEmptyComponent={
                <EmptyState
                  icon="business-outline"
                  title="No Accounts"
                  message="You don't have any accounts set up yet. Accounts are automatically created when you add your first transaction!"
                />
              }
              contentContainerStyle={{ padding: 20, paddingTop: 0, paddingBottom: 10 }}
              activationDistance={20}
            />
          </>
        </View>

        {/* Income View */}
        <View style={{ flex: 1, display: activeView === 'income' ? 'flex' : 'none' }}>
          <View style={[styles.incomeYearSelectorContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <ScrollView keyboardShouldPersistTaps="handled" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.incomeYearScroll}>
              {(['All', ...incomeYears] as (number | 'All')[]).map(year => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.incomeYearChip,
                    { backgroundColor: incomeSelectedYear === year ? colors.primary : colors.surface }
                  ]}
                  onPress={() => setIncomeSelectedYear(year)}
                >
                  <AppText style={[styles.incomeYearChipText, { color: incomeSelectedYear === year ? '#fff' : colors.text }]}>
                    {year}
                  </AppText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.incomeScroll}>
            <View style={styles.incomeHeader}>
              <AppText style={[styles.incomeTitle, { color: colors.text }]}>
                {incomeSelectedYear === 'All' ? 'Yearly Income' : 'Monthly Income'}
              </AppText>
              <AppText style={styles.incomeSubtitle} numberOfLines={1} adjustsFontSizeToFit>
                {incomeSelectedYear === 'All' ? 'View your yearly income and expense overview.' : 'Track income vs expenses to see your balance.'}
              </AppText>
            </View>

            {incomeSelectedYear === 'All' ? (
              <>
                <PremiumCardBackground color={colors.primary} style={styles.incomeYearlySummaryCard}>
                  <View style={{ marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <AppText style={{ fontSize: 16, color: '#FFF', fontWeight: 'bold' }}>
                      Overall Overview
                    </AppText>
                    <TouchableOpacity onPress={() => setIsIncomeSummaryHidden(!isIncomeSummaryHidden)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name={isIncomeSummaryHidden ? 'eye-off-outline' : 'eye-outline'} size={20} color="rgba(255,255,255,0.7)" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.incomeYearlyStatsRow}>
                    <View style={styles.incomeYearlyStatColumn}>
                      <AppText style={styles.incomeStatLabelWhite}>Gross Income</AppText>
                      <AppText style={[styles.incomeStatValue, { color: incomeOverallTotals.gross === 0 ? '#FFF' : '#33B5E5' }]}>
                        {isIncomeSummaryHidden ? '•••••' : `${incomeOverallTotals.gross === 0 ? '' : '+'}${currency}${String(formatAmount(incomeOverallTotals.gross)).padStart(5, '0')}`}
                      </AppText>
                    </View>
                    <View style={styles.incomeYearlyStatColumn}>
                      <AppText style={styles.incomeStatLabelWhite}>Deduction</AppText>
                      <AppText style={[styles.incomeStatValue, { color: incomeOverallTotals.deduction === 0 ? '#FFF' : '#ffbb33' }]}>
                        {isIncomeSummaryHidden ? '•••••' : `${incomeOverallTotals.deduction === 0 ? '' : '-'}${currency}${String(formatAmount(incomeOverallTotals.deduction)).padStart(5, '0')}`}
                      </AppText>
                    </View>
                    <View style={styles.incomeYearlyStatColumn}>
                      <AppText style={styles.incomeStatLabelWhite}>Net Income</AppText>
                      <AppText style={[styles.incomeStatValue, { color: incomeOverallTotals.net === 0 ? '#FFF' : '#00C851' }]}>
                        {isIncomeSummaryHidden ? '•••••' : `${incomeOverallTotals.net === 0 ? '' : '+'}${currency}${String(formatAmount(incomeOverallTotals.net)).padStart(5, '0')}`}
                      </AppText>
                    </View>
                    <View style={styles.incomeYearlyStatColumn}>
                      <AppText style={styles.incomeStatLabelWhite}>Total Expense</AppText>
                      <AppText style={[styles.incomeStatValue, { color: incomeOverallTotals.expense === 0 ? '#FFF' : '#ff4444' }]}>
                        {isIncomeSummaryHidden ? '•••••' : `${incomeOverallTotals.expense === 0 ? '' : '-'}${currency}${String(formatAmount(incomeOverallTotals.expense)).padStart(5, '0')}`}
                      </AppText>
                    </View>
                    <View style={styles.incomeYearlyStatColumn}>
                      <AppText style={styles.incomeStatLabelWhite}>Available Balance</AppText>
                      <AppText style={[styles.incomeStatValue, { color: incomeOverallTotals.balance === 0 ? '#FFF' : (incomeOverallTotals.balance > 0 ? '#00C851' : '#ff4444') }]}>
                        {isIncomeSummaryHidden ? '•••••' : `${incomeOverallTotals.balance === 0 ? '' : (incomeOverallTotals.balance > 0 ? '+' : '-')}${currency}${String(formatAmount(Math.abs(incomeOverallTotals.balance))).padStart(5, '0')}`}
                      </AppText>
                    </View>
                  </View>
                  {renderIncomeProgressBar(incomeOverallTotals.net, incomeOverallTotals.expense, incomeOverallTotals.balance)}
                </PremiumCardBackground>

                <View style={{ height: 2, backgroundColor: colors.accent, borderRadius: 1, marginBottom: 16 }} />

                <View style={styles.incomeList}>
                  {incomeAllYearsStats.map((stat) => (
                    <TouchableOpacity
                      key={stat.year}
                      onPress={() => setIncomeSelectedYear(stat.year)}
                    >
                      <PremiumCardBackground color={colors.primary} style={styles.incomeMonthCard}>
                        <View style={styles.incomeCardHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <AppText style={[styles.incomeMonthName, { color: '#FFF' }]}>{stat.year} Overview</AppText>
                            <Ionicons name="chevron-forward" size={18} color="#FFF" style={{ marginLeft: 4 }} />
                          </View>
                          <TouchableOpacity onPress={() => toggleHiddenIncomeItem(`year-${stat.year}`)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name={(hiddenIncomeItems[`year-${stat.year}`] ?? !isAmountsVisible) ? 'eye-off-outline' : 'eye-outline'} size={20} color="rgba(255,255,255,0.7)" />
                          </TouchableOpacity>
                        </View>

                        <View style={styles.incomeStatsRow}>
                          <View style={styles.incomeStatColumn}>
                            <AppText style={styles.incomeStatLabelWhite}>Gross Income</AppText>
                            <AppText style={[styles.incomeStatValue, { color: stat.gross === 0 ? '#FFF' : '#33B5E5' }]}>
                              {(hiddenIncomeItems[`year-${stat.year}`] ?? !isAmountsVisible) ? '•••••' : `${stat.gross === 0 ? '' : '+'}${currency}${String(formatAmount(stat.gross)).padStart(5, '0')}`}
                            </AppText>
                          </View>

                          <View style={styles.incomeStatColumn}>
                            <AppText style={styles.incomeStatLabelWhite}>Deduction</AppText>
                            <AppText style={[styles.incomeStatValue, { color: stat.deduction === 0 ? '#FFF' : '#ffbb33' }]}>
                              {(hiddenIncomeItems[`year-${stat.year}`] ?? !isAmountsVisible) ? '•••••' : `${stat.deduction === 0 ? '' : '-'}${currency}${String(formatAmount(stat.deduction)).padStart(5, '0')}`}
                            </AppText>
                          </View>

                          <View style={styles.incomeStatColumn}>
                            <AppText style={styles.incomeStatLabelWhite}>Net Income</AppText>
                            <AppText style={[styles.incomeStatValue, { color: stat.net === 0 ? '#FFF' : '#00C851' }]}>
                              {(hiddenIncomeItems[`year-${stat.year}`] ?? !isAmountsVisible) ? '•••••' : `${stat.net === 0 ? '' : '+'}${currency}${String(formatAmount(stat.net)).padStart(5, '0')}`}
                            </AppText>
                          </View>

                          <View style={styles.incomeStatColumn}>
                            <AppText style={styles.incomeStatLabelWhite}>Total Expense</AppText>
                            <AppText style={[styles.incomeStatValue, { color: stat.expense === 0 ? '#FFF' : '#ff4444' }]}>
                              {(hiddenIncomeItems[`year-${stat.year}`] ?? !isAmountsVisible) ? '•••••' : `${stat.expense === 0 ? '' : '-'}${currency}${String(formatAmount(stat.expense)).padStart(5, '0')}`}
                            </AppText>
                          </View>

                          <View style={styles.incomeStatColumn}>
                            <AppText style={styles.incomeStatLabelWhite}>Available Balance</AppText>
                            <AppText
                              style={[styles.incomeStatValue, { color: stat.balance === 0 ? '#FFF' : (stat.balance > 0 ? '#00C851' : '#ff4444') }]}
                            >
                              {(hiddenIncomeItems[`year-${stat.year}`] ?? !isAmountsVisible) ? '•••••' : `${stat.balance === 0 ? '' : (stat.balance > 0 ? '+' : '-')}${currency}${String(formatAmount(Math.abs(stat.balance))).padStart(5, '0')}`}
                            </AppText>
                          </View>
                        </View>
                        {renderIncomeProgressBar(stat.net, stat.expense, stat.balance)}
                      </PremiumCardBackground>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : (
              <>
                <PremiumCardBackground color={colors.primary} style={styles.incomeYearlySummaryCard}>
                  <View style={{ marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <AppText style={{ fontSize: 16, color: '#FFF', fontWeight: 'bold' }}>
                      {incomeSelectedYear} Overview
                    </AppText>
                    <TouchableOpacity onPress={() => setIsIncomeSummaryHidden(!isIncomeSummaryHidden)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name={isIncomeSummaryHidden ? 'eye-off-outline' : 'eye-outline'} size={20} color="rgba(255,255,255,0.7)" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.incomeYearlyStatsRow}>
                    <View style={styles.incomeYearlyStatColumn}>
                      <AppText style={styles.incomeStatLabelWhite}>Gross Income</AppText>
                      <AppText style={[styles.incomeStatValue, { color: incomeYearlyTotals.gross === 0 ? '#FFF' : '#33B5E5' }]}>
                        {isIncomeSummaryHidden ? '•••••' : `${incomeYearlyTotals.gross === 0 ? '' : '+'}${currency}${String(formatAmount(incomeYearlyTotals.gross)).padStart(5, '0')}`}
                      </AppText>
                    </View>
                    <View style={styles.incomeYearlyStatColumn}>
                      <AppText style={styles.incomeStatLabelWhite}>Deduction</AppText>
                      <AppText style={[styles.incomeStatValue, { color: incomeYearlyTotals.deduction === 0 ? '#FFF' : '#ffbb33' }]}>
                        {isIncomeSummaryHidden ? '•••••' : `${incomeYearlyTotals.deduction === 0 ? '' : '-'}${currency}${String(formatAmount(incomeYearlyTotals.deduction)).padStart(5, '0')}`}
                      </AppText>
                    </View>
                    <View style={styles.incomeYearlyStatColumn}>
                      <AppText style={styles.incomeStatLabelWhite}>Net Income</AppText>
                      <AppText style={[styles.incomeStatValue, { color: incomeYearlyTotals.net === 0 ? '#FFF' : '#00C851' }]}>
                        {isIncomeSummaryHidden ? '•••••' : `${incomeYearlyTotals.net === 0 ? '' : '+'}${currency}${String(formatAmount(incomeYearlyTotals.net)).padStart(5, '0')}`}
                      </AppText>
                    </View>
                    <View style={styles.incomeYearlyStatColumn}>
                      <AppText style={styles.incomeStatLabelWhite}>Total Expense</AppText>
                      <AppText style={[styles.incomeStatValue, { color: incomeYearlyTotals.expense === 0 ? '#FFF' : '#ff4444' }]}>
                        {isIncomeSummaryHidden ? '•••••' : `${incomeYearlyTotals.expense === 0 ? '' : '-'}${currency}${String(formatAmount(incomeYearlyTotals.expense)).padStart(5, '0')}`}
                      </AppText>
                    </View>
                    <View style={styles.incomeYearlyStatColumn}>
                      <AppText style={styles.incomeStatLabelWhite}>Available Balance</AppText>
                      <AppText style={[styles.incomeStatValue, { color: incomeYearlyTotals.balance === 0 ? '#FFF' : (incomeYearlyTotals.balance > 0 ? '#00C851' : '#ff4444') }]}>
                        {isIncomeSummaryHidden ? '•••••' : `${incomeYearlyTotals.balance === 0 ? '' : (incomeYearlyTotals.balance > 0 ? '+' : '-')}${currency}${String(formatAmount(Math.abs(incomeYearlyTotals.balance))).padStart(5, '0')}`}
                      </AppText>
                    </View>
                  </View>
                  {renderIncomeProgressBar(incomeYearlyTotals.net, incomeYearlyTotals.expense, incomeYearlyTotals.balance)}
                </PremiumCardBackground>

                <View style={{ height: 2, backgroundColor: colors.accent, borderRadius: 1, marginBottom: 16 }} />

                <View style={styles.incomeList}>
                  {incomeMonthlyStats.map((stat, index) => (
                    <TouchableOpacity
                      key={stat.monthIndex}
                      onPress={() => handleOpenIncomeModal(stat.monthIndex, stat.monthName, stat.gross, stat.deduction)}
                    >
                      <PremiumCardBackground color={colors.primary} style={styles.incomeMonthCard}>
                        <View style={styles.incomeCardHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <AppText style={[styles.incomeMonthName, { color: '#FFF' }]}>{stat.monthName}</AppText>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="pencil" size={18} color="rgba(255,255,255,0.7)" style={{ marginRight: 12 }} />
                            <TouchableOpacity onPress={() => toggleHiddenIncomeItem(`month-${stat.monthIndex}`)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                              <Ionicons name={(hiddenIncomeItems[`month-${stat.monthIndex}`] ?? !isAmountsVisible) ? 'eye-off-outline' : 'eye-outline'} size={20} color="rgba(255,255,255,0.7)" />
                            </TouchableOpacity>
                          </View>
                        </View>

                        <View style={styles.incomeStatsRow}>
                          <View style={styles.incomeStatColumn}>
                            <AppText style={styles.incomeStatLabelWhite}>Gross Income</AppText>
                            <AppText style={[styles.incomeStatValue, { color: stat.gross === 0 ? '#FFF' : '#33B5E5' }]}>
                              {(hiddenIncomeItems[`month-${stat.monthIndex}`] ?? !isAmountsVisible) ? '•••••' : `${stat.gross === 0 ? '' : '+'}${currency}${String(formatAmount(stat.gross)).padStart(5, '0')}`}
                            </AppText>
                          </View>

                          <View style={styles.incomeStatColumn}>
                            <AppText style={styles.incomeStatLabelWhite}>Deduction</AppText>
                            <AppText style={[styles.incomeStatValue, { color: stat.deduction === 0 ? '#FFF' : '#ffbb33' }]}>
                              {(hiddenIncomeItems[`month-${stat.monthIndex}`] ?? !isAmountsVisible) ? '•••••' : `${stat.deduction === 0 ? '' : '-'}${currency}${String(formatAmount(stat.deduction)).padStart(5, '0')}`}
                            </AppText>
                          </View>

                          <View style={styles.incomeStatColumn}>
                            <AppText style={styles.incomeStatLabelWhite}>Net Income</AppText>
                            <AppText style={[styles.incomeStatValue, { color: stat.net === 0 ? '#FFF' : '#00C851' }]}>
                              {(hiddenIncomeItems[`month-${stat.monthIndex}`] ?? !isAmountsVisible) ? '•••••' : `${stat.net === 0 ? '' : '+'}${currency}${String(formatAmount(stat.net)).padStart(5, '0')}`}
                            </AppText>
                          </View>

                          <View style={styles.incomeStatColumn}>
                            <AppText style={styles.incomeStatLabelWhite}>Expense</AppText>
                            <AppText style={[styles.incomeStatValue, { color: stat.expense === 0 ? '#FFF' : '#ff4444' }]}>
                              {(hiddenIncomeItems[`month-${stat.monthIndex}`] ?? !isAmountsVisible) ? '•••••' : `${stat.expense === 0 ? '' : '-'}${currency}${String(formatAmount(stat.expense)).padStart(5, '0')}`}
                            </AppText>
                          </View>

                          <View style={styles.incomeStatColumn}>
                            <AppText style={styles.incomeStatLabelWhite}>Available  Balance</AppText>
                            <AppText
                              style={[styles.incomeStatValue, { color: stat.balance === 0 ? '#FFF' : (stat.balance > 0 ? '#00C851' : '#ff4444') }]}
                            >
                              {(hiddenIncomeItems[`month-${stat.monthIndex}`] ?? !isAmountsVisible) ? '•••••' : `${stat.balance === 0 ? '' : (stat.balance > 0 ? '+' : '-')}${currency}${String(formatAmount(Math.abs(stat.balance))).padStart(5, '0')}`}
                            </AppText>
                          </View>
                        </View>
                        {renderIncomeProgressBar(stat.net, stat.expense, stat.balance)}
                      </PremiumCardBackground>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </ScrollView>

          <Modal visible={isIncomeModalVisible} transparent animationType="slide" onRequestClose={() => setIsIncomeModalVisible(false)}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.incomeModalOverlay}>
                <KeyboardAvoidingView
                  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                  style={[styles.incomeModalContent, { backgroundColor: colors.background, paddingBottom: Math.max(24, insets.bottom + 16) }]}
                >
                  <View style={styles.incomeModalHeader}>
                    <AppText style={[styles.incomeModalTitle, { color: colors.text }]}>
                      Income for {incomeSelectedMonth?.monthName} {incomeSelectedYear}
                    </AppText>
                    <TouchableOpacity onPress={() => setIsIncomeModalVisible(false)}>
                      <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.incomeInputWrapper}>
                    <AppText style={[styles.incomeLabel, { color: colors.text }]}>Gross Income</AppText>
                    <TextInput
                      style={[styles.incomeInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                      placeholder="0.00"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      value={grossIncomeInput}
                      onChangeText={(text) => {
                        setGrossIncomeInput(text);
                        setIncomeError('');
                      }}
                      autoFocus
                    />
                  </View>

                  <View style={styles.incomeInputWrapper}>
                    <AppText style={[styles.incomeLabel, { color: colors.text }]}>Deduction</AppText>
                    <TextInput
                      style={[styles.incomeInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                      placeholder="0.00"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      value={deductionInput}
                      onChangeText={(text) => {
                        setDeductionInput(text);
                        setIncomeError('');
                      }}
                    />
                    {incomeError ? <AppText style={styles.incomeErrorText}>{incomeError}</AppText> : null}
                  </View>

                  <TouchableOpacity style={[styles.incomeSaveButton, { backgroundColor: colors.primary }]} onPress={handleSaveIncome}>
                    <AppText style={styles.incomeSaveButtonText}>Save Income</AppText>
                  </TouchableOpacity>
                </KeyboardAvoidingView>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        </View>

        {/* Expenses View */}
        <View style={{ flex: 1, display: activeView === 'expenses' ? 'flex' : 'none' }}>
          <>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingTop: 0 }}>
              {renderCards()}
              <MonthlySpendingCalendar
                expenses={expenses}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                colors={colors}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
                onDayPress={handleDayPress}
                isCalendarHidden={isMonthlyCalendarHidden}
                setIsCalendarHidden={setIsMonthlyCalendarHidden}
                currency={currency}
              />

              <YearlySpendingCalendar
                expenses={expenses}
                selectedYear={selectedYear}
                colors={colors}
                onMonthPress={handleMonthPress}
                onPrevYear={handlePrevYear}
                onNextYear={handleNextYear}
                isCalendarHidden={isYearlyCalendarHidden}
                setIsCalendarHidden={setIsYearlyCalendarHidden}
                currency={currency}
              />

              <AllYearsSpendingCalendar
                expenses={expenses}
                availableYears={availableYears}
                colors={colors}
                onYearPress={(year: number, total: number) => {
                  if (total > 0) {
                    setSelectedYear(year);
                  } else {
                    showToast('No transaction found.');
                  }
                }}
                isCalendarHidden={isAllYearsCalendarHidden}
                setIsCalendarHidden={setIsAllYearsCalendarHidden}
                currency={currency}
              />

              {/* Yearly Monthly Bar Chart */}
              <PremiumCardBackground color={colors.primary}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginLeft: 4, marginRight: 4 }}>
                  <AppText style={{ fontSize: 16, fontWeight: 'bold', color: '#FFF' }}>
                    Monthly Spending Chart
                  </AppText>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <AppText style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginRight: 8 }}>
                      {selectedYear}
                    </AppText>
                    <TouchableOpacity onPress={() => setIsYearlyBarChartHidden(!isYearlyBarChartHidden)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name={isYearlyBarChartHidden ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.7)" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 }}>
                  <TouchableOpacity onPress={handlePrevYear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="chevron-back" size={20} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleNextYear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="chevron-forward" size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', height: 180, marginTop: 4 }}>
                  <View style={{ justifyContent: 'space-between', paddingRight: 8, paddingBottom: 20 }}>
                    {[
                      monthlyBudget > 0 ? monthlyBudget : maxExpense,
                      (monthlyBudget > 0 ? monthlyBudget : maxExpense) * 0.80,
                      (monthlyBudget > 0 ? monthlyBudget : maxExpense) * 0.60,
                      (monthlyBudget > 0 ? monthlyBudget : maxExpense) * 0.40,
                      (monthlyBudget > 0 ? monthlyBudget : maxExpense) * 0.20,
                      0
                    ].map((val, idx) => (
                      <AppText key={idx} style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', textAlign: 'right' }}>
                        {isYearlyBarChartHidden ? '•••••' : `${currency}${formatCompact(val)}`}
                      </AppText>
                    ))}
                  </View>

                  <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', position: 'relative' }}>
                    <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'space-between', paddingBottom: 20, zIndex: -1 }}>
                      {[1, 2, 3, 4, 5, 6].map((_, i) => (
                        <View key={i} style={{ height: 12, justifyContent: 'center' }}>
                          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                        </View>
                      ))}
                    </View>
                    {monthlyData.map((amount, index) => {
                      const yAxisMax = monthlyBudget > 0 ? monthlyBudget : maxExpense;
                      const heightPercentage = Math.min((amount / yAxisMax) * 100, 100);
                      const barColor = amount === 0
                        ? 'rgba(255,255,255,0.2)'
                        : (monthlyBudget > 0
                          ? (amount > monthlyBudget ? '#ff4444' : (amount >= monthlyBudget * 0.8 ? '#ffbb33' : '#FFF'))
                          : '#FFF');
                      return (
                        <View key={index} style={{ alignItems: 'center', width: '6.9%', height: '100%', justifyContent: 'flex-end' }}>
                          <View style={{ flex: 1, justifyContent: 'flex-end', width: '100%', paddingBottom: 4 }}>
                            {!isYearlyBarChartHidden && amount > 0 && (
                              <AppText style={{ fontSize: 6, color: '#FFF', opacity: 0.8, marginBottom: 4, textAlign: 'center' }} numberOfLines={1} adjustsFontSizeToFit>
                                {`${currency}${formatCompact(amount)}`}
                              </AppText>
                            )}
                            <View style={{ width: '100%', height: isYearlyBarChartHidden ? 0 : `${heightPercentage}%`, backgroundColor: barColor, borderRadius: 4, minHeight: 4 }} />
                          </View>
                          <AppText style={{ fontSize: 9, color: '#FFF', opacity: 0.8, height: 16 }} numberOfLines={1} adjustsFontSizeToFit>
                            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index]}
                          </AppText>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </PremiumCardBackground>

              {/* All Years Bar Chart */}
              <PremiumCardBackground color={colors.primary}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginLeft: 4, marginRight: 4 }}>
                  <AppText style={{ fontSize: 16, fontWeight: 'bold', color: '#FFF' }}>
                    Yearly Spending Chart
                  </AppText>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => setIsAllYearsBarChartHidden(!isAllYearsBarChartHidden)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name={isAllYearsBarChartHidden ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.7)" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', height: 180, marginTop: 4 }}>
                  <View style={{ justifyContent: 'space-between', paddingRight: 8, paddingBottom: 20 }}>
                    {[
                      yearlyBudget > 0 ? yearlyBudget : maxYearExpense,
                      (yearlyBudget > 0 ? yearlyBudget : maxYearExpense) * 0.80,
                      (yearlyBudget > 0 ? yearlyBudget : maxYearExpense) * 0.60,
                      (yearlyBudget > 0 ? yearlyBudget : maxYearExpense) * 0.40,
                      (yearlyBudget > 0 ? yearlyBudget : maxYearExpense) * 0.20,
                      0
                    ].map((val, idx) => (
                      <AppText key={idx} style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', textAlign: 'right' }}>
                        {isAllYearsBarChartHidden ? '•••••' : `${currency}${formatCompact(val)}`}
                      </AppText>
                    ))}
                  </View>

                  <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', position: 'relative' }}>
                    <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'space-between', paddingBottom: 20, zIndex: -1 }}>
                      {[1, 2, 3, 4, 5, 6].map((_, i) => (
                        <View key={i} style={{ height: 12, justifyContent: 'center' }}>
                          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                        </View>
                      ))}
                    </View>
                    {yearlyDataForChart.map((item, index) => {
                      const yAxisMax = yearlyBudget > 0 ? yearlyBudget : maxYearExpense;
                      const heightPercentage = Math.min((item.amount / yAxisMax) * 100, 100);
                      const barColor = item.amount === 0
                        ? 'rgba(255,255,255,0.2)'
                        : (yearlyBudget > 0
                          ? (item.amount > yearlyBudget ? '#ff4444' : (item.amount >= yearlyBudget * 0.8 ? '#ffbb33' : '#FFF'))
                          : '#FFF');
                      return (
                        <View key={index} style={{ alignItems: 'center', flex: 1, marginHorizontal: 2, maxWidth: 50, height: '100%', justifyContent: 'flex-end' }}>
                          <View style={{ flex: 1, justifyContent: 'flex-end', width: '100%', paddingBottom: 4 }}>
                            {!isAllYearsBarChartHidden && item.amount > 0 && (
                              <AppText style={{ fontSize: 9, color: '#FFF', opacity: 0.8, marginBottom: 4, textAlign: 'center' }} numberOfLines={1} adjustsFontSizeToFit>
                                {`${currency}${formatCompact(item.amount)}`}
                              </AppText>
                            )}
                            <View style={{ width: '100%', height: isAllYearsBarChartHidden ? 0 : `${heightPercentage}%`, backgroundColor: barColor, borderRadius: 4, minHeight: 4 }} />
                          </View>
                          <AppText style={{ fontSize: 10, color: '#FFF', opacity: 0.8, height: 16 }} numberOfLines={1} adjustsFontSizeToFit>
                            {item.year}
                          </AppText>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </PremiumCardBackground>


            </ScrollView>

            {toastMessage && (
              <Animated.View style={{
                position: 'absolute',
                bottom: 50,
                alignSelf: 'center',
                backgroundColor: 'rgba(0,0,0,0.7)',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 20,
                opacity: toastOpacity,
                zIndex: 9999,
              }}>
                <AppText style={{ color: 'white', fontSize: 14 }}>{toastMessage}</AppText>
              </Animated.View>
            )}

            <DayExpensesModal
              visible={isDayModalVisible}
              onClose={() => setIsDayModalVisible(false)}
              selectedDate={selectedDayDate}
              isHidden={isMonthlyCalendarHidden}
            />

            <MonthExpensesModal
              visible={isMonthModalVisible}
              onClose={() => setIsMonthModalVisible(false)}
              selectedMonth={selectedMonthForModal}
              selectedYear={selectedYear}
              isHidden={isYearlyCalendarHidden}
            />
          </>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, backgroundColor: colors.background, gap: 8 }}>
        {(['expenses', 'accounts', 'income'] as const).map((view) => (
          <TouchableOpacity
            key={view}
            style={{
              flex: 1,
              paddingVertical: 10,
              alignItems: 'center',
              backgroundColor: activeView === view ? colors.primary : colors.card,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: activeView === view ? colors.primary : colors.border,
            }}
            onPress={() => handleTabPress(view)}
          >
            <AppText style={{
              color: activeView === view ? '#fff' : colors.text,
              fontWeight: activeView === view ? 'bold' : 'normal',
              textTransform: 'capitalize',
              fontSize: 14,
            }}>
              {view}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 20,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  incomeYearSelectorContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  incomeYearScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  incomeYearChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  incomeYearChipText: {
    fontSize: 15,
    fontWeight: '600',
  },
  incomeScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  incomeHeader: {
    marginBottom: 24,
  },
  incomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  incomeSubtitle: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
  },
  incomeYearlySummaryCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  incomeYearlyStatsRow: {
    flexDirection: 'column',
    gap: 8,
  },
  incomeYearlyStatColumn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  incomeList: {
    gap: 0,
  },
  incomeMonthCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  incomeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  incomeMonthName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  incomeStatsRow: {
    flexDirection: 'column',
    gap: 8,
  },
  incomeStatColumn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  incomeStatLabel: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  incomeStatLabelWhite: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  incomeStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  incomeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  incomeModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  incomeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  incomeModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  incomeInputWrapper: {
    marginBottom: 24,
  },
  incomeLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  incomeInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  incomeErrorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
  },
  incomeSaveButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  incomeSaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
