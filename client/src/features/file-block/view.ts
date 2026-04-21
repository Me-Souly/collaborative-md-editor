import type { NodeViewConstructor } from '@milkdown/prose/view';
import { $view } from '@milkdown/utils';
import { fileBlockSchema } from './schema';

// SVG icons by file type — monochrome, 24x24
const SVG_ICONS: Record<string, string> = {
    pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2h8l6 6v14H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><path d="M14 2v6h6"/><text x="12" y="17" text-anchor="middle" font-size="6" font-weight="700" fill="currentColor" stroke="none">PDF</text></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2h8l6 6v14H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 16h5" stroke-linecap="round"/></svg>',
    xls: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2h8l6 6v14H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><path d="M14 2v6h6"/><path d="M8 12h8v7H8z"/><path d="M12 12v7M8 15.5h8"/></svg>',
    zip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2h8l6 6v14H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><path d="M14 2v6h6"/><path d="M12 10v2M12 14v2M10 11v2M10 15v2"/></svg>',
    txt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2h8l6 6v14H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 16h8M8 19h4" stroke-linecap="round"/></svg>',
    default: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2h8l6 6v14H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><path d="M14 2v6h6"/></svg>',
};

// Aliases
SVG_ICONS.docx = SVG_ICONS.doc;
SVG_ICONS.xlsx = SVG_ICONS.xls;
SVG_ICONS.csv = SVG_ICONS.xls;
SVG_ICONS.ppt = SVG_ICONS.doc;
SVG_ICONS.pptx = SVG_ICONS.doc;
SVG_ICONS.rar = SVG_ICONS.zip;
SVG_ICONS['7z'] = SVG_ICONS.zip;
SVG_ICONS.md = SVG_ICONS.txt;

const DOWNLOAD_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v10M7 12l5 5 5-5"/><path d="M5 19h14"/></svg>';

function getIconSvg(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return SVG_ICONS[ext] || SVG_ICONS.default;
}

function formatSize(bytes: number): string {
    if (bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const fileBlockView = $view(
    fileBlockSchema.node,
    (): NodeViewConstructor => {
        return (initialNode, view, getPos) => {
            const { src, filename, mimeType, size } = initialNode.attrs;

            const dom = document.createElement('div');
            dom.className = 'milkdown-file-block';
            dom.contentEditable = 'false';

            // Icon
            const iconEl = document.createElement('span');
            iconEl.className = 'milkdown-file-block-icon';
            iconEl.innerHTML = getIconSvg(filename);

            // Info
            const infoEl = document.createElement('div');
            infoEl.className = 'milkdown-file-block-info';

            const nameEl = document.createElement('span');
            nameEl.className = 'milkdown-file-block-name';
            nameEl.textContent = filename || 'Файл';
            infoEl.appendChild(nameEl);

            if (size > 0) {
                const sizeEl = document.createElement('span');
                sizeEl.className = 'milkdown-file-block-size';
                sizeEl.textContent = formatSize(size);
                infoEl.appendChild(sizeEl);
            }

            // Download button
            const downloadEl = document.createElement('a');
            downloadEl.className = 'milkdown-file-block-download';
            downloadEl.href = src;
            downloadEl.target = '_blank';
            downloadEl.rel = 'noopener noreferrer';
            downloadEl.download = filename;
            downloadEl.innerHTML = DOWNLOAD_ICON;
            downloadEl.title = 'Скачать';

            dom.appendChild(iconEl);
            dom.appendChild(infoEl);
            dom.appendChild(downloadEl);

            dom.addEventListener('click', (e) => {
                if ((e.target as HTMLElement).closest('.milkdown-file-block-download')) return;
                window.open(src, '_blank', 'noopener');
            });

            return {
                dom,
                update: (updatedNode) => {
                    if (updatedNode.type !== initialNode.type) return false;
                    nameEl.textContent = updatedNode.attrs.filename || 'Файл';
                    iconEl.innerHTML = getIconSvg(updatedNode.attrs.filename);
                    downloadEl.href = updatedNode.attrs.src;
                    downloadEl.download = updatedNode.attrs.filename;
                    return true;
                },
                stopEvent: () => true,
                selectNode: () => dom.classList.add('selected'),
                deselectNode: () => dom.classList.remove('selected'),
                destroy: () => dom.remove(),
            };
        };
    },
);
