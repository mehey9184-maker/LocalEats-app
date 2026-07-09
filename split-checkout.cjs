const fs = require('fs');

let content = fs.readFileSync('src/screens/CheckoutScreen.tsx', 'utf-8');

const search = `          </section>

          {/* SECTION 4: Interactive Order Summary / Cart Editor */}`;

const replace = `          </section>
        </div>
        </div>

        {/* Right Column (Cart Summary) */}
        <div className="w-full lg:w-[450px] shrink-0 bg-slate-50 dark:bg-slate-950 lg:bg-slate-100 lg:dark:bg-slate-900 shadow-2xl lg:shadow-none lg:rounded-3xl lg:border lg:border-slate-200 lg:dark:border-slate-800 flex flex-col overflow-hidden h-fit sticky top-6 lg:my-8">
          <div className="flex flex-col gap-6 p-4">

          {/* SECTION 4: Interactive Order Summary / Cart Editor */}`;

content = content.replace(search, replace);

const searchWrapper = `<div className="relative flex h-auto w-full max-w-6xl mx-auto flex-col lg:flex-row bg-transparent overflow-x-hidden pb-16 min-h-screen">
        {/* Left Column (Forms & Details) */}
        <div className="flex-1 bg-white dark:bg-slate-900 shadow-2xl lg:shadow-xl lg:rounded-3xl overflow-hidden flex flex-col">`;

const replaceWrapper = `<div className="relative flex h-auto w-full max-w-6xl mx-auto flex-col lg:flex-row bg-transparent overflow-x-hidden pb-16 min-h-screen lg:gap-8 lg:px-6">
        {/* Left Column (Forms & Details) */}
        <div className="flex-1 bg-white dark:bg-slate-900 shadow-2xl lg:shadow-xl lg:rounded-3xl overflow-hidden flex flex-col lg:my-8">`;

content = content.replace(searchWrapper, replaceWrapper);

const searchEnd = `          </div>
        </div>
      </div>

      {/* Address Selection & Pin Precision Control Popup Modal */}`;

const replaceEnd = `          </div>
        </div>
        </div>
      </div>

      {/* Address Selection & Pin Precision Control Popup Modal */}`;

content = content.replace(searchEnd, replaceEnd);

fs.writeFileSync('src/screens/CheckoutScreen.tsx', content);
