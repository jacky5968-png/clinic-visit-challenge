import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import photos from '../../src/data/productPhotos.json' with { type: 'json' };
const csv = await readFile(new URL('../../output/official-quiz.csv', import.meta.url), 'utf8');
test.beforeEach(async ({ page }) => {
  await page.route('https://docs.google.com/spreadsheets/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/csv', body: csv }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: '開始遊戲', exact: true }).click();
  await expect(page.getByTestId('quiz-source-status')).toContainText('已連線正式題庫');
});
async function selectProduct(page: Page, name: string) {
  await page.getByRole('textbox', { name: '搜尋產品' }).fill(name);
  await page
    .getByRole('group', { name: '產品清單' })
    .getByRole('button')
    .filter({ has: page.getByRole('heading', { name, exact: true }) })
    .click();
  await expect(page.locator('.product-detail h2')).toHaveText(name);
}
async function expectLoaded(page: Page, count: number) {
  await expect(page.locator('.product-photos img')).toHaveCount(count);
  for (const img of await page.locator('.product-photos img').all())
    await expect
      .poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0))
      .toBe(true);
}
test('本機產品照片顯示於選品、診所任務與醫師對話', async ({ page }, info) => {
  await selectProduct(page, 'Bistin');
  await expectLoaded(page, 1);
  await expect(page.locator('.product-photos img')).toHaveAttribute(
    'src',
    '/assets/products/local/bistin.jpg',
  );
  await expect(page.getByText('本機產品照片 · 規格以照片標示為準', { exact: true })).toBeVisible();
  await expect(page.locator('.product-photos figcaption')).toHaveText('包裝標示：20mg');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `output/playwright/product-photo-${info.project.name}.png`,
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: '開始拜訪', exact: true }).click();
  await expect(page.locator('.mission-product img')).toHaveAttribute(
    'src',
    '/assets/products/local/bistin.jpg',
  );
  await page.getByRole('button', { name: '前往醫師診間', exact: true }).click();
  await page.getByRole('button', { name: '略過移動' }).click();
  await page.getByRole('button', { name: '進入診間', exact: true }).click();
  await expect(page.locator('.mission-product img')).toHaveAttribute(
    'src',
    '/assets/products/local/bistin.jpg',
  );
  await page.screenshot({
    path: `output/playwright/product-photo-dialogue-${info.project.name}.png`,
    fullPage: true,
    animations: 'disabled',
  });
});
test('同產品兩種規格與不同劑型分別使用正確照片', async ({ page }, info) => {
  await selectProduct(page, 'Pitastatin');
  await expectLoaded(page, 2);
  await expect(page.locator('.product-photos figcaption').nth(0)).toHaveText(
    '包裝實際標示：2mg（依包裝核對）',
  );
  await expect(page.locator('.product-photos figcaption').nth(1)).toHaveText(
    '包裝實際標示：4mg（依包裝核對）',
  );
  await page.screenshot({
    path: `output/playwright/product-photo-strengths-${info.project.name}.png`,
    fullPage: true,
    animations: 'disabled',
  });
  await selectProduct(page, 'Eufan Sol.');
  await expectLoaded(page, 1);
  await expect(page.locator('.product-photos img')).toHaveAttribute('src', /eufan-solution/);
  await selectProduct(page, 'Eufan Tab.');
  await expect(page.locator('.product-photos img')).toHaveAttribute(
    'src',
    '/assets/products/local/eufan-tablet.png',
  );
  await selectProduct(page, 'Tamlosin D');
  await expect(page.locator('.product-photos img')).toHaveAttribute(
    'src',
    '/assets/products/local/tamlosin-d.png',
  );
});
test('圖片載入失敗有替代畫面，切換產品後可正常顯示', async ({ page }) => {
  await page.route('**/assets/products/local/bistin.jpg', (route) => route.abort());
  await selectProduct(page, 'Bistin');
  await expect(
    page.getByRole('img', { name: 'Bistin產品圖片，包裝標示：20mg（替代畫面）' }),
  ).toBeVisible();
  await selectProduct(page, 'Vidatin');
  await expectLoaded(page, 1);
  await expect(page.locator('.product-photos img')).toHaveAttribute(
    'src',
    '/assets/products/local/vidatin.jpg',
  );
  await selectProduct(page, 'Vildamet');
  await expectLoaded(page, 1);
  await expect(page.locator('.product-photos img')).toHaveAttribute(
    'src',
    '/assets/products/local/vildamet.jpg',
  );
});
test('52張照片均能由本機網址讀取且位元內容符合已核對原始複本', async ({ request }) => {
  const audit = JSON.parse(
    await readFile(new URL('../../output/product-photo-audit.json', import.meta.url), 'utf8'),
  );
  const allPhotos = Object.values(photos).flat();
  for (const photo of allPhotos) {
    const response = await request.get(photo.src);
    expect(response.ok()).toBe(true);
    const record = audit.records.find(
      (r: { target: string }) =>
        '/' + r.target.replaceAll('\\', '/').replace(/^public\//, '') === photo.src,
    );
    expect(
      createHash('sha256')
        .update(await response.body())
        .digest('hex'),
    ).toBe(record.sha256);
  }
  expect(allPhotos).toHaveLength(52);
});
