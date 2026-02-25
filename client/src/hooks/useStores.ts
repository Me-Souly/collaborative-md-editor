import { useContext } from 'react';
import { StoreContext } from '../index';
import RootStore from '@stores/RootStore';

/**
 * Хук для удобного доступа к сторам из компонентов
 * 
 * @example
 * const { rootStore } = useStores();
 * const { authStore, notesStore } = rootStore;
 * 
 * // Или деструктурируем сразу:
 * const { authStore, notesStore } = useStores().rootStore;
 */
export const useStores = (): { rootStore: RootStore } => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStores must be used within StoreContext.Provider');
  }
  return context;
};

/**
 * Хуки для быстрого доступа к конкретным сторам
 */
export const useAuthStore = () => {
  const { rootStore } = useStores();
  return rootStore.authStore;
};

export const useNotesStore = () => {
  const { rootStore } = useStores();
  return rootStore.notesStore;
};

export const useSidebarStore = () => {
  const { rootStore } = useStores();
  return rootStore.sidebarStore;
};

