import type { MilkdownPlugin } from '@milkdown/ctx';
import { remarkFileBlockPlugin } from './remark-plugin';
import { fileBlockSchema } from './schema';
import { fileBlockView } from './view';

export { fileBlockSchema } from './schema';
export { remarkFileBlockPlugin } from './remark-plugin';
export { fileBlockView } from './view';

export const fileBlockComponent: MilkdownPlugin[] = [
    remarkFileBlockPlugin,
    fileBlockSchema,
    fileBlockView,
].flat();
