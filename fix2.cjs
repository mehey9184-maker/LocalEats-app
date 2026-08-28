const fs = require('fs');
let file = fs.readFileSync('src/App.tsx', 'utf8');
const badIndex = file.indexOf('className={`w-5 h-5 ${activeShop.id) ? "fill-current" : ""}` />');
if (badIndex !== -1) {
  file = file.replace('className={`w-5 h-5 ${activeShop.id) ? "fill-current" : ""}` />', 'className={`w-5 h-5 ${favorites.includes(activeShop.id) ? "fill-current" : ""}`} />');
  fs.writeFileSync('src/App.tsx', file);
  console.log("Fixed again!");
} else {
  console.log("Not found");
}
