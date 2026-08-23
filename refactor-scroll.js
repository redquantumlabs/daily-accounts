const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      results.push(file);
    }
  });
  return results;
}
const files = walk('./src').filter(f => f.endsWith('.tsx'));
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('<ScrollView ') || content.includes('<DraggableFlatList ')) {
    content = content.replace(/<ScrollView /g, '<ScrollView keyboardShouldPersistTaps="handled" ');
    content = content.replace(/<DraggableFlatList /g, '<DraggableFlatList keyboardShouldPersistTaps="handled" ');
    fs.writeFileSync(file, content, 'utf8');
  }
});
console.log('Replaced successfully');
