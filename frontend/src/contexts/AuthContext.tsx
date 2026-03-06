'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Cookies from 'js-cookie';
import { authService } from '@/services/auth';
import type { UserLoginData } from '@/types';

interface AuthContextType {
    user: string | null;
    login: (data: UserLoginData) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const publicPaths = ['/login', '/register'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const token = Cookies.get('token');
        const username = Cookies.get('username');

        const isPublic = publicPaths.includes(pathname);

        if (token && username) {
            setUser(username);
            if (isPublic) router.push('/dashboard');
        } else {
            if (!isPublic) router.push('/login');
        }

        setIsLoading(false);
    }, [pathname, router]);

    const login = async (data: UserLoginData) => {
        setIsLoading(true);
        try {
            const form = new URLSearchParams();
            form.append('username', data.username);
            if (data.password) form.append('password', data.password);

            const payload = { ...data, password: data.password };
            await authService.login(payload);

            setUser(data.username);
            router.push('/dashboard');
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        authService.logout();
        setUser(null);
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
