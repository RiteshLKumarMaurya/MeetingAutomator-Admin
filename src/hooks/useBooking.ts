'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { bookingApi, adminBookingApi, adminConsultationSettingsApi } from '@/services/api';
import type {
  CreateConsultationBookingRequest,
  GuestCancelBookingRequest,
  GuestRescheduleBookingRequest,
} from '@/types';
import { isTransientError } from '@/lib/apiClient';

export const bookingQueryKeys = {
  availability: (date: string) => ['booking', 'availability', date] as const,
  guest: (token: string) => ['booking', 'guest', token] as const,
  consultationSettings: ['booking', 'consultation-settings'] as const,
};

export function useAvailableConsultationSlots(date: string) {
  return useQuery({
    queryKey: bookingQueryKeys.availability(date),
    queryFn: () => bookingApi.getAvailableSlots(date).then((r) => r.data.data),
    enabled: Boolean(date),
    staleTime: 20 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useConsultationSettings() {
  return useQuery({
    queryKey: bookingQueryKeys.consultationSettings,
    queryFn: () => bookingApi.getConsultationSettings().then((r) => r.data.data),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useAdminConsultationSettings() {
  return useQuery({
    queryKey: ['admin', 'consultation-settings'],
    queryFn: () => adminConsultationSettingsApi.get().then((r) => r.data.data),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useUpdateAdminConsultationSettings() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: import('@/types').UpdateConsultationSettingsRequest) =>
      adminConsultationSettingsApi.update(data).then((r) => r.data.data),
    onSuccess: (data) => {
      qc.setQueryData(['admin', 'consultation-settings'], data);
      qc.setQueryData(bookingQueryKeys.consultationSettings, data);
      qc.invalidateQueries({ queryKey: ['booking', 'availability'] });
      toast.success('Consultation settings updated.');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          'Unable to update consultation settings.'
      );
    },
  });
}

export function useCreateConsultationBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateConsultationBookingRequest) =>
      bookingApi.createBooking(data).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', 'availability'] });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        (isTransientError(error)
          ? 'We could not reach the booking service. Please try again.'
          : 'Unable to submit your consultation request.');
      toast.error(message);
    },
  });
}

export function useGuestBooking(token: string) {
  return useQuery({
    queryKey: bookingQueryKeys.guest(token),
    queryFn: () => bookingApi.getGuestBooking(token).then((r) => r.data.data),
    enabled: Boolean(token),
    staleTime: 10 * 1000,
  });
}

export function useGuestReschedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GuestRescheduleBookingRequest) =>
      bookingApi.guestReschedule(data).then((r) => r.data.data),
    onSuccess: (data) => {
      if (data?.bookingId) {
        queryClient.invalidateQueries({ queryKey: ['booking', 'guest'] });
        queryClient.invalidateQueries({ queryKey: ['booking', 'availability'] });
      }
      toast.success('Your consultation was rescheduled.');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          'Unable to reschedule this consultation.'
      );
    },
  });
}

export function useGuestCancel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GuestCancelBookingRequest) =>
      bookingApi.guestCancel(data).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', 'guest'] });
      queryClient.invalidateQueries({ queryKey: ['booking', 'availability'] });
      toast.success('Your consultation has been cancelled.');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          'Unable to cancel this consultation.'
      );
    },
  });
}


export const adminBookingQueryKeys = {
  dashboard: ['admin', 'bookings', 'dashboard'] as const,
  list: (filters: unknown, page: number, size: number) =>
    ['admin', 'bookings', 'list', filters, page, size] as const,
  detail: (bookingId: string) =>
    ['admin', 'bookings', 'detail', bookingId] as const,
};

export function useAdminBookingDashboard() {
  return useQuery({
    queryKey: adminBookingQueryKeys.dashboard,
    queryFn: () => adminBookingApi.getDashboard().then((r) => r.data.data),
    staleTime: 15 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useAdminBookings(
  filters: import('@/types').AdminBookingFilterRequest,
  page = 0,
  size = 10
) {
  return useQuery({
    queryKey: adminBookingQueryKeys.list(filters, page, size),
    queryFn: () =>
      adminBookingApi
        .getBookings(filters, { page, size, sort: 'scheduledAt,ASC' })
        .then((r) => r.data.data),
    staleTime: 10 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useAdminBookingDetail(bookingId: string | null) {
  return useQuery({
    queryKey: adminBookingQueryKeys.detail(bookingId ?? ''),
    queryFn: () =>
      adminBookingApi.getBookingById(bookingId as string).then((r) => r.data.data),
    enabled: Boolean(bookingId),
  });
}

function adminBookingErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.message || fallback;
}

export function useAdminApproveBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      data,
    }: {
      bookingId: string;
      data: import('@/types').BookingActionRequest;
    }) => adminBookingApi.approveBooking(bookingId, data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      qc.invalidateQueries({ queryKey: ['booking', 'availability'] });
      toast.success('Booking approved and confirmed.');
    },
    onError: (error: any) =>
      toast.error(adminBookingErrorMessage(error, 'Unable to approve this booking.')),
  });
}

export function useAdminRescheduleBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      data,
    }: {
      bookingId: string;
      data: import('@/types').BookingActionRequest;
    }) => adminBookingApi.rescheduleBooking(bookingId, data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      qc.invalidateQueries({ queryKey: ['booking', 'availability'] });
      toast.success('Booking rescheduled.');
    },
    onError: (error: any) =>
      toast.error(adminBookingErrorMessage(error, 'Unable to reschedule this booking.')),
  });
}

export function useAdminCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      data,
    }: {
      bookingId: string;
      data: import('@/types').BookingActionRequest;
    }) => adminBookingApi.cancelBooking(bookingId, data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      qc.invalidateQueries({ queryKey: ['booking', 'availability'] });
      toast.success('Booking cancelled.');
    },
    onError: (error: any) =>
      toast.error(adminBookingErrorMessage(error, 'Unable to cancel this booking.')),
  });
}

export function useAdminCompleteBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) =>
      adminBookingApi.completeBooking(bookingId).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      toast.success('Booking marked as completed.');
    },
    onError: (error: any) =>
      toast.error(adminBookingErrorMessage(error, 'Unable to complete this booking.')),
  });
}

export function useAdminNoShowBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) =>
      adminBookingApi.noShowBooking(bookingId).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      toast.success('Booking marked as no-show.');
    },
    onError: (error: any) =>
      toast.error(adminBookingErrorMessage(error, 'Unable to mark this booking as no-show.')),
  });
}

export function useAdminDeleteBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) =>
      adminBookingApi.deleteBooking(bookingId).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      toast.success('Booking deleted.');
    },
    onError: (error: any) =>
      toast.error(adminBookingErrorMessage(error, 'Unable to delete this booking.')),
  });
}
