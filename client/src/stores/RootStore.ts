import { makeAutoObservable } from 'mobx';
import authStore from '@stores/authStore';
import notesStore from '@stores/notesStore';
import sidebarStore from '@stores/sidebarStore';
import settingsStore from '@stores/settingsStore';

/**
 * RootStore - объединяет все сторы в одном месте
 * Это позволяет легко получать доступ к любому стору из любого компонента
 */
class RootStore {
    authStore: authStore;
    notesStore: notesStore;
    sidebarStore: sidebarStore;
    settingsStore: settingsStore;

    constructor() {
        // Создаём экземпляры всех сторов
        this.authStore = new authStore();
        this.notesStore = new notesStore(this); // Передаём rootStore для доступа к другим сторам
        this.sidebarStore = new sidebarStore(this);
        this.settingsStore = new settingsStore();

        // Делаем RootStore observable, чтобы компоненты могли реагировать на изменения
        makeAutoObservable(this);
    }
}

export default RootStore;
