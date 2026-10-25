import { test, expect, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://docs.google.com/spreadsheets/**', (route) => route.abort());
  await page.goto('/');
  await page.getByRole('button', { name: '開始遊戲', exact: true }).click();
  await page.getByRole('button', { name: '開始拜訪', exact: true }).click();
});
async function skipTo(page: Page, name: string) {
  await page.getByRole('button', { name, exact: true }).click();
  await page.getByRole('button', { name: '略過移動', exact: true }).click();
  await expect(page.getByTestId('map-player')).not.toHaveClass(/walking/);
}
test('櫃檯、掛號櫃台、入口與診間可連續探索，任務提示與小地圖同步', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await expect(page.getByRole('complementary', { name: '診所小地圖' })).toBeVisible();
  await page.getByRole('button', { name: '前往藥局', exact: true }).click();
  await expect(page.getByTestId('map-player')).toHaveClass(/walking/);
  await expect(page.getByTestId('clinic-3d-canvas')).toHaveAttribute('data-renderer', 'webgl');
  await expect(page.locator('.explorer-task')).toContainText('正在前往藥局');
  await expect(page.getByRole('button', { name: '前往醫師診間', exact: true })).toBeDisabled();
  const firstPose = await page.getByTestId('clinic-3d-canvas').getAttribute('data-walk-pose');
  await expect
    .poll(() => page.getByTestId('clinic-3d-canvas').getAttribute('data-walk-pose'))
    .not.toBe(firstPose);
  await page.getByTestId('clinic-map').screenshot({
    path: `output/playwright/v5-walking-${info.project.name}.png`,
    animations: 'allow',
  });
  await expect
    .poll(() => page.getByTestId('minimap-player').evaluate((el) => getComputedStyle(el).cx))
    .not.toBe('270px');
  await expect(page.getByRole('region', { name: '診所互動對話' })).toContainText('藥師');
  await expect(page.getByRole('button', { name: '小地圖：藥局', exact: true })).toHaveAttribute(
    'aria-current',
    'location',
  );
  await expect(page.getByTestId('minimap-player')).toHaveAttribute('cx', '390');
  await page.screenshot({
    path: `output/playwright/v5-reception-${info.project.name}.png`,
    fullPage: true,
    animations: 'disabled',
  });
  await skipTo(page, '小地圖：掛號櫃台');
  await expect(page.getByRole('region', { name: '診所互動對話' })).toContainText(
    '您好，拜訪報到已完成',
  );
  await expect(page.getByTestId('minimap-player')).toHaveAttribute('cx', '520');
  await page.getByRole('button', { name: '關閉診所互動對話' }).click();
  await expect(page.getByRole('region', { name: '診所互動對話' })).toHaveCount(0);
  await page.getByRole('button', { name: '查看掛號櫃台', exact: true }).click();
  await expect(page.getByRole('region', { name: '診所互動對話' })).toBeVisible();
  await skipTo(page, '前往診所入口');
  await expect(page.getByRole('region', { name: '診所互動對話' })).toContainText('拜訪準備');
  await skipTo(page, '前往醫師診間');
  await expect(page.locator('.explorer-task')).toContainText('已抵達醫師診間');
  await page.screenshot({
    path: `output/playwright/v5-doctor-arrival-${info.project.name}.png`,
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: '進入診間', exact: true }).click();
  await expect(page.getByText('「你好，今天想介紹什麼產品？」')).toBeVisible();
  expect(errors).toEqual([]);
});
test('移動中切換320px與768px尺寸，抵達座標與場景維持一致', async ({ page }) => {
  await page.getByRole('button', { name: '前往藥局', exact: true }).click();
  await page.setViewportSize({ width: 320, height: 850 });
  await expect(page.getByRole('button', { name: '查看藥局', exact: true })).toBeVisible();
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const positions = await page.getByTestId('clinic-3d-canvas').evaluate((el) => {
      const stage = el.getBoundingClientRect();
      const actor = document.querySelector('[data-testid="map-player"]')!.getBoundingClientRect();
      return {
        x: actor.left + actor.width / 2 - stage.left,
        y: actor.bottom - stage.top,
        width: stage.width,
        height: stage.height,
        worldX: Number((el as HTMLElement).dataset.actorX),
        worldZ: Number((el as HTMLElement).dataset.actorZ),
      };
    });
    expect(positions.x).toBeGreaterThan(0);
    expect(positions.x).toBeLessThan(positions.width);
    expect(positions.y).toBeGreaterThan(0);
    expect(positions.y).toBeLessThan(positions.height);
    expect(positions.worldX).toBeCloseTo(-2.5031, 2);
    expect(positions.worldZ).toBeCloseTo(0.73075, 2);
  }
});
test('減少動態效果與鍵盤操作仍可完成選擇性互動，重玩重設探索狀態', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: '小地圖：藥局', exact: true }).press('Enter');
  await expect(page.getByRole('button', { name: '查看藥局', exact: true })).toBeVisible();
  await expect(page.getByTestId('clinic-3d-canvas')).toHaveAttribute('data-walk-pose', '0.0000');
  await page.getByRole('button', { name: '更換產品', exact: true }).click();
  await page.getByRole('button', { name: '開始拜訪', exact: true }).click();
  await expect(page.getByTestId('map-player')).toHaveClass(/start/);
  await expect(
    page.getByRole('button', { name: '小地圖：藥局', exact: true }),
  ).not.toHaveAttribute('aria-current', 'location');
  await page.getByRole('button', { name: '前往醫師診間', exact: true }).click();
  await expect(page.getByRole('button', { name: '進入診間', exact: true })).toBeVisible();
});
