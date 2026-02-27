import type { FileTreeNode } from '@app-types/notes';

function levenshtein(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const m = a.length;
    const n = b.length;
    // rolling row DP
    const row = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) {
        let prev = row[0];
        row[0] = i;
        for (let j = 1; j <= n; j++) {
            const temp = row[j];
            row[j] =
                a[i - 1] === b[j - 1]
                    ? prev
                    : 1 + Math.min(prev, row[j], row[j - 1]);
            prev = temp;
        }
    }
    return row[n];
}

export type FlatNode = { node: FileTreeNode; folderPath: string };

/** Flatten the nested file tree into a flat list of file nodes with their folder paths. */
export function flattenTree(nodes: FileTreeNode[], path = ''): FlatNode[] {
    const result: FlatNode[] = [];
    for (const node of nodes) {
        if (node.type === 'file') {
            result.push({ node, folderPath: path });
        } else {
            const childPath = path ? `${path} / ${node.name}` : node.name;
            result.push(...flattenTree(node.children ?? [], childPath));
        }
    }
    return result;
}

/**
 * Filter + rank FlatNodes by query using substring match first, then word-level Levenshtein.
 * Returns matched items sorted by relevance (best first).
 */
export function levenshteinSearch(items: FlatNode[], query: string): FlatNode[] {
    const q = query.toLowerCase().trim();
    if (!q) return items;

    const maxDist = Math.max(2, Math.floor(q.length * 0.35));

    const scored: { item: FlatNode; score: number }[] = [];

    for (const item of items) {
        const title = (item.node.name ?? '').toLowerCase();

        // Exact substring — best match (score 0)
        if (title.includes(q)) {
            scored.push({ item, score: 0 });
            continue;
        }

        // Word-level Levenshtein
        const words = title.split(/\s+/);
        const bestWord = Math.min(...words.map((w) => levenshtein(w, q)));
        if (bestWord <= maxDist) {
            scored.push({ item, score: bestWord });
            continue;
        }

        // Full-title Levenshtein (helps with short single-word titles)
        const full = levenshtein(title, q);
        if (full <= maxDist) {
            scored.push({ item, score: full + 0.5 });
        }
    }

    return scored.sort((a, b) => a.score - b.score).map((s) => s.item);
}
