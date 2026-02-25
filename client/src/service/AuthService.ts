import $api from "@http";
import type { AxiosResponse } from "axios";
import { AuthResponse } from "@models/response/AuthResponse";

export default class AuthService {
    static async login(identifier: string, password: string): Promise<AxiosResponse<AuthResponse>> {
        return ($api.post as any)('/login', {identifier, password}, {
            skipErrorToast: true // Отключаем автоматический тостер, чтобы LoginForm сам обрабатывал ошибки
        }) as Promise<AxiosResponse<AuthResponse>>;
    }

    static async registration(email: string, username: string, password: string): Promise<AxiosResponse<AuthResponse>> {
        return ($api.post as any)('/users/registration', {email, username, password}, {
            skipErrorToast: true // Отключаем автоматический тостер, чтобы RegisterForm сам обрабатывал ошибки
        }) as Promise<AxiosResponse<AuthResponse>>;
    }

    static async logout(): Promise<void> {
        return $api.post('/logout');
    }

}