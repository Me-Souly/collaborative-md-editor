import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SparklesIcon } from '@components/common/ui/icons';
import { inlineAction, InlineAction } from '@service/AiService';
import * as styles from './InlineAiMenu.module.css';

const ACTIONS: { label: string; action: InlineAction }[] = [
    { label: 'Improve', action: 'improve' },
    { label: 'Fix', action: 'fix' },
    { label: 'Expand', action: 'expand' },
    { label: 'Translate', action: 'translate' },
    { label: 'Continue', action: 'continue' },
];

interface InlineAiMenuProps {
    selection: { text: string; from: number; to: number; rect: DOMRect; doReplace: (md: string) => void; doInsertAfter: (md: string) => void; } | null;
    markdown: string;
    onReplace: (result: string) => void;
    onInsertAfter: (result: string) => void;
    onDismiss: () => void;
}

type Phase = 'idle' | 'loading' | 'result';

export const InlineAiMenu: React.FC<InlineAiMenuProps> = ({
    selection,
    markdown,
    onReplace,
    onInsertAfter,
    onDismiss,
}) => {
    const [phase, setPhase] = useState<Phase>('idle');
    const [result, setResult] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Reset to idle when selection changes
    useEffect(() => {
        setPhase('idle');
        setResult('');
    }, [selection?.text, selection?.from]);

    // Close on outside click
    useEffect(() => {
        if (!selection) return;
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                onDismiss();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [selection, onDismiss]);

    if (!selection) return null;

    const { rect } = selection;
    const top = rect.top - 44; // above selection
    const left = rect.left;

    const handleAction = async (action: InlineAction) => {
        setPhase('loading');
        try {
            const res = await inlineAction(action, selection.text, markdown);
            setResult(res);
            setPhase('result');
        } catch (err: any) {
            setResult('⚠️ ' + (err.message || 'Request failed'));
            setPhase('result');
        }
    };

    const handleReplace = () => {
        onReplace(result);
        onDismiss();
    };

    const handleInsertAfter = () => {
        onInsertAfter(result);
        onDismiss();
    };

    const menu = (
        <div
            ref={wrapperRef}
            className={styles.wrapper}
            style={{ top: Math.max(8, top), left: Math.max(8, left) }}
        >
            {phase === 'idle' && (
                <div className={styles.actionBar}>
                    <SparklesIcon className={styles.aiIcon} />
                    <span className={styles.sep} />
                    {ACTIONS.map((a, i) => (
                        <React.Fragment key={a.action}>
                            {i > 0 && <span className={styles.sep} />}
                            <button
                                className={styles.actionBtn}
                                onClick={() => handleAction(a.action)}
                            >
                                {a.label}
                            </button>
                        </React.Fragment>
                    ))}
                </div>
            )}
            {phase === 'loading' && (
                <div className={styles.loading}>
                    <span className={styles.spinner} />
                    Generating…
                </div>
            )}
            {phase === 'result' && (
                <div className={styles.resultPopup}>
                    <div className={styles.resultText}>{result}</div>
                    <div className={styles.resultActions}>
                        <button className={`${styles.resultBtn} ${styles.resultBtnPrimary}`} onClick={handleReplace}>
                            Replace
                        </button>
                        <button className={styles.resultBtn} onClick={handleInsertAfter}>
                            Insert after
                        </button>
                        <button className={styles.resultBtn} onClick={() => setPhase('idle')}>
                            Back
                        </button>
                        <button className={styles.resultBtn} onClick={onDismiss}>
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    return createPortal(menu, document.body);
};
