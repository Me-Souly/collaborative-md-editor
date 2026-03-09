import { useCallback, useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';

const CURSOR_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
];

export interface RemoteCursorState {
    clientId: number;
    user: { name: string; color: string };
    cursor: { anchor: number; head: number } | null;
}

export function useAwareness(
    awareness: any | null,
    yText: any | null,
    userName: string,
) {
    const [remoteCursors, setRemoteCursors] = useState<RemoteCursorState[]>([]);
    const colorRef = useRef<string>('');

    // Set local user info once awareness is available
    useEffect(() => {
        if (!awareness) return;
        colorRef.current = CURSOR_COLORS[awareness.clientID % CURSOR_COLORS.length];
        awareness.setLocalStateField('user', {
            name: userName,
            color: colorRef.current,
        });
    }, [awareness, userName]);

    // Broadcast local cursor position using Y.RelativePosition (stable across concurrent edits)
    const broadcastCursor = useCallback((anchor: number, head: number) => {
        if (!awareness || !yText) return;
        const doc = yText.doc;
        if (!doc) return;
        try {
            awareness.setLocalStateField('cursor', {
                anchor: Y.createRelativePositionFromTypeIndex(yText, Math.max(0, anchor)),
                head: Y.createRelativePositionFromTypeIndex(yText, Math.max(0, head)),
            });
        } catch {
            // yText may not be ready
        }
    }, [awareness, yText]);

    const clearCursor = useCallback(() => {
        if (!awareness) return;
        awareness.setLocalStateField('cursor', null);
    }, [awareness]);

    // Subscribe to remote awareness changes
    useEffect(() => {
        if (!awareness || !yText) return;
        const doc = yText.doc;
        if (!doc) return;

        const update = () => {
            const states: RemoteCursorState[] = [];
            awareness.getStates().forEach((state: any, clientId: number) => {
                if (clientId === awareness.clientID) return;
                if (!state.user) return;

                let cursor: { anchor: number; head: number } | null = null;
                if (state.cursor) {
                    try {
                        const anchorAbs = Y.createAbsolutePositionFromRelativePosition(
                            state.cursor.anchor, doc,
                        );
                        const headAbs = Y.createAbsolutePositionFromRelativePosition(
                            state.cursor.head, doc,
                        );
                        if (anchorAbs && headAbs) {
                            cursor = { anchor: anchorAbs.index, head: headAbs.index };
                        }
                    } catch {
                        // Relative position not resolvable yet
                    }
                }

                states.push({ clientId, user: state.user, cursor });
            });
            setRemoteCursors(states);
        };

        awareness.on('change', update);
        update();
        return () => awareness.off('change', update);
    }, [awareness, yText]);

    return { remoteCursors, broadcastCursor, clearCursor };
}
