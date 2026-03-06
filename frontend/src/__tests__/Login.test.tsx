import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginPage from '@/app/login/page';
import { AuthProvider } from '@/contexts/AuthContext';
import { authService } from '@/services/auth';
import { Toaster } from 'react-hot-toast';


vi.mock('@/services/auth', () => ({
    authService: {
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        isAuthenticated: vi.fn().mockReturnValue(false),
    }
}));

const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>
        <Toaster />
        {children}
    </AuthProvider>
);

describe('Login Page Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render login form initially', () => {
        render(<LoginPage />, { wrapper: Wrapper });

        expect(screen.getByPlaceholderText(/jdoe_manager/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should show register form when toggle is clicked', () => {
        render(<LoginPage />, { wrapper: Wrapper });

        const toggleBtn = screen.getByRole('button', { name: /register now/i });
        fireEvent.click(toggleBtn);


        expect(screen.getByPlaceholderText(/nome@empresa.com/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('should call authService.login on form submit', async () => {
        (authService.login as any).mockResolvedValueOnce({ access_token: 'fake-token' });

        render(<LoginPage />, { wrapper: Wrapper });

        const userField = screen.getByPlaceholderText(/jdoe_manager/i);
        const passField = screen.getByPlaceholderText(/••••••••/i);
        const submitBtn = screen.getByRole('button', { name: /sign in/i });

        fireEvent.change(userField, { target: { value: 'john' } });
        fireEvent.change(passField, { target: { value: '123' } });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(authService.login).toHaveBeenCalledWith(expect.objectContaining({
                username: 'john',
                password: '123'
            }));
            expect(screen.getByText(/Welcome back, john!/i)).toBeInTheDocument();
        });
    });
});
