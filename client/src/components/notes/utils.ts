/**
 * Утилиты для компонентов заметок
 */

export const getNotePreview = (note: {
  excerpt?: string;
  searchableContent?: string;
  rendered?: string;
}): string => {
  let previewText = '';
  if (note.excerpt && note.excerpt.trim()) {
    previewText = note.excerpt.trim();
  } else if (note.searchableContent && note.searchableContent.trim()) {
    previewText = note.searchableContent.trim().slice(0, 200);
  } else if (note.rendered && note.rendered.trim()) {
    previewText = note.rendered.trim();
  }
  
  const cleanPreview = previewText
    ? previewText.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
    : '';
  
  return cleanPreview.slice(0, 150);
};

export const formatNoteDate = (dateString: string, includeYear: boolean = false): string => {
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
  };
  
  if (includeYear) {
    options.year = 'numeric';
  }
  
  return new Date(dateString).toLocaleDateString('ru-RU', options);
};

