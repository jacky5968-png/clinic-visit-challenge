import { Check, ArrowRight, CheckCircle2, AlertCircle, LockKeyhole } from 'lucide-react';
import type { GameState, Product } from '../types';
import type { Action } from '../engine/state';
import { calculateResult,QUESTION_COUNT,POINTS_PER_QUESTION } from '../engine/quiz';
import { AssessmentScene } from '../components/AssessmentScene';
import '../styles/assessment.css';
import { useVisitMission } from '../context/VisitContext';
export function Quiz({
  state,
  product,
  dispatch,
  onAnswer,
}: {
  state: GameState;
  product: Product;
  dispatch: (a: Action) => void;
  onAnswer: (correct: boolean) => void;
}) {
  const index = state.submitted ? state.answers.length - 1 : state.answers.length;
  const mission = useVisitMission();
  const q = state.questions[index];
  const result = calculateResult(state.answers);
  const correct = state.submitted && state.answers[index].correct;
  return (
    <section className="content-screen quiz-screen">
      <div className="quiz-top">
        <div>
          <span className="eyebrow">STAGE CHALLENGE</span>
          <h1>第{mission.stageNumber}關考驗</h1>
          <p>
            {product.name} <span className="tag">{mission.kind==='training'?'主題訓練':product.demo ? '示範訓練' : '產品訓練'}</span>
          </p>
        </div>
        <div className="scoreboard">
          <div>
            <small>累計答對</small>
            <b>
              {result.correct}
              <span> / {QUESTION_COUNT}</span>
            </b>
          </div>
          <div>
            <small>累計得分</small>
            <b>
              {result.score}
              <span> 分</span>
            </b>
          </div>
        </div>
      </div>
      <div className="quiz-layout assessment-layout">
        <AssessmentScene question={index} selected={state.selectedIndex} submitted={state.submitted} correct={Boolean(correct)}/>
        <article className="question-card" key={q.id}>
          <div className="question-progress">
            <span>
              QUESTION <b>{String(index + 1).padStart(2, '0')}</b> / {QUESTION_COUNT}
            </span>
            <div>
              {Array.from({ length: QUESTION_COUNT }, (_, i) => (
                <i
                  key={i}
                  className={
                    i < state.answers.length
                      ? state.answers[i].correct
                        ? 'correct'
                        : 'wrong'
                      : i === index
                        ? 'current'
                        : ''
                  }
                />
              ))}
            </div>
          </div>
          <h2 data-testid="question-prompt">{q.prompt}</h2>
          <p className="question-hint">請選擇一個答案，再確認送出。</p>
          <div className="answer-grid" role="group" aria-label="答案選項">
            {q.options.map((option, i) => {
              const isCorrect = state.submitted && i === q.correctIndex;
              const isWrong = state.submitted && i === state.selectedIndex && !correct;
              return (
                <button
                  key={i}
                  className={`answer-option ${state.selectedIndex === i ? 'selected' : ''} ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}
                  aria-pressed={state.selectedIndex === i}
                  disabled={state.submitted}
                  onClick={() => dispatch({ type: 'SELECT', index: i })}
                >
                  <span className="answer-letter">{String.fromCharCode(65 + i)}</span>
                  <span>{option}</span>
                  {isCorrect ? (
                    <Check size={19} />
                  ) : isWrong ? (
                    <AlertCircle size={19} />
                  ) : state.selectedIndex === i ? (
                    <span className="radio-selected" />
                  ) : null}
                </button>
              );
            })}
          </div>
          <div aria-live="polite">
            {state.submitted && (
              <div className={`answer-feedback ${correct ? 'correct' : 'wrong'}`} role="status">
                <div>
                  {correct ? <CheckCircle2 size={19} /> : <AlertCircle size={19} />}
                  <b>{correct ? `回答正確！ +${POINTS_PER_QUESTION} 分` : '這一題需要再加強。'}</b>
                </div>
                <p>
                  正確答案：{String.fromCharCode(65 + q.correctIndex)}．{q.options[q.correctIndex]}
                </p>
                {q.explanationReviewed && q.explanation && (
                  <p className="explanation">
                    <span>題庫解析</span>
                    {q.explanation}
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="question-actions">
            <small>
              <LockKeyhole size={14} />
              送出後無法修改答案
            </small>
            {!state.submitted ? (
              <button
                className="button primary"
                disabled={state.selectedIndex === null}
                onClick={() => {
                  onAnswer(state.selectedIndex === q.correctIndex);
                  dispatch({ type: 'SUBMIT' });
                }}
              >
                確認送出
                <ArrowRight size={17} />
              </button>
            ) : (
              <button className="button primary" onClick={() => dispatch({ type: 'NEXT' })}>
                {index === QUESTION_COUNT-1 ? '查看挑戰結果' : '下一題'}
                <ArrowRight size={17} />
              </button>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
