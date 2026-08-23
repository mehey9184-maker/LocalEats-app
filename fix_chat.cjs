const fs = require('fs');
let code = fs.readFileSync('src/components/ChatWidget.tsx', 'utf8');

code = code.replace(/const currentUserId = userId \|\| "guest_user";[\s\n]+const currentUserId = userId \|\| "guest_user";/g, 'const currentUserId = userId || "guest_user";');

fs.writeFileSync('src/components/ChatWidget.tsx', code);
