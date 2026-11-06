@echo off
title MyTV for Windows
cd /d "%~dp0"
echo MyTV Smart TV baslatiliyor...
if exist "node_modules\electron\dist\electron.exe" (
  start "" "node_modules\electron\dist\electron.exe" .
) else (
  call npx electron .
)
exit
