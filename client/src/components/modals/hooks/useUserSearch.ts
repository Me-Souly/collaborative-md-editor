import { useMemo } from 'react';
import type { User } from '@components/modals/hooks/useShareModal';

export const useUserSearch = (users: User[], query: string) => {
    const searchUsers = (query: string): User[] => {
        if (!query.trim()) return [];
        const lowerQuery = query.toLowerCase();
        return users.filter(
            (user) =>
                user.email?.toLowerCase().includes(lowerQuery) ||
                user.name?.toLowerCase().includes(lowerQuery) ||
                user.login?.toLowerCase().includes(lowerQuery) ||
                user.username?.toLowerCase().includes(lowerQuery),
        );
    };

    const filteredUsers = useMemo(() => searchUsers(query), [users, query]);

    return {
        searchUsers,
        filteredUsers,
    };
};
