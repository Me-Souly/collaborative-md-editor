export interface IUser {
    id: string;
    email: string;
    login: string;
    name?: string;
    username?: string; // для обратной совместимости
    role?: string;
    isActivated: boolean;
    avatarUrl?: string | null;
    about?: string | null;
}