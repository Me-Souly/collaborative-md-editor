import React, { useEffect, useRef, useState } from 'react';
import { XIcon, ChevronDownIcon, ChevronRightIcon } from '@components/common/ui/icons';
import {
    findPluginKey,
    setFindQuery,
    findNext,
    findPrev,
    replaceCurrentMatch,
    replaceAllMatches,
    type FindState,
} from '@features/find/find-plugin';
import * as styles from './FindBar.module.css';

interface FindBarProps {
    editorViewRef: { current: any };
    onClose: () => void;
}

export const FindBar: React.FC<FindBarProps> = ({ editorViewRef, onClose }) => {
    const [query, setQuery] = useState('');
    const [replacement, setReplacement] = useState('');
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [showReplace, setShowReplace] = useState(false);
    const [matchInfo, setMatchInfo] = useState<{ current: number; total: number } | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);

    // Focus on mount
    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 30);
    }, []);

    // Sync query → plugin
    useEffect(() => {
        const view = editorViewRef.current;
        if (!view) return;
        setFindQuery(view, query, caseSensitive);
    }, [query, caseSensitive, editorViewRef]);

    // Read match count from plugin state after dispatch
    useEffect(() => {
        const view = editorViewRef.current;
        if (!view) return;
        const update = () => {
            const ps = findPluginKey.getState(view.state) as FindState | undefined;
            if (!ps || !ps.query) { setMatchInfo(null); return; }
            setMatchInfo({ current: ps.current + 1, total: ps.matches.length });
        };
        // Poll on every render — lightweight enough
        update();
    });

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) handlePrev();
            else handleNext();
        }
        if (e.key === 'Escape') {
            handleClose();
        }
    };

    const handleNext = () => {
        const view = editorViewRef.current;
        if (view) findNext(view);
    };

    const handlePrev = () => {
        const view = editorViewRef.current;
        if (view) findPrev(view);
    };

    const handleReplace = () => {
        const view = editorViewRef.current;
        if (view) { replaceCurrentMatch(view, replacement); findNext(view); }
    };

    const handleReplaceAll = () => {
        const view = editorViewRef.current;
        if (view) replaceAllMatches(view, replacement);
    };

    const handleClose = () => {
        const view = editorViewRef.current;
        if (view) setFindQuery(view, '');
        onClose();
    };

    return (
        <div className={styles.findBar}>
            <button
                className={styles.collapseBtn}
                onClick={() => setShowReplace(v => !v)}
                title={showReplace ? 'Hide replace' : 'Show replace'}
            >
                {showReplace
                    ? <ChevronDownIcon className={styles.icon} />
                    : <ChevronRightIcon className={styles.icon} />
                }
            </button>

            <div className={styles.fields}>
                {/* Find row */}
                <div className={styles.row}>
                    <input
                        ref={inputRef}
                        className={styles.input}
                        placeholder="Find…"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        spellCheck={false}
                    />
                    {matchInfo !== null && (
                        <span className={styles.matchCount}>
                            {matchInfo.total === 0 ? 'No results' : `${matchInfo.current}/${matchInfo.total}`}
                        </span>
                    )}
                    <button
                        className={`${styles.iconBtn}${caseSensitive ? ` ${styles.iconBtnActive}` : ''}`}
                        onClick={() => setCaseSensitive(v => !v)}
                        title="Case sensitive"
                    >
                        Aa
                    </button>
                    <button className={styles.iconBtn} onClick={handlePrev} title="Previous (Shift+Enter)">
                        <ChevronRightIcon className={`${styles.icon} ${styles.rotated}`} />
                    </button>
                    <button className={styles.iconBtn} onClick={handleNext} title="Next (Enter)">
                        <ChevronDownIcon className={styles.icon} />
                    </button>
                </div>

                {/* Replace row */}
                {showReplace && (
                    <div className={styles.row}>
                        <input
                            className={styles.input}
                            placeholder="Replace with…"
                            value={replacement}
                            onChange={e => setReplacement(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Escape') handleClose(); }}
                            spellCheck={false}
                        />
                        <button className={styles.replaceBtn} onClick={handleReplace} title="Replace">
                            Replace
                        </button>
                        <button className={styles.replaceBtn} onClick={handleReplaceAll} title="Replace all">
                            All
                        </button>
                    </div>
                )}
            </div>

            <button className={styles.closeBtn} onClick={handleClose} title="Close (Esc)">
                <XIcon className={styles.icon} />
            </button>
        </div>
    );
};
