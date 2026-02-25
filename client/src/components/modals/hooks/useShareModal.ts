import { useState, useEffect } from 'react';
import { useToastContext } from '@contexts/ToastContext';
import { useAuthStore } from '@hooks/useStores';
import $api from '@http';

export interface Collaborator {
  userId: string;
  name: string;
  email: string;
  permission: 'read' | 'edit';
  isOwner?: boolean;
}

export interface User {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  login?: string;
  username?: string;
}

export const useShareModal = (noteId: string, open: boolean) => {
  const toast = useToastContext();
  const authStore = useAuthStore();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && noteId) {
      loadUsers().then(() => {
        loadAccessList();
      });
    }
  }, [open, noteId]);

  useEffect(() => {
    if (open && users.length > 0) {
      loadAccessList();
    }
  }, [users]);

  const loadAccessList = async () => {
    try {
      const res = await $api.get(`/notes/${noteId}/access`);
      const accessList = res.data || [];
      
      // Map access list to collaborators
      const collabs: Collaborator[] = [];
      
      // Add owner
      if (authStore.user?.id) {
        collabs.push({
          userId: authStore.user.id,
          name: authStore.user.username || 'You',
          email: authStore.user.email || '',
          permission: 'edit',
          isOwner: true,
        });
      }

      // Load user details for each access entry
      for (const access of accessList) {
        // Try to get user info from users list or use placeholder
        const user = users.find(u => u.id === access.userId || u.id === access.userId?.toString());
        
        if (user) {
          collabs.push({
            userId: access.userId,
            name: user.name || `User ${access.userId}`,
            email: user.email || '',
            permission: access.permission,
          });
        } else {
          // Use placeholder if user not found
          collabs.push({
            userId: access.userId,
            name: `User ${String(access.userId).slice(0, 8)}`,
            email: '',
            permission: access.permission,
          });
        }
      }

      setCollaborators(collabs);
    } catch (err: any) {
      console.error('Failed to load access list:', err);
      toast.error('Не удалось загрузить список доступа');
    }
  };

  const loadUsers = async () => {
    try {
      const res = await $api.get('/users');
      const usersData = Array.isArray(res.data) ? res.data : [];
      // Normalize user data - handle both DTO format and raw model format
      const normalizedUsers = usersData.map((user: any) => ({
        id: user.id || user._id?.toString() || user._id,
        name: user.name || user.username || user.login || '',
        email: user.email || '',
        login: user.login || user.username || '',
      }));
      setUsers(normalizedUsers);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const handleInvite = async (userId: string, permission: 'read' | 'edit') => {
    if (!authStore.user?.isActivated) {
      toast.warning('Активируйте аккаунт, чтобы приглашать пользователей');
      return false;
    }
    
    // Check if user is already a collaborator
    if (collaborators.some(c => c.userId === userId || c.userId === userId.toString())) {
      toast.warning('Пользователь уже имеет доступ');
      return false;
    }

    setLoading(true);
    try {
      await $api.post(`/notes/${noteId}/access`, {
        userId: userId,
        permission: permission,
      });
      
      await loadAccessList();
      return true;
    } catch (err: any) {
      console.error('Failed to add access:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    if (!authStore.user?.isActivated) {
      toast.warning('Активируйте аккаунт, чтобы управлять доступом');
      return;
    }

    if (userId === authStore.user?.id) {
      toast.warning('Нельзя удалить владельца');
      return;
    }

    setLoading(true);
    try {
      await $api.delete(`/notes/${noteId}/access/${userId}`);
      toast.success('Доступ удалён');
      await loadAccessList();
    } catch (err: any) {
      console.error('Failed to remove access:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePermission = async (userId: string, newPermission: 'read' | 'edit') => {
    if (!authStore.user?.isActivated) {
      toast.warning('Активируйте аккаунт, чтобы управлять доступом');
      return;
    }

    setLoading(true);
    try {
      await $api.patch(`/notes/${noteId}/access/${userId}`, {
        permission: newPermission,
      });
      toast.success('Права доступа обновлены');
      await loadAccessList();
    } catch (err: any) {
      console.error('Failed to update permission:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    collaborators,
    users,
    loading,
    handleInvite,
    handleRemoveCollaborator,
    handleUpdatePermission,
  };
};

