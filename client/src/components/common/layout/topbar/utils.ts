/**
 * Утилиты для TopBar компонентов
 */

export const getUserInitials = (user: any): string => {
  if (!user) return 'U';
  
  // Используем name (полное имя) если есть и не пустое
  if (user.name && user.name.trim()) {
    const parts = user.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      // Если есть несколько слов, берем первые буквы первых двух слов
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    // Если одно слово, берем первые две буквы
    return user.name.substring(0, 2).toUpperCase();
  }
  // Используем login если есть и не пустое
  if (user.login && user.login.trim()) {
    return user.login.substring(0, 2).toUpperCase();
  }
  // Используем username если есть и не пустое
  if (user.username && user.username.trim()) {
    return user.username.substring(0, 2).toUpperCase();
  }
  // Используем роль (например, "Moderator" -> "MO")
  if (user.role && user.role.trim()) {
    const roleUpper = user.role.toUpperCase();
    if (roleUpper.length >= 2) {
      return roleUpper.substring(0, 2);
    }
    return roleUpper.substring(0, 1) + roleUpper.substring(0, 1);
  }
  // Используем email как последний вариант
  if (user.email && user.email.trim()) {
    // Берем первые две буквы до @ или первые две буквы email
    const emailPart = user.email.split('@')[0];
    return emailPart.substring(0, 2).toUpperCase();
  }
  return 'U';
};

export const getCollaboratorInitials = (collaborator: { 
  name?: string; 
  initials?: string; 
  login?: string; 
  username?: string; 
  email?: string 
}): string => {
  if (!collaborator) return 'U';
  
  // Игнорируем жестко заданные 'U' или пустые initials
  if (collaborator.initials && collaborator.initials.trim() && collaborator.initials !== 'U') {
    return collaborator.initials;
  }
  
  // Используем name (полное имя) если есть и не пустое
  if (collaborator.name && collaborator.name.trim() && !collaborator.name.startsWith('User ')) {
    const parts = collaborator.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      // Если есть несколько слов, берем первые буквы первых двух слов
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    // Если одно слово, берем первые две буквы
    return collaborator.name.substring(0, 2).toUpperCase();
  }
  
  // Используем login если есть
  if (collaborator.login && collaborator.login.trim()) {
    return collaborator.login.substring(0, 2).toUpperCase();
  }
  
  // Используем username если есть
  if (collaborator.username && collaborator.username.trim()) {
    return collaborator.username.substring(0, 2).toUpperCase();
  }
  
  // Используем email как последний вариант
  if (collaborator.email && collaborator.email.trim()) {
    const emailPart = collaborator.email.split('@')[0];
    return emailPart.substring(0, 2).toUpperCase();
  }
  
  // Если name начинается с "User ", это значит пользователь не найден - используем первые буквы из ID
  // но только если это не похоже на ObjectId (24 символа)
  if (collaborator.name && collaborator.name.startsWith('User ')) {
    const userId = collaborator.name.replace('User ', '').trim();
    // Если это короткий ID (не ObjectId), используем первые две буквы
    if (userId.length < 24 && userId.length >= 2) {
      // Берем первые две буквы, если они есть
      const firstTwo = userId.substring(0, 2);
      // Проверяем, что это буквы, а не только цифры
      if (/[a-zA-Z]/.test(firstTwo)) {
        return firstTwo.toUpperCase();
      }
    }
  }
  
  return 'U';
};

