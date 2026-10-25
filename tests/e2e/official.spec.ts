import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { parseQuizCsv } from '../../src/data/csvLoader';

const source = await readFile(new URL('../../src/config/quiz.ts', import.meta.url), 'utf8');
const officialUrl = source.match(/https:\/\/[^']+/)![0];
async function enterChallenge(page: Page) {
  await page.getByRole('button', { name: '開始拜訪', exact: true }).click();
  await page.getByRole('button', { name: '前往醫師診間', exact: true }).click();
  await page.getByRole('button', { name: '略過移動' }).click();
  await page.getByRole('button', { name: '進入診間', exact: true }).click();
  await page.getByRole('button', { name: '繼續對話' }).click();
  await page.getByRole('button', { name: '繼續對話' }).click();
  await page.getByRole('button', { name: '接受醫師挑戰' }).click();
}
test('真實正式CSV自動載入、實際產品搜尋與五題100分通關', async ({ page }, info) => {
  test.setTimeout(90000);
  const responsePromise = page.waitForResponse(
    (r) => {
      let request = r.request();
      while (request.redirectedFrom()) request = request.redirectedFrom()!;
      return request.url() === officialUrl && r.status() === 200;
    },
    { timeout: 30000 },
  );
  await page.goto('/');
  const response = await responsePromise;
  const data = parseQuizCsv(await response.text());
  expect(data.products.length).toBeGreaterThan(1);
  expect(data.warnings).toHaveLength(0);
  await page.getByRole('button', { name: '開始遊戲', exact: true }).click();
  await expect(page.getByTestId('quiz-source-status')).toContainText(
    `已連線正式題庫 · ${data.products.length}項產品 · ${data.questions.length}題`,
  );
  const product = data.products.find(
    (p) => data.questions.filter((q) => q.productId === p.id).length >= 5,
  )!;
  await page.getByRole('textbox', { name: '搜尋產品' }).fill(product.name);
  await page
    .getByRole('group', { name: '產品清單' })
    .getByRole('button')
    .filter({ has: page.getByRole('heading', { name: product.name, exact: true }) })
    .click();
  await expect(page.locator('.product-detail h2')).toHaveText(product.name);
  await expect(page.getByText('題庫未提供產品照片', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `output/playwright/official-products-${info.project.name}.png`,
    fullPage: true,
    animations: 'disabled',
  });
  await enterChallenge(page);
  const seen = new Set();
  for (let i = 0; i < 5; i++) {
    const prompt = await page.getByTestId('question-prompt').innerText();
    expect(seen.has(prompt)).toBe(false);
    seen.add(prompt);
    const q = data.questions.find((q) => q.productId === product.id && q.prompt === prompt)!;
    expect(q).toBeTruthy();
    await expect(page.getByRole('group', { name: '答案選項' }).getByRole('button')).toHaveCount(4);
    for (let j = 0; j < 4; j++)
      await expect(
        page.getByRole('group', { name: '答案選項' }).getByRole('button').nth(j),
      ).toContainText(q.options[j]);
    await page
      .getByRole('group', { name: '答案選項' })
      .getByRole('button')
      .nth(q.correctIndex)
      .click();
    await page.getByRole('button', { name: '確認送出', exact: true }).click();
    await expect(page.locator('.explanation')).toHaveCount(0);
    await page
      .getByRole('button', { name: i === 4 ? '查看挑戰結果' : '下一題', exact: true })
      .click();
  }
  await expect(page.getByRole('heading', { name: '外勤養成V5｜挑戰成功！' })).toBeVisible();
  await expect(page.locator('.result-stats')).toContainText(product.name);
  await expect(page.locator('.result-stats .score')).toHaveText('100 分');
  await page.screenshot({
    path: `output/playwright/official-success-${info.project.name}.png`,
    fullPage: true,
    animations: 'disabled',
  });
});

test('正式CSV連線失敗可重試，並可改用手動匯入', async ({ page }) => {
  await page.route(officialUrl, (route) => route.abort());
  await page.goto('/');
  await page.getByRole('button', { name: '開始遊戲', exact: true }).click();
  await expect(page.getByTestId('quiz-source-status')).toContainText('連線失敗');
  const csv = await readFile(new URL('../../public/sample-quiz.csv', import.meta.url), 'utf8');
  await page.unroute(officialUrl);
  await page.route(officialUrl, (route) =>
    route.fulfill({ status: 200, contentType: 'text/csv', body: csv }),
  );
  await page.getByRole('button', { name: '重試連線', exact: true }).click();
  await expect(page.getByTestId('quiz-source-status')).toContainText(
    '已連線正式題庫 · 1項產品 · 5題',
  );
  await page.getByText('接入產品 CSV 題庫', { exact: true }).click();
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'manual.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await expect(page.getByTestId('quiz-source-status')).toContainText('手動匯入');
});

test('正式題庫載入中，手動匯入優先且不被遲到回應覆蓋', async ({ page }) => {
  const csv = await readFile(new URL('../../public/sample-quiz.csv', import.meta.url), 'utf8');
  let release!: () => void;
  let handled!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const finished = new Promise<void>((resolve) => {
    handled = resolve;
  });
  await page.route(officialUrl, async (route) => {
    await gate;
    await route
      .fulfill({
        status: 200,
        contentType: 'text/csv',
        body: csv.replaceAll('CSV示範產品', '遲到正式產品'),
      })
      .catch(() => {});
    handled();
  });
  await page.goto('/');
  await page.getByRole('button', { name: '開始遊戲', exact: true }).click();
  await expect(page.getByTestId('quiz-source-status')).toContainText('正在讀取');
  await page.getByText('接入產品 CSV 題庫', { exact: true }).click();
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'manual.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  release();
  await finished;
  await expect(page.getByTestId('quiz-source-status')).toContainText('手動匯入');
  await expect(page.locator('.product-detail h2')).toHaveText('CSV示範產品');
  await expect(page.getByRole('heading', { name: '遲到正式產品' })).toHaveCount(0);
});
