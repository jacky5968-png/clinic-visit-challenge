import { ArrowUpRight, ArrowRight, MousePointer2, MessageCircle, Medal, Play } from 'lucide-react';
import { ClinicMap } from '../components/ClinicMap';
export function Home({
  onStart,
  onHelp,
  onSkip,
  skipIntro,
}: {
  onStart: () => void;
  onHelp: () => void;
  onSkip: () => void;
  skipIntro: boolean;
}) {
  return (
    <div className={`home-screen ${skipIntro ? 'skip-intro' : ''}`}>
      <section className="hero">
        <div className="hero-copy">
          <h1>
            讓專業，
            <br />
            走進每一次
            <span className="highlight">
              拜訪
              <svg viewBox="0 0 200 12">
                <path d="M3 9 Q 100 -1 197 6" />
              </svg>
            </span>
            。
          </h1>
          <p className="hero-description">
            從診所的第一聲問候，到醫師的每一道提問。
            <br />
            在情境中練習，把產品知識轉化為推廣的自信。
          </p>
          <div className="hero-actions">
            <button className="button primary" onClick={onStart}>
              <Play size={17} fill="currentColor" />
              開始遊戲
              <ArrowRight size={18} />
            </button>
            <button className="text-button" onClick={onHelp}>
              遊戲說明
              <ArrowUpRight size={17} />
            </button>
          </div>
          <div className="hero-meta">
            <span>
              <i />
              本機訓練版
            </span>
            <span>無需登入</span>
            <span>每項約 5 分鐘</span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="scene-topline">
            <span>你的第一站</span>
            <span>01 / SCENE PREVIEW</span>
          </div>
          <ClinicMap />
          <div className="scene-caption">
            <span className="scene-number">01</span>
            <div>
              <b>從這裡，展開你的外勤旅程</b>
              <small>新人必修 → 認識產品 → 五類客戶拜訪</small>
            </div>
            <ArrowUpRight size={22} />
          </div>
        </div>
      </section>
      <section className="journey-section">
        <div className="journey-title">
          <span className="eyebrow">YOUR MISSION</span>
          <h2>一場拜訪，三個關鍵時刻。</h2>
          <p>把每一次練習，變成下一次的從容。</p>
        </div>
        <div className="journey-item">
          <span className="journey-icon">
            <MousePointer2 size={23} />
          </span>
          <div>
            <small>STEP 01</small>
            <h3>七關依序解鎖</h3>
            <p>限定題庫、自由行走與人物互動</p>
          </div>
        </div>
        <div className="journey-item">
          <span className="journey-icon">
            <MessageCircle size={23} />
          </span>
          <div>
            <small>STEP 02</small>
            <h3>專業交流</h3>
            <p>介紹產品，回應醫師提問</p>
          </div>
        </div>
        <div className="journey-item">
          <span className="journey-icon">
            <Medal size={23} />
          </span>
          <div>
            <small>STEP 03</small>
            <h3>合格累積，依序通關</h3>
            <p>每項10題全對，每關至少5項合格</p>
          </div>
        </div>
      </section>
      <div className="home-bottom">
        <p>專為生達化學製藥營一部外勤人員設計的情境訓練</p>
        {!skipIntro && (
          <button className="text-button small" onClick={onSkip}>
            略過進場動畫 →
          </button>
        )}
      </div>
    </div>
  );
}
