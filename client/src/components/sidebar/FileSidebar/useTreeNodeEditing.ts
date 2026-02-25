import { useState, useEffect, useRef } from 'react';
import { useSidebarStore } from '@hooks/useStores';
import { FileTreeNode } from '@app-types/notes';
import { toastManager } from '@utils/toastManager';
import $api from '@http';

export const useTreeNodeEditing = (node: FileTreeNode) => {
  const sidebarStore = useSidebarStore();
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditing = sidebarStore.isEditing(node.id);
  const editingMode = sidebarStore.getEditingMode();

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      if (editingMode === 'rename') {
        setInputValue(node.name);
      } else {
        setInputValue('');
      }
    }
  }, [isEditing, editingMode, node.name]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (!trimmed) {
        sidebarStore.stopEditing();
        return;
      }

      if (editingMode === 'rename') {
        if (trimmed === node.name) {
          sidebarStore.stopEditing();
          return;
        }
        const endpoint = node.type === 'folder' ? `/folders/${node.id}` : `/notes/${node.id}`;
        $api
          .put(endpoint, { title: trimmed })
          .then((res) => {
            const name = res.data.name || res.data.title || trimmed;
            sidebarStore.updateNode(node.id, { name });
            sidebarStore.stopEditing();
            toastManager.success(`${node.type === 'folder' ? 'Папка' : 'Заметка'} переименована`);
          })
          .catch((err) => {
            console.error(`Failed to rename ${node.type}:`, err);
            sidebarStore.stopEditing();
            // Error toast is handled by axios interceptor
          });
      } else {
        handleCreate(trimmed);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      sidebarStore.stopEditing();
    }
  };

  const handleBlur = () => {
    const trimmed = inputValue.trim();
    
    if (editingMode === 'rename') {
      if (trimmed && trimmed !== node.name) {
        const endpoint = node.type === 'folder' ? `/folders/${node.id}` : `/notes/${node.id}`;
        $api
          .put(endpoint, { title: trimmed })
          .then((res) => {
            const name = res.data.name || res.data.title || trimmed;
            sidebarStore.updateNode(node.id, { name });
            toastManager.success(`${node.type === 'folder' ? 'Папка' : 'Заметка'} переименована`);
          })
          .catch((err) => {
            console.error(`Failed to rename ${node.type}:`, err);
            // Error toast is handled by axios interceptor
          });
      }
      sidebarStore.stopEditing();
    } else {
      if (trimmed) {
        handleCreate(trimmed);
      } else {
        sidebarStore.stopEditing();
      }
    }
  };

  const handleCreate = (title: string) => {
    const { creatingParentId, editingMode } = sidebarStore;
    
    if (editingMode === 'create-folder') {
      $api
        .post('/folders', { title, parentId: creatingParentId || null })
        .then((res) => {
          sidebarStore.addNodeFromServer({
            id: res.data.id,
            title: res.data.name || res.data.title || title,
            type: 'folder',
            parentId: res.data.parentId,
          });
          if (creatingParentId) {
            sidebarStore.expandedFolders.add(creatingParentId);
          }
          sidebarStore.stopEditing();
          toastManager.success('Папка создана');
        })
        .catch((err) => {
          console.error('Failed to create folder:', err);
          sidebarStore.stopEditing();
          // Error toast is handled by axios interceptor
        });
    } else if (editingMode === 'create-note') {
      // For root level notes, don't send folderId or parentId
      const payload = creatingParentId 
        ? { title, folderId: creatingParentId }
        : { title, folderId: null, parentId: null };
      
      $api
        .post('/notes', payload)
        .then((res) => {
          sidebarStore.addNodeFromServer({
            id: res.data.id,
            title: res.data.title,
            type: 'file',
            folderId: res.data.folderId,
            parentId: res.data.parentId,
          });
          if (creatingParentId) {
            sidebarStore.expandedFolders.add(creatingParentId);
          }
          sidebarStore.stopEditing();
          toastManager.success('Заметка создана');
        })
        .catch((err) => {
          console.error('Failed to create note:', err);
          sidebarStore.stopEditing();
          // Error toast is handled by axios interceptor
        });
    } else if (editingMode === 'create-subnote') {
      $api
        .post('/notes', { title, parentId: creatingParentId })
        .then((res) => {
          sidebarStore.addNodeFromServer({
            id: res.data.id,
            title: res.data.title,
            type: 'file',
            parentId: res.data.parentId,
          });
          if (creatingParentId) {
            sidebarStore.expandedFolders.add(creatingParentId);
          }
          sidebarStore.stopEditing();
          toastManager.success('Подзаметка создана');
        })
        .catch((err) => {
          console.error('Failed to create sub-note:', err);
          sidebarStore.stopEditing();
          // Error toast is handled by axios interceptor
        });
    }
  };

  return {
    inputRef,
    inputValue,
    setInputValue,
    isEditing,
    editingMode,
    handleKeyDown,
    handleBlur,
  };
};

