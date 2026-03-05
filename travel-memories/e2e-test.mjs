import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.join(__dirname, 'test-screenshots');

async function run() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'zh-CN',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  try {
    // ========================================================================
    // Step 1: Go to Trips page and create a new trip
    // ========================================================================
    console.log('Step 1: Navigate to /trips and create a new trip...');
    await page.goto('http://localhost:5173/trips', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Click "新建旅行" button (in the header area, not inside modal)
    await page.click('button:has-text("新建旅行")');
    await page.waitForTimeout(500);

    // Wait for the modal to appear
    await page.waitForSelector('.fixed.inset-0', { timeout: 5000 });

    // The modal container
    const modal = page.locator('.fixed.inset-0 .relative');

    // Fill in the trip name - the input inside the modal
    const nameInput = modal.locator('input[type="text"]').first();
    await nameInput.fill('云南之旅');

    // Set status to "已完成" - click the button INSIDE THE MODAL that contains "已完成"
    // The modal's status toggle buttons are inside the modal container
    await modal.locator('button:has-text("已完成")').click();
    await page.waitForTimeout(200);

    // Pick the 3rd color (index 2) - the round color buttons inside the modal
    // These are small round buttons with background-color style
    const colorButtons = modal.locator('button.rounded-full');
    const colorCount = await colorButtons.count();
    console.log(`  Found ${colorCount} color buttons`);
    if (colorCount >= 3) {
      await colorButtons.nth(2).click();
    }
    await page.waitForTimeout(200);

    // Set start date - there are two date inputs inside the modal
    const dateInputs = modal.locator('input[type="date"]');
    await dateInputs.nth(0).fill('2024-06-01');
    await dateInputs.nth(1).fill('2024-06-10');

    await page.waitForTimeout(300);

    // Take a screenshot of the form before submitting
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step1a-create-trip-form.png'), fullPage: false });
    console.log('  Screenshot: step1a-create-trip-form.png');

    // Click "创建旅行" button inside the modal
    await modal.locator('button:has-text("创建旅行")').click();
    await page.waitForTimeout(1500);

    // Take a screenshot showing the new trip card
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step1b-trip-card.png'), fullPage: false });
    console.log('  Screenshot: step1b-trip-card.png');

    // ========================================================================
    // Step 2: Click on the trip card to go to trip detail page
    // ========================================================================
    console.log('Step 2: Navigate to trip detail page...');

    // Click on the trip card - use the "查看详情" button link or the card content
    const viewDetailBtn = page.locator('button:has-text("查看详情")').first();
    await viewDetailBtn.click();
    await page.waitForTimeout(2000);

    // Wait for the split view layout to appear (the leaflet map container)
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    await page.waitForTimeout(3000); // Wait for map tiles to load

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step2-trip-detail-split-view.png'), fullPage: false });
    console.log('  Screenshot: step2-trip-detail-split-view.png');

    // ========================================================================
    // Step 3: Add first place (昆明) by clicking the map
    // ========================================================================
    console.log('Step 3: Add first place (昆明)...');

    // Click "添加地点" button in the left panel
    const addPlaceBtn = page.locator('button:has-text("添加地点")').first();
    await addPlaceBtn.click();
    await page.waitForTimeout(500);

    // Verify the prompt is showing
    await page.waitForSelector('text=在地图上点击选择位置', { timeout: 5000 });

    // Take screenshot showing "在地图上点击选择位置" prompt
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step3a-add-place-prompt.png'), fullPage: false });
    console.log('  Screenshot: step3a-add-place-prompt.png');

    // Click on the map at center
    const mapContainer = page.locator('.leaflet-container').first();
    const mapBox = await mapContainer.boundingBox();
    if (!mapBox) throw new Error('Map container not found');

    const mapCenterX = Math.round(mapBox.width / 2);
    const mapCenterY = Math.round(mapBox.height / 2);

    console.log(`  Map bounds: x=${mapBox.x}, y=${mapBox.y}, w=${mapBox.width}, h=${mapBox.height}`);
    console.log(`  Clicking map at relative position: (${mapCenterX}, ${mapCenterY})`);

    await mapContainer.click({ position: { x: mapCenterX, y: mapCenterY } });
    await page.waitForTimeout(3000); // Wait for geocoding

    // Check if name was auto-filled, if not, type "昆明"
    const placeNameInput = page.locator('input[placeholder="地点名称"]');
    const currentName = await placeNameInput.inputValue();
    if (!currentName.trim()) {
      await placeNameInput.fill('昆明');
    }
    console.log(`  Place name: "${await placeNameInput.inputValue()}"`);

    // Transport mode "自驾" (driving) is the default first option, no change needed
    // But let's explicitly set it
    const transportSelect = page.locator('select').first();
    await transportSelect.selectOption('driving');
    await page.waitForTimeout(200);

    // Click "添加地点" confirm button - this is the full-width button within the form box
    // The form has a blue border container with the confirm button inside
    const confirmBtns = page.locator('button:has-text("添加地点")');
    // We need the one that is the submit button, not the toggle button
    // The submit button is inside the add-place form (has border-blue-200 parent)
    // Let's find the button that is a full-width submit button (it has w-full class)
    const submitBtn = page.locator('button.w-full:has-text("添加地点")');
    await submitBtn.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step3b-first-place-added.png'), fullPage: false });
    console.log('  Screenshot: step3b-first-place-added.png');

    // ========================================================================
    // Step 4: Add second place (大理)
    // ========================================================================
    console.log('Step 4: Add second place (大理)...');

    // Click "添加地点" button again - the toggle button (smaller one in the header)
    const addPlaceBtn2 = page.locator('button:has-text("添加地点")').first();
    await addPlaceBtn2.click();
    await page.waitForTimeout(500);

    // Click on a different spot on the map (offset to upper-right)
    const clickX2 = Math.round(mapCenterX + mapBox.width * 0.15);
    const clickY2 = Math.round(mapCenterY - mapBox.height * 0.12);
    console.log(`  Clicking map at relative position: (${clickX2}, ${clickY2})`);
    await mapContainer.click({ position: { x: clickX2, y: clickY2 } });
    await page.waitForTimeout(3000);

    // Check if name was auto-filled, if not, type "大理"
    const placeNameInput2 = page.locator('input[placeholder="地点名称"]');
    const currentName2 = await placeNameInput2.inputValue();
    if (!currentName2.trim()) {
      await placeNameInput2.fill('大理');
    }
    console.log(`  Place name: "${await placeNameInput2.inputValue()}"`);

    // Select transport mode "火车" (train)
    // Note: The label is "高铁" not "火车", and the value is "train"
    await page.locator('select').first().selectOption('train');
    await page.waitForTimeout(200);

    // Click submit
    await page.locator('button.w-full:has-text("添加地点")').click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step4-two-places-with-route.png'), fullPage: false });
    console.log('  Screenshot: step4-two-places-with-route.png');

    // ========================================================================
    // Step 5: Add third place (丽江)
    // ========================================================================
    console.log('Step 5: Add third place (丽江)...');

    // Click "添加地点" button again
    await page.locator('button:has-text("添加地点")').first().click();
    await page.waitForTimeout(500);

    // Click on another spot on the map (lower-left relative to center)
    const clickX3 = Math.round(mapCenterX - mapBox.width * 0.12);
    const clickY3 = Math.round(mapCenterY + mapBox.height * 0.15);
    console.log(`  Clicking map at relative position: (${clickX3}, ${clickY3})`);
    await mapContainer.click({ position: { x: clickX3, y: clickY3 } });
    await page.waitForTimeout(3000);

    // Check if name was auto-filled, if not, type "丽江"
    const placeNameInput3 = page.locator('input[placeholder="地点名称"]');
    const currentName3 = await placeNameInput3.inputValue();
    if (!currentName3.trim()) {
      await placeNameInput3.fill('丽江');
    }
    console.log(`  Place name: "${await placeNameInput3.inputValue()}"`);

    // Select transport mode "飞机" (flight)
    await page.locator('select').first().selectOption('flight');
    await page.waitForTimeout(200);

    // Click submit
    await page.locator('button.w-full:has-text("添加地点")').click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step5-three-places-with-routes.png'), fullPage: false });
    console.log('  Screenshot: step5-three-places-with-routes.png');

    // ========================================================================
    // Step 6: Go to Home page (click "地图" nav link)
    // ========================================================================
    console.log('Step 6: Navigate to Home page...');

    await page.click('nav a:has-text("地图")');
    await page.waitForTimeout(1000);
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    await page.waitForTimeout(3000); // Wait for map to load and fitBounds to run

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step6-home-page-map.png'), fullPage: false });
    console.log('  Screenshot: step6-home-page-map.png');

    // ========================================================================
    // Step 7: Go to Timeline page (click "时间线" nav link)
    // ========================================================================
    console.log('Step 7: Navigate to Timeline page...');

    await page.click('nav a:has-text("时间线")');
    await page.waitForTimeout(1000);
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Select the trip "云南之旅" from the dropdown
    const timelineSelect = page.locator('select').first();
    // Use the option text to select
    await timelineSelect.selectOption({ label: '云南之旅' });
    console.log('  Selected trip: 云南之旅');

    // Wait for "正在构建路线..." to appear and then disappear
    try {
      await page.waitForSelector('text=正在构建路线...', { timeout: 5000 });
      console.log('  Loading segments...');
      await page.waitForSelector('text=正在构建路线...', { state: 'hidden', timeout: 30000 });
      console.log('  Segments loaded.');
    } catch {
      console.log('  Loading overlay may have already disappeared or did not appear.');
    }
    await page.waitForTimeout(3000); // Let the map settle with fitBounds

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step7-timeline-page.png'), fullPage: false });
    console.log('  Screenshot: step7-timeline-page.png');

    // ========================================================================
    // Step 8: Go to Planner page (click "计划" nav link)
    // ========================================================================
    console.log('Step 8: Navigate to Planner page...');

    await page.click('nav a:has-text("计划")');
    await page.waitForTimeout(1000);
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step8-planner-page.png'), fullPage: false });
    console.log('  Screenshot: step8-planner-page.png');

    console.log('\n=== All steps completed successfully! ===');
    console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);

  } catch (error) {
    console.error('Test failed:', error.message);
    // Take an error screenshot
    try {
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error-screenshot.png'), fullPage: false });
      console.log('Error screenshot saved.');
    } catch (e) {
      console.error('Could not save error screenshot:', e.message);
    }
    // Also log the page URL
    console.log('Current URL:', page.url());
    throw error;
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
