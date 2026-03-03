import React, { useState } from 'react';
import { XIcon, MessageSquareIcon, SparklesIcon, ArrowRightIcon } from '@components/common/ui/icons';
import * as styles from '@components/notes/NoteViewer.module.css';

type RightPanelTab = 'comments' | 'ai';

interface EditorRightPanelProps {
    tab: RightPanelTab | null;
    onClose: () => void;
    onTabChange: (tab: RightPanelTab) => void;
}

export const EditorRightPanel: React.FC<EditorRightPanelProps> = ({ tab, onClose, onTabChange }) => {
    const [commentText, setCommentText] = useState('');

    return (
        <div
            className={styles.rightPanel}
            style={{ width: tab ? 280 : 0 }}
            aria-hidden={!tab}
        >
            {tab && (
                <div className={styles.rightPanelInner}>
                    {/* Header with tab switcher */}
                    <div className={styles.rightPanelHeader}>
                        <div className={styles.rightPanelTabs}>
                            <button
                                className={`${styles.rightPanelTab} ${tab === 'comments' ? styles.rightPanelTabActive : ''}`}
                                onClick={() => onTabChange('comments')}
                            >
                                Comments
                            </button>
                            <button
                                className={`${styles.rightPanelTab} ${tab === 'ai' ? styles.rightPanelTabActive : ''}`}
                                onClick={() => onTabChange('ai')}
                            >
                                AI
                            </button>
                        </div>
                        <button className={styles.rightPanelClose} onClick={onClose} title="Close panel">
                            <XIcon className={styles.toolbarIcon} />
                        </button>
                    </div>

                    {/* Comments tab */}
                    {tab === 'comments' && (
                        <div className={styles.rightPanelContent}>
                            <div className={styles.rightPanelEmpty}>
                                <MessageSquareIcon className={styles.rightPanelEmptyIcon} />
                                <p className={styles.rightPanelEmptyTitle}>No comments yet</p>
                                <p className={styles.rightPanelEmptyHint}>
                                    Select text and click Comment to start
                                </p>
                            </div>
                            <div className={styles.rightPanelInputRow}>
                                <input
                                    className={styles.rightPanelInput}
                                    placeholder="Add a comment..."
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                />
                                <button
                                    className={styles.rightPanelSend}
                                    title="Send"
                                    disabled={!commentText}
                                >
                                    <ArrowRightIcon className={styles.toolbarIcon} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* AI tab */}
                    {tab === 'ai' && (
                        <div className={styles.rightPanelContent}>
                            <div className={styles.rightPanelEmpty}>
                                <SparklesIcon className={styles.rightPanelEmptyIcon} />
                                <p className={styles.rightPanelEmptyTitle}>AI Assistant</p>
                                <p className={styles.rightPanelEmptyHint}>Coming soon</p>
                            </div>
                            <div className={styles.rightPanelAiFeatures}>
                                {['Summarize note', 'Fix grammar', 'Translate', 'Ask about content'].map((f) => (
                                    <div key={f} className={styles.rightPanelAiFeature}>
                                        <span className={styles.rightPanelAiDot}>•</span> {f}
                                    </div>
                                ))}
                            </div>
                            <div className={styles.rightPanelInputRow}>
                                <input
                                    className={styles.rightPanelInput}
                                    placeholder="Coming soon..."
                                    disabled
                                    style={{ opacity: 0.5, cursor: 'not-allowed' }}
                                />
                                <button className={styles.rightPanelSend} disabled style={{ opacity: 0.4 }}>
                                    <ArrowRightIcon className={styles.toolbarIcon} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
