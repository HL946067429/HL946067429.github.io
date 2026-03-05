import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const dir = 'audit-screenshots';

await page.goto('http://localhost:5173/');
await page.waitForTimeout(2500);

// Settings page
await page.click('nav >> text=设置');
await page.waitForTimeout(1500);
await page.screenshot({ path: `${dir}/06-settings-fix.png` });
console.log('06-settings done');

// Go to trips list and click detail
await page.click('nav >> text=旅行');
await page.waitForTimeout(2000);
// Click the trip card containing the text
const card = page.locator('text=云南大理之旅').first();
const visible = await card.isVisible().catch(() => false);
console.log('Trip card visible:', visible);
if (visible) {
  await card.click();
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${dir}/03-detail-fix.png` });
  console.log('03-detail done');
} else {
  // Debug: take a screenshot to see what's on screen
  await page.screenshot({ path: `${dir}/debug-trips.png` });
  console.log('debug screenshot saved');
}

await browser.close();
console.log('Done.');
