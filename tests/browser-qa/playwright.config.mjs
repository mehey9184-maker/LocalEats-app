import {defineConfig,devices} from "@playwright/test";

export default defineConfig({
  testDir:".",
  testMatch:"*.spec.mjs",
  fullyParallel:false,
  retries:0,
  workers:1,
  projects:[
    {name:"desktop",use:{viewport:{width:1280,height:720}}},
    {name:"mobile",use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
  ],
  timeout:60000,
  expect:{timeout:20000},
  reporter:[["line"],["html",{outputFolder:"playwright-report",open:"never"}]],
  outputDir:"test-results/browser-qa",
  use:{
    baseURL:"http://127.0.0.1:4174",
    trace:"retain-on-failure",
    screenshot:"only-on-failure",
    video:"off", // Screenshots and Playwright traces remain; no FFmpeg download needed.
    ...devices["Desktop Chrome"],
    // GitHub Ubuntu runner ships Chromium-based Google Chrome already.
    // Local developers without CHROME_BIN use Playwright's installed Chromium.
    launchOptions:process.env.CHROME_BIN
      ? {executablePath:process.env.CHROME_BIN}
      : {},
    serviceWorkers:"block",
    permissions:["geolocation"],
    geolocation:{latitude:-26.1,longitude:28.03},
  },
  webServer:{
    // The config lives in tests/browser-qa, but Vite must serve the repo root.
    cwd:process.cwd(),
    command:"node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4174 --strictPort --config vite.config.ts",
    stdout:"pipe",
    stderr:"pipe",
    url:"http://127.0.0.1:4174",
    timeout:120000,
    reuseExistingServer:false,
    env:{
      VITE_LOCAL_FIREBASE_EMULATORS:"true",
      VITE_FIREBASE_PROJECT_ID:"demo-localeats-browser-qa",
      VITE_FIREBASE_AUTH_DOMAIN:"demo-localeats-browser-qa.firebaseapp.com",
      VITE_FIREBASE_API_KEY:"browser-qa-local-only",
      VITE_FIREBASE_APP_ID:"1:123:web:localonly",
      VITE_FIREBASE_STORAGE_BUCKET:"demo-localeats-browser-qa.appspot.com",
      VITE_FIREBASE_MESSAGING_SENDER_ID:"123",
      VITE_FIREBASE_FIRESTORE_DATABASE_ID:"(default)",
      VITE_PICKUP_ORDERING_ENABLED:"false",
      VITE_LOCALEATS_API_URL:"",
      VITE_SENTRY_DSN:"",
    },
  },
});
