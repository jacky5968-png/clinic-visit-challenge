import { test, expect } from '@playwright/test';
import fs from 'node:fs';

test('building inspection returns to the seven-island panorama without changing the selected stage', async ({ page }) => {
  await page.route('https://docs.google.com/spreadsheets/**', route => route.fulfill({ status: 200, contentType: 'text/csv', body: fs.readFileSync('tests/fixtures/seven-stage-source.csv', 'utf8') }));
  await page.goto('/');
  await page.getByRole('button', { name: '開始遊戲', exact: true }).click();
  const map = page.getByTestId('island-map-canvas');
  await expect(map).toHaveAttribute('data-renderer', 'webgl');
  await page.getByRole('button', { name: '島嶼全景', exact: true }).click();
  const selected = await map.getAttribute('data-selected'), homeZoom = await map.getAttribute('data-zoom');
  await page.getByRole('button', { name: '島嶼向左旋轉', exact: true }).click();
  await page.getByRole('button', { name: '放大查看生達製劑大樓', exact: true }).click();
  const dialog = page.getByTestId('formulation-viewer-dialog'), model = page.getByTestId('formulation-viewer-canvas');
  await expect(dialog).toBeVisible(); await expect(model).toHaveAttribute('data-renderer', 'webgl');
  await page.getByRole('button', { name: '關閉大樓放大檢視', exact: true }).press('Shift+Tab');
  await expect(page.getByRole('button', { name: '回到八島全景', exact: true })).toBeFocused();
  await page.getByRole('button', { name: '回到八島全景', exact: true }).press('Tab');
  await expect(page.getByRole('button', { name: '關閉大樓放大檢視', exact: true })).toBeFocused();
  await page.getByRole('button', { name: '放大大樓', exact: true }).click();
  await expect(model).toHaveAttribute('data-zoom', '1.200');
  const initialAngle = await model.getAttribute('data-azimuth');
  await page.getByRole('button', { name: '大樓向左旋轉', exact: true }).click();
  await expect(model).not.toHaveAttribute('data-azimuth', initialAngle!);
  await dialog.press('Escape'); await expect(dialog).toHaveCount(0); await expect(model).toHaveCount(0);
  await expect(map).toHaveAttribute('data-selected', selected!);
  await expect(map).toHaveAttribute('data-zoom', homeZoom!); await expect(map).toHaveAttribute('data-azimuth', '0.000');
  await expect(page.locator('.map-view .island-stage-button')).toHaveCount(7);
  await expect(page.getByRole('button', { name: '放大查看生達製劑大樓', exact: true })).toBeFocused();
  // The actual geometry is clickable too, independently of its accessible name button.
  const area = JSON.parse((await map.getAttribute('data-landmark-area'))!);
  await map.click({ position: { x: area.x + area.width / 2, y: area.y + area.height * .55 } });
  await expect(dialog).toBeVisible();
  await page.getByRole('button', { name: '回到八島全景', exact: true }).click();
  await expect(dialog).toHaveCount(0); await expect(map).toHaveAttribute('data-selected', selected!);
});
