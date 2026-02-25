import * as Y from "yjs";
import { noteService } from "../services/index.js";

export async function persistYDoc(noteId, ydoc) {
    const state = Y.encodeStateAsUpdate(ydoc);
    await noteService.saveYDocState(noteId, state);
}
