import api from "..";

export interface User {
    id: number;
    username: string;
    email: string;
    role: string;
    is_active: boolean;
    created_at: string;
}

export interface LoginResponse {
    access_token: string;
    token_type: string;
}

export const authApi = {
    login: async (formData: FormData): Promise<LoginResponse> => {
        const response = await api.post<LoginResponse>('/auth/token', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    getMe: async (): Promise<User> => {
        const response = await api.get<User>('/auth/users/me');
        return response.data;
    },

    getAllUsers: async (): Promise<User[]> => {
        const response = await api.get<User[]>('/auth/users');
        return response.data;
    },

    createUser: async (user: any): Promise<User> => {
        const response = await api.post<User>('/auth/users', user);
        return response.data;
    },

    updateProfile: async (data: { email?: string, password?: string }): Promise<User> => {
        const response = await api.put<User>('/auth/users/me', data);
        return response.data;
    },
};
