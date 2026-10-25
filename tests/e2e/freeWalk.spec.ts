import { test, expect, type Page, type Locator } from '@playwright/test';
import questions from '../../src/data/questions.json' with { type: 'json' };

async function start(page: Page) {
  await page.route('https://docs.google.com/spreadsheets/**', (route) => route.abort());
  await page.goto('/');
  await page.getByRole('button', { name: '開始遊戲', exact: true }).click();
  await page.getByRole('button', { name: '開始拜訪', exact: true }).click();
  const canvas = page.getByTestId('clinic-3d-canvas');
  await expect(canvas).toHaveAttribute('data-renderer', 'webgl', { timeout: 20000 });
  await canvas.focus();
  return canvas;
}
async function position(canvas: Locator) {
  return canvas.evaluate((el: HTMLElement) => ({
    x: Number(el.dataset.actorX),
    z: Number(el.dataset.actorZ),
    angle: Number(el.dataset.azimuth),
  }));
}
async function hold(page: Page, keys: string[], ms: number) {
  for (const key of keys) await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  for (const key of keys) await page.keyboard.up(key);
}
// Drive the real keyboard using position feedback, without assigning application state.
async function walkTo(page: Page, canvas: Locator, target: { x: number; z: number }) {
  await canvas.focus();
  for (let step = 0; step < 120; step++) {
    const p = await position(canvas),
      dx = target.x - p.x,
      dz = target.z - p.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.14) return;
    const horizontal = dx * Math.cos(p.angle) - dz * Math.sin(p.angle);
    const vertical = dx * Math.sin(p.angle) + dz * Math.cos(p.angle);
    const max = Math.max(Math.abs(horizontal), Math.abs(vertical));
    const keys: string[] = [];
    if (Math.abs(horizontal) > max * 0.4) keys.push(horizontal > 0 ? 'ArrowRight' : 'ArrowLeft');
    if (Math.abs(vertical) > max * 0.4) keys.push(vertical > 0 ? 'ArrowDown' : 'ArrowUp');
    await hold(page, keys, Math.min(100, Math.max(25, (distance / 2.35) * 1000 * 0.8)));
  }
  throw new Error(
    `無法以方向鍵抵達 ${JSON.stringify(target)}，目前 ${JSON.stringify(await position(canvas))}`,
  );
}

test('方向鍵與WASD移動、鬆開即停、反向抵消，旋轉視角與減少動態仍能行走', async ({ page }) => {
  const canvas = await start(page),
    original = await position(canvas);
  const scroll = await page.evaluate(() => scrollY);
  await hold(page, ['ArrowLeft'], 350);
  const moved = await position(canvas);
  expect(Math.hypot(moved.x - original.x, moved.z - original.z)).toBeGreaterThan(0.2);
  expect(moved.angle).toBe(original.angle);
  await expect(canvas).toHaveAttribute('data-manual-moving', 'false');
  await page.waitForTimeout(250);
  expect(await position(canvas)).toEqual(moved);
  expect(await page.evaluate(() => scrollY)).toBe(scroll);
  // Measure while both keys are held, excluding the transition between key presses.
  await page.keyboard.down('ArrowUp');
  await page.keyboard.down('ArrowDown');
  await expect(canvas).toHaveAttribute('data-manual-moving', 'false');
  const bothPressed = await position(canvas);
  await page.waitForTimeout(250);
  const opposite = await position(canvas);
  await page.keyboard.up('ArrowUp');
  await page.keyboard.up('ArrowDown');
  expect(Math.hypot(opposite.x-bothPressed.x, opposite.z-bothPressed.z)).toBeLessThan(0.06);
  await page.keyboard.press('Alt+ArrowRight');
  expect((await position(canvas)).angle).not.toBe(original.angle);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const before = await position(canvas);
  await hold(page, ['KeyA'], 250);
  const after = await position(canvas);
  expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(0.1);
  await expect(canvas).toHaveAttribute('data-walk-pose', '0.0000');
});

test('全程方向鍵走進診所、櫃檯E互動、醫師Enter互動並完成五題100分', async ({ page }, info) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const canvas = await start(page);
  await walkTo(page, canvas, { x: -2.65, z: 4.98 });
  await walkTo(page, canvas, { x: -2.65, z: 3.7 });
  await walkTo(page, canvas, { x: -2.5, z: 0.75 });
  await expect(page.getByRole('button', { name: '與藥師互動', exact: true })).toBeEnabled();
  await expect(page.getByRole('region', { name: '診所互動對話' })).toHaveCount(0);
  await page.keyboard.press('e');
  await expect(page.getByRole('region', { name: '診所互動對話' })).toContainText('藥師');
  await page.screenshot({
    path: `output/playwright/v5-free-reception-${info.project.name}.png`,
    fullPage: true,
  });
  await walkTo(page, canvas, { x: -0.15, z: 0.75 });
  await expect(page.getByRole('button', { name: '查看拜訪準備', exact: true })).toBeDisabled();
  await page.keyboard.press('e');
  await expect(page.getByRole('region', { name: '診所互動對話' })).toHaveCount(0);
  await walkTo(page, canvas, { x: 3.2, z: 0.35 });
  await walkTo(page, canvas, { x: 3.2, z: -0.82 });
  await expect(page.getByRole('button', { name: '與醫師互動', exact: true })).toBeEnabled();
  await page.screenshot({
    path: `output/playwright/v5-free-doctor-${info.project.name}.png`,
    fullPage: true,
  });
  await page.keyboard.press('Enter');
  await expect(page.getByText('「你好，今天想介紹什麼產品？」')).toBeVisible();
  await expect(canvas).toHaveCount(1);
  await expect(page.getByTestId('doctor-scene-speech')).toBeVisible();
  await page.getByRole('button', { name: '繼續對話' }).click();
  await page.getByRole('button', { name: '繼續對話' }).click();
  await page.getByRole('button', { name: '接受醫師挑戰' }).click();
  for (let i = 0; i < 5; i++) {
    const prompt = await page.getByTestId('question-prompt').innerText();
    const q = questions.find((q) => q.prompt === prompt)!;
    await page
      .getByRole('group', { name: '答案選項' })
      .getByRole('button')
      .nth(q.correctIndex)
      .click();
    await page.getByRole('button', { name: '確認送出', exact: true }).click();
    await page
      .getByRole('button', { name: i === 4 ? '查看挑戰結果' : '下一題', exact: true })
      .click();
  }
  await expect(page.locator('.result-stats .score')).toHaveText('100 分');
  await expect(page.getByRole('heading', { name: '外勤養成V5｜挑戰成功！' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('碰撞阻擋櫃檯，手動中斷導航後不跳回舊終點，仍能重新導航', async ({ page }) => {
  const canvas = await start(page);
  await page.getByRole('button', { name: '前往藥局', exact: true }).click();
  await page.getByRole('button', { name: '略過移動', exact: true }).click();
  await canvas.focus();
  await hold(page, ['ArrowUp', 'ArrowRight'], 1300);
  const blocked = await position(canvas);
  expect(blocked.z).toBeGreaterThanOrEqual(-0.085);
  expect(blocked.z).toBeLessThan(0.3);
  await page.getByRole('button', { name: '小地圖：醫師診間', exact: true }).click();
  await expect(page.getByTestId('map-player')).toHaveClass(/walking/);
  await canvas.focus();
  await hold(page, ['ArrowDown'], 200);
  const interrupted = await position(canvas);
  await expect(page.getByRole('button', { name: '略過移動', exact: true })).toHaveCount(0);
  await page.waitForTimeout(6500);
  expect(await position(canvas)).toEqual(interrupted);
  await page.getByRole('button', { name: '小地圖：醫師診間', exact: true }).click();
  await page.getByRole('button', { name: '略過移動', exact: true }).click();
  await page.getByRole('button', { name: '進入診間', exact: true }).click();
  await expect(page.getByRole('button', { name: '繼續對話', exact: true })).toBeVisible();
});

test('方向按鈕長按、焦點離開停止、說明視窗與重開場景不殘留按鍵', async ({ page }, info) => {
  const canvas = await start(page),
    before = await position(canvas);
  const button = page.getByRole('button', { name: '向左走', exact: true });
  await button.scrollIntoViewIfNeeded();
  const box = (await button.boundingBox())!;
  if (info.project.name === 'mobile') {
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2, id: 0 }],
    });
    await page.waitForTimeout(350);
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await session.detach();
  } else {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(350);
    await page.mouse.up();
  }
  const moved = await position(canvas);
  expect(Math.hypot(moved.x - before.x, moved.z - before.z)).toBeGreaterThan(0.2);
  await expect(canvas).toHaveAttribute('data-manual-moving', 'false');
  await canvas.focus();
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(100);
  await page.getByRole('button', { name: '向右旋轉', exact: true }).focus();
  await page.keyboard.up('ArrowLeft');
  const stopped = await position(canvas);
  await page.waitForTimeout(250);
  const still = await position(canvas);
  expect(still.x).toBe(stopped.x);
  expect(still.z).toBe(stopped.z);
  await page.getByRole('button', { name: '遊戲說明', exact: true }).click();
  await page.keyboard.press('ArrowUp');
  expect((await position(canvas)).x).toBe(still.x);
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 320, height: 850 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: '更換產品', exact: true }).click();
  await page.getByRole('button', { name: '開始拜訪', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-renderer', 'webgl');
  const reset = await position(canvas);
  expect(reset.x).toBeCloseTo(before.x);
  expect(reset.z).toBeCloseTo(before.z);
  await page.waitForTimeout(250);
  expect(await position(canvas)).toEqual(reset);
});
