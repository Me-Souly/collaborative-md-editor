@echo off
REM Скрипт для Windows для определения IP адреса

echo Определение IP адреса...

REM Получаем IP адрес
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set IP=%%a
    set IP=!IP: =!
    goto :found
)

:found
if "%IP%"=="" (
    echo Не удалось определить IP адрес.
    echo Укажи IP вручную в .env файле
    exit /b 1
)

echo Найден IP: %IP%
echo.
echo Рекомендуемые настройки для локальной сети:
echo.
echo # Для доступа с других устройств в локальной сети:
echo REACT_APP_API_URL=http://%IP%:5000/api
echo REACT_APP_WS_URL=ws://%IP%:5000
echo CLIENT_URL=http://%IP%:3000
echo.
echo    Или открой приложение по адресу: http://%IP%:3000
echo    Код автоматически определит IP и будет использовать его для API

pause

