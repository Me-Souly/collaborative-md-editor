# Multi-stage build для React клиента
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем package файлы
COPY package*.json ./
COPY rspack.config.js ./
COPY tsconfig.json ./

# Устанавливаем зависимости
RUN npm ci

# Копируем исходный код
COPY public ./public
COPY src ./src

# Собираем приложение
ARG REACT_APP_API_URL
ARG REACT_APP_WS_URL
ARG REACT_APP_API_PORT
ARG REACT_APP_WS_PORT

ENV NODE_ENV=production
ENV REACT_APP_WS_URL=${REACT_APP_WS_URL}
ENV REACT_APP_API_PORT=${REACT_APP_API_PORT}
ENV REACT_APP_WS_PORT=${REACT_APP_WS_PORT}
# REACT_APP_API_URL опционально - если не задан, код определит автоматически
ENV REACT_APP_API_URL=${REACT_APP_API_URL}

RUN npm run build

# Production stage - nginx для статики
FROM nginx:alpine

# Устанавливаем wget для health check
RUN apk add --no-cache wget

# Копируем собранные файлы
COPY --from=builder /app/build /usr/share/nginx/html

# Копируем конфигурацию nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

