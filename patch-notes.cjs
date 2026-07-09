const fs = require('fs');

let content = fs.readFileSync('src/screens/CheckoutScreen.tsx', 'utf-8');

const searchDeliveryNotes = `              {/* Visual distance range helper badge */}`;
const replaceDeliveryNotes = `              {/* Delivery Notes Text Area */}
              <div className="flex flex-col gap-2 mt-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500 block">
                  Delivery Notes / Landmarks
                </label>
                <textarea
                  placeholder="e.g., ring the bell, or leave at the gate"
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-orange-500/50 outline-none transition-all placeholder:text-slate-400 dark:text-white resize-none"
                />
              </div>
              
              {/* Visual distance range helper badge */}`;

content = content.replace(searchDeliveryNotes, replaceDeliveryNotes);

fs.writeFileSync('src/screens/CheckoutScreen.tsx', content);
