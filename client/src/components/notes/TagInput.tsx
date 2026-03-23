import React, { useState, useEffect, useRef, useCallback } from 'react';
import $api from '@http';
import * as styles from './TagInput.module.css';

interface Tag {
    id: string;
    name: string;
    slug: string;
}

interface TagInputProps {
    noteId: string;
    initialTags: Tag[];
    canEdit: boolean;
    onTagsChange?: (tags: Tag[]) => void;
}

export const TagInput: React.FC<TagInputProps> = ({ noteId, initialTags, canEdit, onTagsChange }) => {
    const [tags, setTags] = useState<Tag[]>(initialTags);
    const [input, setInput] = useState('');
    const [suggestions, setSuggestions] = useState<Tag[]>([]);
    const [allTags, setAllTags] = useState<Tag[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        $api.get('/tags').then((res) => {
            setAllTags(Array.isArray(res.data) ? res.data.map((t: any) => ({ id: t._id, name: t.name, slug: t.slug })) : []);
        }).catch(() => {});
    }, []);

    useEffect(() => {
        setTags(initialTags);
    }, [noteId, initialTags]);

    const saveTags = useCallback((nextTags: Tag[]) => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(async () => {
            try {
                const res = await $api.patch(`/notes/${noteId}/tags`, {
                    tags: nextTags.map((t) => t.name),
                });
                const saved: Tag[] = Array.isArray(res.data)
                    ? res.data.map((t: any) => ({ id: t.id, name: t.name, slug: t.slug }))
                    : nextTags;
                setTags(saved);
                onTagsChange?.(saved);
                setAllTags((prev) => {
                    const names = new Set(prev.map((t) => t.name));
                    return [...prev, ...saved.filter((t) => !names.has(t.name))];
                });
            } catch {}
        }, 600);
    }, [noteId, onTagsChange]);

    const addTag = (name: string) => {
        const trimmed = name.trim().toLowerCase();
        if (!trimmed) return;
        if (tags.some((t) => t.name === trimmed)) {
            setInput('');
            setShowDropdown(false);
            return;
        }
        const existing = allTags.find((t) => t.name === trimmed);
        const newTag: Tag = existing ?? { id: '', name: trimmed, slug: trimmed };
        const next = [...tags, newTag];
        setTags(next);
        setInput('');
        setShowDropdown(false);
        saveTags(next);
    };

    const removeTag = (name: string) => {
        const next = tags.filter((t) => t.name !== name);
        setTags(next);
        saveTags(next);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInput(val);
        if (val.trim()) {
            const q = val.toLowerCase();
            const filtered = allTags
                .filter((t) => t.name.includes(q) && !tags.some((existing) => existing.name === t.name))
                .slice(0, 6);
            setSuggestions(filtered);
            setShowDropdown(true);
        } else {
            setShowDropdown(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(input);
        } else if (e.key === 'Backspace' && !input && tags.length > 0) {
            removeTag(tags[tags.length - 1].name);
        } else if (e.key === 'Escape') {
            setShowDropdown(false);
        }
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handleClick = (e: Event) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('pointerdown', handleClick);
        return () => document.removeEventListener('pointerdown', handleClick);
    }, []);

    if (!canEdit && tags.length === 0) return null;

    return (
        <div className={styles.wrapper} ref={containerRef}>
            <div
                className={styles.container}
                onClick={() => canEdit && inputRef.current?.focus()}
            >
                {tags.map((tag) => (
                    <span key={tag.name} className={styles.tag}>
                        #{tag.name}
                        {canEdit && (
                            <button
                                className={styles.removeBtn}
                                onClick={(e) => { e.stopPropagation(); removeTag(tag.name); }}
                                title="Remove tag"
                            >
                                ×
                            </button>
                        )}
                    </span>
                ))}
                {canEdit && (
                    <input
                        ref={inputRef}
                        className={styles.input}
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onFocus={() => { if (input) setShowDropdown(true); }}
                        placeholder={tags.length === 0 ? 'Add tags...' : ''}
                    />
                )}
            </div>
            {showDropdown && suggestions.length > 0 && (
                <div className={styles.dropdown}>
                    {suggestions.map((s) => (
                        <button
                            key={s.name}
                            className={styles.suggestion}
                            onMouseDown={(e) => { e.preventDefault(); addTag(s.name); }}
                        >
                            #{s.name}
                        </button>
                    ))}
                    {input && !allTags.some((t) => t.name === input.trim().toLowerCase()) && (
                        <button
                            className={styles.suggestionNew}
                            onMouseDown={(e) => { e.preventDefault(); addTag(input); }}
                        >
                            Create "{input.trim()}"
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
