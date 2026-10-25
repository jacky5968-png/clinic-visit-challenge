# GitHub 發布說明

本版保留七關指定題庫、每項10題全對、每關至少5項不同產品／主題合格及依序解鎖規則。原正式CSV來源僅匿名唯讀，沒有修改原題庫，也沒有新增產品照片。

## GitHub Pages

專案使用相對資源路徑，可同時在本機根目錄與 GitHub Pages 儲存庫子目錄載入。推送至 `main` 後，`.github/workflows/pages.yml` 會以 Node.js 24 安裝依賴、執行單元測試、建置並部署 `dist`。

儲存庫的 Settings → Pages → Source 選擇 **GitHub Actions**。成功後的遊戲網址由部署環境與 Actions 紀錄顯示。

## 保留與排除

- 上傳原始碼、既有素材、鎖定依賴檔、測試、文件及啟動指令。
- 不上傳 `node_modules`、本機備份、驗收輸出、測試報告、環境變數檔或瀏覽器進度。
- 網站繼續從既有公開CSV讀取題庫；無法連線時仍沿用原先重試／匯入流程。
- 合格紀錄保存在各瀏覽器的 localStorage。GitHub Pages 與本機網址屬於不同來源，進度不會自動搬移或跨裝置同步。

## 本機驗證

```powershell
npm ci
npm test
npm run build
npm run preview
```

公開儲存庫與網站可讓他人檢視遊戲原始碼、既有素材及程式內原本的公開題庫連結。
