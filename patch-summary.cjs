const fs = require('fs');

let content = fs.readFileSync('src/screens/CheckoutScreen.tsx', 'utf-8');

const searchSummary = `            <div className="space-y-2.5 pt-1.5 text-xs font-bold">
              <div className="flex justify-between items-center text-slate-400">
                <span className="uppercase tracking-wider">Subtotal</span>
                <span className="font-mono">R {subtotal.toFixed(2)}</span>
              </div>`;
              
const replaceSummary = `            <div className="space-y-2.5 pt-1.5 text-xs font-bold">
              {/* Items Breakdown */}
              <div className="flex flex-col gap-2 pb-2 border-b border-dashed border-slate-800">
                {cart.map((item, idx) => {
                  const itemTotal = (item.price + (item.selectedCustomizations?.reduce((s, c) => s + c.price, 0) || 0)) * item.quantity;
                  return (
                    <div key={idx} className="flex justify-between items-start text-slate-300">
                      <div className="flex flex-col gap-0.5">
                        <span className="uppercase tracking-wider text-[11px] leading-tight flex items-start gap-1">
                          <span className="text-orange-500 font-black">{item.quantity}x</span> {item.name}
                        </span>
                        {item.selectedCustomizations && item.selectedCustomizations.length > 0 && (
                          <span className="text-[9px] text-slate-500 font-normal pl-4">
                            + {item.selectedCustomizations.map(c => c.name).join(", ")}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-slate-400">R {itemTotal.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex justify-between items-center text-slate-400 pt-1">
                <span className="uppercase tracking-wider">Subtotal</span>
                <span className="font-mono">R {subtotal.toFixed(2)}</span>
              </div>`;

content = content.replace(searchSummary, replaceSummary);

fs.writeFileSync('src/screens/CheckoutScreen.tsx', content);
