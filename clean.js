const fs = require('fs');
function processFile(path) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/user \? \\$\{([A-Z_]+)\}_\\\$\{user\.email\}\ : \1/g, '');
  content = content.replace(/user \? \(@[a-z_]+)_\\\$\{user\.email\}\ : '.*?'/g, "'$1'");
  fs.writeFileSync(path, content);
}
processFile('src/context/ExpenseContext.tsx');
processFile('src/context/TransactionContext.tsx');
