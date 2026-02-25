/**
 * Типы для CSS Modules
 * Этот файл позволяет TypeScript понимать структуру CSS Modules
 * Поддерживает именованные экспорты (import * as styles)
 * 
 * Использует Record<string, string> для поддержки любых свойств
 */

declare module '*.module.css' {
  const classes: Record<string, string>;
  export = classes;
}

declare module '*.module.scss' {
  const classes: Record<string, string>;
  export = classes;
}

declare module '*.module.sass' {
  const classes: Record<string, string>;
  export = classes;
}

