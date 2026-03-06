'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/auth';
import toast from 'react-hot-toast';

export default function LoginPage() {
    const { login } = useAuth();


    const [isRegistering, setIsRegistering] = useState(false);
    const [isLoading, setIsLoading] = useState(false);


    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (isRegistering) {
                await authService.register({ username, email, password });
                toast.success(`Account created! Use the form to Login.`);
                setIsRegistering(false);
                setPassword('');
            } else {
                await login({ username, password });
                toast.success(`Welcome back, ${username}!`);
            }
        } catch (err: any) {

            const errorMessage = err.response?.data?.detail;
            toast.error(typeof errorMessage === 'string' ? errorMessage : 'Invalid credentials or Network error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50 flex-col px-4">

            <div className="max-w-md w-full rounded-2xl bg-white shadow-xl overflow-hidden border border-gray-100">

                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 py-8 px-8 text-center text-white">
                    <h1 className="text-3xl font-extrabold tracking-tight mb-2">
                        MailerWeb <span className="text-blue-200">Bookings</span>
                    </h1>
                    <p className="text-indigo-100 text-sm">
                        {isRegistering ? 'Join the workspace rooms' : 'Access your professional meeting rooms'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-gray-700">Username</label>
                        <input
                            required
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-gray-800"
                            placeholder="e.g. jdoe_manager"
                        />
                    </div>

                    {isRegistering && (
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-700">E-mail (For Notifications)</label>
                            <input
                                required
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-gray-800"
                                placeholder="nome@empresa.com"
                            />
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-gray-700">Password</label>
                        <input
                            required
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-gray-800"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        disabled={isLoading}
                        type="submit"
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                    >
                        {isLoading
                            ? 'Processing...'
                            : (isRegistering ? 'Create Account' : 'Sign In')}
                    </button>
                </form>

                <div className="bg-gray-50 px-8 py-5 border-t border-gray-100 text-center">
                    <p className="text-sm text-gray-600">
                        {isRegistering ? 'Already have an account?' : "Don't have an account yet?"}
                        <button
                            type="button"
                            onClick={() => setIsRegistering(!isRegistering)}
                            className="ml-2 text-blue-600 font-semibold hover:underline bg-transparent border-none cursor-pointer"
                        >
                            {isRegistering ? 'Log in' : 'Register now'}
                        </button>
                    </p>
                </div>

            </div>
        </main>
    );
}
