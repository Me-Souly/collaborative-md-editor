import { useState, useEffect, useRef } from 'react';
import type { FileTreeNode } from '@app-types/notes';
import $api from '@http';
import { flattenTree, levenshteinSearch } from '../utils/levenshtein';

export type SearchResult = {
    id: string;
    title?: string;
    folderPath?: string; // own notes: derived from tree; undefined for API results
    meta?: { excerpt?: string; isFavorite?: boolean };
    isPublic?: boolean;
    updatedAt?: string; // API results
};

/**
 * useSearch — two-tier search:
 *   1. Own notes: instant local Levenshtein over `fileTree` (no API call, no debounce)
 *   2. Public/accessible notes: debounced call to /search/notes/public
 *
 * `fileTree` should be passed from an observer component so MobX re-renders
 * the component (and thus re-runs the hook) when the tree changes.
 */
export const useSearch = (searchQuery: string, fileTree: FileTreeNode[]) => {
    const [isSearching, setIsSearching] = useState(false);
    const [publicResults, setPublicResults] = useState<SearchResult[]>([]);
    const debounceRef = useRef<number | null>(null);
    const ownIdsRef = useRef<Set<string>>(new Set());

    // ── Own notes (local, synchronous) ──────────────────────────────
    // No useMemo: the caller (observer component) re-renders when fileTree changes,
    // so this recomputes automatically and correctly tracks MobX access.
    const flat = flattenTree(fileTree);
    const q = searchQuery.trim();
    const myResults: SearchResult[] = (q ? levenshteinSearch(flat, q) : flat)
        .slice(0, 30)
        .map(({ node, folderPath }) => ({
            id: node.id,
            title: node.name,
            folderPath,
            meta: { isFavorite: node.isFavorite },
            isPublic: node.isPublic,
        }));

    // Keep a fresh ref for deduplication inside the async callback
    ownIdsRef.current = new Set(myResults.map((n) => n.id));

    // ── Public notes (API, debounced) ────────────────────────────────
    useEffect(() => {
        if (debounceRef.current) window.clearTimeout(debounceRef.current);

        if (q.length < 2) {
            setPublicResults([]);
            return;
        }

        debounceRef.current = window.setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await ($api.get as any)('/search/notes/public', {
                    params: { query: q },
                    skipErrorToast: true,
                }).catch(() => ({ data: { notes: [] } }));

                const notes = (res.data?.notes ?? []) as SearchResult[];
                // Remove notes that already appear in "My Notes" section
                setPublicResults(notes.filter((n) => !ownIdsRef.current.has(n.id)));
            } catch {
                setPublicResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 400);

        return () => {
            if (debounceRef.current) window.clearTimeout(debounceRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery]);

    return { isSearching, myResults, publicResults };
};
