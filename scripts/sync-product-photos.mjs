// Exact, reviewed mappings only. Copies originals without resizing/recompression.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import Papa from 'papaparse';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sources = JSON.parse(
  await fs.readFile(path.join(root, 'scripts/product-photo-sources.json'), 'utf8'),
);
const localRoot = path.resolve(root, sources.localRoot);
const assetRoot = path.join(root, 'public/assets/products/local');
const generated = {};
const records = [];
const sha = (buffer) => createHash('sha256').update(buffer).digest('hex');
const sourceRecords = new Map();
const verifiedDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());
const quizOption = process.argv.indexOf('--quiz');
if (quizOption >= 0 && !process.argv[quizOption + 1]) throw new Error('--quiz requires a CSV path');
let quizCsv;
if (quizOption >= 0) {
  quizCsv = await fs.readFile(path.resolve(root, process.argv[quizOption + 1]), 'utf8');
} else {
  const config = await fs.readFile(path.join(root, 'src/config/quiz.ts'), 'utf8');
  const url = config.match(/https:\/\/docs\.google\.com\/[^']+/)?.[0];
  if (!url) throw new Error('Official quiz URL not found');
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Quiz download failed: ${response.status}`);
  quizCsv = await response.text();
}
const rows = Papa.parse(quizCsv.replace(/^\uFEFF/, ''), { header: true, skipEmptyLines: 'greedy' }).data;
const names = [...new Set(rows.map((row) => row['產品']?.trim()).filter(Boolean))];
if (!names.length) throw new Error('Quiz contains no product names');
const unsupported = Object.keys(sources.products).filter((name) => !names.includes(name));
if (unsupported.length) throw new Error(`Mappings not in quiz: ${unsupported.join(',')}`);
// Read every reviewed source before writing any copies.
for (const photos of Object.values(sources.products)) {
  for (const photo of photos) {
    if (path.basename(photo.target) !== photo.target) throw new Error('Target must be a filename');
    const sourceRoot = photo.root ? sources.supplementRoots[photo.root] : localRoot;
    await fs.access(path.join(sourceRoot, photo.file));
  }
}
let updatedFiles = 0, addedFiles = 0;
const backupRoot = path.join(root, 'backups', `product-photos-${Date.now()}`);
await fs.mkdir(assetRoot, { recursive: true });
for (const [name, photos] of Object.entries(sources.products)) {
  generated[name] = [];
  for (const photo of photos) {
    if (path.basename(photo.target) !== photo.target) throw new Error('Target must be a filename');
    const sourceRoot = photo.root ? sources.supplementRoots[photo.root] : localRoot;
    const sourcePath = path.join(sourceRoot, photo.file);
    const targetPath = path.join(assetRoot, photo.target);
    const original = await fs.readFile(sourcePath);
    let current;
    try {
      current = await fs.readFile(targetPath);
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
    if (current && sha(current) !== sha(original)) {
      await fs.mkdir(backupRoot, { recursive: true });
      await fs.writeFile(path.join(backupRoot, photo.target), current, { flag: 'wx' });
      await fs.writeFile(targetPath, original);
      updatedFiles++;
    }
    if (!current) {
      await fs.writeFile(targetPath, original, { flag: 'wx' });
      addedFiles++;
    }
    if (sha(await fs.readFile(targetPath)) !== sha(original))
      throw new Error(`Copy failed: ${targetPath}`);
    sourceRecords.set(sourcePath, sha(original));
    generated[name].push({ src: `/assets/products/local/${photo.target}`, caption: photo.caption });
    records.push({
      product: name,
      source: sourcePath,
      target: path.relative(root, targetPath).split(path.sep).join('/'),
      caption: photo.caption,
      sha256: sha(original),
      note: photo.note || '',
    });
  }
}
const pending = names.filter((name) => !generated[name]);
const unused = (await fs.readdir(localRoot)).filter(
  (name) =>
    /\.(jpg|png)$/i.test(name) &&
    !Object.values(sources.products)
      .flat()
      .some((photo) => !photo.root && photo.file === name),
);
const report = {
  verifiedDate,
  sourcePolicy: '本機既有實拍照片，逐張核對包裝標示。原檔不改名、不覆寫，不使用生成圖卡。',
  quizItems: names.length,
  mappedItems: Object.keys(generated).length,
  photoFiles: records.length,
  pendingItems: pending.length,
  records,
  pending,
  unusedLocalFiles: unused,
  sourceFiles: Object.fromEntries(sourceRecords),
  quizSha256: sha(Buffer.from(quizCsv)),
  addedFiles,
  updatedFiles,
};
await fs.writeFile(
  path.join(root, 'src/data/productPhotos.json'),
  JSON.stringify(generated, null, 2) + '\n',
);
await fs.writeFile(
  path.join(root, 'output/product-photo-audit.json'),
  JSON.stringify(report, null, 2) + '\n',
);
const escape = (value) => value.replaceAll('|', '\\|');
const markdown = `# 實際產品照片對照與待補清單\n\n核對日期：${verifiedDate}。${report.sourcePolicy}\n\n正式題庫${names.length}項產品／主題，已對應${report.mappedItems}項、${records.length}張照片；其餘${pending.length}項維持待補。\n\n照片規格依包裝原文標註，僅描述該張照片，不將照片上的規格套用為整個題庫產品的唯一規格。\n\n## 已接入\n\n| 原題庫產品名 | 遊戲照片 | 包裝核對 | 本機來源檔 |\n| --- | --- | --- | --- |\n${records.map((r) => `| ${escape(r.product)} | ${r.target} | ${escape(r.caption)} | ${escape(path.relative(root, r.source))} |`).join('\n')}\n\n## 檔名差異\n\n${records
  .filter((r) => r.note)
  .map((r) => `- ${r.product}：${r.note}`)
  .join(
    '\n',
  )}\n\n## 待補（含未對應產品照片的教材主題）\n\n${pending.map((name) => '- ' + name).join('\n')}\n\n## 本工作區有照片但原題庫無同名項目\n\n${unused.map((name) => '- ' + name).join('\n')}\n\n以上不套用到名稱近似的其他產品。未將Acetamol照片配給「止痛針劑」、未將Tamlosin 0.4照片配給Tamlosin D、未將錠劑照片配給同系列乳膏。\n\n完整SHA-256與複本驗證見 output/product-photo-audit.json。\n`;
await fs.writeFile(path.join(root, 'docs/產品照片對照與待補清單.md'), markdown);
console.log(
  JSON.stringify(
    {
      quizItems: report.quizItems,
      mappedItems: report.mappedItems,
      photoFiles: report.photoFiles,
      pendingItems: report.pendingItems,
      unusedLocalFiles: unused,
      addedFiles,
      updatedFiles,
    },
    null,
    2,
  ),
);
