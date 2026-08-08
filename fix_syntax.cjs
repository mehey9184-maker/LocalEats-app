const fs = require('fs');
let code = fs.readFileSync('src/screens/CheckoutScreen.tsx', 'utf8');

// The issue was:
//          </section>
//          )}
//          {/* STEP 2 NAVIGATION BUTTONS */}
//          <div className="pt-2 flex items-center justify-between gap-3">

const badStr = `          </section>
          )}
          {/* STEP 2 NAVIGATION BUTTONS */}`;
const goodStr = `          )}
          {/* STEP 2 NAVIGATION BUTTONS */}`;

if (code.includes(badStr)) {
    code = code.replace(badStr, goodStr);
    fs.writeFileSync('src/screens/CheckoutScreen.tsx', code);
    console.log('Fixed bad closing section!');
} else {
    console.log('Could not find bad string');
}

// And the unterminated regex at 3524
const badStr2 = `        )}
      </div>
    </div>`;

const goodStr2 = `        )}
      </div>
    </div>
  </div>`;
  
if (code.includes(badStr2)) {
    code = code.replace(badStr2, goodStr2);
    fs.writeFileSync('src/screens/CheckoutScreen.tsx', code);
    console.log('Fixed unterminated regex (missing div)');
}
