import React, { createContext } from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import RootStore from '@stores/RootStore';
import { registerServiceWorker } from './sw-register';
import './index.css';

if (process.env.REACT_APP_SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.REACT_APP_SENTRY_DSN,
        environment: process.env.REACT_APP_SENTRY_ENVIRONMENT || 'development',
        // Записываем 100% транзакций в development, 10% в production
        tracesSampleRate: process.env.REACT_APP_SENTRY_ENVIRONMENT === 'production' ? 0.1 : 1.0,
        // Показывать диалог обратной связи при необработанной ошибке
        sendDefaultPii: true,
        beforeSend(event) {
            return event;
        },
    });
}

// Создаём единственный экземпляр RootStore
const rootStore = new RootStore();

// Типизируем контекст
interface StoreContextType {
    rootStore: RootStore;
}

// Создаём контекст
export const StoreContext = createContext<StoreContextType>({
    rootStore,
});

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
    <React.StrictMode>
        <StoreContext.Provider value={{ rootStore }}>
            <App />
        </StoreContext.Provider>
    </React.StrictMode>,
);

// Экспортируем для удобства использования в компонентах
export { rootStore };

// Регистрируем Service Worker для PWA (только в production)
registerServiceWorker();
