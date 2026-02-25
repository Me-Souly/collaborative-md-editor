import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@components/common/ui/Modal';
import { observer } from 'mobx-react-lite';
import { useNoteCardActions } from '@components/notes/hooks/useNoteCardActions';
import { NoteCardGrid } from '@components/notes/components/NoteCardGrid';
import { NoteCardList } from '@components/notes/components/NoteCardList';

interface NoteCardProps {
    note: {
        id: string;
        title: string;
        excerpt?: string;
        rendered?: string;
        searchableContent?: string;
        updatedAt: string;
        createdAt: string;
        isFavorite?: boolean;
        isShared?: boolean;
    };
    viewMode: 'grid' | 'list';
    onDelete?: () => void;
    readOnly?: boolean;
    onBlock?: (noteId: string) => void;
    showBlockButton?: boolean;
}

export const NoteCard: React.FC<NoteCardProps> = observer(
    ({ note, viewMode, onDelete, readOnly = false, onBlock, showBlockButton = false }) => {
        const navigate = useNavigate();

        const {
            isPublic,
            modalState,
            closeModal,
            handleRename,
            handleCreateSubnote,
            handleTogglePublic,
            handleDelete,
        } = useNoteCardActions({
            noteId: note.id,
            noteTitle: note.title,
            isPublic: !!note.isShared,
            onDelete,
        });

        const handleCardClick = () => {
            navigate(`/note/${note.id}`);
        };

        const commonProps = {
            note,
            isPublic,
            readOnly,
            showBlockButton,
            onCardClick: handleCardClick,
            onBlock,
            onTogglePublic: handleTogglePublic,
            onRename: handleRename,
            onCreateSubnote: handleCreateSubnote,
            onDelete: handleDelete,
        };

        return (
            <>
                {viewMode === 'list' ? (
                    <NoteCardList {...commonProps} />
                ) : (
                    <NoteCardGrid {...commonProps} />
                )}
                {modalState && (
                    <Modal
                        isOpen={modalState.isOpen}
                        onClose={closeModal}
                        title={modalState.title}
                        message={modalState.message}
                        confirmText={modalState.confirmText}
                        cancelText={modalState.cancelText}
                        onConfirm={modalState.onConfirm}
                        variant={modalState.variant}
                    />
                )}
            </>
        );
    },
);
