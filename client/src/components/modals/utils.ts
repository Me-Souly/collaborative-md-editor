/**
 * Утилиты для модальных окон
 */

export const getInitials = (name: string): string => {
  if (!name || !name.trim()) return 'U';
  
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';
};

