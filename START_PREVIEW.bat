@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Starting a safe local preview. No API keys are needed.
echo Open http://localhost:3000 if the browser does not open automatically.
start "" http://localhost:3000
npx --yes serve@14 public -l 3000
pause
