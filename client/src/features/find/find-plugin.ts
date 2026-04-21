import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import type { EditorState, Transaction } from 'prosemirror-state';
import type { Node } from 'prosemirror-model';

export const findPluginKey = new PluginKey<FindState>('find');

export interface FindMatch {
    from: number;
    to: number;
}

export interface FindState {
    query: string;
    caseSensitive: boolean;
    matches: FindMatch[];
    current: number; // index into matches
}

// Inject styles once
let stylesInjected = false;
function injectFindStyles() {
    if (stylesInjected || typeof document === 'undefined') return;
    if (document.getElementById('pm-find-plugin-styles')) { stylesInjected = true; return; }
    const style = document.createElement('style');
    style.id = 'pm-find-plugin-styles';
    style.textContent = `
.pm-find-match {
    background: rgba(255, 213, 0, 0.4);
    border-radius: 2px;
}
.pm-find-match-active {
    background: rgba(255, 140, 0, 0.55);
    border-radius: 2px;
    outline: 1px solid rgba(255, 140, 0, 0.8);
}
    `;
    document.head.appendChild(style);
    stylesInjected = true;
}

function findMatches(doc: Node, query: string, caseSensitive: boolean): FindMatch[] {
    if (!query) return [];
    const matches: FindMatch[] = [];
    const needle = caseSensitive ? query : query.toLowerCase();

    doc.nodesBetween(0, doc.content.size, (node, pos) => {
        if (!node.isText) return;
        const text = caseSensitive ? node.text! : node.text!.toLowerCase();
        let idx = text.indexOf(needle);
        while (idx !== -1) {
            matches.push({ from: pos + idx, to: pos + idx + needle.length });
            idx = text.indexOf(needle, idx + 1);
        }
    });

    return matches;
}

function buildDecorations(state: FindState, doc: Node): DecorationSet {
    if (!state.query || !state.matches.length) return DecorationSet.empty;
    const decos = state.matches.map((m, i) =>
        Decoration.inline(m.from, m.to, {
            class: i === state.current ? 'pm-find-match pm-find-match-active' : 'pm-find-match',
        })
    );
    return DecorationSet.create(doc, decos);
}

export function createFindPlugin(): Plugin<FindState> {
    injectFindStyles();

    return new Plugin<FindState>({
        key: findPluginKey,

        state: {
            init: (): FindState => ({ query: '', caseSensitive: false, matches: [], current: 0 }),

            apply(tr: Transaction, state: FindState): FindState {
                const meta = tr.getMeta(findPluginKey) as Partial<FindState> & { type?: string } | undefined;
                if (!meta) {
                    if (!tr.docChanged) return state;
                    // Recompute matches on doc change
                    const matches = findMatches(tr.doc, state.query, state.caseSensitive);
                    const current = Math.min(state.current, Math.max(0, matches.length - 1));
                    return { ...state, matches, current };
                }
                if (meta.type === 'next') {
                    const current = state.matches.length
                        ? (state.current + 1) % state.matches.length
                        : 0;
                    return { ...state, current };
                }
                if (meta.type === 'prev') {
                    const current = state.matches.length
                        ? (state.current - 1 + state.matches.length) % state.matches.length
                        : 0;
                    return { ...state, current };
                }
                const query = meta.query ?? state.query;
                const caseSensitive = meta.caseSensitive ?? state.caseSensitive;
                const matches = findMatches(tr.doc, query, caseSensitive);
                const current = Math.min(state.current, Math.max(0, matches.length - 1));
                return { query, caseSensitive, matches, current };
            },
        },

        props: {
            decorations(state: EditorState): DecorationSet {
                const ps = findPluginKey.getState(state);
                if (!ps) return DecorationSet.empty;
                return buildDecorations(ps, state.doc);
            },
        },
    });
}

// ── Helper commands ────────────────────────────────────────────────────────

export function setFindQuery(view: any, query: string, caseSensitive = false) {
    view.dispatch(view.state.tr.setMeta(findPluginKey, { query, caseSensitive }));
}

export function findNext(view: any) {
    const state = findPluginKey.getState(view.state) as FindState;
    if (!state?.matches.length) return;
    view.dispatch(view.state.tr.setMeta(findPluginKey, { type: 'next' }));
    scrollToCurrentMatch(view);
}

export function findPrev(view: any) {
    const state = findPluginKey.getState(view.state) as FindState;
    if (!state?.matches.length) return;
    view.dispatch(view.state.tr.setMeta(findPluginKey, { type: 'prev' }));
    scrollToCurrentMatch(view);
}

export function replaceCurrentMatch(view: any, replacement: string) {
    const state = findPluginKey.getState(view.state) as FindState;
    if (!state?.matches.length) return;
    const match = state.matches[state.current];
    const tr = view.state.tr.replaceWith(match.from, match.to, view.state.schema.text(replacement));
    view.dispatch(tr);
}

export function replaceAllMatches(view: any, replacement: string) {
    const state = findPluginKey.getState(view.state) as FindState;
    if (!state?.matches.length) return;
    // Replace from end to start to preserve positions
    let tr = view.state.tr;
    const matches = [...state.matches].reverse();
    for (const m of matches) {
        if (replacement) {
            tr = tr.replaceWith(m.from, m.to, view.state.schema.text(replacement));
        } else {
            tr = tr.delete(m.from, m.to);
        }
    }
    view.dispatch(tr);
}

function scrollToCurrentMatch(view: any) {
    requestAnimationFrame(() => {
        try {
            const state = findPluginKey.getState(view.state) as FindState;
            if (!state?.matches.length) return;
            const match = state.matches[state.current];
            const coords = view.coordsAtPos(match.from);
            let el: HTMLElement | null = view.dom.parentElement;
            while (el) {
                const ov = window.getComputedStyle(el).overflowY;
                if (ov === 'auto' || ov === 'scroll') break;
                el = el.parentElement;
            }
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const targetOffset = el.scrollTop + (coords.top - rect.top) - el.clientHeight * 0.35;
            el.scrollTo({ top: Math.max(0, targetOffset), behavior: 'smooth' });
        } catch { /* view gone */ }
    });
}
