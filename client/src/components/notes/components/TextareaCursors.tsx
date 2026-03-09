import React, { useEffect, useRef, useState } from 'react';
import { type RemoteCursorState } from '@hooks/useAwareness';
import * as styles from '@components/notes/components/TextareaCursors.module.css';

interface CaretPos {
    top: number;
    left: number;
    height: number;
}

// Mirror div approach — the only accurate way to find caret position in a textarea.
// Creates a hidden div that replicates the textarea's styles and measures a marker span.
let mirrorDiv: HTMLDivElement | null = null;

const MIRROR_STYLES: Array<keyof CSSStyleDeclaration> = [
    'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontVariant',
    'letterSpacing', 'wordSpacing', 'lineHeight', 'textIndent', 'textTransform',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'boxSizing', 'wordBreak', 'whiteSpace', 'overflowWrap', 'tabSize',
];

function getOrCreateMirror(): HTMLDivElement {
    if (!mirrorDiv) {
        mirrorDiv = document.createElement('div');
        mirrorDiv.setAttribute('aria-hidden', 'true');
        Object.assign(mirrorDiv.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            visibility: 'hidden',
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: '-9999',
        });
        document.body.appendChild(mirrorDiv);
    }
    return mirrorDiv;
}

function getCaretPixelPos(textarea: HTMLTextAreaElement, charIndex: number): CaretPos {
    const mirror = getOrCreateMirror();
    const computed = getComputedStyle(textarea);

    // Copy textarea dimensions and styles to mirror
    mirror.style.width = textarea.clientWidth + 'px';
    mirror.style.height = textarea.clientHeight + 'px';

    for (const prop of MIRROR_STYLES) {
        (mirror.style as any)[prop] = computed[prop];
    }

    // Clamp charIndex
    const text = textarea.value;
    const safeIndex = Math.max(0, Math.min(charIndex, text.length));

    // Build mirror content: text before cursor + marker + text after
    const before = document.createTextNode(text.substring(0, safeIndex));
    const marker = document.createElement('span');
    marker.textContent = '\u200b'; // zero-width space as measurement anchor
    const after = document.createTextNode(text.substring(safeIndex));

    mirror.textContent = '';
    mirror.appendChild(before);
    mirror.appendChild(marker);
    mirror.appendChild(after);

    // Position mirror to overlay textarea (account for scroll)
    const taRect = textarea.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();

    const top = markerRect.top - taRect.top + textarea.scrollTop;
    const left = markerRect.left - taRect.left + textarea.scrollLeft;
    const height = markerRect.height || parseFloat(computed.lineHeight) || parseFloat(computed.fontSize) * 1.4;

    // Adjust for textarea scroll
    return {
        top: top - textarea.scrollTop,
        left: left - textarea.scrollLeft,
        height,
    };
}

interface TextareaCursorsProps {
    textarea: { current: HTMLTextAreaElement | null };
    cursors: RemoteCursorState[];
}

export const TextareaCursors: React.FC<TextareaCursorsProps> = ({ textarea, cursors }) => {
    const [, forceUpdate] = useState(0);
    const rafRef = useRef<number | null>(null);

    // Re-render on textarea scroll or resize (e.g. panel resizer drag)
    useEffect(() => {
        const el = textarea.current;
        if (!el) return;

        const scheduleUpdate = () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => forceUpdate(n => n + 1));
        };

        el.addEventListener('scroll', scheduleUpdate, { passive: true });

        const ro = new ResizeObserver(scheduleUpdate);
        ro.observe(el);

        return () => {
            el.removeEventListener('scroll', scheduleUpdate);
            ro.disconnect();
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [textarea]);

    const el = textarea.current;
    if (!el) return null;

    const activeCursors = cursors.filter(c => c.cursor !== null);
    if (activeCursors.length === 0) return null;

    return (
        <div className={styles.overlay} aria-hidden="true">
            {activeCursors.map(cursor => {
                const { anchor, head } = cursor.cursor!;
                const caretPos = getCaretPixelPos(el, head);

                return (
                    <React.Fragment key={cursor.clientId}>
                        {anchor !== head && (
                            <SelectionHighlight
                                textarea={el}
                                from={Math.min(anchor, head)}
                                to={Math.max(anchor, head)}
                                color={cursor.user.color}
                            />
                        )}
                        <div
                            className={styles.caret}
                            style={{
                                top: caretPos.top,
                                left: caretPos.left,
                                height: caretPos.height,
                                borderLeftColor: cursor.user.color,
                            }}
                        />
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

// Renders selection by measuring start and end positions via the mirror div
const SelectionHighlight: React.FC<SelectionHighlightProps> = ({ textarea, from, to, color }) => {
    const startPos = getCaretPixelPos(textarea, from);
    const endPos = getCaretPixelPos(textarea, to);
    const lineHeight = startPos.height;

    // Single line
    if (Math.abs(startPos.top - endPos.top) < lineHeight * 0.5) {
        return (
            <div
                className={styles.selection}
                style={{
                    top: startPos.top,
                    left: startPos.left,
                    width: Math.max(endPos.left - startPos.left, 2),
                    height: lineHeight,
                    backgroundColor: color + '33',
                }}
            />
        );
    }

    // Multi-line: measure each line boundary
    const segments: { top: number; left: number; width: number }[] = [];
    const computed = getComputedStyle(textarea);
    const paddingLeft = parseFloat(computed.paddingLeft) || 0;
    const textareaWidth = textarea.clientWidth - parseFloat(computed.paddingRight || '0');

    // First line: from startPos to right edge
    segments.push({
        top: startPos.top,
        left: startPos.left,
        width: textareaWidth - startPos.left,
    });

    // Middle lines
    let lineTop = startPos.top + lineHeight;
    while (lineTop < endPos.top - lineHeight * 0.5) {
        segments.push({ top: lineTop, left: paddingLeft, width: textareaWidth - paddingLeft });
        lineTop += lineHeight;
    }

    // Last line: from left edge to endPos
    if (endPos.left > paddingLeft) {
        segments.push({ top: endPos.top, left: paddingLeft, width: endPos.left - paddingLeft });
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
                        width: Math.max(seg.width, 2),
                        height: lineHeight,
                        backgroundColor: color + '33',
                    }}
                />
            ))}
        </>
    );
};
