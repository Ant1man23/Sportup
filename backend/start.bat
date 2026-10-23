@echo off
REM ============================================================
REM SportUp Backend — Script de démarrage rapide
REM ============================================================

echo.
echo  ========================================
echo   SportUp Backend — Démarrage
echo  ========================================
echo.

REM 1. Appliquer les migrations (SQLite / MySQL selon .env)
echo [1/4] Application des migrations...
php artisan migrate --force
if %ERRORLEVEL% NEQ 0 (
    echo  [WARN] Migration MySQL échouée. Passage en mode SQLite...
    php artisan migrate --force --env=testing
)

REM 2. Seeder les données de démo si vide
echo.
echo [2/4] Seeding données de démonstration...
php artisan db:seed --class=TournamentSeeder --force 2>nul || php artisan db:seed --class=TournamentSeeder --env=testing

REM 3. Lancer le Queue Worker (Background)
echo.
echo [3/4] Démarrage du Queue Worker asynchrone...
start /b php artisan queue:work --tries=3 --timeout=30 > nul 2>&1

REM 4. Lancer le serveur API
echo.
echo [4/4] Démarrage du serveur sur http://localhost:8000...
echo  Appuie sur Ctrl+C pour arrêter.
echo.
php artisan serve --host=0.0.0.0 --port=8000
