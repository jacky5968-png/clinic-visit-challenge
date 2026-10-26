import { useEffect, useRef } from 'react';
import { X, MousePointer2, MessageCircle, ShieldCheck } from 'lucide-react';
export function HelpDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="help-dialog"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-heading">
        <span className="eyebrow">HOW TO PLAY</span>
        <button className="icon-button" aria-label="關閉遊戲說明" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      <h2>每一次拜訪，都是進步的開始。</h2>
      <p>每項產品／主題抽10題，全部答對才合格。每關至少5項不同產品／主題合格，才能通關並解鎖下一關；重複挑戰同一項不重複計數。</p>
      <ol className="help-steps">
        <li>
          <MousePointer2 />
          <div>
            <b>01 選擇關卡與題庫</b>
            <p>
              先完成前一關，再選擇下一關限定的產品或主題。點擊3D場景後，以方向鍵／WASD自由行走，抵達人物定位點即自動開啟對話；手機可長按方向按鈕。也可點擊地點或小地圖自動前往。關閉對話後，可按 E、Enter 或點選人物再聊。拖曳旋轉、滾輪或雙指縮放，Alt＋方向鍵調整視角。
            </p>
          </div>
        </li>
        <li>
          <MessageCircle />
          <div>
            <b>02 與主管、教官、藥師或醫師交流</b>
            <p>每一關先到01櫃台，按「回應」並「完成對話」，外勤就會自動沿動線前往02，抵達即開啟對話；完成02後也會自動前往03，與主管、教官、藥師或醫師交流及考核。藍色圓圈是下一站、綠色打勾為已完成、灰色鎖頭為待解鎖。每題選擇一個答案後確認送出，送出後不能修改。</p>
          </div>
        </li>
        <li>
          <ShieldCheck />
          <div>
            <b>03 每項10題全對，每關累積5項</b>
            <p>每題10分，10題全對100分才算本項合格；90分仍不合格。累積5項不同產品／主題合格才通關。答錯可完成本局、複習錯題後再挑戰；不足10題的題庫不能開始。</p>
          </div>
        </li>
      </ol>
      <div className="demo-notice">
        七個關卡與醫師皆為虛構情境，實際產品題目沿用「營一大挑戰」正式題庫。作答明細不儲存，合格後僅在本機保留產品／主題、題庫版本、合格題數與日期。七關僅使用符合各關分類的題庫，不以示範題替代。舊版5題紀錄保留，不計入新版合格進度。
      </div>
      <button className="button primary full" onClick={onClose}>
        了解，開始探索
      </button>
    </dialog>
  );
}
