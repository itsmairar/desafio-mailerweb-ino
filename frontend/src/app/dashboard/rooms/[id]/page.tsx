'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { roomService, bookingService } from '@/services/models';
import { Room, Booking } from '@/types';
import toast from 'react-hot-toast';
import { ArrowLeft, Clock, Calendar, Users, Edit2, Trash2, X } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import api from '@/services/api';

export default function RoomPage() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const roomId = Number(params?.id);

    const [room, setRoom] = useState<Room | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingBookingId, setEditingBookingId] = useState<number | null>(null);

    const [title, setTitle] = useState('');
    const [startAt, setStartAt] = useState('');
    const [endAt, setEndAt] = useState('');
    const [participants, setParticipants] = useState('');

    useEffect(() => {
        if (isNaN(roomId)) return;
        fetchRoomDetails();
    }, [roomId]);

    const fetchRoomDetails = async () => {
        try {
            const roomData = await roomService.getRoom(roomId);
            setRoom(roomData);
            try {
                const resp = await api.get('/api/v1/bookings/');
                const roomBookings = resp.data.filter((b: Booking) => b.room_id === roomId);
                setBookings(roomBookings);
            } catch {
                setBookings([]);
            }
        } catch {
            toast.error('Failed to load room details');
            router.push('/dashboard');
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setIsEditMode(false);
        setEditingBookingId(null);
        setTitle('');
        setStartAt('');
        setEndAt('');
        setParticipants('');
    };

    const handleOpenNewModal = () => {
        resetForm();
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (booking: Booking) => {
        if (booking.status === 'CANCELED') {
            toast.error('Cannot edit a canceled booking');
            return;
        }
        resetForm();
        setIsEditMode(true);
        setEditingBookingId(booking.id);
        setTitle(booking.title);
        setStartAt(booking.start_at.slice(0, 16));
        setEndAt(booking.end_at.slice(0, 16));
        setParticipants(booking.participants);
        setIsModalOpen(true);
    };

    const handleSaveBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const dateStartIso = new Date(startAt).toISOString();
            const dateEndIso = new Date(endAt).toISOString();

            if (isEditMode && editingBookingId) {
                await bookingService.updateBooking(editingBookingId, {
                    title, participants, start_at: dateStartIso, end_at: dateEndIso
                });
                toast.success(`Booking updated successfully! Email sent to ${participants}`);
            } else {
                await bookingService.createBooking({
                    room_id: roomId, title, participants, start_at: dateStartIso, end_at: dateEndIso
                });
                toast.success(`Booking created! Outbox event sent to Worker.`);
            }
            setIsModalOpen(false);
            fetchRoomDetails();
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Failed to save booking');
        }
    };

    const handleCancelBooking = async (bookingId: number) => {
        if (!confirm('Are you sure you want to cancel this booking? Participants will be notified.')) return;
        try {
            await bookingService.cancelBooking(bookingId);
            toast.success('Booking canceled successfully!');
            fetchRoomDetails();
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Error canceling booking');
        }
    };

    if (isLoading) return <div className="h-screen flex items-center justify-center font-bold animate-pulse text-xl text-slate-500">Loading Room...</div>;

    return (
        <div className="min-h-screen bg-slate-50">

            <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center sticky top-0 z-10 shadow-sm gap-4">
                <button
                    onClick={() => router.push('/dashboard')}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">{room?.name}</h1>
                    <p className="text-slate-500 text-xs mt-0.5">{room?.capacity} Seats Available</p>
                </div>
                <button
                    onClick={handleOpenNewModal}
                    className="bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md active:scale-95 transition-all"
                >
                    Schedule Meeting
                </button>
            </nav>


            <main className="max-w-5xl mx-auto px-6 py-10">

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8">
                    <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-6">Upcoming Schedule</h2>

                    {bookings.length === 0 ? (
                        <div className="text-center py-16 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                            <div className="h-16 w-16 bg-white shadow-sm rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                <Calendar size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700 mb-1">No bookings yet</h3>
                            <p className="text-slate-500 mb-6">This room is completely free. Be the first to schedule an event!</p>
                            <button
                                onClick={handleOpenNewModal}
                                className="text-blue-600 font-semibold hover:underline"
                            >
                                Create new booking
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {bookings.map(booking => {
                                const isCanceled = booking.status === 'CANCELED';
                                return (
                                    <div
                                        key={booking.id}
                                        className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${isCanceled ? 'bg-red-50/50 border-red-100 opacity-75' : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'}`}
                                    >
                                        <div className="flex gap-4 items-start">
                                            <div className={`mt-1 h-10 w-10 rounded-full flex items-center justify-center ${isCanceled ? 'bg-red-100 text-red-500' : 'bg-blue-100 text-blue-600'}`}>
                                                {isCanceled ? <X size={20} /> : <Clock size={20} />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h4 className={`text-lg font-bold ${isCanceled ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                                                        {booking.title}
                                                    </h4>
                                                    {isCanceled && <span className="text-[10px] font-bold tracking-wider bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full uppercase">Canceled</span>}
                                                    {!isCanceled && <span className="text-[10px] font-bold tracking-wider bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full uppercase">Active</span>}
                                                </div>
                                                <div className="text-sm text-slate-600 flex items-center gap-4">
                                                    <span className="flex items-center gap-1.5 font-medium">
                                                        <Calendar size={14} className="text-slate-400" />
                                                        {format(parseISO(booking.start_at), "MMM d, yyyy • HH:mm")} — {format(parseISO(booking.end_at), "HH:mm")}
                                                    </span>
                                                    <span className="flex items-center gap-1.5">
                                                        <Users size={14} className="text-slate-400" />
                                                        <span className="truncate max-w-[200px]">{booking.participants}</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleOpenEditModal(booking)}
                                                disabled={isCanceled}
                                                className={`p-2 rounded-lg transition-colors ${isCanceled ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'}`}
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleCancelBooking(booking.id)}
                                                disabled={isCanceled}
                                                className={`p-2 rounded-lg transition-colors ${isCanceled ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:text-red-600 hover:bg-red-50'}`}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>


            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">
                                {isEditMode ? 'Update Meeting' : 'Schedule New Meeting'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveBooking} className="p-6 space-y-5">
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-slate-700">Meeting Title</label>
                                <input
                                    autoFocus required type="text" value={title} onChange={e => setTitle(e.target.value)}
                                    placeholder="e.g. Q3 Planning"
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50 focus:bg-white transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-semibold text-slate-700">Start Time</label>
                                    <input
                                        required type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50 focus:bg-white transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-semibold text-slate-700">End Time</label>
                                    <input
                                        required type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50 focus:bg-white transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-slate-700">Participants (Emails)</label>
                                <input
                                    required type="text" value={participants} onChange={e => setParticipants(e.target.value)}
                                    placeholder="john@example.com, doe@gmail.com"
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50 focus:bg-white transition-all"
                                />
                                <p className="text-xs text-slate-500 font-medium">Separate multiple emails with commas.</p>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button" onClick={() => setIsModalOpen(false)}
                                    className="w-full py-3.5 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="w-full py-3.5 rounded-xl font-bold bg-blue-600 text-white shadow-md hover:shadow-lg hover:bg-blue-700 active:scale-[0.98] transition-all"
                                >
                                    {isEditMode ? 'Save Changes' : 'Confirm Booking'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
