import { useState, useEffect, useRef } from 'react';
import $api from '@http';

export type SearchResult = {
  id: string;
  title?: string;
  meta?: { excerpt?: string; isFavorite?: boolean };
  isPublic?: boolean;
};

export const useSearch = (searchQuery: string) => {
  const [isSearching, setIsSearching] = useState(false);
  const [myResults, setMyResults] = useState<SearchResult[]>([]);
  const [publicResults, setPublicResults] = useState<SearchResult[]>([]);
  const searchDebounceRef = useRef<number | null>(null);

  useEffect(() => {
    const query = searchQuery.trim();

    // Если строка пустая — просто скрываем результаты
    if (!query) {
      setMyResults([]);
      setPublicResults([]);
      return;
    }

    // Минимальная длина запроса для поиска
    if (query.length < 3) {
      setMyResults([]);
      setPublicResults([]);
      return;
    }

    // Очищаем предыдущий таймер
    if (searchDebounceRef.current) {
      window.clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = window.setTimeout(async () => {
      try {
        setIsSearching(true);
        const [ownRes, publicRes] = await Promise.all([
          ($api.get as any)('/search/notes', {
            params: { query },
            skipErrorToast: true,
          }).catch(() => ({ data: { notes: [] } })),
          ($api.get as any)('/search/notes/public', {
            params: { query },
            skipErrorToast: true,
          }).catch(() => ({ data: { notes: [] } })),
        ]);

        const ownNotes = (ownRes.data?.notes as SearchResult[]) || [];
        const pubNotes = (publicRes.data?.notes as SearchResult[]) || [];

        setMyResults(ownNotes);
        setPublicResults(pubNotes);
      } catch (error) {
        console.error('Search error:', error);
        setMyResults([]);
        setPublicResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (searchDebounceRef.current) {
        window.clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery]);

  return {
    isSearching,
    myResults,
    publicResults,
  };
};

