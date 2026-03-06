import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RoomPage from '@/app/dashboard/rooms/[id]/page';
import { roomService, bookingService } from '@/services/models';
import api from '@/services/api';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'react-hot-toast';


vi.mock('@/services/models', () => ({
    roomService: {
        getRoom: vi.fn()
    },
    bookingService: {
        createBooking: vi.fn()
    }
}));


vi.mock('@/services/api', () => ({
    default: {
        get: vi.fn()
    }
}));

const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>
        <Toaster />
        {children}
    </AuthProvider>
);

describe('Room Booking Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (roomService.getRoom as any).mockResolvedValue({
            id: 1, name: 'Google Conf Room', capacity: 10
        });
        (api.get as any).mockResolvedValue({ data: [] });
    });

    it('should open Schedule Modal and render inputs', async () => {
        render(<RoomPage />, { wrapper: Wrapper });


        await waitFor(() => {
            expect(screen.getByText(/Google Conf Room/)).toBeInTheDocument();
        });

        const openModalBtn = screen.getByRole('button', { name: /Schedule Meeting/i });
        fireEvent.click(openModalBtn);

        expect(screen.getByPlaceholderText(/e.g. Q3 Planning/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/john@example.com, doe@gmail.com/i)).toBeInTheDocument();
    });

    it('should submit a booking successfully', async () => {
        (bookingService.createBooking as any).mockResolvedValueOnce({ id: 10 });

        const { container } = render(<RoomPage />, { wrapper: Wrapper });
        await waitFor(() => expect(screen.getByText(/Google Conf Room/)).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', { name: /Schedule Meeting/i }));


        fireEvent.change(screen.getByPlaceholderText(/Q3 Planning/i), { target: { value: 'Marketing Kickoff' } });
        fireEvent.change(screen.getByPlaceholderText(/john@example.com/i), { target: { value: 'test@example.com' } });

        const dateInputs = container.querySelectorAll('input[type="datetime-local"]');
        fireEvent.change(dateInputs[0], { target: { value: '2024-10-10T10:00' } });
        fireEvent.change(dateInputs[1], { target: { value: '2024-10-10T12:00' } });


        fireEvent.click(screen.getByRole('button', { name: /Confirm Booking/i }));

        await waitFor(() => {
            expect(bookingService.createBooking).toHaveBeenCalled();
            expect(screen.getByText(/Booking created! Outbox event sent to Worker./i)).toBeInTheDocument();
        });
    });

    it('should display Overlap Conflict Error when backend rejects booking (409)', async () => {
        const fakeOverlapError = {
            response: { data: { detail: 'Time slot overlaps with an existing booking' } }
        };
        (bookingService.createBooking as any).mockRejectedValueOnce(fakeOverlapError);

        const { container } = render(<RoomPage />, { wrapper: Wrapper });
        await waitFor(() => expect(screen.getByText(/Google Conf Room/)).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', { name: /Schedule Meeting/i }));


        fireEvent.change(screen.getByPlaceholderText(/Q3 Planning/i), { target: { value: 'Blocked Meeting' } });
        fireEvent.change(screen.getByPlaceholderText(/john@example.com/i), { target: { value: 'test@example.com' } });

        const dateInputs = container.querySelectorAll('input[type="datetime-local"]');
        fireEvent.change(dateInputs[0], { target: { value: '2024-10-10T10:00' } });
        fireEvent.change(dateInputs[1], { target: { value: '2024-10-10T12:00' } });

        fireEvent.click(screen.getByRole('button', { name: /Confirm Booking/i }));


        await waitFor(() => {
            expect(screen.getByText(/Time slot overlaps with an existing booking/i)).toBeInTheDocument();
        });
    });

});
