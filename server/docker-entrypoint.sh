#!/bin/sh
set -e

# Формируем REDIS_URL автоматически, если указан REDIS_PASSWORD
if [ -n "$REDIS_PASSWORD" ] && [ -z "$REDIS_URL" ]; then
  export REDIS_URL="redis://:${REDIS_PASSWORD}@redis:6379"
  echo "[Entrypoint] REDIS_URL automatically set with password"
elif [ -z "$REDIS_URL" ]; then
  export REDIS_URL="redis://redis:6379"
  echo "[Entrypoint] REDIS_URL set without password"
fi

# Формируем DB_URL автоматически, если не задан
if [ -z "$DB_URL" ]; then
  export DB_URL="mongodb://${MONGO_ROOT_USERNAME:-admin}:${MONGO_ROOT_PASSWORD:-password}@mongodb:27017/${MONGO_DATABASE:-notes_db}?authSource=admin"
  echo "[Entrypoint] DB_URL automatically set from MONGO_* variables"
else
  echo "[Entrypoint] Using provided DB_URL"
fi

# Запускаем приложение
exec "$@"

