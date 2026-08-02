import React from 'react';
import { renderToString } from 'react-dom/server';
// Mock .png and .css imports
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function() {
  const arg = arguments[0];
  if (arg.endsWith('.png') || arg.endsWith('.css')) return '';
  return originalRequire.apply(this, arguments);
};

import App from './src/App';
import * as cheerio from 'cheerio';

const html = renderToString(<App />);
const $ = cheerio.load(html);

console.log("Root hierarchy:");
const root = $('div').first();
console.log('1:', root.attr('class'));
const child2 = root.children('div').eq(0);
console.log('2:', child2.attr('class'));
const child3 = child2.children('div').eq(0);
console.log('3:', child3.attr('class'));
const child4 = child3.children('div').eq(0);
console.log('4:', child4.attr('class'));
const child5 = child4.children('div').eq(0);
console.log('5:', child5.attr('class'));
const child6 = child5.children('div').eq(0);
console.log('6:', child6.attr('class'));
