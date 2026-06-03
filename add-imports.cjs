const fs = require('fs');
const path = require('path');

function walk(dir, list = []) {
  fs.readdirSync(dir).forEach(file => {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) {
      if(!p.includes('node_modules') && !p.includes('.git') && !p.includes('dist')) list = walk(p, list);
    } else if (p.endsWith('.jsx')) {
      list.push(p);
    }
  });
  return list;
}

const files = walk(path.join(__dirname, 'src'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  if (content.includes('parseISO')) {
    let importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]date-fns['"]/;
    if (importRegex.test(content)) {
       const match = content.match(importRegex);
       if (!match[1].includes('parseISO')) {
          content = content.replace(importRegex, `import { $1, parseISO } from "date-fns"`);
          fs.writeFileSync(file, content);
          console.log('Added parseISO import to: ' + file);
       }
    } else {
       if(!content.includes('import { parseISO } from "date-fns"')) {
         content = 'import { parseISO } from "date-fns";\n' + content;
         fs.writeFileSync(file, content);
         console.log('Prepended parseISO import to: ' + file);
       }
    }
  }
});
