const fs = require('fs');
const files = [
  'c:\\daily-accounts\\src\\screens\\SettingsScreen.tsx',
  'c:\\daily-accounts\\src\\screens\\ManageAccountsScreen.tsx',
  'c:\\daily-accounts\\src\\screens\\HomeScreen.tsx',
  'c:\\daily-accounts\\src\\screens\\AnalyticsScreen.tsx',
  'c:\\daily-accounts\\src\\components\\ExpenseList.tsx',
  'c:\\daily-accounts\\src\\components\\AccountTransactionList.tsx',
  'c:\\daily-accounts\\src\\components\\AddTransactionModal.tsx',
  'c:\\daily-accounts\\src\\components\\AddPaymentModeModal.tsx',
  'c:\\daily-accounts\\src\\components\\AddExpenseModal.tsx',
  'c:\\daily-accounts\\src\\components\\AddCategoryModal.tsx',
  'c:\\daily-accounts\\src\\components\\ImportSheetModal.tsx',
  'c:\\daily-accounts\\src\\components\\ImportTransactionalSheetModal.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (content.includes('Alert.alert(') || content.includes('Alert.alert\n') || content.includes('Alert.alert\r')) {
    if (!content.includes('import { useAlert }')) {
      const isScreen = file.includes('screens');
      const importPath = isScreen ? '../context/AlertContext' : '../context/AlertContext';
      
      const lines = content.split('\n');
      let lastImportIndex = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) lastImportIndex = i;
      }
      lines.splice(lastImportIndex + 1, 0, `import { useAlert } from '${importPath}';`);
      content = lines.join('\n');
    }

    if (!content.includes('const { showAlert } = useAlert();')) {
      content = content.replace(/(export default function [a-zA-Z0-9_]+\(.*?\)\s*\{)/g, "$1\n  const { showAlert } = useAlert();");
    }
    
    content = content.replace(/Alert\.alert\(/g, 'showAlert(');
    
    content = content.replace(/import\s+\{([^}]*?)Alert([^}]*?)\}\s+from\s+['"]react-native['"]/g, (match, p1, p2) => {
       let inner = p1 + p2;
       inner = inner.replace(/,,/g, ',').replace(/^\s*,/, '').replace(/,\s*$/, '');
       if (inner.trim() === '') return '';
       return `import { ${inner.trim()} } from 'react-native'`;
    });
    
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Refactored ${file.split('\\').pop()}`);
  }
}
