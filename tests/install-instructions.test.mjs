import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getInstallInstructions } from "../src/services/installInstructions.ts";

test("install instructions match the browser and platform", () => {
  const chrome = "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/142.0.0.0 Safari/537.36";
  const safari = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/26.0 Safari/605.1.15";
  assert.match(getInstallInstructions(chrome).join(" "), /Install page as app/);
  assert.match(getInstallInstructions(chrome + " Edg/142.0.0.0").join(" "), /Apps/);
  assert.match(getInstallInstructions(chrome.replace("Windows NT 10.0", "Linux; Android 15")).join(" "), /home screen/i);
  assert.match(getInstallInstructions(safari.replace("Macintosh", "iPhone")).join(" "), /Open as Web App/);
  assert.match(getInstallInstructions(safari, 5).join(" "), /Add to Home Screen/);
  assert.match(getInstallInstructions(safari).join(" "), /Add to Dock/);
  assert.match(getInstallInstructions("iPhone WhatsApp").join(" "), /Safari/);
  assert.equal(getInstallInstructions("Mozilla/5.0 (X11; Linux x86_64) Firefox/140.0"), null);
});

test("manifest declares square icons that match the shipped artwork", () => {
  const manifest = JSON.parse(readFileSync(new URL("../public/manifest.json", import.meta.url), "utf8"));
  assert.equal(manifest.start_url, ".");
  assert.equal(manifest.display, "standalone");
  assert.deepEqual(manifest.icons.map(({ sizes, purpose }) => [sizes, purpose]), [
    ["192x192", "any"], ["512x512", "any"], ["512x512", "maskable"],
  ]);
  for (const icon of manifest.icons) {
    const png = readFileSync(new URL("../public" + icon.src, import.meta.url));
    assert.equal(png.toString("ascii", 12, 16), "IHDR");
    assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.sizes);
  }
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /rel="apple-touch-icon" sizes="180x180" href="\/apple-touch-icon\.png"/);
  const apple = readFileSync(new URL("../public/apple-touch-icon.png", import.meta.url));
  assert.equal(apple.readUInt32BE(16), 180);
  assert.equal(apple.readUInt32BE(20), 180);
});

test("native install consumes each offer once and waits for browser confirmation", async () => {
  const windowStub = new EventTarget();
  windowStub.matchMedia = () => ({ matches: false });
  globalThis.window = windowStub;
  try {
    const { appAlreadyInstalled, availableInstallEvent, requestNativeInstall } =
      await import("../src/services/pwaInstallInvite.ts");
    const offer = new Event("beforeinstallprompt", { cancelable: true });
    let calls = 0;
    offer.prompt = async () => { calls++; return { outcome: "accepted" }; };
    windowStub.dispatchEvent(offer);
    assert.equal(offer.defaultPrevented, true);
    assert.equal(calls, 0);
    assert.equal(availableInstallEvent(), offer);
    const result = requestNativeInstall();
    assert.equal(calls, 1);
    assert.equal(await requestNativeInstall(), "unavailable");
    assert.equal(await result, "accepted");
    assert.equal(appAlreadyInstalled(), false);
    windowStub.dispatchEvent(new Event("appinstalled"));
    assert.equal(appAlreadyInstalled(), true);
  } finally {
    delete globalThis.window;
  }
});
