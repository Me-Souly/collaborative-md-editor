import React from 'react';
import { ChevronsLeftIcon, ChevronsRightIcon } from '@components/common/ui/icons';
import * as styles from '@components/sidebar/FileSidebar.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

interface FileSidebarFooterProps {
    collapsed: boolean;
    onToggleCollapse: () => void;
}

export const FileSidebarFooter: React.FC<FileSidebarFooterProps> = ({
    collapsed,
    onToggleCollapse,
}) => {
    return (
        <div className={styles.footer}>
            {/* {!collapsed && (
        <button className={cn(styles.button, styles.buttonGhost, styles.footerButton)}>
          <SettingsIcon className={styles.icon} />
          <span>Settings</span>
        </button>
      )} */}

            <button
                className={cn(styles.button, styles.buttonGhost, styles.collapseButton)}
                onClick={onToggleCollapse}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
                {collapsed ? (
                    <ChevronsRightIcon className={styles.icon} />
                ) : (
                    <ChevronsLeftIcon className={styles.icon} />
                )}
            </button>
        </div>
    );
};
