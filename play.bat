@echo off
setlocal
cd /d "%~dp0"
start "" /min cmd /c "node tools\serve.mjs > tools\serve.log 2>&1"
timeout /t 1 >nul
start "" "http://127.0.0.1:8123/"
endlocal
