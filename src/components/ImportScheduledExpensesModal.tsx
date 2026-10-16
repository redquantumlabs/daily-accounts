import React, { useState } from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import AppText from './AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeContext } from '../context/ThemeContext';
import { useExpenseContext, ScheduledExpense } from '../context/ExpenseContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Papa from 'papaparse';
import { useAlert } from '../context/AlertContext';
import { roundAmount } from '../utils/format';

interface ImportScheduledExpensesModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Parses dates in DD-MM-YY, DD-MM-YYYY, DD/MM/YY, DD/MM/YYYY, or YYYY-MM-DD
 */
export const parseExpenseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();

  // Try YYYY-MM-DD
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(trimmed)) {
    const parts = trimmed.split(/[-/]/).map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0);
    return isNaN(date.getTime()) ? null : date;
  }

  // Try DD-MM-YY or DD-MM-YYYY or DD/MM/YY or DD/MM/YYYY
  const parts = trimmed.split(/[-/]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      if (year < 100) year += 2000;
      const date = new Date(year, month - 1, day, 0, 0, 0);
      return isNaN(date.getTime()) ? null : date;
    }
  }

  const fallback = new Date(trimmed);
  return isNaN(fallback.getTime()) ? null : fallback;
};

/**
 * Parses schedule date and time in DD-MM-YY hh:mm AM/PM, DD-MM-YYYY hh:mm AM/PM, or ISO formats
 */
export const parseScheduleDateTime = (dateTimeStr: string): Date | null => {
  if (!dateTimeStr) return null;
  const trimmed = dateTimeStr.trim();

  // Format 1: DD-MM-YY hh:mm AM/PM (or DD/MM/YYYY hh:mm:ss AM/PM)
  // e.g. "01-11-26 08:00 AM", "01-11-2026 8:00 AM", "01-11-26 14:00"
  const ddmmyyMatch = trimmed.match(
    /^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM|am|pm))?$/i
  );
  if (ddmmyyMatch) {
    const day = parseInt(ddmmyyMatch[1], 10);
    const month = parseInt(ddmmyyMatch[2], 10);
    let year = parseInt(ddmmyyMatch[3], 10);
    if (year < 100) year += 2000;

    let hours = parseInt(ddmmyyMatch[4], 10);
    const minutes = parseInt(ddmmyyMatch[5], 10);
    const seconds = ddmmyyMatch[6] ? parseInt(ddmmyyMatch[6], 10) : 0;
    const meridiem = ddmmyyMatch[7] ? ddmmyyMatch[7].toUpperCase() : null;

    if (meridiem === 'PM' && hours < 12) {
      hours += 12;
    } else if (meridiem === 'AM' && hours === 12) {
      hours = 0;
    }

    const d = new Date(year, month - 1, day, hours, minutes, seconds);
    if (!isNaN(d.getTime())) return d;
  }

  // Format 2: YYYY-MM-DD hh:mm (or ISO)
  const isoMatch = trimmed.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM|am|pm))?$/i
  );
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);

    let hours = parseInt(isoMatch[4], 10);
    const minutes = parseInt(isoMatch[5], 10);
    const seconds = isoMatch[6] ? parseInt(isoMatch[6], 10) : 0;
    const meridiem = isoMatch[7] ? isoMatch[7].toUpperCase() : null;

    if (meridiem === 'PM' && hours < 12) {
      hours += 12;
    } else if (meridiem === 'AM' && hours === 12) {
      hours = 0;
    }

    const d = new Date(year, month - 1, day, hours, minutes, seconds);
    if (!isNaN(d.getTime())) return d;
  }

  const fallback = new Date(trimmed);
  return isNaN(fallback.getTime()) ? null : fallback;
};

const isSameCalendarDay = (d1: Date, d2: Date) => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

export default function ImportScheduledExpensesModal({
  visible,
  onClose,
}: ImportScheduledExpensesModalProps) {
  const { showAlert } = useAlert();
  const colors = useThemeColors();
  const { isDarkTheme } = useThemeContext();
  const insets = useSafeAreaInsets();
  const { scheduledExpenses, categories, paymentModes, bulkImportScheduledExpenses } =
    useExpenseContext();

  const [url, setUrl] = useState('');
  const [availableTabs, setAvailableTabs] = useState<string[]>([]);
  const [selectedTabs, setSelectedTabs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<1 | 2>(1); // 1 = Enter URL & Read Tabs, 2 = Select Tabs & Import

  const handleToggleSelectAll = () => {
    if (selectedTabs.length === availableTabs.length) {
      setSelectedTabs([]);
    } else {
      setSelectedTabs([...availableTabs]);
    }
  };

  const toggleTab = (tab: string) => {
    if (selectedTabs.includes(tab)) {
      setSelectedTabs(selectedTabs.filter((t) => t !== tab));
    } else {
      setSelectedTabs([...selectedTabs, tab]);
    }
  };

  const handleFetchTabs = async () => {
    setError('');
    setIsLoading(true);
    setProgress('Fetching tabs...');

    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const sheetId = match ? match[1] : null;

    if (!sheetId) {
      setError('Invalid Google Sheet URL. Please ensure it is a valid link.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(url);
      const html = await response.text();

      const tabRegex = /<div class="goog-inline-block docs-sheet-tab-caption">([^<]+)<\/div>/g;
      const tabs: string[] = [];
      let matchArr;
      while ((matchArr = tabRegex.exec(html)) !== null) {
        tabs.push(matchArr[1].trim());
      }

      // Secondary check if goog-inline-block was not found
      if (tabs.length === 0) {
        const spanRegex = /<span class="docs-sheet-tab-name">([^<]+)<\/span>/g;
        while ((matchArr = spanRegex.exec(html)) !== null) {
          tabs.push(matchArr[1].trim());
        }
      }

      // Fallback: check if direct CSV export works
      if (tabs.length === 0) {
        const testUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
        const testRes = await fetch(testUrl);
        if (testRes.ok) {
          const testText = await testRes.text();
          if (!testText.includes('<html') && testText.trim().length > 0) {
            tabs.push('Sheet1');
          }
        }
      }

      const uniqueTabs = Array.from(new Set(tabs));

      if (uniqueTabs.length === 0) {
        setError(
          'Could not find any tabs. Ensure the sheet is publicly accessible ("Anyone with the link can view").'
        );
        setIsLoading(false);
        return;
      }

      setAvailableTabs(uniqueTabs);
      setSelectedTabs(uniqueTabs); // Select all by default
      setStep(2);
      setIsLoading(false);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch the sheet.');
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    setError('');
    setIsLoading(true);
    setProgress('Extracting Sheet ID...');

    if (selectedTabs.length === 0) {
      setError('Please select at least one tab to import.');
      setIsLoading(false);
      return;
    }

    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const sheetId = match ? match[1] : null;

    if (!sheetId) {
      setError('Invalid Google Sheet URL.');
      setIsLoading(false);
      return;
    }

    try {
      const newScheduledExpenses: ScheduledExpense[] = [];
      let skippedDuplicates = 0;
      let skippedMissingCategoryOrMode = 0;
      let skippedPastDate = 0;
      let skippedInvalid = 0;

      const nowTime = Date.now();

      // Check against existing scheduled expenses
      const isDuplicate = (
        targetAmount: number,
        targetDesc: string,
        targetExpDate: Date,
        targetCatId: string,
        targetModeId: string
      ) => {
        const checkList = [...scheduledExpenses, ...newScheduledExpenses];
        return checkList.some((item) => {
          if (Number(item.amount) !== Number(targetAmount)) return false;
          if (item.description.trim().toLowerCase() !== targetDesc.trim().toLowerCase()) return false;
          if (item.categoryId !== targetCatId) return false;
          if (item.paymentModeId !== targetModeId) return false;

          const itemExpDate = new Date(item.expenseDate);
          if (isNaN(itemExpDate.getTime())) return false;
          return isSameCalendarDay(itemExpDate, targetExpDate);
        });
      };

      for (const tab of selectedTabs) {
        setProgress(`Fetching ${tab}...`);
        const fetchUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
          tab
        )}`;

        const response = await fetch(fetchUrl);
        if (!response.ok) {
          console.log(`Failed to fetch tab "${tab}", skipping.`);
          continue;
        }

        const csvText = await response.text();
        if (csvText.includes('<html') || csvText.trim() === '') {
          continue;
        }

        const parsed = Papa.parse(csvText, { header: false, skipEmptyLines: true });
        const rows: any[] = parsed.data;

        if (rows.length === 0) continue;

        // Detect column positions by header row names if available
        let dateCol = 0;
        let descCol = 1;
        let amountCol = 2;
        let catCol = 3;
        let modeCol = 4;
        let scheduleDateCol = 5;

        const headerRow = rows[0].map((cell: any) => String(cell || '').trim().toLowerCase());
        const foundDate = headerRow.findIndex(
          (h: string) => h.includes('date') && !h.includes('sched')
        );
        if (foundDate !== -1) dateCol = foundDate;

        const foundDesc = headerRow.findIndex((h: string) => h.includes('desc'));
        if (foundDesc !== -1) descCol = foundDesc;

        const foundAmount = headerRow.findIndex((h: string) => h.includes('amount'));
        if (foundAmount !== -1) amountCol = foundAmount;

        const foundCat = headerRow.findIndex((h: string) => h.includes('cat'));
        if (foundCat !== -1) catCol = foundCat;

        const foundMode = headerRow.findIndex(
          (h: string) => h.includes('mode') || h.includes('pay')
        );
        if (foundMode !== -1) modeCol = foundMode;

        const foundSchedule = headerRow.findIndex((h: string) => h.includes('sched'));
        if (foundSchedule !== -1) scheduleDateCol = foundSchedule;

        // Process data rows (skip header row at index 0)
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const dateStr = String(row[dateCol] || '').trim();
          const descStr = String(row[descCol] || '').trim();
          const amountStr = String(row[amountCol] || '').replace(/,/g, '').trim();
          const catStr = String(row[catCol] || '').trim();
          const modeStr = String(row[modeCol] || '').trim();
          const scheduleDateStr = String(row[scheduleDateCol] || '').trim();

          // Skip completely empty rows
          if (!dateStr && !descStr && !amountStr) continue;

          // Validate description and amount
          const amount = parseFloat(amountStr);
          if (!descStr || isNaN(amount) || amount <= 0) {
            skippedInvalid++;
            continue;
          }

          // Parse expense date
          const expenseDate = parseExpenseDate(dateStr);
          if (!expenseDate) {
            skippedInvalid++;
            continue;
          }

          // Parse schedule date & time
          const scheduleDateTime = parseScheduleDateTime(scheduleDateStr);
          if (!scheduleDateTime) {
            skippedInvalid++;
            continue;
          }

          // Validation Rule 3: Skip if schedule date & time was in the past
          if (scheduleDateTime.getTime() <= nowTime) {
            skippedPastDate++;
            continue;
          }

          // Validation Rule 2: Skip if Category or Payment Mode does not exist in app
          const matchedCategory = categories.find(
            (c) => c.name.trim().toLowerCase() === catStr.toLowerCase()
          );
          const matchedPaymentMode = paymentModes.find(
            (m) => m.name.trim().toLowerCase() === modeStr.toLowerCase()
          );

          if (!matchedCategory || !matchedPaymentMode) {
            skippedMissingCategoryOrMode++;
            continue;
          }

          // Validation Rule 1: Skip if already exists with same Amount, Description, Date, Category, Payment Mode
          if (
            isDuplicate(
              amount,
              descStr,
              expenseDate,
              matchedCategory.id,
              matchedPaymentMode.id
            )
          ) {
            skippedDuplicates++;
            continue;
          }

          // All validations passed, create new scheduled expense
          const newItem: ScheduledExpense = {
            id: `sched_imp_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
            amount: roundAmount(amount),
            description: descStr,
            expenseDate: expenseDate.toISOString(),
            scheduleDate: scheduleDateTime.toISOString(),
            categoryId: matchedCategory.id,
            paymentModeId: matchedPaymentMode.id,
            isProcessed: false,
            createdAt: new Date().toISOString(),
          };

          newScheduledExpenses.push(newItem);
        }
      }

      // Check results
      const totalSkipped =
        skippedDuplicates +
        skippedMissingCategoryOrMode +
        skippedPastDate +
        skippedInvalid;

      if (newScheduledExpenses.length === 0) {
        setIsLoading(false);
        const skippedDetails = [
          skippedDuplicates > 0 ? `• ${skippedDuplicates} already exist` : '',
          skippedMissingCategoryOrMode > 0
            ? `• ${skippedMissingCategoryOrMode} category or payment mode not found in app`
            : '',
          skippedPastDate > 0 ? `• ${skippedPastDate} schedule date was in the past` : '',
          skippedInvalid > 0 ? `• ${skippedInvalid} invalid data format` : '',
        ]
          .filter(Boolean)
          .join('\n');

        showAlert(
          'No Records Imported',
          totalSkipped > 0
            ? `0 scheduled expenses imported.\n\nAll ${totalSkipped} row(s) were skipped:\n${skippedDetails}`
            : 'No valid rows found in the selected sheet(s).'
        );
        return;
      }

      setProgress('Saving scheduled expenses...');
      await bulkImportScheduledExpenses(newScheduledExpenses);

      setIsLoading(false);

      const skipSummary = [
        skippedDuplicates > 0 ? `• ${skippedDuplicates} already exist` : '',
        skippedMissingCategoryOrMode > 0
          ? `• ${skippedMissingCategoryOrMode} Category/Payment Mode not found`
          : '',
        skippedPastDate > 0 ? `• ${skippedPastDate} schedule date in the past` : '',
        skippedInvalid > 0 ? `• ${skippedInvalid} invalid format` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const message =
        totalSkipped > 0
          ? `Imported ${newScheduledExpenses.length} scheduled expense(s).\n\nSkipped ${totalSkipped} row(s):\n${skipSummary}`
          : `Successfully imported ${newScheduledExpenses.length} scheduled expense(s).`;

      showAlert('Import Successful', message, [
        {
          text: 'OK',
          onPress: () => {
            setStep(1);
            setAvailableTabs([]);
            setSelectedTabs([]);
            setUrl('');
            onClose();
          },
        },
      ]);
    } catch (e: any) {
      setError(e.message || 'An error occurred during import.');
      setIsLoading(false);
    }
  };

  const placeholderColor = colors.textMuted;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.background,
                paddingBottom: Math.max(24, insets.bottom + 16),
              },
            ]}
          >
            <View style={styles.header}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons
                  name="calendar-outline"
                  size={24}
                  color={colors.primary}
                  style={{ marginRight: 8 }}
                />
                <AppText style={[styles.title, { color: colors.text }]}>
                  {step === 1 ? 'Import Scheduled Expenses' : 'Select Tabs'}
                </AppText>
              </View>
              <TouchableOpacity onPress={!isLoading ? onClose : undefined} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={!isLoading ? colors.text : '#888'} />
              </TouchableOpacity>
            </View>

            {error ? <AppText style={styles.errorText}>{error}</AppText> : null}

            {step === 1 ? (
              <>
                <AppText style={styles.instructions}>
                  Paste your Google Sheet link to read available tabs and import scheduled expenses.
                </AppText>

                <View style={styles.inputWrapper}>
                  <AppText style={styles.label}>Google Sheet URL</AppText>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          flex: 1,
                          backgroundColor: colors.surface,
                          color: colors.text,
                          borderColor: colors.border,
                        },
                      ]}
                      placeholder="Google Sheet URL"
                      placeholderTextColor={placeholderColor}
                      value={url}
                      onChangeText={(text) => {
                        setUrl(text);
                        setError('');
                      }}
                      editable={!isLoading}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {url.length > 0 && !isLoading && (
                      <TouchableOpacity
                        style={styles.clearIcon}
                        onPress={() => {
                          setUrl('');
                          setError('');
                        }}
                      >
                        <Ionicons name="close-circle" size={20} color={placeholderColor} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <AppText style={[styles.progressText, { color: colors.primary }]}>
                      {progress}
                    </AppText>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.importButton, { backgroundColor: colors.primary }]}
                    onPress={handleFetchTabs}
                  >
                    <AppText style={styles.importButtonText}>Read Tabs</AppText>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <AppText style={{ fontSize: 13, color: colors.textMuted }}>
                    {selectedTabs.length} of {availableTabs.length} tab(s) selected
                  </AppText>
                  <TouchableOpacity onPress={handleToggleSelectAll} disabled={isLoading}>
                    <AppText
                      style={{ fontSize: 13, color: colors.primary, fontWeight: '700' }}
                    >
                      {selectedTabs.length === availableTabs.length
                        ? 'Deselect All'
                        : 'Select All'}
                    </AppText>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={{ maxHeight: 220 }}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 8 }}
                >
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    {availableTabs.map((tab) => {
                      const isSelected = selectedTabs.includes(tab);
                      return (
                        <TouchableOpacity
                          key={tab}
                          style={[
                            styles.tabChip,
                            {
                              backgroundColor: isSelected ? colors.primary : colors.surface,
                              borderColor: isSelected ? colors.primary : colors.border,
                            },
                          ]}
                          onPress={() => toggleTab(tab)}
                          disabled={isLoading}
                        >
                          <Ionicons
                            name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                            size={18}
                            color={isSelected ? '#fff' : colors.text}
                            style={{ marginRight: 6 }}
                          />
                          <AppText
                            style={{
                              color: isSelected ? '#fff' : colors.text,
                              fontWeight: '600',
                            }}
                          >
                            {tab}
                          </AppText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                  <TouchableOpacity
                    style={[
                      styles.importButton,
                      {
                        flex: 1,
                        backgroundColor: colors.surface,
                        borderWidth: 1,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => {
                      setStep(1);
                      setError('');
                    }}
                    disabled={isLoading}
                  >
                    <AppText style={[styles.importButtonText, { color: colors.text }]}>
                      Back
                    </AppText>
                  </TouchableOpacity>

                  {isLoading ? (
                    <View style={[styles.loadingContainer, { flex: 2, paddingVertical: 0 }]}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <AppText
                        style={[
                          styles.progressText,
                          { color: colors.primary, fontSize: 14, marginTop: 4 },
                        ]}
                      >
                        {progress}
                      </AppText>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.importButton, { flex: 2, backgroundColor: colors.primary }]}
                      onPress={handleImport}
                    >
                      <AppText style={styles.importButtonText}>Import</AppText>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  instructions: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
    lineHeight: 20,
  },
  errorText: {
    color: '#ff4444',
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  inputWrapper: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
    marginLeft: 4,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 16,
    paddingRight: 40,
    fontSize: 16,
  },
  clearIcon: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  importButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  importButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  progressText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '600',
  },
});
