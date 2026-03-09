import React, { useEffect, useRef, useState } from 'react';
import { type RemoteCursorState } from '@hooks/useAwareness';
import * as styles from '@components/notes/components/TextareaCursors.module.css';

interface CaretPos {
    top: number;
    left: number;
}

// Cached canvas context for measuring monospace character width
let cachedCharWidth: number | null = null;
let cachedFont = '';

function getCharWidth(textarea: HTMLTextAreaElement): number {
    const font = getComputedStyle(textarea).font;
    if (cachedFont === font && cachedCharWidth !== null) return cachedCharWidth;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    ctx.font = font;
    cachedCharWidth = ctx.measureText('m').width;
    cachedFont = font;
    return cachedCharWidth;
}

function getCaretPixelPos(textarea: HTMLTextAreaElement, charIndex: number): CaretPos {
    const text = textarea.value.substring(0, charIndex);
    const lines = text.split('\n');
    const row = lines.length - 1;
    const col = lines[lines.length - 1].length;

    const style = getComputedStyle(textarea);
    const charWidth = getCharWidth(textarea);
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.6;
    const paddingTop = parseFloat(style.paddingTop) || 24;
    const paddingLeft = parseFloat(style.paddingLeft) || 32;

    return {
        top: paddingTop + row * lineHeight - textarea.scrollTop,
        left: paddingLeft + col * charWidth - textarea.scrollLeft,
    };
}

interface TextareaCursorsProps {
    textarea: { current: HTMLTextAreaElement | null };
    cursors: RemoteCursorState[];
}

export const TextareaCursors: React.FC<TextareaCursorsProps> = ({ textarea, cursors }) => {
    const [, forceUpdate] = useState(0);
    const rafRef = useRef<number | null>(null);

    // Re-render on textarea scroll
    useEffect(() => {
        const el = textarea.current;
        if (!el) return;
        const onScroll = () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => forceUpdate(n => n + 1));
        };
        el.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            el.removeEventListener('scroll', onScroll);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [textarea]);

    const el = textarea.current;
    if (!el || cursors.length === 0) return null;

    const activeCursors = cursors.filter(c => c.cursor !== null);
    if (activeCursors.length === 0) return null;

    return (
        <div className={styles.overlay} aria-hidden="true">
            {activeCursors.map(cursor => {
                const { anchor, head } = cursor.cursor!;
                const caretPos = getCaretPixelPos(el, head);
                const from = Math.min(anchor, head);
                const to = Math.max(anchor, head);

                return (
                    <React.Fragment key={cursor.clientId}>
                        {/* Selection highlight — one highlight span per selected line segment */}
                        {from !== to && (
                            <SelectionHighlight
                                textarea={el}
                                from={from}
                                to={to}
                                color={cursor.user.color}
                            />
                        )}
                        {/* Caret line */}
                        <div
                            className={styles.caret}
                            style={{
                                top: caretPos.top,
                                left: caretPos.left,
                                borderLeftColor: cursor.user.color,
                            }}
                        />
                        {/* Username label */}
                        <div
                            className={styles.label}
                            style={{
                                top: caretPos.top - 20,
                                left: caretPos.left,
                                backgroundColor: cursor.user.color,
                            }}
                        >
                            {cursor.user.name}
                        </div>
                    </React.Fragment>
                );
            })}
        </div>
    );
};

interface SelectionHighlightProps {
    textarea: HTMLTextAreaElement;
    from: number;
    to: number;
    color: string;
}

const SelectionHighlight: React.FC<SelectionHighlightProps> = ({ textarea, from, to, color }) => {
    const text = textarea.value;

    // Iterate over selected lines and draw one highlight rect per line
    const segments: { top: number; left: number; width: number }[] = [];

    const style = getComputedStyle(textarea);
    const charWidth = getCharWidth(textarea);
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.6;
    const paddingTop = parseFloat(style.paddingTop) || 24;
    const paddingLeft = parseFloat(style.paddingLeft) || 32;

    let charIndex = 0;
    let lineIndex = 0;
    const lines = text.split('\n');

    for (const line of lines) {
        const lineStart = charIndex;
        const lineEnd = charIndex + line.length;

        if (lineEnd >= from && lineStart <= to) {
            const segFrom = Math.max(from, lineStart);
            const segTo = Math.min(to, lineEnd);
            const colFrom = segFrom - lineStart;
            const colTo = segTo - lineStart;
            const top = paddingTop + lineIndex * lineHeight - textarea.scrollTop;
            const left = paddingLeft + colFrom * charWidth - textarea.scrollLeft;
            const width = Math.max((colTo - colFrom) * charWidth, 2);
            segments.push({ top, left, width });
        }

        charIndex = lineEnd + 1; // +1 for the \n
        lineIndex++;
        if (charIndex > to) break;
    }

    return (
        <>
            {segments.map((seg, i) => (
                <div
                    key={i}
                    className={styles.selection}
                    style={{
                        top: seg.top,
                        left: seg.left,
                        width: seg.width,
                        height: lineHeight,
                        backgroundColor: color + '33', // 20% opacity
                    }}
                />
            ))}
        </>
    );
};
