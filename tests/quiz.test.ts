import { describe, it, expect } from 'vitest';
import { drawQuestions, gradeAnswer, calculateResult } from '../src/engine/quiz';
import { gameReducer, initialState } from '../src/engine/state';
import { parseQuizCsv } from '../src/data/csvLoader';
import data from '../src/data/questions.json';
import type { Question } from '../src/types';
const bank:Question[] = Array.from({length:10},(_,i)=>({...data[i%data.length],id:'test-'+i,prompt:'測試題目'+i})) as Question[];
describe('抽題與計分', () => {
  it('每局抽10題且不改動原題庫', () => {
    const original = JSON.stringify(bank);
    expect(drawQuestions(bank, 'demo')).toHaveLength(10);
    expect(JSON.stringify(bank)).toBe(original);
  });
  it('連續100次抽題都不重複', () => {
    for (let i = 0; i < 100; i++) {
      const q = drawQuestions(bank, 'demo');
      expect(new Set(q.map((x) => x.id)).size).toBe(10);
    }
  });
  it('只抽取指定產品並處理重複ID', () => {
    const other = { ...bank[0], id: 'other', productId: 'other' };
    expect(
      drawQuestions([...bank, bank[0], other], 'demo').every((q) => q.productId === 'demo'),
    ).toBe(true);
  });
  it('少於10題拒絕開始', () => {
    expect(() => drawQuestions(bank.slice(0, 9), 'demo')).toThrow('至少需要10題');
    expect(() => drawQuestions(bank, 'missing')).toThrow('只有 0 題');
  });
  it('正確答案得10分', () => {
    const answer = gradeAnswer(bank[0], bank[0].correctIndex);
    expect(answer.correct).toBe(true);
    expect(calculateResult([answer]).score).toBe(10);
  });
  it('錯誤答案得0分', () => {
    expect(gradeAnswer(bank[0], 1).correct).toBe(false);
  });
  it('只有10題全對才能通關', () => {
    const answers = bank.map((q) => gradeAnswer(q, q.correctIndex));
    expect(calculateResult(answers)).toEqual({ correct: 10, score: 100, passed: true });
    expect(calculateResult(answers.slice(0, 9)).passed).toBe(false);
    answers[0] = { ...answers[0], correct: false };
    expect(calculateResult(answers)).toEqual({ correct: 9, score: 90, passed: false });
  });
  it('重複答題不能灌分', () => {
    const a = gradeAnswer(bank[0], bank[0].correctIndex);
    expect(calculateResult(Array(10).fill(a))).toEqual({ correct: 1, score: 10, passed: false });
  });
  it('拒絕無效選項', () => {
    for (const i of [-1, 4, 1.2, NaN]) expect(() => gradeAnswer(bank[0], i)).toThrow();
  });
});
describe('遊戲狀態', () => {
  it('正式題庫預設產品不會改變首頁畫面', () => {
    const s = gameReducer(initialState, { type: 'DEFAULT_PRODUCT', id: 'csv-1' });
    expect(s.screen).toBe('home');
    expect(s.productId).toBe('csv-1');
  });
  it('正式題庫回應不打斷進行中的示範挑戰或已選擇產品', () => {
    const s = gameReducer(initialState, { type: 'START', bank });
    expect(gameReducer(s, { type: 'DEFAULT_PRODUCT', id: 'csv-1' })).toEqual(s);
    const selected = gameReducer(initialState, { type: 'SELECT_PRODUCT', id: 'csv-2' });
    expect(gameReducer(selected, { type: 'DEFAULT_PRODUCT', id: 'csv-1' })).toEqual(selected);
  });
  function ready() {
    let s = gameReducer(initialState, { type: 'START', bank });
    s = gameReducer(s, { type: 'ENTER_ROOM' });
    return gameReducer(s, { type: 'BEGIN_QUIZ' });
  }
  it('保留診所到診間的題目', () => {
    const s = ready();
    expect(s.screen).toBe('quiz');
    expect(s.questions).toHaveLength(10);
  });
  it('不能直接跳進未開始的挑戰', () => {
    expect(gameReducer(initialState, { type: 'BEGIN_QUIZ' })).toEqual(initialState);
  });
  it('沒有選答案不能送出', () => {
    const s = ready();
    expect(gameReducer(s, { type: 'SUBMIT' })).toEqual(s);
  });
  it('送出後鎖定答案且不得重複計分', () => {
    let s = ready();
    s = gameReducer(s, { type: 'SELECT', index: 0 });
    s = gameReducer(s, { type: 'SUBMIT' });
    expect(gameReducer(s, { type: 'SELECT', index: 1 })).toEqual(s);
    expect(gameReducer(s, { type: 'SUBMIT' }).answers).toHaveLength(1);
  });
  it('完整10題後進入結果，重玩會重設分數', () => {
    let s = ready();
    for (let i = 0; i < 10; i++) {
      s = gameReducer(s, { type: 'SELECT', index: s.questions[i].correctIndex });
      s = gameReducer(s, { type: 'SUBMIT' });
      s = gameReducer(s, { type: 'NEXT' });
    }
    expect(s.screen).toBe('result');
    expect(calculateResult(s.answers).passed).toBe(true);
    s = gameReducer(s, { type: 'START', bank });
    expect(s.answers).toHaveLength(0);
    expect(s.screen).toBe('clinic');
  });
  it('少於10題維持產品頁並顯示錯誤', () => {
    const s = gameReducer(
      { ...initialState, screen: 'products' },
      { type: 'START', bank: bank.slice(0, 9) },
    );
    expect(s.screen).toBe('products');
    expect(s.error).toContain('至少需要10題');
  });
});
describe('CSV題庫', () => {
  it('原正式題庫的空白選項欄名、分類及原題原選項直接保留', () => {
    const data = parseQuizCsv(
      '藥理分類,產品,類型,分數,題目,選項 A,選項 B,選項 C,選項 D,正確答案,顯示分類\n分類一,實際產品名稱,單選,3,原始題目？,原文甲,原文乙,原文丙,原文丁,B,顯示分類一',
    );
    expect(data.products[0].category).toBe('顯示分類一');
    expect(data.products[0].ingredient).toBe('成分資料尚未提供');
    expect(data.products[0].image).toBe('/assets/products/product-placeholder.svg');
    expect(data.products[0].imageProvided).toBe(false);
    expect(data.questions[0].prompt).toBe('原始題目？');
    expect(data.questions[0].options).toEqual(['原文甲', '原文乙', '原文丙', '原文丁']);
    expect(calculateResult([gradeAnswer(data.questions[0], 1)]).score).toBe(10);
  });
  const header =
    'product,question,optionA,optionB,optionC,optionD,answer,explanation,explanationReviewed';
  it('支援引號、逗號、換行及UTF8 BOM', () => {
    const q = parseQuizCsv('\uFEFF' + header + '\n示範,"問題，含逗號\n與換行",甲,乙,丙,丁,B,,');
    expect(q.questions[0].prompt).toContain('\n');
    expect(q.questions[0].correctIndex).toBe(1);
  });
  it('支援中文欄名與1-4答案', () => {
    const q = parseQuizCsv(
      '產品名稱,題目,選項A,選項B,選項C,選項D,正確答案\n示範,題目一,甲,乙,丙,丁,3',
    );
    expect(q.questions[0].correctIndex).toBe(2);
  });
  it('支援以完整選項文字標示答案', () => {
    expect(parseQuizCsv(header + '\n示範,題目一,甲,乙,丙,丁,丁,,').questions[0].correctIndex).toBe(
      3,
    );
  });
  it('無審核標記不載入解析', () => {
    const q = parseQuizCsv(header + '\n示範,題目一,甲,乙,丙,丁,A,未審核內容,');
    expect(q.questions[0].explanation).toBeUndefined();
  });
  it('已審核解析保留原文', () => {
    const q = parseQuizCsv(header + '\n示範,題目一,甲,乙,丙,丁,A,原文解析,true');
    expect(q.questions[0].explanation).toBe('原文解析');
  });
  it('略過無效列及重複題目', () => {
    const q = parseQuizCsv(
      header +
        '\n示範,題目一,甲,乙,丙,丁,A,,\n示範,題目一,甲,乙,丙,丁,A,,\n示範,題目二,甲,乙,丙,丁,Z,,',
    );
    expect(q.questions).toHaveLength(1);
    expect(q.warnings).toHaveLength(2);
  });
  it('缺少必要欄位拒絕匯入', () => {
    expect(() => parseQuizCsv('product,question\n示範,題目')).toThrow('缺少必要欄位');
  });
  it('拒絕重複選項與空題庫', () => {
    expect(() => parseQuizCsv(header + '\n示範,題目一,甲,甲,丙,丁,A,,')).toThrow(
      '沒有可使用的題目',
    );
  });
  it('CSV產品名當純文字處理', () => {
    const q = parseQuizCsv(header + '\n<script>alert(1)</script>,題目,甲,乙,丙,丁,A,,');
    expect(q.products[0].name).toContain('<script>');
  });
});
