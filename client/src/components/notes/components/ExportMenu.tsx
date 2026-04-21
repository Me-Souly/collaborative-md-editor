import React, { useEffect, useRef, useState } from 'react';
import { DownloadIcon } from '@components/common/ui/icons';
import * as styles from '@components/notes/NoteViewer.module.css';

interface ExportMenuProps {
    markdown: string;
    title: string;
    editorContainerRef: { current: HTMLDivElement | null };
}

function downloadBlob(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function sanitizeFilename(title: string): string {
    return title.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'note';
}

export const ExportMenu: React.FC<ExportMenuProps> = ({ markdown, title, editorContainerRef }) => {
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const filename = sanitizeFilename(title);

    const exportMd = () => {
        downloadBlob(markdown, `${filename}.md`, 'text/markdown');
        setOpen(false);
    };

    const exportHtml = () => {
        const proseMirror = editorContainerRef.current?.querySelector('.ProseMirror');
        const bodyHtml = proseMirror ? proseMirror.innerHTML : `<pre>${markdown}</pre>`;
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${title}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 860px; margin: 40px auto; padding: 0 24px; color: #1a1a1a; line-height: 1.6; }
  h1,h2,h3,h4,h5,h6 { margin-top: 1.5em; margin-bottom: 0.5em; }
  h1 { font-size: 2em; border-bottom: 2px solid #eee; padding-bottom: 0.3em; }
  h2 { font-size: 1.5em; border-bottom: 1px solid #eee; padding-bottom: 0.2em; }
  pre { background: #f6f8fa; border-radius: 6px; padding: 16px; overflow-x: auto; }
  code { font-family: 'Courier New', monospace; font-size: 0.9em; background: #f6f8fa; padding: 2px 5px; border-radius: 3px; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 1em; color: #666; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ddd; padding: 8px 12px; }
  th { background: #f6f8fa; }
  img { max-width: 100%; }
  a { color: #0969da; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
        downloadBlob(html, `${filename}.html`, 'text/html');
        setOpen(false);
    };

    const exportPdf = () => {
        window.print();
        setOpen(false);
    };

    return (
        <div className={styles.exportMenuWrapper} ref={menuRef}>
            <button
                className={styles.floatingControlsBtn}
                onClick={() => setOpen(v => !v)}
                title="Export"
            >
                <DownloadIcon className={styles.toolbarIcon} />
            </button>
            {open && (
                <div className={styles.exportDropdown}>
                    <button className={styles.exportItem} onClick={exportMd}>
                        <span className={styles.exportItemExt}>.md</span>
                        <span>Markdown</span>
                    </button>
                    <button className={styles.exportItem} onClick={exportHtml}>
                        <span className={styles.exportItemExt}>.html</span>
                        <span>HTML</span>
                    </button>
                    <button className={styles.exportItem} onClick={exportPdf}>
                        <span className={styles.exportItemExt}>.pdf</span>
                        <span>PDF (Print)</span>
                    </button>
                </div>
            )}
        </div>
    );
};
