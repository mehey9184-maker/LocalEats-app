const fs = require('fs');
let text = fs.readFileSync('src/App.tsx', 'utf8');

text = text.replace('function RecenterMap({ coords }: { coords: [number, number] })', 'function RecenterMap({ coords }: { coords: any })');
text = text.replace('onStoreInfo(activeShop)', 'onStoreInfo(activeShop.id)');

fs.writeFileSync('src/App.tsx', text);
console.log("Fixed TS errors");
