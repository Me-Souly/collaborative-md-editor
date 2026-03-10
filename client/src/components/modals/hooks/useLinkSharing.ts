import { useState, useEffect } from 'react';
import { useToastContext } from '@contexts/ToastContext';
import $api from '@http';

export interface ShareLink {
  token: string;
  shareLink: string;
  name: string;
  permission: 'read' | 'edit';
  expiresAt: string | null;
  createdAt: string;
}

export const useLinkSharing = (noteId: string, open: boolean) => {
  const toast = useToastContext();
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && noteId) {
      loadLinks();
    }
  }, [open, noteId]);

  const loadLinks = async () => {
    try {
      const res = await $api.get(`/notes/${noteId}/share-links`);
      setLinks(Array.isArray(res.data) ? res.data : []);
    } catch {
      setLinks([]);
    }
  };

  const createLink = async (permission: 'read' | 'edit', expiresAt: Date | null, name: string) => {
    setLoading(true);
    try {
      const res = await $api.post(`/notes/${noteId}/share-link`, { permission, expiresAt, name });
      setLinks(prev => [...prev, res.data]);
      return res.data as ShareLink;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Не удалось создать ссылку');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteLink = async (token: string) => {
    setLoading(true);
    try {
      await $api.delete(`/share-link/${token}`);
      setLinks(prev => prev.filter(l => l.token !== token));
      toast.success('Ссылка отозвана');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Не удалось удалить ссылку');
    } finally {
      setLoading(false);
    }
  };

  return { links, loading, createLink, deleteLink };
};
