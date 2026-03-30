import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HomeIcon, ChevronRightIcon, UserIcon } from '@components/common/ui/icons';
import * as styles from '@components/common/layout/topbar/TopBar.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

interface TopBarBreadcrumbsProps {
    noteTitle?: string;
    noteOwnerId?: string;
    noteOwnerLogin?: string;
    noteOwnerName?: string;
    isOwner?: boolean;
    onRename?: (newTitle: string) => Promise<void>;
    autoFocusTitle?: boolean;
    onTitleConfirmed?: () => void;
}

export const TopBarBreadcrumbs: React.FC<TopBarBreadcrumbsProps> = ({
    noteTitle,
    noteOwnerId,
    noteOwnerLogin,
    noteOwnerName,
    isOwner = false,
    onRename,
    autoFocusTitle = false,
    onTitleConfirmed,
}) => {
    const navigate = useNavigate();
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const hasAutoFocusedRef = useRef(false);

    useEffect(() => {
        if (editing) inputRef.current?.select();
    }, [editing]);

    // Auto-enter edit mode for newly created notes
    useEffect(() => {
        if (autoFocusTitle && noteTitle && isOwner && onRename && !hasAutoFocusedRef.current) {
            hasAutoFocusedRef.current = true;
            setValue(noteTitle);
            setEditing(true);
        }
    }, [autoFocusTitle, noteTitle, isOwner, onRename]);

    const startEditing = () => {
        if (!isOwner || !onRename) return;
        setValue(noteTitle || '');
        setEditing(true);
    };

    const confirm = async (): Promise<boolean> => {
        const trimmed = value.trim();
        if (trimmed && trimmed !== noteTitle && onRename) {
            try {
                await onRename(trimmed);
            } catch (error) {
                // Revert to original title on failure
                setValue(noteTitle || '');
                return false;
            }
        }
        setEditing(false);
        return true;
    };
    const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const success = await confirm();
            if (success) onTitleConfirmed?.();
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            setEditing(false);
        }
    };

    return (
        <div className={styles.left}>
            {/* Home — icon only when a note is open, icon + text on home */}
            <button
                className={cn(
                    styles.button,
                    styles.buttonGhost,
                    styles.homeButton,
                    noteTitle && styles.homeButtonIconOnly,
                )}
                onClick={() => navigate('/')}
                title="Home"
            >
                <HomeIcon className={styles.homeIcon} />
                {!noteTitle && <span className={styles.homeText}>Home</span>}
            </button>

            {noteTitle && (
                <>
                    <ChevronRightIcon className={styles.breadcrumbChevron} />

                    {editing ? (
                        <input
                            ref={inputRef}
                            className={styles.breadcrumbInput}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onBlur={confirm}
                            onKeyDown={handleKeyDown}
                        />
                    ) : (
                        <span
                            className={cn(
                                styles.breadcrumbItem,
                                styles.breadcrumbItemActive,
                                isOwner && onRename && styles.breadcrumbItemEditable,
                            )}
                            onClick={startEditing}
                            title={isOwner && onRename ? 'Click to rename' : undefined}
                        >
                            {noteTitle}
                        </span>
                    )}

                    {(noteOwnerLogin || noteOwnerId) && (
                        <span className={styles.ownerLink}>
                            <ChevronRightIcon className={styles.breadcrumbChevron} />
                            <button
                                className={styles.ownerLinkButton}
                                onClick={() => {
                                    const identifier = noteOwnerLogin || noteOwnerId;
                                    navigate(`/user/${identifier}`);
                                }}
                                title={`View ${noteOwnerName || noteOwnerLogin || 'owner'}'s profile`}
                            >
                                <UserIcon className={styles.ownerLinkIcon} />
                                <span className={styles.ownerLinkText}>
                                    {noteOwnerName || noteOwnerLogin || 'Owner'}
                                </span>
                            </button>
                        </span>
                    )}
                </>
            )}
        </div>
    );
};
