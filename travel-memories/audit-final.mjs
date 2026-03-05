import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const dir = 'audit-screenshots';

// Load app and seed data
await page.goto('http://localhost:5173/');
await page.waitForTimeout(2000);

await page.evaluate(async () => {
  const { db } = await import('/src/db/index.ts');
  const count = await db.trips.count();
  if (count > 0) return;
  const now = new Date().toISOString();

  const t1 = await db.trips.add({ name: '云南大理之旅', description: '冬日暖阳，苍山洱海间的悠闲时光', status: 'completed', startDate: '2025-12-20', endDate: '2025-12-28', tags: ['自驾', '古城', '雪山'], color: '#3b82f6', createdAt: now, updatedAt: now });
  await db.places.bulkAdd([
    { tripId: t1, name: '昆明长水机场', latitude: 25.1, longitude: 102.74, address: '', visitDate: '2025-12-20', sortOrder: 1, transportMode: 'flight', rating: 3 },
    { tripId: t1, name: '大理古城', latitude: 25.69, longitude: 100.16, address: '', visitDate: '2025-12-21', sortOrder: 2, transportMode: 'driving', rating: 5 },
    { tripId: t1, name: '洱海环湖', latitude: 25.73, longitude: 100.21, address: '', visitDate: '2025-12-23', sortOrder: 3, transportMode: 'driving', rating: 5 },
    { tripId: t1, name: '丽江古城', latitude: 26.87, longitude: 100.23, address: '', visitDate: '2025-12-25', sortOrder: 4, transportMode: 'driving', rating: 4 },
    { tripId: t1, name: '玉龙雪山', latitude: 27.12, longitude: 100.17, address: '', visitDate: '2025-12-26', sortOrder: 5, transportMode: 'driving', rating: 5 },
  ]);

  const t2 = await db.trips.add({ name: '日本关西行', description: '京都的红叶，大阪的美食，奈良的小鹿', status: 'completed', startDate: '2025-11-01', endDate: '2025-11-08', tags: ['樱花', '温泉', '美食'], color: '#ef4444', createdAt: now, updatedAt: now });
  await db.places.bulkAdd([
    { tripId: t2, name: '大阪关西机场', latitude: 34.43, longitude: 135.24, address: '', visitDate: '2025-11-01', sortOrder: 1, transportMode: 'flight', rating: 3 },
    { tripId: t2, name: '京都清水寺', latitude: 34.99, longitude: 135.78, address: '', visitDate: '2025-11-02', sortOrder: 2, transportMode: 'train', rating: 5 },
    { tripId: t2, name: '奈良公园', latitude: 34.69, longitude: 135.84, address: '', visitDate: '2025-11-04', sortOrder: 3, transportMode: 'train', rating: 4 },
    { tripId: t2, name: '大阪道顿堀', latitude: 34.67, longitude: 135.50, address: '', visitDate: '2025-11-06', sortOrder: 4, transportMode: 'train', rating: 5 },
  ]);

  const t3 = await db.trips.add({ name: '新疆自驾计划', description: '独库公路，赛里木湖，喀纳斯，一路向西', status: 'planned', startDate: '2026-07-15', endDate: '2026-07-28', tags: ['自驾', '草原', '雪山', '公路'], color: '#10b981', createdAt: now, updatedAt: now });
  await db.places.bulkAdd([
    { tripId: t3, name: '乌鲁木齐', latitude: 43.82, longitude: 87.62, address: '', visitDate: '2026-07-15', sortOrder: 1, transportMode: 'flight', rating: 0 },
    { tripId: t3, name: '赛里木湖', latitude: 44.60, longitude: 81.17, address: '', visitDate: '2026-07-17', sortOrder: 2, transportMode: 'driving', rating: 0 },
    { tripId: t3, name: '那拉提草原', latitude: 43.35, longitude: 84.01, address: '', visitDate: '2026-07-20', sortOrder: 3, transportMode: 'driving', rating: 0 },
    { tripId: t3, name: '喀纳斯湖', latitude: 48.72, longitude: 87.01, address: '', visitDate: '2026-07-23', sortOrder: 4, transportMode: 'driving', rating: 0 },
  ]);

  const t4 = await db.trips.add({ name: '北京周末游', description: '故宫、长城、胡同里的老北京味道', status: 'completed', startDate: '2025-10-01', endDate: '2025-10-03', tags: ['历史', '古迹'], color: '#8b5cf6', createdAt: now, updatedAt: now });
  await db.places.bulkAdd([
    { tripId: t4, name: '北京首都机场', latitude: 40.08, longitude: 116.59, address: '', visitDate: '2025-10-01', sortOrder: 1, transportMode: 'flight', rating: 3 },
    { tripId: t4, name: '故宫博物院', latitude: 39.92, longitude: 116.39, address: '', visitDate: '2025-10-01', sortOrder: 2, transportMode: 'driving', rating: 5 },
    { tripId: t4, name: '八达岭长城', latitude: 40.35, longitude: 116.02, address: '', visitDate: '2025-10-02', sortOrder: 3, transportMode: 'driving', rating: 5 },
  ]);
});

await page.waitForTimeout(500);
await page.reload();
await page.waitForTimeout(3000);
await page.screenshot({ path: `${dir}/01-home.png` });
console.log('01-home done');

// Trips
await page.click('nav >> text=旅行');
await page.waitForTimeout(2000);
await page.screenshot({ path: `${dir}/02-trips.png` });
console.log('02-trips done');

// Detail - click trip
const card = page.locator('text=云南大理之旅').first();
if (await card.isVisible({ timeout: 2000 }).catch(() => false)) {
  await card.click();
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${dir}/03-detail.png` });
  console.log('03-detail done');
}

// Planner
await page.click('nav >> text=计划');
await page.waitForTimeout(2500);
// Click the planned trip
const planned = page.locator('text=新疆自驾计划').first();
if (await planned.isVisible({ timeout: 2000 }).catch(() => false)) {
  await planned.click();
  await page.waitForTimeout(2000);
}
await page.screenshot({ path: `${dir}/04-planner.png` });
console.log('04-planner done');

// Timeline
await page.click('nav >> text=时间线');
await page.waitForTimeout(2500);
await page.screenshot({ path: `${dir}/05-timeline.png` });
console.log('05-timeline done');

// Settings
await page.click('nav >> text=设置');
await page.waitForTimeout(1500);
await page.screenshot({ path: `${dir}/06-settings.png` });
console.log('06-settings done');

await browser.close();
console.log('All done.');
