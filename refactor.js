const fs = require('fs');

const expenseFile = 'c:/daily-accounts/src/context/ExpenseContext.tsx';
let content = fs.readFileSync(expenseFile, 'utf8');

const startIdx = content.indexOf('  const loadData = async () => {');
const endIdx = content.indexOf('  };\n\n  useEffect(() => {', startIdx);
const loadDataContent = content.substring(startIdx, endIdx + 4);

let newLoadData = loadDataContent.replace(/const (\w+) = await AsyncStorage\.getItem\(([\w]+)\);/g, 'const $1 = data[$2];');

const prefix = `  const loadData = async () => {
    try {
      setIsLoading(true);
      const keys = [storageKey, categoriesStorageKey, paymentModesStorageKey, currencyStorageKey, budgetStorageKey, showMonthlyBudgetStorageKey, amountsVisibleStorageKey, showYearlyBudgetStorageKey, showYearCardStorageKey, analyticsChartTypeStorageKey, chartStyleStorageKey, downloadPathStorageKey, backupPathStorageKey, monthlyIncomesStorageKey, summaryTimeStorageKey, reminderTimeStorageKey, autoBackupTimeMorningStorageKey, autoBackupTimeEveningStorageKey];
      const results = await AsyncStorage.multiGet(keys);
      const data = Object.fromEntries(results);
`;

newLoadData = newLoadData.replace('  const loadData = async () => {\n    try {\n      setIsLoading(true);\n', prefix);

content = content.replace(loadDataContent, () => newLoadData);
fs.writeFileSync(expenseFile, content);
console.log('ExpenseContext refactored.');
