const fs = require('fs');

function replaceFileContent(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf8');
    for (const { target, replacement } of replacements) {
        if (content.includes(target)) {
            content = content.replace(target, replacement);
        } else {
            console.log(`Could not find target in ${filePath}`);
        }
    }
    fs.writeFileSync(filePath, content);
}

// 1. Relatorios.jsx
replaceFileContent('src/pages/Relatorios.jsx', [
    {
        target: '<div className=\"flex justify-between items-start\">',
        replacement: '<div className=\"flex justify-between items-start no-print\">'
    },
    {
        target: `          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 !important;
          }`,
        replacement: `          .no-print, aside, nav, header, footer, button, .sonner-toaster { display: none !important; }
          .print-only { display: block !important; }
          body, html, #root, .p-6, .print-container, .lg\\:ml-64, main { display: block !important; position: static !important; height: auto !important; min-height: auto !important; overflow: visible !important; margin: 0 !important; width: 100% !important; padding: 0 !important; }`
    }
]);

// 2. Medicamentos.jsx
replaceFileContent('src/pages/Medicamentos.jsx', [
    {
        target: '<div className=\"flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4\">',
        replacement: '<div className=\"flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print\">'
    },
    {
        target: '<Card className=\"p-4 border-0 shadow-sm\">',
        replacement: '<Card className=\"p-4 border-0 shadow-sm no-print\">'
    },
    {
        target: '<Card className=\"border-0 shadow-sm overflow-hidden\">',
        replacement: '<Card className=\"border-0 shadow-sm overflow-hidden no-print\">'
    },
    {
        target: `          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 !important;
          }`,
        replacement: `          .no-print, aside, nav, header, footer, button, .sonner-toaster, dialog, [role="dialog"], [role="combobox"], [role="menu"] { display: none !important; }
          .print-only { display: block !important; }
          body, html, #root, .p-6, .print-container, .lg\\:ml-64, main { display: block !important; position: static !important; height: auto !important; min-height: auto !important; overflow: visible !important; margin: 0 !important; width: 100% !important; padding: 0 !important; }`
    }
]);

// 3. Inventario.jsx
replaceFileContent('src/pages/Inventario.jsx', [
    {
        target: '<div className=\"flex justify-between items-center mb-6\">',
        replacement: '<div className=\"flex justify-between items-center mb-6 no-print\">'
    },
    {
        target: '<Card className=\"p-4 border-0 shadow-sm mb-6\">',
        replacement: '<Card className=\"p-4 border-0 shadow-sm mb-6 no-print\">'
    },
    {
        target: '<Tabs value={activeTab} onValueChange={setActiveTab} className=\"w-full\">',
        replacement: '<Tabs value={activeTab} onValueChange={setActiveTab} className=\"w-full no-print\">'
    },
    {
        target: `          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 !important;
          }`,
        replacement: `          .no-print, aside, nav, header, footer, button, .sonner-toaster { display: none !important; }
          .print-only { display: block !important; }
          body, html, #root, .p-6, .print-container, .lg\\:ml-64, main { display: block !important; position: static !important; height: auto !important; min-height: auto !important; overflow: visible !important; margin: 0 !important; width: 100% !important; padding: 0 !important; }`
    }
]);

// 4. Entradas.jsx
replaceFileContent('src/pages/Entradas.jsx', [
    {
        target: '<Dialog open={reportOpen} onOpenChange={setReportOpen}>',
        replacement: '<Dialog open={reportOpen} onOpenChange={setReportOpen} className=\"print-dialog\">'
    },
    {
        target: `          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 !important;
          }`,
        replacement: `          .no-print, aside, nav, header, footer, button, .sonner-toaster, #root { display: none !important; }
          [data-radix-portal] { display: block !important; position: static !important; height: auto !important; width: 100% !important; }
          [role="dialog"] { display: block !important; position: static !important; transform: none !important; max-width: 100% !important; width: 100% !important; height: auto !important; max-height: none !important; border: 0 !important; box-shadow: none !important; overflow: visible !important; }
          .fixed { position: static !important; }
          body, html { display: block !important; position: static !important; height: auto !important; min-height: auto !important; overflow: visible !important; margin: 0 !important; width: 100% !important; padding: 0 !important; }`
    }
]);

// 5. Saidas.jsx
replaceFileContent('src/pages/Saidas.jsx', [
    {
        target: '<Dialog open={reportOpen} onOpenChange={setReportOpen}>',
        replacement: '<Dialog open={reportOpen} onOpenChange={setReportOpen} className=\"print-dialog\">'
    },
    {
        target: `          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 !important;
          }`,
        replacement: `          .no-print, aside, nav, header, footer, button, .sonner-toaster, #root { display: none !important; }
          [data-radix-portal] { display: block !important; position: static !important; height: auto !important; width: 100% !important; }
          [role="dialog"] { display: block !important; position: static !important; transform: none !important; max-width: 100% !important; width: 100% !important; height: auto !important; max-height: none !important; border: 0 !important; box-shadow: none !important; overflow: visible !important; }
          .fixed { position: static !important; }
          body, html { display: block !important; position: static !important; height: auto !important; min-height: auto !important; overflow: visible !important; margin: 0 !important; width: 100% !important; padding: 0 !important; }`
    }
]);

console.log('Done');
