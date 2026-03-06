import { UserLoginData, UserRegisterData } from '@/types';
import api from './api';
import Cookies from 'js-cookie';

export const authService = {
    async login(data: UserLoginData) {
        const response = await api.post('/api/v1/user/login', data);
        if (response.data.access_token) {
            Cookies.set('token', response.data.access_token, { expires: 1 });
            Cookies.set('username', data.username, { expires: 1 });
        }
        return response.data;
    },

    async register(data: UserRegisterData) {
        const response = await api.post('/api/v1/user/', data);
        return response.data;
    },

    logout() {
        Cookies.remove('token');
        Cookies.remove('username');
    },

    isAuthenticated() {
        return !!Cookies.get('token');
    }
};
