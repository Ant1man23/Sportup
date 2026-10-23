@echo off
echo ========================================================
echo   SportUp - Lancement du Cloudflare Tunnel
echo   Expose l'API locale (http://127.0.0.1:8000) sur HTTPS
echo ========================================================
echo.
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://127.0.0.1:8000
pause
