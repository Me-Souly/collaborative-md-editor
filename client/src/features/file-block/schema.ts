import { $nodeSchema } from '@milkdown/utils';

export const FILE_DATA_TYPE = 'file-block';

export const fileBlockSchema = $nodeSchema(FILE_DATA_TYPE, () => ({
    inline: false,
    group: 'block',
    selectable: true,
    draggable: true,
    isolating: true,
    marks: '',
    atom: true,
    priority: 100,
    attrs: {
        src: { default: '', validate: 'string' },
        filename: { default: '', validate: 'string' },
        mimeType: { default: '', validate: 'string' },
        size: { default: 0, validate: 'number' },
    },
    parseDOM: [
        {
            tag: `div[data-type="${FILE_DATA_TYPE}"]`,
            getAttrs: (dom) => {
                if (!(dom instanceof HTMLElement)) return false;
                return {
                    src: dom.getAttribute('data-src') || '',
                    filename: dom.getAttribute('data-filename') || '',
                    mimeType: dom.getAttribute('data-mime-type') || '',
                    size: Number(dom.getAttribute('data-size') ?? 0),
                };
            },
        },
    ],
    toDOM: (node) => [
        'div',
        {
            'data-type': FILE_DATA_TYPE,
            'data-src': node.attrs.src,
            'data-filename': node.attrs.filename,
            'data-mime-type': node.attrs.mimeType,
            'data-size': String(node.attrs.size),
        },
        node.attrs.filename,
    ],
    parseMarkdown: {
        match: ({ type }: { type: string }) => type === FILE_DATA_TYPE,
        runner: (state: any, node: any, type: any) => {
            state.addNode(type, {
                src: (node.url as string) || '',
                filename: (node.filename as string) || '',
                mimeType: (node.mimeType as string) || '',
                size: Number(node.size ?? 0),
            });
        },
    },
    toMarkdown: {
        match: (node: any) => node.type.name === FILE_DATA_TYPE,
        runner: (state: any, node: any) => {
            state.openNode('paragraph');
            state.addNode('link', undefined, [
                { type: 'text', value: `\uD83D\uDCCE ${node.attrs.filename}` },
            ], {
                url: node.attrs.src,
                title: null,
            });
            state.closeNode();
        },
    },
}));
