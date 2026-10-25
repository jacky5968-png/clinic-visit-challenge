import Papa from 'papaparse';
import type { Product, Question } from '../types';
import { findLocalProductPhotos } from './productPhotoResolver';
// 可在確認原始題庫欄名後擴充對照；不改動原題庫。
const aliases: Record<string, string[]> = {
  product: ['product', '產品名稱', '產品', '商品名稱'],
  question: ['question', '題目', '問題'],
  a: ['optionA', '選項A', '選項 A', 'A'],
  b: ['optionB', '選項B', '選項 B', 'B'],
  c: ['optionC', '選項C', '選項 C', 'C'],
  d: ['optionD', '選項D', '選項 D', 'D'],
  answer: ['answer', '正確答案', '答案'],
  explanation: ['explanation', '解析', '答案解析'],
  reviewed: ['explanationReviewed', '解析已審核'],
  image: ['image', '產品圖片'],
  ingredient: ['ingredient', '成分'],
  category: ['顯示分類', '藥理分類', 'category'],
};
export function parseQuizCsv(csv: string): {
  products: Product[];
  questions: Question[];
  warnings: string[];
} {
  const parsed = Papa.parse<Record<string, string>>(csv.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });
  if (parsed.errors.length) throw new Error(`CSV格式錯誤：${parsed.errors[0].message}`);
  const headers = parsed.meta.fields ?? [];
  for (const key of ['product', 'question', 'a', 'b', 'c', 'd', 'answer'])
    if (!aliases[key].some((h) => headers.includes(h)))
      throw new Error(`CSV缺少必要欄位：${aliases[key][0]}`);
  const products: Product[] = [],
    questions: Question[] = [],
    warnings: string[] = [],
    names = new Map<string, string>(),
    fingerprints = new Set<string>();
  const read = (row: Record<string, string>, key: string) =>
    aliases[key].map((a) => row[a]?.trim()).find(Boolean) ?? '';
  parsed.data.forEach((row, i) => {
    const name = read(row, 'product'),
      prompt = read(row, 'question');
    const options = [
      read(row, 'a'),
      read(row, 'b'),
      read(row, 'c'),
      read(row, 'd'),
    ] as Question['options'];
    const raw = read(row, 'answer'),
      letter = raw.toUpperCase().replace(/[.、．)）]$/, '');
    // 支援 A-D、1-4 或完全相符且唯一的選項文字；避免靜默猜測。
    let index = /^[A-D]$/.test(letter)
      ? letter.charCodeAt(0) - 65
      : /^[1-4]$/.test(raw)
        ? Number(raw) - 1
        : options.filter((o) => o === raw).length === 1
          ? options.indexOf(raw)
          : -1;
    if (!name || !prompt || options.some((o) => !o) || new Set(options).size !== 4 || index < 0) {
      warnings.push(`第${i + 2}列無效，已略過。`);
      return;
    }
    const fingerprint = JSON.stringify([name, prompt]);
    if (fingerprints.has(fingerprint)) {
      warnings.push(`第${i + 2}列題目重複，已略過。`);
      return;
    }
    fingerprints.add(fingerprint);
    if (!names.has(name)) {
      const id = `csv-${names.size + 1}`;
      names.set(name, id);
      const candidate = read(row, 'image');
      const localPhotos = findLocalProductPhotos(name);
      const csvImageProvided = /^(https?:\/\/|\/assets\/)/.test(candidate);
      const imageProvided = Boolean(localPhotos?.length) || csvImageProvided;
      products.push({
        id,
        name,
        ingredient: read(row, 'ingredient') || '成分資料尚未提供',
        image:
          localPhotos?.[0].src ??
          (csvImageProvided ? candidate : '/assets/products/product-placeholder.svg'),
        imageProvided,
        imageSource: localPhotos?.length ? 'local' : csvImageProvided ? 'csv' : undefined,
        imageCaption: localPhotos?.[0].caption,
        photos: localPhotos,
        category: read(row, 'category') || 'CSV題庫',
        description: '本次挑戰直接沿用題庫中的產品原題、四個選項及正確答案，每次隨機抽出10題。',
        demo: false,
      });
    }
    const reviewed = /^(true|1|yes|是|已審核)$/i.test(read(row, 'reviewed'));
    questions.push({
      id: `csv-row-${i + 2}`,
      productId: names.get(name)!,
      prompt,
      options,
      correctIndex: index,
      explanation: reviewed ? read(row, 'explanation') : undefined,
      explanationReviewed: reviewed,
    });
  });
  if (!questions.length) throw new Error('CSV沒有可使用的題目，請檢查欄位與正確答案。');
  return { products, questions, warnings };
}
export async function loadQuizCsv(url: string, signal?: AbortSignal) {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol))
    throw new Error('請使用公開的 HTTP / HTTPS CSV網址。');
  const response = await fetch(parsed, { signal, credentials: 'omit', cache: 'no-store' });
  if (!response.ok) throw new Error(`CSV讀取失敗（${response.status}）`);
  return parseQuizCsv(await response.text());
}
