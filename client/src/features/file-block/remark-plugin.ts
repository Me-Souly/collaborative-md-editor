import type { Node } from '@milkdown/transformer';
import { $remark } from '@milkdown/utils';
import { visit } from 'unist-util-visit';

function getTextContent(nodes?: any[]): string {
    if (!nodes) return '';
    return nodes
        .filter((n: any) => n.type === 'text')
        .map((n: any) => n.value as string)
        .join('');
}

function visitFileBlock(ast: Node) {
    return visit(
        ast,
        'paragraph',
        (
            node: Node & { children?: any[] },
            index: number,
            parent: Node & { children: any[] },
        ) => {
            if (!node.children || node.children.length !== 1) return;
            const child = node.children[0];
            if (!child || child.type !== 'link') return;

            const url = child.url as string;
            if (!url || !url.includes('/api/files/')) return;

            // Any link pointing to /api/files/ is a file attachment.
            // Strip optional 📎 prefix from display name.
            const rawText = getTextContent(child.children);
            const filename = rawText.replace(/^\uD83D\uDCCE\s*/, '').trim() || 'Файл';

            const newNode = {
                type: 'file-block',
                url,
                filename,
                mimeType: '',
                size: 0,
            };

            parent.children.splice(index, 1, newNode as any);
        },
    );
}

export const remarkFileBlockPlugin = $remark(
    'remark-file-block',
    () => () => visitFileBlock,
);
