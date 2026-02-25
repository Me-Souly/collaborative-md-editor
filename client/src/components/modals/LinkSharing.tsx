import React, { useState } from 'react';
import { useToastContext } from '@contexts/ToastContext';
import { CustomSelect } from '@components/common/ui/CustomSelect';
import { GlobeIcon, CopyIcon } from '@components/common/ui/icons';
import * as styles from '@components/modals/ShareModal.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

interface LinkSharingProps {
    noteId: string;
}

export const LinkSharing: React.FC<LinkSharingProps> = ({ noteId }) => {
    const toast = useToastContext();
    const [linkSharing, setLinkSharing] = useState(false);
    const [linkPermission, setLinkPermission] = useState<'read' | 'edit'>('read');

    const copyLink = () => {
        const link = `${window.location.origin}/note/${noteId}`;
        navigator.clipboard.writeText(link);
        toast.success('Ссылка скопирована');
    };

    return (
        <div className={cn(styles.section, styles.linkSection)}>
            <div className={styles.linkHeader}>
                <div>
                    <label className={styles.label}>Публичная ссылка</label>
                    <p className={styles.description}>Любой с этой ссылкой может получить доступ</p>
                </div>
                <label className={styles.switch}>
                    <input
                        type="checkbox"
                        checked={linkSharing}
                        onChange={(e) => setLinkSharing(e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                </label>
            </div>

            {linkSharing && (
                <div className={styles.linkContent}>
                    <div className={styles.linkInputWrapper}>
                        <GlobeIcon className={styles.inputIcon} />
                        <input
                            type="text"
                            className={styles.input}
                            value={`${window.location.origin}/note/${noteId}`}
                            readOnly
                        />
                        <button className={styles.copyButton} onClick={copyLink}>
                            <CopyIcon className={styles.copyIcon} />
                            Копировать
                        </button>
                    </div>
                    <CustomSelect
                        value={linkPermission}
                        options={[
                            { value: 'read', label: 'Только просмотр' },
                            { value: 'edit', label: 'Редактирование' },
                        ]}
                        onChange={(value) => setLinkPermission(value as 'read' | 'edit')}
                    />
                </div>
            )}
        </div>
    );
};
