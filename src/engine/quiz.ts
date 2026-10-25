import type { Answer, Question } from '../types';
import {QUESTION_COUNT,POINTS_PER_QUESTION} from '../config/challenge';
export {QUESTION_COUNT,POINTS_PER_QUESTION} from '../config/challenge';
export function availableQuestionCount(bank:Question[],productId:string){
  return new Set(bank.filter(q=>q.productId===productId).map(q=>q.id)).size;
}
export function drawQuestions(
  bank: Question[],
  productId: string,
  random = Math.random,
): Question[] {
  const seen = new Set<string>();
  const pool = bank.filter((q) => {
    if (q.productId !== productId || seen.has(q.id)) return false;
    seen.add(q.id);
    return true;
  });
  if (pool.length < QUESTION_COUNT)
    throw new Error(`此產品只有 ${pool.length} 題有效題目，至少需要${QUESTION_COUNT}題才能開始挑戰。`);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, QUESTION_COUNT);
}
export function gradeAnswer(question: Question, selectedIndex: number): Answer {
  if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex > 3)
    throw new Error('請選擇有效答案');
  return {
    questionId: question.id,
    selectedIndex,
    correct: selectedIndex === question.correctIndex,
  };
}
export function calculateResult(answers: Answer[]) {
  const unique = [...new Map(answers.map((a) => [a.questionId, a])).values()];
  const correct = unique.filter((a) => a.correct).length;
  return {
    correct,
    score: Math.min(100,correct * POINTS_PER_QUESTION),
    passed: unique.length === QUESTION_COUNT && correct === QUESTION_COUNT,
  };
}
