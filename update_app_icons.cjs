const fs = require('fs');
let file = fs.readFileSync('src/App.tsx', 'utf8');

const iconsCode = `
const userIcon = L.divIcon({
  html: \`<div class="relative w-12 h-12 drop-shadow-xl flex flex-col items-center justify-center">
    <div class="bg-blue-600 p-2 rounded-full border-4 border-white shadow-lg text-white flex items-center justify-center relative z-10 animate-bounce">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    </div>
    <div class="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1"></div>
  </div>\`,
  className: '',
  iconSize: [48, 48],
  iconAnchor: [24, 48],
  popupAnchor: [0, -48]
});

const shopIcon = L.divIcon({
  html: \`<div class="relative w-12 h-12 drop-shadow-xl flex flex-col items-center justify-center">
    <div class="bg-orange-600 p-2.5 rounded-xl border-2 border-white shadow-lg text-white flex items-center justify-center relative z-10">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/>
      </svg>
    </div>
    <div class="w-1.5 h-1.5 bg-orange-600 rounded-full mt-1"></div>
  </div>\`,
  className: '',
  iconSize: [48, 48],
  iconAnchor: [24, 48],
  popupAnchor: [0, -48]
});
`;

// Replace existing shopIcon
file = file.replace(/const shopIcon = new L\.Icon\(\{[\s\S]*?\}\);/m, '/* replaced */');

// Replace existing userIcon
file = file.replace(/const userIcon = new L\.Icon\(\{[\s\S]*?\}\);/m, iconsCode);

fs.writeFileSync('src/App.tsx', file);
console.log('App.tsx icons updated');
