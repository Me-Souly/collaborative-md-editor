import { useCallback } from 'react';

export const useYjsTextUpdate = () => {
    const updateYText = useCallback((markdown: string, origin: string = 'local', yText: any) => {
        if (!yText) return;
        const doc = yText.doc;
        if (!doc) return;

        const previous = yText.toString();
        if (markdown === previous) return;

        const next = markdown ?? '';
        let start = 0;
        const prevLength = previous.length;
        const nextLength = next.length;

        while (start < prevLength && start < nextLength && previous[start] === next[start]) {
            start += 1;
        }

        let endPrev = prevLength;
        let endNext = nextLength;
        while (endPrev > start && endNext > start && previous[endPrev - 1] === next[endNext - 1]) {
            endPrev -= 1;
            endNext -= 1;
        }

        const deleteCount = endPrev - start;
        const insertText = next.slice(start, endNext);

        doc.transact(() => {
            if (deleteCount > 0) {
                yText.delete(start, deleteCount);
            }
            if (insertText.length > 0) {
                yText.insert(start, insertText);
            }
        }, origin);
    }, []);

    return { updateYText };
};
