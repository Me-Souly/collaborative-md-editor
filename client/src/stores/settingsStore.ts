import { makeAutoObservable } from 'mobx';

export type Theme = 'light' | 'dark';
export type Accent = 'amber' | 'indigo' | 'slate' | 'forest' | 'rose';
export type CardView = 'grid' | 'list';

const STORAGE_KEY = 'nm-settings';

class SettingsStore {
    theme: Theme = 'light';
    accent: Accent = 'amber';
    cardView: CardView = 'grid';

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

    private applyToDOM() {
        document.documentElement.setAttribute('data-theme', this.theme);
        document.documentElement.setAttribute('data-accent', this.accent);
    }

    private save() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ theme: this.theme, accent: this.accent, cardView: this.cardView }),
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
        } catch {
            // ignore
        }
    }
}

export default SettingsStore;
