import React from 'react';
import { Link } from 'react-router-dom';
import type { PublicNoteForModerator } from '@models/response/ModeratorResponse';
import { TrashIcon } from '@components/common/ui/icons';
import * as styles from '@pages/components/ModeratorNoteRow.module.css';

interface ModeratorNoteRowProps {
    note: PublicNoteForModerator;
    onDelete: (note: PublicNoteForModerator) => void;
    formatDate: (dateString: string) => string;
}

export const ModeratorNoteRow: React.FC<ModeratorNoteRowProps> = ({
    note,
    onDelete,
    formatDate,
}) => {
    return (
        <tr className={styles.tableRow}>
            <td className={styles.tableCell}>
                <Link to={`/note/${note.id}`} className={styles.noteIdLink}>
                    {note.id.slice(0, 8)}...
                </Link>
            </td>
            <td className={styles.tableCellTitle}>{note.title}</td>
            <td className={styles.tableCell}>
                {note.author ? (
                    <Link to={`/user/${note.author.login}`} className={styles.authorLink}>
                        @{note.author.login}
                    </Link>
                ) : (
                    <span className={styles.noAuthor}>Неизвестен</span>
                )}
            </td>
            <td className={styles.tableCellPreview}>{note.contentPreview.slice(0, 50)}...</td>
            <td className={styles.tableCellDate}>{formatDate(note.createdAt)}</td>
            <td className={styles.tableCellActions}>
                <button
                    onClick={() => onDelete(note)}
                    className={styles.deleteButton}
                    title="Удалить заметку"
                    aria-label="Удалить заметку"
                >
                    <TrashIcon className={styles.deleteIcon} />
                </button>
            </td>
        </tr>
    );
};
