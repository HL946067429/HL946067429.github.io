import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.join(__dirname, 'audit-screenshots');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const visualIssues = [];

function logIssue(page, description) {
  visualIssues.push({ page, description });
  console.log(`  [ISSUE] ${page}: ${description}`);
}

async function run() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    locale: 'zh-CN',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  try {
    // ========================================================================
    // STEP 1: Clear existing data first (via Settings page)
    // ========================================================================
    console.log('Step 0: Clearing any existing data...');
    await page.goto('http://localhost:5173/settings', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Click "清空数据" 3 times to confirm
    try {
      const clearBtn = page.locator('button:has-text("清空数据")');
      if (await clearBtn.isVisible()) {
        await clearBtn.click();
        await page.waitForTimeout(300);
        // Click "确定要删除？"
        const confirmBtn = page.locator('button:has-text("确定要删除")');
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
          await page.waitForTimeout(300);
          // Click "最终确认删除"
          const finalBtn = page.locator('button:has-text("最终确认删除")');
          if (await finalBtn.isVisible()) {
            await finalBtn.click();
            await page.waitForTimeout(1000);
            console.log('  Cleared all data.');
          }
        }
      }
    } catch {
      console.log('  No data to clear or clear failed (OK).');
    }

    // ========================================================================
    // STEP 1: Create Trip 1 - 云南大理之旅
    // ========================================================================
    console.log('\n=== Creating Trip 1: 云南大理之旅 ===');
    await page.goto('http://localhost:5173/trips', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await page.click('button:has-text("新建旅行")');
    await page.waitForTimeout(500);
    await page.waitForSelector('.fixed.inset-0', { timeout: 5000 });

    const modal = page.locator('.fixed.inset-0 .relative');

    // Fill name
    await modal.locator('input[type="text"]').first().fill('云南大理之旅');
    await page.waitForTimeout(200);

    // Fill description
    await modal.locator('textarea').fill('环洱海自驾，探索古城和苍山');
    await page.waitForTimeout(200);

    // Set status to completed
    await modal.locator('button:has-text("已完成")').click();
    await page.waitForTimeout(200);

    // Pick 3rd color (green, index 2)
    const colorButtons = modal.locator('button.rounded-full');
    await colorButtons.nth(2).click();
    await page.waitForTimeout(200);

    // Set dates
    const dateInputs = modal.locator('input[type="date"]');
    await dateInputs.nth(0).fill('2024-06-01');
    await dateInputs.nth(1).fill('2024-06-10');
    await page.waitForTimeout(200);

    // Add tags: "自驾" and "摄影"
    const tagInput = modal.locator('input[placeholder="输入标签，按 Enter 添加"]');
    await tagInput.fill('自驾');
    await tagInput.press('Enter');
    await page.waitForTimeout(200);
    await tagInput.fill('摄影');
    await tagInput.press('Enter');
    await page.waitForTimeout(200);

    // Create trip
    await modal.locator('button:has-text("创建旅行")').click();
    await page.waitForTimeout(1500);
    console.log('  Trip 1 created.');

    // ========================================================================
    // STEP 2: Create Trip 2 - 日本关西行
    // ========================================================================
    console.log('\n=== Creating Trip 2: 日本关西行 ===');
    await page.click('button:has-text("新建旅行")');
    await page.waitForTimeout(500);
    await page.waitForSelector('.fixed.inset-0', { timeout: 5000 });

    const modal2 = page.locator('.fixed.inset-0 .relative');

    await modal2.locator('input[type="text"]').first().fill('日本关西行');
    await page.waitForTimeout(200);
    await modal2.locator('textarea').fill('大阪京都奈良，樱花季之旅');
    await page.waitForTimeout(200);
    await modal2.locator('button:has-text("已完成")').click();
    await page.waitForTimeout(200);

    // Pick 1st color (blue, index 0)
    const colorButtons2 = modal2.locator('button.rounded-full');
    await colorButtons2.nth(0).click();
    await page.waitForTimeout(200);

    const dateInputs2 = modal2.locator('input[type="date"]');
    await dateInputs2.nth(0).fill('2024-03-15');
    await dateInputs2.nth(1).fill('2024-03-25');
    await page.waitForTimeout(200);

    const tagInput2 = modal2.locator('input[placeholder="输入标签，按 Enter 添加"]');
    await tagInput2.fill('美食');
    await tagInput2.press('Enter');
    await page.waitForTimeout(200);
    await tagInput2.fill('文化');
    await tagInput2.press('Enter');
    await page.waitForTimeout(200);

    await modal2.locator('button:has-text("创建旅行")').click();
    await page.waitForTimeout(1500);
    console.log('  Trip 2 created.');

    // ========================================================================
    // STEP 3: Create Trip 3 - 新疆自驾计划
    // ========================================================================
    console.log('\n=== Creating Trip 3: 新疆自驾计划 ===');
    await page.click('button:has-text("新建旅行")');
    await page.waitForTimeout(500);
    await page.waitForSelector('.fixed.inset-0', { timeout: 5000 });

    const modal3 = page.locator('.fixed.inset-0 .relative');

    await modal3.locator('input[type="text"]').first().fill('新疆自驾计划');
    await page.waitForTimeout(200);
    await modal3.locator('textarea').fill('独库公路、喀纳斯、赛里木湖');
    await page.waitForTimeout(200);

    // Status: planned (default, but let's make sure)
    await modal3.locator('button:has-text("计划中")').click();
    await page.waitForTimeout(200);

    // Pick 5th color (index 4 - purple #8b5cf6)
    const colorButtons3 = modal3.locator('button.rounded-full');
    await colorButtons3.nth(4).click();
    await page.waitForTimeout(200);

    const dateInputs3 = modal3.locator('input[type="date"]');
    await dateInputs3.nth(0).fill('2025-08-01');
    await dateInputs3.nth(1).fill('2025-08-20');
    await page.waitForTimeout(200);

    const tagInput3 = modal3.locator('input[placeholder="输入标签，按 Enter 添加"]');
    await tagInput3.fill('自驾');
    await tagInput3.press('Enter');
    await page.waitForTimeout(200);
    await tagInput3.fill('风景');
    await tagInput3.press('Enter');
    await page.waitForTimeout(200);

    await modal3.locator('button:has-text("创建旅行")').click();
    await page.waitForTimeout(1500);
    console.log('  Trip 3 created.');

    // ========================================================================
    // STEP 4: Add Places to Trip 1 (云南大理之旅)
    // ========================================================================
    console.log('\n=== Adding places to Trip 1: 云南大理之旅 ===');

    // Navigate to trip 1 detail
    // Trips sorted by startDate descending: 新疆(2025-08-01), 云南(2024-06-01), 日本(2024-03-15)
    // Use the grid card structure: click directly on the card with the trip name
    await page.locator('.grid > div').filter({ hasText: '云南大理之旅' }).first().click();
    await page.waitForTimeout(2000);
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const mapContainer = page.locator('.leaflet-container').first();

    // --- Place 1: 昆明 ---
    console.log('  Adding place 1: 昆明');
    await page.locator('button:has-text("添加地点")').first().click();
    await page.waitForTimeout(500);

    // Click on map at position simulating Kunming (center area, lower)
    await mapContainer.click({ position: { x: 400, y: 400 } });
    await page.waitForTimeout(2000);

    // Fill name
    const nameInput1 = page.locator('input[placeholder="地点名称"]');
    await nameInput1.fill('昆明');
    await page.waitForTimeout(200);

    // Fill date
    const dateInputPlace = page.locator('.border-blue-200 input[type="date"], .border-blue-800 input[type="date"]');
    await dateInputPlace.fill('2024-06-01');
    await page.waitForTimeout(200);

    // Transport: driving (default, first option)
    const transportSelect = page.locator('.border-blue-200 select, .border-blue-800 select').first();
    await transportSelect.selectOption('driving');
    await page.waitForTimeout(200);

    // Rating: 4 stars - click the 4th star
    const stars = page.locator('.border-blue-200 button:has(svg), .border-blue-800 button:has(svg)').filter({ has: page.locator('svg') });
    // More specific: the rating stars are near "评分:" text
    const ratingStars = page.locator('.border-blue-200, .border-blue-800').locator('button.p-0\\.5');
    const starCount = await ratingStars.count();
    console.log(`  Found ${starCount} rating star buttons`);
    if (starCount >= 4) {
      await ratingStars.nth(3).click(); // 4th star (0-indexed: 3)
    }
    await page.waitForTimeout(200);

    // Click "添加地点" submit button (w-full)
    await page.locator('button.w-full:has-text("添加地点")').click();
    await page.waitForTimeout(2000);
    console.log('  Place 1 (昆明) added.');

    // --- Place 2: 大理 ---
    console.log('  Adding place 2: 大理');
    await page.locator('button:has-text("添加地点")').first().click();
    await page.waitForTimeout(500);

    await mapContainer.click({ position: { x: 350, y: 300 } });
    await page.waitForTimeout(2000);

    await page.locator('input[placeholder="地点名称"]').fill('大理');
    await page.waitForTimeout(200);

    const dateInputPlace2 = page.locator('.border-blue-200 input[type="date"], .border-blue-800 input[type="date"]');
    await dateInputPlace2.fill('2024-06-03');
    await page.waitForTimeout(200);

    const transportSelect2 = page.locator('.border-blue-200 select, .border-blue-800 select').first();
    await transportSelect2.selectOption('driving');
    await page.waitForTimeout(200);

    // Rating: 5 stars
    const ratingStars2 = page.locator('.border-blue-200, .border-blue-800').locator('button.p-0\\.5');
    if (await ratingStars2.count() >= 5) {
      await ratingStars2.nth(4).click(); // 5th star
    }
    await page.waitForTimeout(200);

    await page.locator('button.w-full:has-text("添加地点")').click();
    await page.waitForTimeout(2000);
    console.log('  Place 2 (大理) added.');

    // --- Place 3: 丽江 ---
    console.log('  Adding place 3: 丽江');
    await page.locator('button:has-text("添加地点")').first().click();
    await page.waitForTimeout(500);

    await mapContainer.click({ position: { x: 330, y: 220 } });
    await page.waitForTimeout(2000);

    await page.locator('input[placeholder="地点名称"]').fill('丽江');
    await page.waitForTimeout(200);

    const dateInputPlace3 = page.locator('.border-blue-200 input[type="date"], .border-blue-800 input[type="date"]');
    await dateInputPlace3.fill('2024-06-06');
    await page.waitForTimeout(200);

    const transportSelect3 = page.locator('.border-blue-200 select, .border-blue-800 select').first();
    await transportSelect3.selectOption('train');
    await page.waitForTimeout(200);

    // Rating: 4 stars
    const ratingStars3 = page.locator('.border-blue-200, .border-blue-800').locator('button.p-0\\.5');
    if (await ratingStars3.count() >= 4) {
      await ratingStars3.nth(3).click(); // 4th star
    }
    await page.waitForTimeout(200);

    await page.locator('button.w-full:has-text("添加地点")').click();
    await page.waitForTimeout(2000);
    console.log('  Place 3 (丽江) added.');

    // Screenshot Trip 1 detail
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'trip-detail-yunnan.png'), fullPage: false });
    console.log('  Screenshot: trip-detail-yunnan.png');

    // ========================================================================
    // STEP 5: Add Places to Trip 2 (日本关西行)
    // ========================================================================
    console.log('\n=== Adding places to Trip 2: 日本关西行 ===');

    // Go back to trips list
    await page.locator('button:has(svg.lucide-arrow-left)').click();
    await page.waitForTimeout(1500);

    // Click on 日本关西行
    await page.locator('.grid > div').filter({ hasText: '日本关西行' }).first().click();
    await page.waitForTimeout(2000);
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const mapContainer2 = page.locator('.leaflet-container').first();

    // --- Place 1: 大阪 ---
    console.log('  Adding place 1: 大阪');
    await page.locator('button:has-text("添加地点")').first().click();
    await page.waitForTimeout(500);

    await mapContainer2.click({ position: { x: 450, y: 350 } });
    await page.waitForTimeout(2000);

    await page.locator('input[placeholder="地点名称"]').fill('大阪');
    await page.waitForTimeout(200);

    await page.locator('.border-blue-200 input[type="date"], .border-blue-800 input[type="date"]').fill('2024-03-15');
    await page.waitForTimeout(200);

    await page.locator('.border-blue-200 select, .border-blue-800 select').first().selectOption('flight');
    await page.waitForTimeout(200);

    // Rating: 4 stars
    const rs4 = page.locator('.border-blue-200, .border-blue-800').locator('button.p-0\\.5');
    if (await rs4.count() >= 4) await rs4.nth(3).click();
    await page.waitForTimeout(200);

    await page.locator('button.w-full:has-text("添加地点")').click();
    await page.waitForTimeout(2000);
    console.log('  Place 1 (大阪) added.');

    // --- Place 2: 京都 ---
    console.log('  Adding place 2: 京都');
    await page.locator('button:has-text("添加地点")').first().click();
    await page.waitForTimeout(500);

    await mapContainer2.click({ position: { x: 400, y: 280 } });
    await page.waitForTimeout(2000);

    await page.locator('input[placeholder="地点名称"]').fill('京都');
    await page.waitForTimeout(200);

    await page.locator('.border-blue-200 input[type="date"], .border-blue-800 input[type="date"]').fill('2024-03-18');
    await page.waitForTimeout(200);

    await page.locator('.border-blue-200 select, .border-blue-800 select').first().selectOption('train');
    await page.waitForTimeout(200);

    // Rating: 5 stars
    const rs5 = page.locator('.border-blue-200, .border-blue-800').locator('button.p-0\\.5');
    if (await rs5.count() >= 5) await rs5.nth(4).click();
    await page.waitForTimeout(200);

    await page.locator('button.w-full:has-text("添加地点")').click();
    await page.waitForTimeout(2000);
    console.log('  Place 2 (京都) added.');

    // --- Place 3: 奈良 ---
    console.log('  Adding place 3: 奈良');
    await page.locator('button:has-text("添加地点")').first().click();
    await page.waitForTimeout(500);

    await mapContainer2.click({ position: { x: 430, y: 320 } });
    await page.waitForTimeout(2000);

    await page.locator('input[placeholder="地点名称"]').fill('奈良');
    await page.waitForTimeout(200);

    await page.locator('.border-blue-200 input[type="date"], .border-blue-800 input[type="date"]').fill('2024-03-22');
    await page.waitForTimeout(200);

    await page.locator('.border-blue-200 select, .border-blue-800 select').first().selectOption('train');
    await page.waitForTimeout(200);

    // Rating: 4 stars
    const rs6 = page.locator('.border-blue-200, .border-blue-800').locator('button.p-0\\.5');
    if (await rs6.count() >= 4) await rs6.nth(3).click();
    await page.waitForTimeout(200);

    await page.locator('button.w-full:has-text("添加地点")').click();
    await page.waitForTimeout(2000);
    console.log('  Place 3 (奈良) added.');

    // Screenshot Trip 2 detail
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'trip-detail-japan.png'), fullPage: false });
    console.log('  Screenshot: trip-detail-japan.png');

    // ========================================================================
    // STEP 6: Add Places to Trip 3 (新疆自驾计划)
    // ========================================================================
    console.log('\n=== Adding places to Trip 3: 新疆自驾计划 ===');

    // Go back to trips list
    await page.locator('button:has(svg.lucide-arrow-left)').click();
    await page.waitForTimeout(1500);

    // Click on 新疆自驾计划
    await page.locator('.grid > div').filter({ hasText: '新疆自驾计划' }).first().click();
    await page.waitForTimeout(2000);
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const mapContainer3 = page.locator('.leaflet-container').first();

    // --- Place 1: 乌鲁木齐 ---
    console.log('  Adding place 1: 乌鲁木齐');
    await page.locator('button:has-text("添加地点")').first().click();
    await page.waitForTimeout(500);

    await mapContainer3.click({ position: { x: 500, y: 380 } });
    await page.waitForTimeout(2000);

    await page.locator('input[placeholder="地点名称"]').fill('乌鲁木齐');
    await page.waitForTimeout(200);

    await page.locator('.border-blue-200 input[type="date"], .border-blue-800 input[type="date"]').fill('2025-08-01');
    await page.waitForTimeout(200);

    await page.locator('.border-blue-200 select, .border-blue-800 select').first().selectOption('flight');
    await page.waitForTimeout(200);

    // Rating: 0 stars (don't click any star)

    await page.locator('button.w-full:has-text("添加地点")').click();
    await page.waitForTimeout(2000);
    console.log('  Place 1 (乌鲁木齐) added.');

    // --- Place 2: 独山子 ---
    console.log('  Adding place 2: 独山子');
    await page.locator('button:has-text("添加地点")').first().click();
    await page.waitForTimeout(500);

    await mapContainer3.click({ position: { x: 380, y: 300 } });
    await page.waitForTimeout(2000);

    await page.locator('input[placeholder="地点名称"]').fill('独山子');
    await page.waitForTimeout(200);

    await page.locator('.border-blue-200 input[type="date"], .border-blue-800 input[type="date"]').fill('2025-08-05');
    await page.waitForTimeout(200);

    await page.locator('.border-blue-200 select, .border-blue-800 select').first().selectOption('driving');
    await page.waitForTimeout(200);

    // Rating: 0 stars

    await page.locator('button.w-full:has-text("添加地点")').click();
    await page.waitForTimeout(2000);
    console.log('  Place 2 (独山子) added.');

    // --- Place 3: 喀纳斯 ---
    console.log('  Adding place 3: 喀纳斯');
    await page.locator('button:has-text("添加地点")').first().click();
    await page.waitForTimeout(500);

    await mapContainer3.click({ position: { x: 350, y: 200 } });
    await page.waitForTimeout(2000);

    await page.locator('input[placeholder="地点名称"]').fill('喀纳斯');
    await page.waitForTimeout(200);

    await page.locator('.border-blue-200 input[type="date"], .border-blue-800 input[type="date"]').fill('2025-08-10');
    await page.waitForTimeout(200);

    await page.locator('.border-blue-200 select, .border-blue-800 select').first().selectOption('driving');
    await page.waitForTimeout(200);

    // Rating: 0 stars

    await page.locator('button.w-full:has-text("添加地点")').click();
    await page.waitForTimeout(2000);
    console.log('  Place 3 (喀纳斯) added.');

    // Screenshot Trip 3 detail
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'trip-detail-xinjiang.png'), fullPage: false });
    console.log('  Screenshot: trip-detail-xinjiang.png');

    // ========================================================================
    // STEP 7: Take screenshots of all pages
    // ========================================================================
    console.log('\n=== Taking comprehensive screenshots ===');

    // --- 1. Home page ---
    console.log('  Navigating to Home page...');
    await page.click('nav a:has-text("地图")');
    await page.waitForTimeout(1000);
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    await page.waitForTimeout(3000); // Wait for map tiles and fitBounds

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'home-with-data.png'), fullPage: false });
    console.log('  Screenshot: home-with-data.png');

    // Check visual issues on home page
    const sidebarVisible = await page.locator('.w-80').first().isVisible();
    if (!sidebarVisible) {
      logIssue('Home', 'Sidebar not visible by default');
    }

    // --- 9. Home page with sidebar hover ---
    console.log('  Taking hover screenshot on sidebar trip...');
    const firstTripCard = page.locator('.w-80 .p-3.rounded-xl').first();
    if (await firstTripCard.isVisible()) {
      await firstTripCard.hover();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'home-sidebar-hover.png'), fullPage: false });
      console.log('  Screenshot: home-sidebar-hover.png');
    } else {
      console.log('  Could not find sidebar trip card to hover');
    }

    // --- 2. Trips list page ---
    console.log('  Navigating to Trips page...');
    await page.click('nav a:has-text("旅行")');
    await page.waitForTimeout(1500);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'trips-list.png'), fullPage: false });
    console.log('  Screenshot: trips-list.png');

    // Check visual issues on trips page
    const tripCards = await page.locator('.grid > div').count();
    if (tripCards !== 3) {
      logIssue('Trips', `Expected 3 trip cards, found ${tripCards}`);
    }

    // Check if tag badges render correctly
    const tagBadges = await page.locator('span:has-text("自驾")').count();
    if (tagBadges === 0) {
      logIssue('Trips', 'Tag badges not rendering on trip cards');
    }

    // --- 3. Trip detail - Yunnan (navigate back to it) ---
    console.log('  Navigating to Trip 1 detail (Yunnan)...');
    await page.locator('.grid > div').filter({ hasText: '云南大理之旅' }).first().click();
    await page.waitForTimeout(2000);
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    await page.waitForTimeout(3000);

    // Check visual issues
    const placeListItems = await page.locator('.space-y-1 > div').count();
    console.log(`  Found ${placeListItems} place items in list`);

    // Check if route lines are visible (polyline elements)
    const polylines = await page.locator('.leaflet-overlay-pane path').count();
    console.log(`  Found ${polylines} route polyline(s)`);
    if (polylines === 0) {
      logIssue('TripDetail-Yunnan', 'No route polylines visible between places');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'trip-detail-yunnan.png'), fullPage: false });
    console.log('  Screenshot: trip-detail-yunnan.png (final)');

    // --- Go back and take Japan detail screenshot ---
    console.log('  Navigating to Trip 2 detail (Japan)...');
    await page.locator('button:has(svg.lucide-arrow-left)').click();
    await page.waitForTimeout(1500);
    await page.locator('.grid > div').filter({ hasText: '日本关西行' }).first().click();
    await page.waitForTimeout(2000);
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    await page.waitForTimeout(3000);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'trip-detail-japan.png'), fullPage: false });
    console.log('  Screenshot: trip-detail-japan.png (final)');

    // --- Go back and take Xinjiang detail screenshot ---
    console.log('  Navigating to Trip 3 detail (Xinjiang)...');
    await page.locator('button:has(svg.lucide-arrow-left)').click();
    await page.waitForTimeout(1500);
    await page.locator('.grid > div').filter({ hasText: '新疆自驾计划' }).first().click();
    await page.waitForTimeout(2000);
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    await page.waitForTimeout(3000);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'trip-detail-xinjiang.png'), fullPage: false });
    console.log('  Screenshot: trip-detail-xinjiang.png (final)');

    // --- 6. Planner page ---
    console.log('  Navigating to Planner page...');
    await page.click('nav a:has-text("计划")');
    await page.waitForTimeout(1000);
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Check if planned trips show up in the planner left panel
    const plannerTripBtn = page.locator('button:has-text("新疆自驾计划")');
    const plannerHasTrip = await plannerTripBtn.isVisible();
    if (!plannerHasTrip) {
      logIssue('Planner', 'Planned trip "新疆自驾计划" not visible in planner sidebar');
    } else {
      // Select the planned trip
      await plannerTripBtn.click();
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'planner-page.png'), fullPage: false });
    console.log('  Screenshot: planner-page.png');

    // --- 7. Timeline page ---
    console.log('  Navigating to Timeline page...');
    await page.click('nav a:has-text("时间线")');
    await page.waitForTimeout(1000);
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Select a trip from the dropdown
    const timelineSelect = page.locator('select').first();
    // Select "云南大理之旅"
    try {
      await timelineSelect.selectOption({ label: '云南大理之旅' });
      console.log('  Selected trip: 云南大理之旅');

      // Wait for loading segments to complete
      try {
        await page.waitForSelector('text=正在构建路线...', { timeout: 3000 });
        console.log('  Loading segments...');
        await page.waitForSelector('text=正在构建路线...', { state: 'hidden', timeout: 30000 });
        console.log('  Segments loaded.');
      } catch {
        console.log('  Loading overlay did not appear or already disappeared.');
      }
      await page.waitForTimeout(3000);
    } catch (e) {
      console.log(`  Could not select trip in timeline: ${e.message}`);
      logIssue('Timeline', 'Could not select trip from dropdown');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'timeline-page.png'), fullPage: false });
    console.log('  Screenshot: timeline-page.png');

    // Check timeline visual issues
    const controlBar = await page.locator('input[type="range"]').isVisible();
    if (!controlBar) {
      logIssue('Timeline', 'Progress slider not visible');
    }

    const playBtn = await page.locator('button:has(svg.lucide-play)').isVisible();
    const pauseBtn = await page.locator('button:has(svg.lucide-pause)').isVisible();
    if (!playBtn && !pauseBtn) {
      logIssue('Timeline', 'Play/Pause button not visible');
    }

    // --- 8. Settings page ---
    console.log('  Navigating to Settings page...');
    await page.click('nav a:has-text("设置")');
    await page.waitForTimeout(1500);

    // Check settings stats
    const statsText = await page.textContent('.grid.grid-cols-3');
    if (statsText) {
      console.log(`  Settings stats area text: ${statsText.replace(/\s+/g, ' ').trim()}`);
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'settings-page.png'), fullPage: false });
    console.log('  Screenshot: settings-page.png');

    // Check visual issues on settings page
    const darkModeToggle = await page.locator('button:has(span.rounded-full)').first().isVisible();
    if (!darkModeToggle) {
      logIssue('Settings', 'Dark mode toggle not visible');
    }

    // ========================================================================
    // Visual audit checks
    // ========================================================================
    console.log('\n=== Running Visual Audit Checks ===');

    // Check navigation bar
    const navLinks = await page.locator('nav a').count();
    console.log(`  Nav links count: ${navLinks}`);
    if (navLinks < 5) {
      logIssue('Navigation', `Expected 5 nav links, found ${navLinks}`);
    }

    // Check for any console errors by going through pages again
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate through pages to catch console errors
    for (const route of ['/', '/trips', '/planner', '/timeline', '/settings']) {
      await page.goto(`http://localhost:5173${route}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
    }

    if (consoleErrors.length > 0) {
      for (const err of consoleErrors) {
        logIssue('Console', `JS Error: ${err.substring(0, 100)}`);
      }
    }

    // ========================================================================
    // Summary
    // ========================================================================
    console.log('\n=== Visual Audit Summary ===');
    console.log(`Total screenshots taken: 9`);
    console.log(`Total visual issues found: ${visualIssues.length}`);
    if (visualIssues.length > 0) {
      console.log('\nIssues:');
      for (const issue of visualIssues) {
        console.log(`  - [${issue.page}] ${issue.description}`);
      }
    }
    console.log(`\nScreenshots saved to: ${SCREENSHOT_DIR}`);

  } catch (error) {
    console.error('\nTest failed:', error.message);
    console.error(error.stack);
    try {
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error-screenshot.png'), fullPage: false });
      console.log('Error screenshot saved.');
    } catch (e) {
      console.error('Could not save error screenshot:', e.message);
    }
    console.log('Current URL:', page.url());
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
