import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { findLocalProductPhotos } from '../src/data/productPhotoResolver';
import { parseQuizCsv } from '../src/data/csvLoader';
import photos from '../src/data/productPhotos.json';

describe('實際產品照片', () => {
  it('每個照片檔都存在，複本SHA-256與核對紀錄一致', () => {
    const audit = JSON.parse(fs.readFileSync('tests/fixtures/product-photo-audit.json', 'utf8'));
    expect(Object.keys(photos)).toHaveLength(audit.mappedItems);
    for (const record of audit.records) {
      const file = fs.readFileSync(path.resolve(record.target));
      expect(createHash('sha256').update(file).digest('hex')).toBe(record.sha256);
    }
    expect(audit.records).toHaveLength(25);
  });
  it('只匹配已核對產品，不以相近名稱推測劑型、劑量或混合題組', () => {
    for (const name of [
      'Tamlosin D',
      'Tamlosin 0.8',
      'Eufan Tab.',
      'Deherp Cream',
      '止痛針劑',
      'Acarose 100mg',
    ]) {
      expect(findLocalProductPhotos(name)).toBeUndefined();
    }
    expect(findLocalProductPhotos('Tamlosin 0.4')?.[0].src).toContain('tamlosin-0-4mg');
    expect(findLocalProductPhotos('Eufan Sol.')?.[0].src).toContain('eufan-solution');
  });
  it('Pitastatin照片依包裝標示對應2mg與4mg，保留兩張規格圖', () => {
    const p = findLocalProductPhotos('Pitastatin')!;
    expect(p.map((photo) => photo.src)).toEqual([
      '/assets/products/local/pitastatin-2mg.jpg',
      '/assets/products/local/pitastatin-4mg.jpg',
    ]);
    expect(p[0].caption).toContain('2mg');
    expect(p[1].caption).toContain('4mg');
    const audit = JSON.parse(fs.readFileSync('tests/fixtures/product-photo-audit.json', 'utf8'));
    expect(
      audit.records.find((r: { target: string }) =>
        r.target.replaceAll('\\', '/').endsWith('/pitastatin-2mg.jpg'),
      ).source,
    ).toMatch(/Pitastatin 4mg.jpg$/);
  });
  it('已核對本機圖優先於CSV圖片，未匹配產品仍使用待補', () => {
    const data = parseQuizCsv(
      '產品,題目,選項A,選項B,選項C,選項D,正確答案,產品圖片\nBistin,問題一,甲,乙,丙,丁,A,https://example.com/photo.jpg\n沒有照片,問題二,甲,乙,丙,丁,B,',
    );
    expect(data.products[0].imageSource).toBe('local');
    expect(data.products[0].image).toBe('/assets/products/local/bistin.jpg');
    expect(data.products[1].imageProvided).toBe(false);
    expect(data.products[1].image).toBe('/assets/products/product-placeholder.svg');
  });
  it('正規化僅處理空白、全形與大小寫，不改變產品規格', () => {
    expect(findLocalProductPhotos('  BISTIN  ')).toEqual(findLocalProductPhotos('Bistin'));
    const p = findLocalProductPhotos('Bistin')!;
    p[0].caption = 'changed';
    expect(findLocalProductPhotos('Bistin')![0].caption).not.toBe('changed');
  });
  it('照片對照不改寫正式CSV中的題幹、選項、答案及有效題數', () => {
    const csv = fs.readFileSync('tests/fixtures/product-photos-source.csv', 'utf8');
    const data = parseQuizCsv(csv);
    expect(data.products).toHaveLength(80);
    expect(data.questions).toHaveLength(1428);
    expect(data.warnings).toHaveLength(0);
    expect(data.products.filter((p) => p.imageSource === 'local')).toHaveLength(23);
    expect(data.questions.every((q) => q.explanation === undefined)).toBe(true);
  });
});
