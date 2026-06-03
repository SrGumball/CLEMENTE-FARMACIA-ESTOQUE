const fs = require('fs');
const path = require('path');

function walk(dir, list = []) {
  fs.readdirSync(dir).forEach(file => {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) {
      if(!p.includes('node_modules') && !p.includes('.git') && !p.includes('dist')) list = walk(p, list);
    } else if (p.endsWith('.jsx') || p.endsWith('.js')) {
      list.push(p);
    }
  });
  return list;
}

const files = walk(path.join(__dirname, 'src'));

// Regex to find new Date(variable) but NOT new Date()
// We target things that look like date properties: data_xxx, created_at, validade, etc.
const dateRegex = /new Date\s*\(\s*([a-zA-Z0-9_\.]*(?:data_[a-zA-Z0-9_]+|created_at|validade|data|vencimento))\s*\)/g;

files.forEach(file => {
  if (file.includes('fix-dates.cjs') || file.includes('add-imports.cjs')) return;
  
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  if (dateRegex.test(content)) {
    content = content.replace(dateRegex, 'parseISO($1)');
    console.log(`Updated dates in: ${file}`);
    
    // Check for imports
    if (content.includes('from "date-fns"') || content.includes("from 'date-fns'")) {
       if (!content.includes('parseISO')) {
          content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['"]date-fns['"]/, (match, p1) => {
             return `import { ${p1.trim()}, parseISO } from "date-fns"`;
          });
       }
    } else {
       if (!content.includes('parseISO')) {
         const imports = content.match(/import\s+.*from\s+['"].*['"]/g);
         if (imports && imports.length > 0) {
           const lastImport = imports[imports.length - 1];
           content = content.replace(lastImport, `${lastImport}\nimport { parseISO } from "date-fns";`);
         } else {
           content = `import { parseISO } from "date-fns";\n${content}`;
         }
       }
    }
    
    fs.writeFileSync(file, content);
  }
});

console.log('Done mapping new Date to parseISO across the project.');
