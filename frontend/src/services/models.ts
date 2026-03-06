import { Booking, BookingCreateData, Room, RoomCreateData } from '@/types';
import api from './api';

export const roomService = {
    async getRooms() {
        const response = await api.get<Room[]>('/api/v1/rooms/');
        return response.data;
    },

    async getRoom(id: number) {
        const response = await api.get<Room>(`/api/v1/rooms/${id}`);
        return response.data;
    },

    async createRoom(data: RoomCreateData) {
        const response = await api.post<Room>('/api/v1/rooms/', data);
        return response.data;
    }
};

export const bookingService = {
    async createBooking(data: BookingCreateData) {
        const response = await api.post<Booking>('/api/v1/bookings/', data);
        return response.data;
    },

    async updateBooking(id: number, data: Omit<BookingCreateData, 'room_id'>) {
        const response = await api.put<Booking>(`/api/v1/bookings/${id}`, data);
        return response.data;
    },

    async cancelBooking(id: number) {
        const response = await api.delete<Booking>(`/api/v1/bookings/${id}`);
        return response.data;
    }
};
