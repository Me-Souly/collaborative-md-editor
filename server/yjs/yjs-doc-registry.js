export const activeDocs = new Map();

export function getActiveDoc(noteId) {
    return activeDocs.get(noteId);
}

export function setActiveDoc(noteId, ydoc) {
    activeDocs.set(noteId, ydoc);
}

export function getAllDocs() {
    return activeDocs;
}
