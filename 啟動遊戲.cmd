@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist node_modules (
  echo 第一次使用請先執行 npm install。
  pause
  exit /b 1
)
npm.cmd run dev -- --port 5173 --open
