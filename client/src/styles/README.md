# Styles Structure

Эта папка содержит глобальные стили приложения.

## Структура

```
styles/
├── variables.css    # CSS переменные (цвета, размеры, отступы)
├── reset.css        # CSS Reset (сброс дефолтных стилей браузера)
├── global.css       # Глобальные стили (scrollbar, selection, utilities)
└── README.md        # Документация
```

## Использование CSS переменных

Все CSS переменные определены в `variables.css` и доступны глобально.

### Примеры использования в CSS Modules:

```css
/* components/MyComponent.module.css */
.button {
  background-color: var(--color-primary);
  color: var(--color-bg-primary);
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-base) var(--transition-ease);
}

.button:hover {
  background-color: var(--color-primary-hover);
}
```

### Доступные переменные:

#### Цвета
- `--color-primary` - Основной цвет (синий)
- `--color-text-primary` - Основной цвет текста
- `--color-bg-primary` - Основной цвет фона
- `--color-border-primary` - Цвет границ
- `--color-success`, `--color-error`, `--color-warning` - Статусные цвета

#### Отступы
- `--spacing-xs` до `--spacing-4xl` - Различные размеры отступов

#### Радиусы
- `--radius-sm` до `--radius-full` - Различные радиусы скругления

#### Тени
- `--shadow-sm` до `--shadow-xl` - Различные тени
- `--shadow-focus` - Тень для фокуса

#### Типографика
- `--font-family-base` - Основной шрифт
- `--font-size-xs` до `--font-size-xl` - Размеры шрифтов
- `--font-weight-normal` до `--font-weight-bold` - Насыщенность шрифта

#### Переходы
- `--transition-fast`, `--transition-base`, `--transition-slow` - Длительность переходов

## Импорт стилей

Глобальные стили автоматически импортируются через `index.css`:

```typescript
// index.tsx
import './index.css'; // Импортирует все стили из styles/
```

## Локальные стили компонентов

Локальные стили компонентов остаются в CSS Modules рядом с компонентами:

```
components/
  └── MyComponent/
      ├── MyComponent.tsx
      └── MyComponent.module.css
```

## Рекомендации

1. **Используйте CSS переменные** вместо хардкода цветов и размеров
2. **Добавляйте новые переменные** в `variables.css`, если они используются в нескольких местах
3. **Локальные стили** используйте только для специфичных стилей компонента
4. **Глобальные стили** добавляйте в `global.css` только если они действительно глобальные

