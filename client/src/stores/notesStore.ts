import { makeAutoObservable, runInAction } from 'mobx';
import RootStore from '@stores/RootStore';
import type { Note } from '@app-types/notes';

/**
 * Store для управления заметками
 * Отвечает за:
 * - Список заметок
 * - Выбранную заметку
 * - Загрузку/сохранение заметок
 */
class notesStore {
    rootStore: RootStore;

    // Состояние
    notes: Note[] = [];
    selectedNoteId: string | null = null;
    isLoading = false;
    error: string | null = null;

    constructor(rootStore: RootStore) {
        this.rootStore = rootStore;
        makeAutoObservable(this);
    }

    // Getters
    get selectedNote(): Note | undefined {
        if (!this.selectedNoteId) return undefined;
        return this.notes.find((note) => note.id === this.selectedNoteId);
    }

    get hasNotes(): boolean {
        return this.notes.length > 0;
    }

    // Actions
    setNotes(notes: Note[]) {
        this.notes = notes;
    }

    setSelectedNoteId(noteId: string | null) {
        this.selectedNoteId = noteId;
    }

    setLoading(loading: boolean) {
        this.isLoading = loading;
    }

    setError(error: string | null) {
        this.error = error;
    }

    addNote(note: Note) {
        this.notes.push(note);
    }

    updateNote(noteId: string, updates: Partial<Note>) {
        const note = this.notes.find((n) => n.id === noteId);
        if (note) {
            Object.assign(note, updates);
        }
    }

    deleteNote(noteId: string) {
        this.notes = this.notes.filter((note) => note.id !== noteId);
        if (this.selectedNoteId === noteId) {
            this.selectedNoteId = null;
        }
    }

    // Async actions (примеры)
    async loadNotes() {
        this.setLoading(true);
        this.setError(null);
        try {
            // Здесь будет запрос к API
            // const response = await NoteService.fetchNotes();
            // Обновления observable состояния обернуты в runInAction
            // runInAction(() => {
            //   this.setNotes(response.data);
            // });
        } catch {
            // Обновления observable состояния обернуты в runInAction
            runInAction(() => {
                this.setError('Ошибка загрузки заметок');
            });
        } finally {
            // Обновления observable состояния обернуты в runInAction
            runInAction(() => {
                this.setLoading(false);
            });
        }
    }

    async saveNote(noteId: string, content: string) {
        try {
            // Здесь будет запрос к API
            // await NoteService.updateNote(noteId, content);
            // Обновления observable состояния обернуты в runInAction
            runInAction(() => {
                this.updateNote(noteId, { content, updatedAt: new Date().toISOString() });
            });
        } catch {
            // Обновления observable состояния обернуты в runInAction
            runInAction(() => {
                this.setError('Ошибка сохранения заметки');
            });
        }
    }
}

export default notesStore;
