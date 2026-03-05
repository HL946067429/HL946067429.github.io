import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// Navigate to app
await page.goto('http://localhost:5173/');
await page.waitForTimeout(2000);

// Seed test data via IndexedDB
await page.evaluate(async () => {
  const { db } = await import('/src/db/index.ts');
  const count = await db.trips.count();
  if (count > 0) {
    console.log('Data already exists, skipping seed');
    return;
  }

  const now = new Date().toISOString();

  const trip1Id = await db.trips.add({
    name: '云南大理之旅',
    description: '冬日暖阳，苍山洱海间的悠闲时光',
    status: 'completed',
    startDate: '2025-12-20',
    endDate: '2025-12-28',
    tags: ['自驾', '古城', '雪山'],
    color: '#3b82f6',
    createdAt: now,
    updatedAt: now,
  });

  await db.places.bulkAdd([
    { tripId: trip1Id, name: '昆明长水机场', latitude: 25.1, longitude: 102.74, address: '昆明市', visitDate: '2025-12-20', sortOrder: 1, transportMode: 'flight', rating: 3 },
    { tripId: trip1Id, name: '大理古城', latitude: 25.69, longitude: 100.16, address: '大理市', visitDate: '2025-12-21', sortOrder: 2, transportMode: 'driving', rating: 5 },
    { tripId: trip1Id, name: '洱海环湖', latitude: 25.73, longitude: 100.21, address: '大理市', visitDate: '2025-12-23', sortOrder: 3, transportMode: 'driving', rating: 5 },
    { tripId: trip1Id, name: '丽江古城', latitude: 26.87, longitude: 100.23, address: '丽江市', visitDate: '2025-12-25', sortOrder: 4, transportMode: 'driving', rating: 4 },
    { tripId: trip1Id, name: '玉龙雪山', latitude: 27.12, longitude: 100.17, address: '丽江市', visitDate: '2025-12-26', sortOrder: 5, transportMode: 'driving', rating: 5 },
  ]);

  const trip2Id = await db.trips.add({
    name: '日本关西行',
    description: '京都的红叶，大阪的美食，奈良的小鹿',
    status: 'completed',
    startDate: '2025-11-01',
    endDate: '2025-11-08',
    tags: ['樱花', '温泉', '美食'],
    color: '#ef4444',
    createdAt: now,
    updatedAt: now,
  });

  await db.places.bulkAdd([
    { tripId: trip2Id, name: '大阪关西机场', latitude: 34.43, longitude: 135.24, address: '大阪', visitDate: '2025-11-01', sortOrder: 1, transportMode: 'flight', rating: 3 },
    { tripId: trip2Id, name: '京都清水寺', latitude: 34.99, longitude: 135.78, address: '京都', visitDate: '2025-11-02', sortOrder: 2, transportMode: 'train', rating: 5 },
    { tripId: trip2Id, name: '奈良公园', latitude: 34.69, longitude: 135.84, address: '奈良', visitDate: '2025-11-04', sortOrder: 3, transportMode: 'train', rating: 4 },
    { tripId: trip2Id, name: '大阪道顿堀', latitude: 34.67, longitude: 135.50, address: '大阪', visitDate: '2025-11-06', sortOrder: 4, transportMode: 'train', rating: 5 },
  ]);

  const trip3Id = await db.trips.add({
    name: '新疆自驾计划',
    description: '独库公路，赛里木湖，喀纳斯，一路向西',
    status: 'planned',
    startDate: '2026-07-15',
    endDate: '2026-07-28',
    tags: ['自驾', '草原', '雪山', '公路'],
    color: '#10b981',
    createdAt: now,
    updatedAt: now,
  });

  await db.places.bulkAdd([
    { tripId: trip3Id, name: '乌鲁木齐', latitude: 43.82, longitude: 87.62, address: '乌鲁木齐市', visitDate: '2026-07-15', sortOrder: 1, transportMode: 'flight', rating: 0 },
    { tripId: trip3Id, name: '赛里木湖', latitude: 44.60, longitude: 81.17, address: '博州', visitDate: '2026-07-17', sortOrder: 2, transportMode: 'driving', rating: 0 },
    { tripId: trip3Id, name: '那拉提草原', latitude: 43.35, longitude: 84.01, address: '伊犁', visitDate: '2026-07-20', sortOrder: 3, transportMode: 'driving', rating: 0 },
    { tripId: trip3Id, name: '喀纳斯湖', latitude: 48.72, longitude: 87.01, address: '阿勒泰', visitDate: '2026-07-23', sortOrder: 4, transportMode: 'driving', rating: 0 },
  ]);

  const trip4Id = await db.trips.add({
    name: '北京周末游',
    description: '故宫、长城、胡同里的老北京味道',
    status: 'completed',
    startDate: '2025-10-01',
    endDate: '2025-10-03',
    tags: ['历史', '古迹'],
    color: '#8b5cf6',
    createdAt: now,
    updatedAt: now,
  });

  await db.places.bulkAdd([
    { tripId: trip4Id, name: '北京首都机场', latitude: 40.08, longitude: 116.59, address: '北京', visitDate: '2025-10-01', sortOrder: 1, transportMode: 'flight', rating: 3 },
    { tripId: trip4Id, name: '故宫博物院', latitude: 39.92, longitude: 116.39, address: '北京东城', visitDate: '2025-10-01', sortOrder: 2, transportMode: 'driving', rating: 5 },
    { tripId: trip4Id, name: '八达岭长城', latitude: 40.35, longitude: 116.02, address: '北京延庆', visitDate: '2025-10-02', sortOrder: 3, transportMode: 'driving', rating: 5 },
  ]);

  console.log('Seed data created successfully');
});

await page.waitForTimeout(500);

const dir = 'audit-screenshots';

// Reload home to show new data
await page.reload();
await page.waitForTimeout(3000);
await page.screenshot({ path: `${dir}/01-home.png` });
console.log('01-home done');

// Click "旅行" nav link
await page.click('nav >> text=旅行');
await page.waitForTimeout(2000);
await page.screenshot({ path: `${dir}/02-trips.png` });
console.log('02-trips done');

// Click first trip card to go to detail
const tripCard = page.locator('text=云南大理之旅').first();
if (await tripCard.isVisible({ timeout: 2000 }).catch(() => false)) {
  await tripCard.click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${dir}/03-detail.png` });
  console.log('03-detail done');
}

// Click "计划" nav link
await page.click('nav >> text=计划');
await page.waitForTimeout(2500);
await page.screenshot({ path: `${dir}/04-planner.png` });
console.log('04-planner done');

// Click "时间线" nav link
await page.click('nav >> text=时间线');
await page.waitForTimeout(2500);
await page.screenshot({ path: `${dir}/05-timeline.png` });
console.log('05-timeline done');

// Click "设置" nav link
await page.click('nav >> text=设置');
await page.waitForTimeout(1500);
await page.screenshot({ path: `${dir}/06-settings.png` });
console.log('06-settings done');

await browser.close();
console.log('All screenshots saved.');
