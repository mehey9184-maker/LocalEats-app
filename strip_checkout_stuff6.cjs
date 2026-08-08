const fs = require('fs');
let code = fs.readFileSync('src/screens/CheckoutScreen.tsx', 'utf8');

const startStr = '{/* SECTION: Cash Payment & Rider Change Voucher */}';
const endStr = '{/* SECURITY BADGE'; // Ends before this

const startIdx = code.indexOf(startStr);
const endIdx = code.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
    code = code.substring(0, startIdx) + code.substring(endIdx);
    fs.writeFileSync('src/screens/CheckoutScreen.tsx', code);
    console.log('Successfully stripped Voucher UI');
} else {
    console.log('Could not find markers');
}
