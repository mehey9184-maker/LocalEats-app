const fs = require('fs');
let code = fs.readFileSync('src/screens/CheckoutScreen.tsx', 'utf8');

const startStr = '{/* CASH CHANGE QUICK SELECT CHIPS & LIVE RIDER BREAKDOWN */}';
const endStr = '{/* SECTION 6.5: Support Rider with Optional Tip */}';

const startIdx = code.indexOf(startStr);
const endIdx = code.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
    code = code.substring(0, startIdx) + '\n          </section>\n\n          ' + code.substring(endIdx);
    fs.writeFileSync('src/screens/CheckoutScreen.tsx', code);
    console.log('Successfully stripped Cash Change UI');
} else {
    console.log('Could not find markers');
}
