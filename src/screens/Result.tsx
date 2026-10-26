import { useEffect } from 'react';
import { ArrowRight, RotateCcw, Home, CheckCircle2, BookOpen } from 'lucide-react';
import type { GameState, Product } from '../types';
import { calculateResult,QUESTION_COUNT } from '../engine/quiz';
import { assets } from '../data/assets';
import { AssetImage } from '../components/AssetImage';
import { GAME_NAME } from '../config/game';
import {sevenStages} from '../data/sevenStages';
import { useVisitMission } from '../context/VisitContext';
export function Result({
  state,
  product,
  onRetry,
  onProducts,
  onHome,
  onSuccess,
  completedCount,
  qualifiedCount,
  alreadyQualified,
  nextClinic,
  onNextVisit,
  storageAvailable,
}: {
  state: GameState;
  product: Product;
  onRetry: () => void;
  onProducts: () => void;
  onHome: () => void;
  onSuccess: () => void;
  completedCount: number;
  qualifiedCount:number;
  alreadyQualified:boolean;
  nextClinic?: string;
  onNextVisit?: () => void;
  storageAvailable: boolean;
}) {
  const result = calculateResult(state.answers);
  const mission = useVisitMission();
  useEffect(() => {
    if (result.passed) onSuccess();
  }, []);
  return (
    <section className={`result-screen ${result.passed ? 'passed' : ''}`}>
      <div className="result-emblem">
        {result.passed ? (
          <AssetImage src={assets.success} alt="挑戰成功徽章" />
        ) : (
          <BookOpen size={52} />
        )}
      </div>
      <span className="eyebrow">
        {result.passed ? 'MISSION ACCOMPLISHED' : 'KEEP LEARNING, KEEP GROWING'}
      </span>
      <h1>{result.passed ? `${GAME_NAME}｜本項合格！` : '本項尚未合格，請再接再厲！'}</h1>
      <p className="result-quote">
        {mission.doctor.name}：「
        {result.passed
          ? (mission.kind==='training'?'這個主題掌握得很好，恭喜通過考驗。':'你的產品知識掌握得很好，謝謝你的介紹。')
          : '回顧這次的提問，準備好後，我們再聊一次。'}
        」
      </p>
      <div className="result-visit" data-testid="result-visit">
        <b>
          {mission.clinic} · {mission.doctor.name}
        </b>
        <span>{mission.title}</span>
        <p className="stage-qualification-progress" data-testid="result-qualified-count" role="status">本關已有 {qualifiedCount} 項合格紀錄。可繼續挑戰，或自由前往其他島嶼。</p>
        {result.passed&&<p>{alreadyQualified?'此產品／主題先前已合格，重複挑戰不增加合格數。':'本次10題全對，已列入本關合格進度。'}</p>}
        <p>
          {completedCount === sevenStages.length
            ? '八座島嶼都有你的合格紀錄！'
            : `已有合格紀錄的島嶼：${completedCount} / ${sevenStages.length}`}
        </p>
        {!storageAvailable && <small>本次進度僅在頁面開啟期間保留，瀏覽器無法寫入本機紀錄。</small>}
      </div>
      <div className="result-stats">
        <div>
          <span>本次挑戰題庫</span>
          <b>{product.name}</b>
        </div>
        <div>
          <span>答對題數</span>
          <b>
            {result.correct} <small>/ {QUESTION_COUNT} 題</small>
          </b>
        </div>
        <div>
          <span>總得分</span>
          <b className="score">
            {result.score}
            <small> 分</small>
          </b>
        </div>
        <div>
          <span>挑戰結果</span>
          <b>
            {result.passed ? (
              <>
                <CheckCircle2 size={18} />
                本項合格
              </>
            ) : (
              '本項未合格'
            )}
          </b>
        </div>
      </div>
      {result.passed && <div className="success-note">這份從容，將成為下一次拜訪的起點。</div>}
      {!result.passed && (
        <div className="review-panel">
          <div className="review-heading">
            <BookOpen size={19} />
            <h2>錯題回顧</h2>
            <span>{QUESTION_COUNT - result.correct} 題需要再加強</span>
          </div>
          {state.questions.map((q, i) =>
            state.answers[i]?.correct ? null : (
              <article key={q.id}>
                <h3>
                  {i + 1}. {q.prompt}
                </h3>
                <p className="wrong-answer">
                  你的答案：{q.options[state.answers[i].selectedIndex]}
                </p>
                <p className="right-answer">
                  正確答案：{String.fromCharCode(65 + q.correctIndex)}．{q.options[q.correctIndex]}
                </p>
                {q.explanationReviewed && q.explanation && <p>{q.explanation}</p>}
              </article>
            ),
          )}
        </div>
      )}
      <div className="result-actions">
        {result.passed && onNextVisit && (
          <button className="button secondary" onClick={onNextVisit}>
            探索另一座島：{nextClinic}
            <ArrowRight size={17} />
          </button>
        )}
        <button className="button primary" onClick={onRetry}>
          <RotateCcw size={17} />
          再次挑戰
        </button>
        <button className="button secondary" onClick={onProducts}>
          繼續挑戰本關其他產品／主題
          <ArrowRight size={17} />
        </button>
        <button className="text-button" onClick={onHome}>
          <Home size={16} />
          返回首頁
        </button>
      </div>
      <p className="muted result-footnote">
        分數與作答明細僅在本局顯示；合格後只在本機保留產品／主題、關卡、合格題數與完成日期，不上傳。
      </p>
    </section>
  );
}
