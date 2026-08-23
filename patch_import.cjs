const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');
code = code.replace('getDocs,', 'getDocs, writeBatch,');
fs.writeFileSync('src/lib/firebase.ts', code);
