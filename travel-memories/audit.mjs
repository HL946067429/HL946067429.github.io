import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const dir = 'audit-screenshots';

// Home
await page.goto('http://localhost:5173/#/');
await page.waitForTimeout(2500);
await page.screenshot({ path: `${dir}/01-home.png` });
console.log('01-home done');

// Trips
await page.goto('http://localhost:5173/#/trips');
await page.waitForTimeout(1500);
await page.screenshot({ path: `${dir}/02-trips.png` });
console.log('02-trips done');

// Trip detail (click first card if exists)
const card = page.locator('[class*="cursor-pointer"]').first();
if (await card.isVisible()) {
  await card.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${dir}/03-detail.png` });
  console.log('03-detail done');
}

// Planner
await page.goto('http://localhost:5173/#/planner');
await page.waitForTimeout(2000);
await page.screenshot({ path: `${dir}/04-planner.png` });
console.log('04-planner done');

// Timeline
await page.goto('http://localhost:5173/#/timeline');
await page.waitForTimeout(2000);
await page.screenshot({ path: `${dir}/05-timeline.png` });
console.log('05-timeline done');

// Settings
await page.goto('http://localhost:5173/#/settings');
await page.waitForTimeout(1500);
await page.screenshot({ path: `${dir}/06-settings.png` });
console.log('06-settings done');

await browser.close();
console.log('All screenshots saved.');
