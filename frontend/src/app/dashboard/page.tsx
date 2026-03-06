'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { roomService } from '@/services/models';
import { Room } from '@/types';
import toast from 'react-hot-toast';
import { LogOut, Plus, Users, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
    const { user, logout } = useAuth();
    const router = useRouter();

    const [rooms, setRooms] = useState<Room[]>([]);
    const [isLoading, setIsLoading] = useState(true);


    const [isCreatingRoom, setIsCreatingRoom] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomCapacity, setNewRoomCapacity] = useState<number | ''>('');

    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        try {
            const data = await roomService.getRooms();
            setRooms(data);
        } catch {
            toast.error('Failed to fetch meeting rooms');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRoomName || !newRoomCapacity) return;

        try {
            await roomService.createRoom({ name: newRoomName, capacity: Number(newRoomCapacity) });
            toast.success('Room created successfully!');
            setIsCreatingRoom(false);
            setNewRoomName('');
            setNewRoomCapacity('');
            fetchRooms();
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Failed to create room');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">

            <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">M</div>
                    <span className="text-xl font-bold text-slate-800 tracking-tight">MailerWeb</span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-sm">
                        <span className="text-slate-500">Logged as </span>
                        <span className="font-semibold text-slate-800">{user}</span>
                    </div>
                    <button
                        onClick={logout}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                        title="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </nav>


            <main className="max-w-6xl mx-auto px-6 py-10">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Meeting Rooms</h1>
                        <p className="text-slate-500 mt-1">Manage and book workspaces across the company.</p>
                    </div>
                    <button
                        onClick={() => setIsCreatingRoom(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all active:scale-95"
                    >
                        <Plus size={20} />
                        <span>New Room</span>
                    </button>
                </div>


                {isCreatingRoom && (
                    <div className="mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-top-4">
                        <h2 className="text-lg font-bold text-slate-800 mb-4">Create New Room</h2>
                        <form onSubmit={handleCreateRoom} className="flex items-end gap-4">
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Room Name</label>
                                <input
                                    type="text"
                                    autoFocus
                                    value={newRoomName}
                                    onChange={(e) => setNewRoomName(e.target.value)}
                                    placeholder="e.g. Conference A"
                                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="w-48">
                                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Max Capacity</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={newRoomCapacity}
                                    onChange={(e) => setNewRoomCapacity(e.target.value ? Number(e.target.value) : '')}
                                    placeholder="e.g. 10"
                                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreatingRoom(false)}
                                    className="px-5 py-2.5 rounded-lg font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 rounded-lg font-semibold text-white bg-slate-900 hover:bg-black transition-colors"
                                >
                                    Save Room
                                </button>
                            </div>
                        </form>
                    </div>
                )}


                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-40 bg-slate-200 rounded-2xl animate-pulse"></div>
                        ))}
                    </div>
                ) : rooms.length === 0 ? (
                    <div className="text-center py-20 bg-white border border-slate-200 border-dashed rounded-3xl">
                        <h3 className="text-xl font-bold text-slate-700 mb-2">No rooms available yet</h3>
                        <p className="text-slate-500">Create the first meeting room to start managing bookings.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rooms.map(room => (
                            <div
                                key={room.id}
                                onClick={() => router.push(`/dashboard/rooms/${room.id}`)}
                                className="group bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-300 cursor-pointer transition-all duration-300"
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <Users size={24} />
                                    </div>
                                    <div className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                                        <span>{room.capacity}</span>
                                        <span>Seats</span>
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">{room.name}</h3>
                                <p className="text-slate-500 text-sm mb-6">Click to view schedules and manage bookings.</p>

                                <div className="flex items-center text-sm font-semibold text-blue-600 gap-2 opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300">
                                    Open Schedule <ArrowRight size={16} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
