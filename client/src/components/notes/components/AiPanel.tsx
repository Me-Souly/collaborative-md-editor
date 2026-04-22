import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SparklesIcon, ArrowRightIcon } from '@components/common/ui/icons';
import { chatStream, inlineAction, ChatMessage, InlineAction } from '@service/AiService';
import * as styles from './AiPanel.module.css';

const QUICK_ACTIONS: { label: string; action: InlineAction | '_summarize' }[] = [
    { label: 'Summarize note', action: '_summarize' },
    { label: 'Key points', action: '_keypoints' as any },
];

interface AiPanelProps {
    markdown: string;
    selectedText?: string | null;
}

export const AiPanel: React.FC<AiPanelProps> = ({ markdown, selectedText }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [streaming, setStreaming] = useState(false);
    const [includeContext, setIncludeContext] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    // Scroll to bottom on new content
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Auto-resize textarea
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    };

    const sendMessage = useCallback(async (userText: string) => {
        const trimmed = userText.trim();
        if (!trimmed || streaming) return;

        const newMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
        setMessages([...newMessages, { role: 'assistant', content: '' }]);
        setInput('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        setStreaming(true);

        abortRef.current = new AbortController();

        try {
            let accumulated = '';
            const noteContent = includeContext ? markdown : undefined;
            for await (const chunk of chatStream(newMessages, noteContent, abortRef.current.signal)) {
                accumulated += chunk;
                setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: 'assistant', content: accumulated };
                    return updated;
                });
            }
        } catch (err: any) {
            if (err.name === 'AbortError') return;
            setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                    role: 'assistant',
                    content: '⚠️ ' + (err.message || 'Something went wrong'),
                };
                return updated;
            });
        } finally {
            setStreaming(false);
            abortRef.current = null;
        }
    }, [messages, streaming, includeContext, markdown]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    };

    const handleQuickAction = async (action: string) => {
        if (streaming) return;
        if (action === '_summarize') {
            sendMessage('Please summarize this note for me.');
        } else if (action === '_keypoints') {
            sendMessage('What are the key points of this note?');
        }
    };

    const handleStop = () => {
        abortRef.current?.abort();
    };

    const isLastStreaming = streaming && messages.length > 0 && messages[messages.length - 1].role === 'assistant';

    return (
        <div className={styles.panel}>
            <div className={styles.quickActions}>
                {QUICK_ACTIONS.map(q => (
                    <button
                        key={q.action}
                        className={styles.chip}
                        onClick={() => handleQuickAction(q.action)}
                        disabled={streaming}
                    >
                        {q.label}
                    </button>
                ))}
                {selectedText && (
                    <button
                        className={styles.chip}
                        onClick={() => sendMessage(`Improve this text: "${selectedText}"`)}
                        disabled={streaming}
                        title={selectedText}
                    >
                        <SparklesIcon className={styles.chipIcon} /> Improve selection
                    </button>
                )}
            </div>

            <div className={styles.messages}>
                {messages.length === 0 ? (
                    <div className={styles.empty}>
                        <SparklesIcon className={styles.emptyIcon} />
                        <span>Ask anything about your note</span>
                    </div>
                ) : (
                    messages.map((msg, i) => {
                        const isStreamingThis = isLastStreaming && i === messages.length - 1;
                        return (
                            <div
                                key={i}
                                className={`${styles.message} ${msg.role === 'user' ? styles.messageUser : ''}`}
                            >
                                <span className={styles.messageRole}>
                                    {msg.role === 'user' ? 'You' : 'AI'}
                                </span>
                                <div className={styles.messageBubble}>
                                    {msg.content || (isStreamingThis ? '' : '…')}
                                    {isStreamingThis && <span className={styles.cursor} />}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className={styles.footer}>
                <label className={styles.contextToggle}>
                    <input
                        type="checkbox"
                        checked={includeContext}
                        onChange={e => setIncludeContext(e.target.checked)}
                    />
                    Include note context
                </label>
                <div className={styles.inputRow}>
                    <textarea
                        ref={textareaRef}
                        className={styles.textarea}
                        placeholder="Ask AI… (Enter to send, Shift+Enter for newline)"
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        rows={3}
                        disabled={streaming}
                    />
                    {streaming ? (
                        <button className={styles.sendBtn} onClick={handleStop} title="Stop">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><rect x="1" y="1" width="10" height="10" rx="2"/></svg>
                        </button>
                    ) : (
                        <button
                            className={styles.sendBtn}
                            onClick={() => sendMessage(input)}
                            disabled={!input.trim()}
                            title="Send"
                        >
                            <ArrowRightIcon className={styles.sendIcon} />
                        </button>
                    )}
                </div>
                {messages.length > 0 && !streaming && (
                    <button className={styles.clearBtn} onClick={() => setMessages([])}>
                        Clear conversation
                    </button>
                )}
            </div>
        </div>
    );
};
