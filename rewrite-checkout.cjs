const fs = require('fs');

let content = fs.readFileSync('src/screens/CheckoutScreen.tsx', 'utf-8');

// 1. Change the wrapper to be max-w-6xl and flex-col lg:flex-row
content = content.replace(
  '<div className="relative flex h-auto w-full max-w-md mx-auto flex-col bg-white dark:bg-slate-900 overflow-x-hidden shadow-2xl pb-16 min-h-screen">',
  '<div className="relative flex h-auto w-full max-w-6xl mx-auto flex-col lg:flex-row bg-transparent overflow-x-hidden pb-16 min-h-screen">'
);

// 2. The Header block needs to be part of the Left Column, so let's just wrap the left column around it.
// Right after the above wrapper, we have:
// { /* Header Block */ }
// We can wrap everything from { /* Header Block */ } up to Settlement Method in a div for the left column.
// And wrap from Items to Order to the end in a div for the right column.

// Since the file is cleanly formatted, we can find the indices.

const headerStart = content.indexOf('{/* Header Block */}');
const flexColStart = content.indexOf('<div className="flex flex-col gap-6 p-4">', headerStart);

// We should replace that flex col start with our new structure.
content = content.replace(
  '<div className="flex flex-col gap-6 p-4">',
  '        <div className="flex flex-col gap-6 p-4">'
); // just keep it for now.

// Actually, it might be easier to use string splitting if we know exact unique strings for each section.
const fulfillmentSection = '<section className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-3xl border border-slate-100 dark:border-slate-800">';
const contactSection = '<section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4 rounded-3xl shadow-sm space-y-4">'; // wait there are multiple.

// We know the line numbers roughly, but they might have changed. Let's find unique strings.

// Let's use a clever regex or just read line by line.
const lines = content.split('\n');

let inLeft = false;
let out = [];

// find the main wrapper
let replacedWrapper = false;
let foundHeader = false;
let rightColStarted = false;

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];

  if (!replacedWrapper && line.includes('w-full max-w-md mx-auto flex-col bg-white dark:bg-slate-900')) {
    line = line.replace('w-full max-w-md mx-auto flex-col bg-white dark:bg-slate-900 overflow-x-hidden shadow-2xl', 'w-full max-w-5xl mx-auto flex-col lg:flex-row bg-transparent overflow-x-hidden lg:gap-8 lg:p-6');
    replacedWrapper = true;
  }

  if (line.includes('{/* Header Block */}')) {
    out.push('        {/* Left Column (Forms & Details) */}');
    out.push('        <div className="flex-1 bg-white dark:bg-slate-900 shadow-2xl lg:shadow-xl lg:rounded-3xl overflow-hidden flex flex-col">');
    foundHeader = true;
  }

  // Items to order is what we want to move to Right Column.
  // Wait, the DOM currently has:
  // <div className="flex flex-col gap-6 p-4">
  //   Fulfillment
  //   Contact
  //   Order From
  //   Delivery Address
  //   Items to Order
  //   Promo
  //   Settlement
  //   Summary
  // </div>
  
  out.push(line);
}

fs.writeFileSync('src/screens/CheckoutScreen.tsx', out.join('\n'));
