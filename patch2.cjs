const fs = require('fs');
const code = fs.readFileSync('src/App.tsx', 'utf8');
const lines = code.split('\n');

const toReplaceStart = 4154;
const toReplaceEnd = 4154;

const newLines = `              )}
              {currentScreen === "profile" && (
                <ProfileScreen`.split('\n');

lines.splice(toReplaceStart, toReplaceEnd - toReplaceStart + 1, ...newLines);
fs.writeFileSync('src/App.tsx', lines.join('\n'));
