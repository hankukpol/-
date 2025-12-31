@echo off
echo ========================================
echo 한국경찰학원 업무분장 시스템 시작
echo ========================================
echo.
echo Python 웹 서버를 시작합니다...
echo 브라우저가 자동으로 열립니다.
echo.
echo 종료하려면 이 창을 닫으세요.
echo ========================================
echo.

cd /d "%~dp0"
start http://localhost:8000/한국경찰학원 업무분장.html
python -m http.server 8000
