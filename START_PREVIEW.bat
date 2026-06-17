@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is required.& pause & exit /b 1)
echo Opening local gallery at http://localhost:3000
start "" http://localhost:3000
npx --yes serve public -l 3000
pause
