#!/bin/bash

# Скрипт для автоматического определения IP адреса и настройки .env

echo "Определение IP адреса..."

# Определяем IP адрес
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    IP=$(hostname -I | awk '{print $1}')
elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    # Windows (Git Bash)
    IP=$(ipconfig | grep "IPv4" | awk '{print $14}' | head -n 1)
else
    echo "Неизвестная ОС. Укажи IP вручную."
    exit 1
fi

if [ -z "$IP" ]; then
    echo "Не удалось определить IP адрес."
    echo "Укажи IP вручную в .env файле"
    exit 1
fi

echo "Найден IP: $IP"
echo ""
echo "Рекомендуемые настройки для локальной сети:"
echo ""
echo "# Для доступа с других устройств в локальной сети:"
echo "REACT_APP_API_URL=http://$IP:5000/api"
echo "REACT_APP_WS_URL=ws://$IP:5000"
echo "CLIENT_URL=http://$IP:3000"
echo ""
echo "   Или открой приложение по адресу: http://$IP:3000"
echo "   Код автоматически определит IP и будет использовать его для API"

