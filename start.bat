@echo off 
setlocal enabledelayedexpansion
echo ==========================================
echo   AUTO INSTALL / AUTO UPDATE
echo ==========================================

:: =================== CONFIG ======================
:: ZIP архіви (main.zip або release.zip)
set BACKEND_ZIP_URL=https://github.com/Aksel-141/server-trainer-app/archive/refs/heads/release.zip
set FRONTEND_ZIP_URL=https://github.com/Aksel-141/client-trainer-app/archive/refs/heads/release.zip


:: Назва папки після розпаковки ZIP
set BACKEND_FOLDER=backend-main
set FRONTEND_FOLDER=frontend-main

:: Команда запуску бекенду
set BACKEND_START_CMD=node index.js

:: Тимчасова папка
set TMP_DIR=%cd%\tmp_download

:: Де лежить dist
set DIST_DIR=%cd%\dist

echo ==========================================
echo         AUTO INSTALL / AUTO UPDATE
echo ==========================================

:: Очистити тимчасову папку
if exist "%TMP_DIR%" rd /s /q "%TMP_DIR%"
mkdir "%TMP_DIR%"


powershell -Command "(Invoke-WebRequest '%BACKEND_ZIP_URL:main.zip=version.txt%' -OutFile '%TMP_DIR%\backend_version.txt')" 2>nul
if errorlevel 1 (
    echo Не вдалося отримати віддалену версію бекенду.
) else (
    set /p REMOTE_BACK=<"%TMP_DIR%\backend_version.txt"

    if exist version.txt (
        set /p LOCAL_BACK=<version.txt
    ) else (
        set LOCAL_BACK=none
    )

    if "%REMOTE_BACK%"=="%LOCAL_BACK%" (
        echo Бекенд актуальний.
    ) else (
        echo Нове оновлення бекенду доступне!
        echo Завантаження бекенду...

        powershell -Command "Invoke-WebRequest '%BACKEND_ZIP_URL%' -OutFile '%TMP_DIR%\backend.zip'"
        echo Розпаковка бекенду...
        powershell -Command "Expand-Archive '%TMP_DIR%\backend.zip' '%TMP_DIR%'"

        echo Оновлення файлів...
        xcopy "%TMP_DIR%\%BACKEND_FOLDER%\*" "%cd%\" /e /h /c /y

        echo %REMOTE_BACK%>version.txt
        echo Бекенд оновлено до версії %REMOTE_BACK%.
    )
)

:: --------------------------------------------
:: 2. ВСТАНОВЛЕННЯ ЗАЛЕЖНОСТЕЙ БЕКЕНДУ
:: --------------------------------------------
echo.
echo === Встановлення залежностей бекенду ===
npm install

:: --------------------------------------------
:: 3. ЗАВАНТАЖЕННЯ ТА ЗБІРКА ФРОНТУ
:: --------------------------------------------
echo.
echo === Перевірка оновлення фронтенду ===

powershell -Command "(Invoke-WebRequest '%FRONTEND_ZIP_URL:main.zip=version.txt%' -OutFile '%TMP_DIR%\front_version.txt')" 2>nul

if errorlevel 1 (
    echo Не вдалося отримати віддалену версію фронтенду.
) else (
    set /p REMOTE_FRONT=<"%TMP_DIR%\front_version.txt"

    if exist front_version.txt (
        set /p LOCAL_FRONT=<front_version.txt
    ) else (
        set LOCAL_FRONT=none
    )

    if not "%REMOTE_FRONT%"=="%LOCAL_FRONT%" (
        echo Нове оновлення фронтенду доступне!
        echo Завантаження фронтенду...

        powershell -Command "Invoke-WebRequest '%FRONTEND_ZIP_URL%' -OutFile '%TMP_DIR%\frontend.zip'"
        echo Розпаковка фронтенду...
        powershell -Command "Expand-Archive '%TMP_DIR%\frontend.zip' '%TMP_DIR%'"

        echo Збірка фронтенду...
        cd "%TMP_DIR%\%FRONTEND_FOLDER%"
        npm install
        npm run build
        cd "%cd%\..\"

        echo Оновлення dist...
        if exist "%DIST_DIR%" rd /s /q "%DIST_DIR%"
        mkdir "%DIST_DIR%"
        xcopy "%TMP_DIR%\%FRONTEND_FOLDER%\build\*" "%DIST_DIR%\" /e /h /c /y

        echo %REMOTE_FRONT%>front_version.txt
        echo Фронтенд оновлено.
    ) else (
        echo Фронтенд актуальний.
    )
)

:: --------------------------------------------
:: 4. ОЧИЩЕННЯ ТИМЧАСОВИХ ФАЙЛІВ
:: --------------------------------------------
echo.
echo === Очищення тимчасових файлів ===
rd /s /q "%TMP_DIR%"

:: --------------------------------------------
:: 5. ЗАПУСК БЕКЕНДУ
:: --------------------------------------------
echo.
echo === Запуск бекенду ===
%BACKEND_START_CMD%

exit /b