const fs = require('fs');
const path = require('path');

function walk(dir, list = []) {
  fs.readdirSync(dir).forEach(file => {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) {
      list = walk(p, list);
    } else if (p.endsWith('.jsx')) {
      list.push(p);
    }
  });
  return list;
}

const files = walk(path.join(__dirname, 'src'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Replace new Date(x.data_...) with parseISO(x.data_...)
  // We use regex to find new Date(...) that wraps something like xxx.data_xxx
  const regex = /new Date\(([a-zA-Z0-9_\.]*data_[a-zA-Z0-9_]+)\)/g;
  
  if (regex.test(content)) {
    content = content.replace(regex, 'parseISO($1)');
  }
  
  // also replace new Date(x.created_at) if it's there
  const regex2 = /new Date\(([a-zA-Z0-9_\.]*created_at)\)/g;
  if (regex2.test(content)) {
    content = content.replace(regex2, 'parseISO($1)');
  }

  if (content !== originalContent) {
    console.log('Modified dates in: ' + file);
    
    // Add import { parseISO } from 'date-fns' if missing
    // First check if date-fns is imported
    if (content.includes('from "date-fns"') || content.includes("from 'date-fns'")) {
       if (!content.includes('parseISO')) {
          content = content.replace(/import\s+{([^}]+)}\s+from\s+['"]date-fns['"]/, (match, p1) => {
             return `import { ${p1.trim()}, parseISO } from "date-fns"`;
          });
       }
    } else {
       if (!content.includes('parseISO')) {
         // insert after last import
         const imports = content.match(/import\s+.*from\s+['"].*['"]/g);
         if (imports && imports.length > 0) {
           const lastImport = imports[imports.length - 1];
           content = content.replace(lastImport, lastImport + '\nimport { parseISO } from "date-fns";');
         } else {
           content = 'import { parseISO } from "date-fns";\n' + content;
         }
       }
    }
    
    fs.writeFileSync(file, content);
  }
});

console.log('Done mapping new Date to parseISO');
