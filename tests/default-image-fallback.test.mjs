import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const photo = read('src/components/BlurUpImage.tsx');
const catalog = read('src/hooks/useShopsData.ts');
const firebase = read('src/lib/firebase.ts');
const card = read('src/components/ShopCard.tsx');
const cart = read('src/components/CartDrawer.tsx');
const avatar = read('src/utils/imageUtils.ts');
const app = read('src/App.tsx');
const constants = read('src/utils.ts');

test('missing and broken shop/menu pictures show trustworthy, local placeholders', () => {
  assert.match(photo, /fallbackKind\?: 'shop' \| 'food'/);
  assert.match(photo, /!targetSrc \|\| failed/);
  assert.match(photo, /Shop photo not available/);
  assert.match(photo, /No photo yet/);
  assert.match(photo, /onError=\{handleImageError\}/);
  assert.doesNotMatch(photo, /unsplash\.com/);
  assert.match(card, /fallbackKind="shop"/);
  assert.match(cart, /fallbackKind="food"/);
  assert.doesNotMatch(card, /const cat = \(s\.category/);
});

test('real catalog mapping does not invent food photographs for missing uploads', () => {
  assert.match(catalog, /image: m\.image_url \|\| ''/);
  assert.match(catalog, /images: \(s as any\)\.images \|\| \[\]/);
  assert.match(firebase, /m\.image_url \|\| m\.image \|\| m\.photo \|\| ""/);
  assert.match(constants, /DEFAULT_MENU_IMAGE = ""/);
  assert.doesNotMatch(card, /images\.unsplash\.com/);
});

test('default profile initials stay on-device; uploaded photos remain preferred', () => {
  assert.match(avatar, /data:image\/svg\+xml/);
  assert.match(avatar, /split\(\/\\s\+\/\)/);
  assert.doesNotMatch(avatar, /ui-avatars\.com/);
  assert.match(app, /userProfile\?\.photoURL \|\| getAvatarUrl/);
  assert.match(app, /onError=\{\(event\) => \{ event\.currentTarget\.src = getAvatarUrl/);
});
