# 手機桌面 App 圖示

圖示來源：使用者提供的 `field-training-v1-app-icon-assets.zip`。圖片原樣保留於 `public/icons/`。

| 用途 | 檔案 | 尺寸 |
| --- | --- | --- |
| iPhone 主畫面 | `apple-touch-icon.png` | 180×180 |
| Android 主畫面 | `icon-192.png`、`icon-512.png` | 192×192、512×512 |
| Android 適應性圖示 | `icon-maskable-512.png` | 512×512 |
| 瀏覽器分頁 | `favicon.png`、`favicon.ico` | PNG 48×48；ICO 多尺寸 |
| 保留的原始大圖／小圖 | `app-icon-1024.png`、`icon-64.png` | 1024×1024、64×64 |

App 完整名稱為「外勤養成V1」，桌面簡稱為「外勤養成」。設定位於 `public/manifest.webmanifest` 與 `index.html`，網站原有標題及分享預覽標題保留。

## 日後替換 Logo

直接替換 `public/icons/` 中相同檔名、格式及尺寸的圖示，再執行 `npm run build` 即可。Maskable 圖示的重要圖案應維持在中央安全區內。若更換檔名或尺寸，須同步修改 `index.html` 與 manifest 的對應宣告。手機或瀏覽器可能保留舊圖示快取，更新後請重新加入主畫面確認。

## 部署路徑

沿用 Vite 的 `base: './'`，HTML 使用 `%BASE_URL%`，manifest 的圖示、`start_url` 與 `scope` 都使用相對路徑，不綁定 GitHub 儲存庫名稱。可支援 GitHub Pages 的 `/clinic-visit-challenge/` 子目錄，以及未來提供這些靜態檔案的根目錄或其他子目錄部署；實際 Sites 發布仍須確認平台有保留 manifest 及圖示檔案。

省略 manifest 的 `id`，讓它預設使用解析後的 `start_url`，避免素材包的 `id: '.'` 在 GitHub 共用網域下解析成網站根目錄。參考 [MDN manifest id 規則](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/id)。

本次只加入圖示與主畫面資訊，未新增 Service Worker、離線快取或安裝提示功能。

## 本機驗證（2026-10-26）

- `npm run build` 成功；原有 Three.js 大型區塊提示仍存在，無建置錯誤。
- `npm test`：27 個測試檔、210 項測試全部通過。
- 八個圖示與使用者素材包逐檔比對 SHA-256 完全一致；建置輸出亦逐檔核對。
- 建置版以本機 HTTP 模擬 `/`、`/clinic-visit-challenge/`、`/future-sites/game/`，三組路徑的 manifest、favicon、Apple 圖示及 Android 圖示均回應 200，MIME、尺寸與內容正確；啟動路徑及範圍維持在各自目錄。
- 原有分享標題保留，未修改 `src/`、題庫、音樂或遊戲規則；未提交、推送或發布。
- 尚未以實體 iPhone／Android 加入主畫面，也未實際部署至 ChatGPT Sites。本輪驗證範圍為本機建置與路徑相容性。

本機驗證結果保留於忽略版本控管的 `output/app-icons-verification.json`；驗證腳本為 `output/verify-app-icons.mjs`，可在建置後執行 `node output/verify-app-icons.mjs` 重測。
