export interface Room {
    id: number;
    name: string;
    capacity: number;
}

export interface Booking {
    id: number;
    title: string;
    start_at: string;
    end_at: string;
    status: 'ACTIVE' | 'CANCELED';
    participants: string;
    user_id: number;
    room_id: number;
    room?: Room;
}

export interface UserLoginData {
    username: string;
    password?: string;
}

export interface UserRegisterData {
    username: string;
    email: string;
    password?: string;
}

export interface BookingCreateData {
    room_id: number;
    title: string;
    start_at: string;
    end_at: string;
    participants: string;
}

export interface RoomCreateData {
    name: string;
    capacity: number;
}
