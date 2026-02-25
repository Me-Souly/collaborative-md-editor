import $api from "@http";
import type { AxiosResponse } from "axios";
import type { ActivationResponse } from "@models/response/ActivationResponse";

export default class ActivationService {
    static async activate(token: string): Promise<AxiosResponse<void>> {
        return $api.get(`/activate/${token}`);
    }

    static async resendActivation(): Promise<AxiosResponse<ActivationResponse>> {
        return $api.post<ActivationResponse>('/activation/resend');
    }
}

