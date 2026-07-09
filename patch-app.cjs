const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// We will find the boundaries of CheckoutScreen in App.tsx and delete it.
const startStr = 'function CheckoutScreen({';
const endStr = 'function OrderSuccessScreen({';

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + content.substring(endIndex);
}

// And we need to add the import statement at the top.
const importStr = 'import { CheckoutScreen } from "./screens/CheckoutScreen";\n';
const firstImport = content.indexOf('import {');
content = content.substring(0, firstImport) + importStr + content.substring(firstImport);

fs.writeFileSync('src/App.tsx', content);
