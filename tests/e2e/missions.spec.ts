import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { parseQuizCsv } from '../../src/data/csvLoader';
import { MISSION_STORAGE_KEY } from '../../src/engine/missionProgress';
const official = await readFile(new URL('../../output/official-quiz.csv', import.meta.url), 'utf8');
const officialBank = parseQuizCsv(official);
async function mock(page: Page, body = official) {
  await page.route('https://docs.google.com/spreadsheets/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/csv', body }),
  );
}
async function products(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: '開始遊戲', exact: true }).click();
  await expect(page.getByTestId('quiz-source-status')).toContainText('已連線正式題庫');
}
async function go(page: Page, destination: string) {
  await page.getByRole('button', { name: `小地圖：${destination}`, exact: true }).click();
  await page.getByRole('button', { name: '略過移動', exact: true }).click();
  await expect(page.getByTestId('map-player')).not.toHaveClass(/walking/);
}
async function quiz(page: Page, doctor: string, required?: string) {
  if (required) await go(page, required);
  await go(page, '醫師診間');
  await page.getByRole('button', { name: '進入診間', exact: true }).click();
  await expect(page.locator('.active-visit-profile b')).toContainText(doctor);
  await page.getByRole('button', { name: '繼續對話', exact: true }).click();
  await page.getByRole('button', { name: '繼續對話', exact: true }).click();
  await page.getByRole('button', { name: '接受醫師挑戰', exact: true }).click();
  await expect(page.locator('.doctor-name')).toContainText(doctor);
}
async function answer(page: Page, bank = officialBank, wrongFirst = false) {
  const product = bank.products[0];
  const seen = new Set();
  for (let i = 0; i < 5; i++) {
    const prompt = await page.getByTestId('question-prompt').innerText();
    expect(seen.has(prompt)).toBe(false);
    seen.add(prompt);
    const q = bank.questions.find((q) => q.productId === product.id && q.prompt === prompt)!;
    expect(q).toBeTruthy();
    await page
      .getByRole('group', { name: '答案選項' })
      .getByRole('button')
      .nth(wrongFirst && i === 0 ? (q.correctIndex + 1) % 4 : q.correctIndex)
      .click();
    await page.getByRole('button', { name: '確認送出', exact: true }).click();
    await page
      .getByRole('button', { name: i === 4 ? '查看挑戰結果' : '下一題', exact: true })
      .click();
  }
  await expect(page.locator('.result-stats .score')).toHaveText(wrongFirst ? '80 分' : '100 分');
  await expect(page.locator('.result-stats')).toContainText(product.name);
}

test('三間診所的3D招牌主題與醫師身分獨立，必要準備不可略過且保留自由行走', async ({
  page,
}, info) => {
  test.setTimeout(90000);
  await mock(page);
  await products(page);
  await expect(page.getByTestId('mission-progress-count')).toContainText('0 / 3');
  await expect(page.getByRole('group', { name: '診所任務' }).getByRole('button')).toHaveCount(3);
  await page.screenshot({
    path: `output/playwright/v5-mission-board-${info.project.name}.png`,
    fullPage: true,
  });
  await page
    .locator('.mission-selector')
    .screenshot({ path: `output/playwright/v5-missions-${info.project.name}.png` });
  const images: Buffer[] = [];
  for (const mission of [
    { id: 'cheng-xin', clinic: '生達診所', doctor: '陳醫師' },
    { id: 'qing-chuan', clinic: '晴川診所', doctor: '林醫師', required: '藥局' },
    { id: 'xiang-yang', clinic: '向陽診所', doctor: '王醫師', required: '掛號櫃台' },
  ]) {
    await page
      .getByRole('button', { name: `選擇${mission.clinic}・${mission.doctor}`, exact: true })
      .click();
    await page.getByRole('button', { name: '開始拜訪', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: `歡迎來到，${mission.clinic}。`, exact: true }),
    ).toBeVisible();
    const canvas = page.getByTestId('clinic-3d-canvas');
    await expect(canvas).toHaveAttribute('data-renderer', 'webgl');
    await expect(canvas).toHaveAttribute('data-mission-id', mission.id);
    await expect(canvas).toHaveAttribute('data-doctor', mission.doctor);
    images.push(await canvas.screenshot());
    await page
      .getByTestId('clinic-map')
      .screenshot({ path: `output/playwright/v5-${mission.id}-${info.project.name}.png` });
    const before = await canvas.getAttribute('data-actor-x');
    await canvas.focus();
    await page.keyboard.down('ArrowLeft');
    await expect.poll(() => canvas.getAttribute('data-actor-x')).not.toBe(before);
    await page.keyboard.up('ArrowLeft');
    await go(page, '醫師診間');
    if (mission.required) {
      await expect(page.getByTestId('proximity-action')).toContainText('請先完成');
      await expect(page.getByRole('button', { name: '與醫師互動', exact: true })).toBeDisabled();
      await expect(page.locator('.mission-panel h2')).toContainText('尚未完成');
      await page.getByRole('button', { name: '進入診間', exact: true }).click();
      await expect(page.getByRole('alert')).toContainText(mission.required);
      await expect(page.getByTestId('clinic-3d-canvas')).toHaveCount(1);
      await go(page, mission.required);
      await expect(page.getByRole('region', { name: '診所互動對話' })).toContainText(
        mission.doctor,
      );
      await go(page, '醫師診間');
      await expect(page.getByRole('button', { name: '與醫師互動', exact: true })).toBeEnabled();
    }
    await page.getByRole('button', { name: '進入診間', exact: true }).click();
    await expect(page.locator('.active-visit-profile')).toContainText(mission.clinic);
    await expect(page.locator('.active-visit-profile b')).toContainText(mission.doctor);
    await page.getByRole('button', { name: '更換產品', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  expect(images[0].equals(images[1])).toBe(false);
  expect(images[1].equals(images[2])).toBe(false);
});

test('同產品連訪三間、80分不完成、重試重設準備，100分完成並在重新整理後保留', async ({
  page,
}, info) => {
  test.setTimeout(150000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await mock(page);
  await products(page);
  await page.getByRole('button', { name: '開始拜訪', exact: true }).click();
  await quiz(page, '陳醫師');
  await answer(page);
  await expect(page.getByTestId('result-visit')).toContainText('1 / 3');
  await page.getByRole('button', { name: '下一間診所：晴川診所', exact: true }).click();
  await quiz(page, '林醫師', '藥局');
  await answer(page, officialBank, true);
  await expect(page.getByTestId('result-visit')).toContainText('1 / 3');
  await expect(page.getByRole('button', { name: /下一間診所/ })).toHaveCount(0);
  await page.getByRole('button', { name: '再次挑戰', exact: true }).click();
  await go(page, '醫師診間');
  await page.getByRole('button', { name: '進入診間', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('藥局');
  await quiz(page, '林醫師', '藥局');
  await answer(page);
  await expect(page.getByTestId('result-visit')).toContainText('2 / 3');
  await page.getByRole('button', { name: '下一間診所：向陽診所', exact: true }).click();
  await quiz(page, '王醫師', '掛號櫃台');
  await answer(page);
  await expect(page.getByTestId('result-visit')).toContainText('三間診所任務已完成');
  await expect(page.getByRole('button', { name: /下一間診所/ })).toHaveCount(0);
  await page.screenshot({
    path: `output/playwright/v5-all-missions-${info.project.name}.png`,
    fullPage: true,
  });
  await page.reload();
  await page.getByRole('button', { name: '開始遊戲', exact: true }).click();
  await expect(page.getByTestId('mission-progress-count')).toContainText('3 / 3');
  await expect(page.locator('.mission-done')).toHaveCount(3);
  const stored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    MISSION_STORAGE_KEY,
  );
  expect(stored.completed).toHaveLength(3);
  expect(Object.keys(stored.completed[0]).sort()).toEqual([
    'completedAt',
    'missionId',
    'productKey',
    'productName',
  ]);
  expect(errors).toEqual([]);
});

function fixture(name: string, updated = false) {
  return (
    '產品,題目,選項A,選項B,選項C,選項D,正確答案\n' +
    Array.from({ length: 5 }, (_, i) =>
      [
        name,
        `${name}題目${i}${updated && i === 0 ? '更新' : ''}`,
        '甲',
        '乙',
        '丙',
        '丁',
        'A',
      ].join(','),
    ).join('\n')
  );
}
test('完成標記不混用產品，題庫內容更新後重算，恢復相同題庫可讀取原進度', async ({ page }) => {
  test.setTimeout(90000);
  let body = fixture('任務測試產品');
  await page.route('https://docs.google.com/spreadsheets/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/csv', body }),
  );
  await products(page);
  await page.getByRole('button', { name: '開始拜訪', exact: true }).click();
  await quiz(page, '陳醫師');
  await answer(page, parseQuizCsv(body));
  await page.getByRole('main').getByRole('button', { name: '更換產品', exact: true }).click();
  await expect(page.getByTestId('mission-progress-count')).toContainText('1 / 3');
  await page
    .getByRole('group', { name: '產品清單' })
    .getByRole('button')
    .filter({ has: page.getByRole('heading', { name: '澄心示範錠', exact: true }) })
    .click();
  await expect(page.getByTestId('mission-progress-count')).toContainText('0 / 3');
  body = fixture('任務測試產品', true);
  await page.reload();
  await page.getByRole('button', { name: '開始遊戲', exact: true }).click();
  await expect(page.getByTestId('quiz-source-status')).toContainText('已連線正式題庫');
  await expect(page.getByTestId('mission-progress-count')).toContainText('0 / 3');
  body = fixture('任務測試產品');
  await page.reload();
  await page.getByRole('button', { name: '開始遊戲', exact: true }).click();
  await expect(page.getByTestId('quiz-source-status')).toContainText('已連線正式題庫');
  await expect(page.getByTestId('mission-progress-count')).toContainText('1 / 3');
});

test('本機紀錄損壞或不可寫、WebGL無法使用時，仍保留醫師身分與必要任務', async ({ page }) => {
  test.setTimeout(90000);
  await page.addInitScript(
    ({ key }) => {
      localStorage.setItem(key, 'broken-json');
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, value) {
        if (k === key) throw new DOMException('blocked', 'QuotaExceededError');
        return set.call(this, k, value);
      };
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        type: string,
        ...args: unknown[]
      ) {
        if (['webgl', 'webgl2', 'experimental-webgl'].includes(type)) return null;
        return Reflect.apply(original, this, [type, ...args]);
      } as typeof original;
    },
    { key: MISSION_STORAGE_KEY },
  );
  await mock(page);
  await products(page);
  await expect(page.getByText('此瀏覽器無法儲存任務進度', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: '選擇向陽診所・王醫師', exact: true }).click();
  await page.getByRole('button', { name: '開始拜訪', exact: true }).click();
  await expect(page.getByTestId('3d-fallback')).toBeVisible();
  await expect(page.locator('.explorer-location')).toContainText('向陽診所');
  await go(page, '醫師診間');
  await page.getByRole('button', { name: '進入診間', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('掛號櫃台');
  await quiz(page, '王醫師', '掛號櫃台');
  await answer(page);
  await expect(page.getByTestId('result-visit')).toContainText('1 / 3');
  await expect(page.getByTestId('result-visit')).toContainText('無法寫入');
});
