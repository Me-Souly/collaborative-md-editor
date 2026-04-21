import { makeAutoObservable } from 'mobx';

export type Theme = 'light' | 'dark';
export type Accent = 'amber' | 'indigo' | 'slate' | 'forest' | 'rose';
export type CardView = 'grid' | 'list';

export interface Keybindings {
    duplicateLine: string;
    deleteLine: string;
    moveParagraphUp: string;
    moveParagraphDown: string;
    insertHR: string;
}

export const DEFAULT_KEYBINDINGS: Keybindings = {
    duplicateLine: 'Mod-d',
    deleteLine: 'Mod-Shift-k',
    moveParagraphUp: 'Alt-Up',
    moveParagraphDown: 'Alt-Down',
    insertHR: 'Mod-Shift-h',
};

const STORAGE_KEY = 'nm-settings';

class SettingsStore {
    theme: Theme = 'light';
    accent: Accent = 'amber';
    cardView: CardView = 'grid';
    keybindings: Keybindings = { ...DEFAULT_KEYBINDINGS };

    constructor() {
        makeAutoObservable(this);
        this.load();
        this.applyToDOM();
    }

    setTheme(theme: Theme) {
        this.theme = theme;
        this.applyToDOM();
        this.save();
    }

    toggleTheme() {
        this.setTheme(this.theme === 'light' ? 'dark' : 'light');
    }

    setAccent(accent: Accent) {
        this.accent = accent;
        this.applyToDOM();
        this.save();
    }

    setCardView(cardView: CardView) {
        this.cardView = cardView;
        this.save();
    }

    setKeybinding(action: keyof Keybindings, shortcut: string) {
        this.keybindings = { ...this.keybindings, [action]: shortcut };
        this.save();
    }

    resetKeybindings() {
        this.keybindings = { ...DEFAULT_KEYBINDINGS };
        this.save();
    }

    private applyToDOM() {
        document.documentElement.setAttribute('data-theme', this.theme);
        document.documentElement.setAttribute('data-accent', this.accent);
    }

    private save() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    theme: this.theme,
                    accent: this.accent,
                    cardView: this.cardView,
                    keybindings: this.keybindings,
                }),
            );
        } catch {
            // ignore
        }
    }

    private load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const data = JSON.parse(raw);
            if (data.theme === 'light' || data.theme === 'dark') this.theme = data.theme;
            if (['amber', 'indigo', 'slate', 'forest', 'rose'].includes(data.accent))
                this.accent = data.accent;
            if (data.cardView === 'grid' || data.cardView === 'list') this.cardView = data.cardView;
            if (data.keybindings && typeof data.keybindings === 'object') {
                this.keybindings = { ...DEFAULT_KEYBINDINGS, ...data.keybindings };
            }
        } catch {
            // ignore
        }
    }
}

export default SettingsStore;
