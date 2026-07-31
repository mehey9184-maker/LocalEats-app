const fs = require('fs');
let file = fs.readFileSync('src/main.tsx', 'utf8');

file = file.replace(
  /window\.addEventListener\('unhandledrejection', \(event\) => \{/g,
  "window.addEventListener('unhandledrejection', (event) => {"
);

// We want to replace the whole window.addEventListener('unhandledrejection', ...) block
