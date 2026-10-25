import { test, expect, type Page } from '@playwright/test';
import questions from '../../src/data/questions.json' with { type: 'json' };
test.beforeEach(async ({ page }) => {
  // 既有示範流程固定隔離正式網路；真實連線由official.spec.ts另行驗證。
  await page.route('https://docs.google.com/spreadsheets/**', (route) => route.abort());
});
async function startVisit(page: Page) {
  await page.getByRole('button', { name: '開始遊戲', exact: true }).click();
  await expect(page.getByRole('heading', { name: '今天，想介紹哪項產品？' })).toBeVisible();
  await page.getByRole('button', { name: '開始拜訪', exact: true }).click();
  await expect(page.getByText('前往醫師診間，', { exact: false }).first()).toBeVisible();
}
async function enterRoom(page: Page, skip = false) {
  await page.getByRole('button', { name: '前往醫師診間', exact: true }).click();
  if (skip) await page.getByRole('button', { name: '略過移動' }).click();
  await page.getByRole('button', { name: '進入診間', exact: true }).waitFor();
  await page.getByRole('button', { name: '進入診間', exact: true }).click();
  await expect(page.getByText('「你好，今天想介紹什麼產品？」')).toBeVisible();
  await page.getByRole('button', { name: '繼續對話' }).click();
  await expect(page.getByText('「醫師您好，今天想向您介紹這項產品。」')).toBeVisible();
  await page.getByRole('button', { name: '繼續對話' }).click();
  await page.getByRole('button', { name: '接受醫師挑戰' }).click();
}
async function answerAll(page: Page, wrongFirst = false) {
  const seen = new Set<string>();
  for (let i = 0; i < 5; i++) {
    const prompt = await page.getByTestId('question-prompt').innerText();
    expect(seen.has(prompt)).toBe(false);
    seen.add(prompt);
    const q = questions.find((q) => q.prompt === prompt)!;
    const selected = wrongFirst && i === 0 ? (q.correctIndex + 1) % 4 : q.correctIndex;
    const submit = page.getByRole('button', { name: '確認送出', exact: true });
    await expect(submit).toBeDisabled();
    await page
      .getByRole('button', {
        name: new RegExp(
          `^${String.fromCharCode(65 + selected)}.*${q.options[selected].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
        ),
      })
      .click();
    await submit.click();
    await expect(
      page.getByRole('group', { name: '答案選項' }).getByRole('button').first(),
    ).toBeDisabled();
    await expect(
      page.getByText(
        `正確答案：${String.fromCharCode(65 + q.correctIndex)}．${q.options[q.correctIndex]}`,
        { exact: true },
      ),
    ).toBeVisible();
    await page
      .getByRole('button', { name: i === 4 ? '查看挑戰結果' : '下一題', exact: true })
      .click();
  }
  expect(seen.size).toBe(5);
}
test('首頁、說明、音效切換與版面', async ({ page }, info) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/外勤養成V5/);
  await expect(page.getByRole('heading', { name: /讓專業/ })).toBeVisible();
  await page.getByRole('button', { name: '音效關閉', exact: true }).click();
  await expect(page.getByRole('button', { name: '音效開啟', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: '音效開啟', exact: true }).click();
  await page.getByRole('button', { name: '遊戲說明', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({
    path: `output/playwright/home-${info.project.name}.png`,
    fullPage: true,
    animations: 'disabled',
  });
});
test('走路、醫師對話、5題全對100分通關、重玩與返回', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await startVisit(page);
  await page.screenshot({
    path: `output/playwright/clinic-${info.project.name}.png`,
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: '前往醫師診間', exact: true }).click();
  await expect(page.getByTestId('map-player')).toHaveClass(/walking/);
  await expect(page.getByTestId('clinic-3d-canvas')).toHaveAttribute('data-renderer', 'webgl');
  await page.getByRole('button', { name: '進入診間', exact: true }).waitFor();
  await page.getByRole('button', { name: '進入診間', exact: true }).click();
  await page.getByRole('button', { name: '繼續對話' }).click();
  await page.getByRole('button', { name: '繼續對話' }).click();
  await page.screenshot({
    path: `output/playwright/consultation-${info.project.name}.png`,
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: '接受醫師挑戰' }).click();
  await page.screenshot({
    path: `output/playwright/quiz-${info.project.name}.png`,
    fullPage: true,
    animations: 'disabled',
  });
  await answerAll(page);
  await expect(page.getByRole('heading', { name: '外勤養成V5｜挑戰成功！' })).toBeVisible();
  await expect(page.locator('.result-stats .score')).toHaveText('100 分');
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({
    path: `output/playwright/success-${info.project.name}.png`,
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: '再次挑戰', exact: true }).click();
  await expect(page.getByTestId('map-player')).toHaveClass(/start/);
  await page.getByRole('button', { name: '更換產品', exact: true }).click();
  await expect(page.getByRole('heading', { name: '今天，想介紹哪項產品？' })).toBeVisible();
  await page.getByRole('button', { name: '返回首頁', exact: true }).click();
  await expect(page.getByRole('button', { name: '開始遊戲', exact: true })).toBeVisible();
});
test('答錯1題得80分、未通關、保留錯題及正解', async ({ page }, info) => {
  await page.goto('/');
  await startVisit(page);
  await enterRoom(page, true);
  await answerAll(page, true);
  await expect(page.getByRole('heading', { name: '挑戰尚未成功，請再接再厲！' })).toBeVisible();
  await expect(page.locator('.result-stats .score')).toHaveText('80 分');
  await expect(page.locator('.review-panel article')).toHaveCount(1);
  await expect(page.locator('.right-answer')).toBeVisible();
  await page.screenshot({
    path: `output/playwright/failure-${info.project.name}.png`,
    fullPage: true,
    animations: 'disabled',
  });
});
test('CSV匯入、搜尋、少於5題攔截與圖片替代', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '開始遊戲', exact: true }).click();
  await page.getByText('接入產品 CSV 題庫', { exact: true }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'fixture.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      'product,question,optionA,optionB,optionC,optionD,answer,image\n不足題產品,題目一,甲,乙,丙,丁,A,/assets/products/missing.png',
      'utf8',
    ),
  });
  await expect(page.getByText('已匯入 1 項產品、1 題。')).toBeVisible();
  await expect(page.getByRole('button', { name: '開始拜訪', exact: true })).toBeDisabled();
  await expect(page.getByRole('alert')).toContainText('只有 1 題');
  await expect(page.getByRole('img', { name: '不足題產品產品圖片（替代畫面）' })).toBeVisible();
  await page.getByRole('textbox', { name: '搜尋產品' }).fill('不存在');
  await expect(page.getByText('找不到符合的產品，請嘗試其他關鍵字。')).toBeVisible();
});
test('減少動態效果仍可完成移動', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await startVisit(page);
  await page.getByRole('button', { name: '前往醫師診間', exact: true }).click();
  await expect(page.getByRole('button', { name: '進入診間', exact: true })).toBeVisible();
});

test('公開CSV網址可接入原題庫欄名，保留每題20分', async ({ page }) => {
  const rows = questions.map((q) =>
    [
      '相容格式產品',
      '示範分類',
      '單選',
      3,
      q.prompt,
      ...q.options,
      String.fromCharCode(65 + q.correctIndex),
    ].join(','),
  );
  const csv = '產品,藥理分類,類型,分數,題目,選項A,選項B,選項C,選項D,正確答案\n' + rows.join('\n');
  await page.route('**/test-bank.csv', (route) =>
    route.fulfill({ status: 200, contentType: 'text/csv; charset=utf-8', body: csv }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: '開始遊戲', exact: true }).click();
  await page.getByText('接入產品 CSV 題庫', { exact: true }).click();
  await page
    .getByRole('textbox', { name: '公開 CSV 網址' })
    .fill(new URL('/test-bank.csv', page.url()).href);
  await page.getByRole('button', { name: '讀取網址', exact: true }).click();
  await expect(page.getByText('已匯入 1 項產品、5 題。')).toBeVisible();
  await page.getByRole('button', { name: '開始拜訪', exact: true }).click();
  await enterRoom(page, true);
  await answerAll(page);
  await expect(page.locator('.result-stats .score')).toHaveText('100 分');
});

test('320px與768px畫面保留可操作區域，切換不自動捲動', async ({ page }) => {
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('/');
    await startVisit(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await enterRoom(page, true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});
