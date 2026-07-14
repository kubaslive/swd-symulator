const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  await page.goto('http://localhost:5173/swd-symulator/');
  await page.waitForTimeout(2000);
  console.log("Checking if triggerGen exists...");
  const hasTrigger = await page.evaluate(() => typeof window.triggerGen === 'function');
  console.log("hasTrigger: ", hasTrigger);
  if (hasTrigger) {
    console.log("Calling triggerGen()...");
    await page.evaluate(() => window.triggerGen());
    await page.waitForTimeout(2000);
    console.log("Called successfully.");
  }
  await browser.close();
})();
