import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

test("first paint has a Home loading shell before the app module", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const root = html.indexOf('<div id="root">');
  const module = html.indexOf('<script type="module"');
  assert.ok(root >= 0 && module > root);
  const initial = html.slice(root, module);
  assert.match(initial, /id="startup-shell" aria-label="Loading LocalEats Home"/);
  for (const shape of ["header", "cards", "nav"]) {
    assert.match(initial, new RegExp('class="startup-' + shape + '"'));
  }
  assert.match(initial, /id="startup-retry" href="" hidden/);
  assert.match(initial, /<noscript>/);
  assert.match(html, /<style>[\s\S]*#startup-shell[\s\S]*<\/style>/);
});
