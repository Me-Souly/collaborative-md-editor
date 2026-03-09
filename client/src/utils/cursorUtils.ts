/**
 * Adjust a cursor position (character index) to account for a Y.Text event delta.
 *
 * Delta format: Array of { retain?: N } | { insert?: string|object } | { delete?: N }
 *
 * Returns the new character index after the remote edit has been applied.
 */
export function adjustCursorForDelta(
    delta: Array<{ retain?: number; insert?: string | object; delete?: number }>,
    oldCursorPos: number,
): number {
    let oldIndex = 0;
    let shift = 0;

    for (const op of delta) {
        if (oldIndex >= oldCursorPos) break;

        if (op.retain != null) {
            oldIndex += op.retain;
        } else if (op.insert != null) {
            const len = typeof op.insert === 'string' ? op.insert.length : 1;
            // Insert before or at cursor → shift right
            if (oldIndex <= oldCursorPos) shift += len;
        } else if (op.delete != null) {
            const deleteEnd = oldIndex + op.delete;
            if (oldCursorPos <= deleteEnd) {
                // Cursor is inside the deleted range → move to deletion start
                shift -= oldCursorPos - oldIndex;
                return Math.max(0, oldCursorPos + shift);
            }
            // Cursor is after deleted range → shift left
            shift -= op.delete;
            oldIndex += op.delete;
        }
    }

    return Math.max(0, oldCursorPos + shift);
}

/**
 * Convert a plain-text character offset to a ProseMirror document position.
 * Mirrors the counting convention of doc.textBetween(0, pos, '\n', '\n').
 */
export function textOffsetToPos(doc: any, targetOffset: number): number {
    if (targetOffset <= 0) return 0;
    let textSeen = 0;

    function walk(node: any, pos: number): number | null {
        if (node.isText) {
            if (textSeen + node.nodeSize >= targetOffset) {
                return pos + (targetOffset - textSeen);
            }
            textSeen += node.nodeSize;
            return null;
        }
        let childPos = pos + 1;
        for (let i = 0; i < node.childCount; i++) {
            const child = node.child(i);
            if (i > 0 && node.isBlock && child.isBlock) {
                textSeen += 1;
                if (textSeen >= targetOffset) return childPos;
            }
            const result = walk(child, childPos);
            if (result !== null) return result;
            childPos += child.nodeSize;
        }
        return null;
    }

    return walk(doc, 0) ?? Math.min(targetOffset, doc.content.size);
}
