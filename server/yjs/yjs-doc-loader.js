import * as Y from "yjs";
import { noteService } from "../services/index.js";

export async function loadYDoc(noteId, docsCache) {
    let ydoc = docsCache.get(noteId);

    if (ydoc) return ydoc;

    // создаём документ
    ydoc = new Y.Doc();
    docsCache.set(noteId, ydoc);

    // загружаем состояние из базы
    const note = await noteService.getNoteById(noteId);

    if (note?.ydocState) {
        Y.applyUpdate(ydoc, note.ydocState);
    }

    return ydoc;
}
