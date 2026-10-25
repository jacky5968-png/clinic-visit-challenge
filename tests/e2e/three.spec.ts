import { test, expect, type Page, type Locator } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const csv = await readFile(new URL('../../output/official-quiz.csv', import.meta.url), 'utf8');
async function start3d(page: Page) {
  await page.route('https://docs.google.com/spreadsheets/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/csv', body: csv }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: '開始遊戲', exact: true }).click();
  await page.getByRole('button', { name: '開始拜訪', exact: true }).click();
  const canvas = page.getByTestId('clinic-3d-canvas');
  await expect(canvas).toHaveAttribute('data-renderer', 'webgl', { timeout: 20000 });
  return canvas;
}
// Labels move to avoid collisions; canvas gestures must start on exposed canvas.
async function exposedCanvasPoint(canvas: Locator, travel = 0) {
  return canvas.evaluate((element, travel) => {
    const b = element.getBoundingClientRect();
    for (const fy of [0.6, 0.75, 0.85, 0.4, 0.25]) {
      for (const fx of [0.08, 0.25, 0.45, 0.6]) {
        const x = b.left + b.width * fx, y = b.top + b.height * fy;
        if (x + travel >= b.right - 5) continue;
        if ([0, travel / 2, travel].every(dx => document.elementFromPoint(x + dx, y) === element))
          return { x, y };
      }
    }
    throw new Error('No exposed canvas area for gesture test');
  }, travel);
}
test('真正WebGL診所可旋轉縮放、俯視與重設，影像會隨鏡頭改變', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const canvas = await start3d(page);
  expect(
    await canvas.evaluate((c: HTMLCanvasElement) =>
      c.getContext('webgl2')?.getParameter(c.getContext('webgl2')!.VERSION),
    ),
  ).toContain('WebGL 2');
  expect(Number(await canvas.getAttribute('data-draw-calls'))).toBeGreaterThan(10);
  await page.getByTestId('clinic-map').screenshot({
    path: `output/playwright/v5-default-${info.project.name}.png`,
    animations: 'disabled',
  });
  const first = await canvas.screenshot();
  const angle = await canvas.getAttribute('data-azimuth');
  await page.getByRole('button', { name: '向右旋轉', exact: true }).click();
  await expect(canvas).not.toHaveAttribute('data-azimuth', angle!);
  const rotated = await canvas.screenshot();
  expect(rotated.equals(first)).toBe(false);
  await page.getByRole('button', { name: '放大場景', exact: true }).click();
  await expect(page.getByLabel('場景縮放比例')).toHaveText('115%');
  await page.getByRole('button', { name: '俯視診所', exact: true }).click();
  await expect.poll(async () => Number(await canvas.getAttribute('data-polar'))).toBeLessThan(0.4);
  await page.getByTestId('clinic-map').screenshot({
    path: `output/playwright/v5-top-${info.project.name}.png`,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: '重設視角', exact: true }).click();
  await expect(page.getByLabel('場景縮放比例')).toHaveText('100%');
  expect(errors).toEqual([]);
});

test('滑鼠拖曳、滾輪與鍵盤控制可操作且縮放有界限', async ({ page }) => {
  const canvas = await start3d(page);
  await canvas.scrollIntoViewIfNeeded();
  const dragPoint = await exposedCanvasPoint(canvas, 120);
  const angle = await canvas.getAttribute('data-azimuth');
  await page.mouse.move(dragPoint.x, dragPoint.y);
  await page.mouse.down();
  await page.mouse.move(dragPoint.x + 120, dragPoint.y, { steps: 12 });
  await page.mouse.up();
  await expect(canvas).not.toHaveAttribute('data-azimuth', angle!);
  const wheelPoint = await exposedCanvasPoint(canvas);
  await page.mouse.move(wheelPoint.x, wheelPoint.y);
  await page.mouse.wheel(0, -300);
  await expect.poll(async () => Number(await canvas.getAttribute('data-zoom'))).toBeGreaterThan(1);
  await canvas.focus();
  await canvas.press('Home');
  await expect(page.getByLabel('場景縮放比例')).toHaveText('100%');
  await canvas.press('Alt+ArrowLeft');
  await expect(canvas).not.toHaveAttribute('data-azimuth', angle!);
  for (let i = 0; i < 10; i++)
    await page.getByRole('button', { name: '放大場景', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-zoom', '2.2500');
  for (let i = 0; i < 20; i++)
    await page.getByRole('button', { name: '縮小場景', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-zoom', '0.6500');
});

test('點擊3D櫃檯物件觸發真實拾取，人物與小地圖移動', async ({ page }, info) => {
  const canvas = await start3d(page);
  await canvas.scrollIntoViewIfNeeded();
  const bounds = (await canvas.boundingBox())!,
    point = JSON.parse((await canvas.getAttribute('data-pickreception'))!);
  const startX = await canvas.getAttribute('data-actor-x');
  await page.mouse.click(bounds.x + point.x, bounds.y + point.y);
  await expect(page.getByTestId('map-player')).toHaveClass(/walking/);
  await expect.poll(() => canvas.getAttribute('data-actor-x')).not.toBe(startX);
  const pose = await canvas.getAttribute('data-walk-pose');
  await expect.poll(() => canvas.getAttribute('data-walk-pose')).not.toBe(pose);
  await expect(page.getByRole('region', { name: '診所互動對話' })).toContainText('藥師');
  await page.getByTestId('clinic-map').screenshot({
    path: `output/playwright/v5-reception-${info.project.name}.png`,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: '小地圖：醫師診間', exact: true }).click();
  await page.getByRole('button', { name: '略過移動', exact: true }).click();
  await page.getByRole('button', { name: '進入診間', exact: true }).click();
  await expect(page.getByText('「你好，今天想介紹什麼產品？」')).toBeVisible();
  await expect(page.getByTestId('clinic-3d-canvas')).toHaveCount(1);
  await expect(page.getByTestId('doctor-scene-speech')).toBeVisible();
});

test('WebGL無法使用時自動切換簡易場景，仍能拜訪醫師', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type === 'webgl2' || type === 'webgl' || type === 'experimental-webgl') return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.route('https://docs.google.com/spreadsheets/**', (route) => route.abort());
  await page.goto('/');
  await page.getByRole('button', { name: '開始遊戲', exact: true }).click();
  await page.getByRole('button', { name: '開始拜訪', exact: true }).click();
  await expect(page.getByTestId('3d-fallback')).toBeVisible();
  await page.getByRole('button', { name: '前往醫師診間', exact: true }).click();
  await page.getByRole('button', { name: '略過移動', exact: true }).click();
  await page.getByRole('button', { name: '進入診間', exact: true }).click();
  await expect(page.getByRole('button', { name: '繼續對話', exact: true })).toBeVisible();
});

test('顯示內容遺失可回復為簡易模式，反覆離開場景不殘留畫布', async ({ page }) => {
  const canvas = await start3d(page);
  await canvas.evaluate((element: HTMLCanvasElement) =>
    element.getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext(),
  );
  await expect(page.getByTestId('3d-fallback')).toBeVisible();
  await page.getByRole('button', { name: '更換產品', exact: true }).click();
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: '開始拜訪', exact: true }).click();
    await expect(page.getByTestId('clinic-3d-canvas')).toHaveAttribute('data-renderer', 'webgl', {
      timeout: 15000,
    });
    await expect(page.locator('canvas')).toHaveCount(1);
    await page.getByRole('button', { name: '更換產品', exact: true }).click();
    await expect(page.locator('canvas')).toHaveCount(0);
  }
});

test('手機雙指縮放可用，改變尺寸後仍能操作', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', '此案例驗證觸控裝置');
  const canvas = await start3d(page);
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  const session = await page.context().newCDPSession(page);
  const centerX = box.x + box.width * 0.5,
    y = box.y + box.height * 0.82;
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: centerX - 25, y, id: 0 },
      { x: centerX + 25, y, id: 1 },
    ],
  });
  for (let gap = 30; gap <= 65; gap += 5)
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: centerX - gap, y, id: 0 },
        { x: centerX + gap, y, id: 1 },
      ],
    });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await session.detach();
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-zoom')))
    .toBeGreaterThan(1.1);
  await page.setViewportSize({ width: 320, height: 850 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: '重設視角', exact: true }).click();
  await page.getByRole('button', { name: '小地圖：醫師診間', exact: true }).click();
  await page.getByRole('button', { name: '略過移動', exact: true }).click();
  await expect(page.getByRole('button', { name: '進入診間', exact: true })).toBeVisible();
});
