import React, { useState, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { FileTreeNode } from '@app-types/notes';
import { useSidebarStore } from '@hooks/useStores';
import {
    FileTextIcon,
    FolderIcon,
    FolderOpenIcon,
    ChevronRightIcon,
    ChevronDownIcon,
} from '@components/common/ui/icons';
import { TreeNodeMenu } from '@components/sidebar/FileSidebar/TreeNodeMenu';
import { useTreeNodeEditing } from '@components/sidebar/FileSidebar/useTreeNodeEditing';
import * as styles from '@components/sidebar/FileSidebar.module.css';
import $api from '@http';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

interface TreeNodeProps {
    node: FileTreeNode;
    level: number;
    collapsed: boolean;
    currentNoteId?: string;
    onSelectNote: (id: string) => void;
}

export const TreeNode: React.FC<TreeNodeProps> = observer(
    ({ node, level, collapsed, currentNoteId, onSelectNote }) => {
        const sidebarStore = useSidebarStore();
        const navigate = useNavigate();
        const [showDropdown, setShowDropdown] = useState(false);
        const dropdownRef = useRef<HTMLDivElement>(null);
        const {
            inputRef,
            inputValue,
            setInputValue,
            isEditing,
            editingMode,
            handleKeyDown,
            handleBlur,
        } = useTreeNodeEditing(node);

        const isFolder = node.type === 'folder';
        const hasChildren = !!node.children && node.children.length > 0;
        const isActive = currentNoteId === node.id;
        const isExpanded = sidebarStore.isFolderExpanded(node.id);

        const handleDelete = () => {
            // Если удаляется текущая заметка, перенаправляем на главную
            if (!isFolder && currentNoteId === node.id) {
                navigate('/');
            }
        };

        useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                    setShowDropdown(false);
                }
            };

            if (showDropdown) {
                document.addEventListener('mousedown', handleClickOutside);
            }

            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }, [showDropdown]);

        const handleClick = () => {
            if (isEditing) return;
            if (isFolder) {
                sidebarStore.toggleFolder(node.id);
            } else {
                onSelectNote(node.id);
            }
        };

        const handleExpandClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            sidebarStore.toggleFolder(node.id);
        };

        const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
            e.stopPropagation();
            e.dataTransfer.effectAllowed = 'move';
            sidebarStore.startDragging(node.id, node.type);
        };

        const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
            e.stopPropagation();
            sidebarStore.stopDragging();
        };

        const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
            if (!sidebarStore.canDropOn(node)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        };

        const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            e.stopPropagation();
            const dragging = sidebarStore.draggingNode;
            if (!dragging || !sidebarStore.canDropOn(node)) return;

            const targetId = node.id;
            sidebarStore.moveNode(dragging.id, dragging.type, targetId);
            sidebarStore.stopDragging();

            // Синхронизация с сервером
            if (dragging.type === 'file') {
                const update: any = {};
                if (node.type === 'folder') {
                    update.folderId = node.id;
                    update.parentId = null;
                } else {
                    update.parentId = node.id;
                }
                $api.put(`/notes/${dragging.id}`, update).catch((err) => {
                    console.error('Failed to update note position:', err);
                });
            } else if (node.type === 'folder') {
                $api.put(`/folders/${dragging.id}`, { parentId: node.id }).catch((err) => {
                    console.error('Failed to update folder position:', err);
                });
            }
        };

        return (
            <div>
                <div
                    className={cn(styles.treeNode, isActive && styles.treeNodeActive)}
                    style={!collapsed && level > 0 ? { marginLeft: level * 18 } : undefined}
                    onClick={handleClick}
                    draggable
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    {hasChildren && !collapsed && (
                        <button onClick={handleExpandClick} className={styles.expandButton}>
                            {isExpanded ? (
                                <ChevronDownIcon className={styles.iconSmall} />
                            ) : (
                                <ChevronRightIcon className={styles.iconSmall} />
                            )}
                        </button>
                    )}

                    {isFolder ? (
                        isExpanded && !collapsed ? (
                            <FolderOpenIcon className={cn(styles.icon, styles.iconPrimary)} />
                        ) : (
                            <FolderIcon className={cn(styles.icon, styles.iconMuted)} />
                        )
                    ) : (
                        <FileTextIcon className={cn(styles.icon, styles.iconMuted)} />
                    )}

                    {!collapsed && (
                        <>
                            {isEditing ? (
                                <input
                                    ref={inputRef}
                                    type="text"
                                    className={styles.nodeNameInput}
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onBlur={handleBlur}
                                    onClick={(e) => e.stopPropagation()}
                                    placeholder={
                                        editingMode === 'rename' ? node.name : 'Enter name...'
                                    }
                                />
                            ) : (
                                <span className={styles.nodeName}>{node.name}</span>
                            )}

                            {!isEditing && (
                                <div ref={dropdownRef}>
                                    <TreeNodeMenu
                                        node={node}
                                        isOpen={showDropdown}
                                        onToggle={() => setShowDropdown(!showDropdown)}
                                        onClose={() => setShowDropdown(false)}
                                        onDelete={handleDelete}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>

                {isExpanded && !collapsed && (
                    <div className={styles.treeNodeChildren}>
                        {node.children &&
                            node.children.map((child) => (
                                <TreeNode
                                    key={child.id}
                                    node={child}
                                    level={level + 1}
                                    collapsed={collapsed}
                                    currentNoteId={currentNoteId}
                                    onSelectNote={onSelectNote}
                                />
                            ))}
                        {sidebarStore.creatingParentId === node.id &&
                            sidebarStore.editingNodeId &&
                            sidebarStore.editingNodeId.startsWith('temp-') && (
                                <TreeNode
                                    key={sidebarStore.editingNodeId}
                                    node={{
                                        id: sidebarStore.editingNodeId,
                                        name: '',
                                        type:
                                            sidebarStore.editingMode === 'create-folder'
                                                ? 'folder'
                                                : 'file',
                                        parentId: node.id,
                                    }}
                                    level={level + 1}
                                    collapsed={collapsed}
                                    currentNoteId={currentNoteId}
                                    onSelectNote={onSelectNote}
                                />
                            )}
                    </div>
                )}
            </div>
        );
    },
);
