@echo off
chcp 65001 >nul
title 高中理科复习 - 本地网站
cd /d "%~dp0"

set PORT=8124

echo ============================================
echo   高中理科全科复习 · 本地学习网站
echo ============================================
echo.
echo 正在启动本地服务器（端口 %PORT%）...
echo 关闭此黑色窗口即可停止网站。
echo.

where py >nul 2>nul
if %errorlevel%==0 (
    start "" http://localhost:%PORT%/index.html
    py -m http.server %PORT%
    goto :eof
)

where python >nul 2>nul
if %errorlevel%==0 (
    start "" http://localhost:%PORT%/index.html
    python -m http.server %PORT%
    goto :eof
)

echo [提示] 没有检测到 Python。
echo 请先安装 Python（https://www.python.org/downloads/，安装时勾选 Add to PATH），
echo 然后重新双击本文件即可。
echo.
pause
