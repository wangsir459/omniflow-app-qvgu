import { API_BASE_URL } from '@/config/constants';
import type { ApiErrorBody, ApiResponse } from '@shared/types/api';
import type { Equipment, Reservation, ReservationInput } from '@shared/types/reservation';

export class ApiError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
  } catch {
    throw new ApiError('网络异常，请检查网络后重试', 'NETWORK');
  }
  let body: ApiResponse<T> | ApiErrorBody | null = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok || !body || !('success' in body) || !body.success) {
    const err = body && 'error' in body ? body.error : undefined;
    throw new ApiError(err?.message ?? '服务暂时不可用，请稍后重试', err?.code ?? 'SERVER');
  }
  return (body as ApiResponse<T>).data;
}

export const api = {
  listEquipment: () => request<Equipment[]>('/equipment'),
  listReservations: () => request<Reservation[]>('/reservations'),
  createReservation: (input: ReservationInput) =>
    request<Reservation>('/reservations', { method: 'POST', body: JSON.stringify(input) }),
  updateReservation: (id: string, input: ReservationInput) =>
    request<Reservation>(`/reservations/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  cancelReservation: (id: string) =>
    request<Reservation>(`/reservations/${id}/cancel`, { method: 'POST' }),
  checkIn: (id: string) =>
    request<Reservation>(`/reservations/${id}/check-in`, { method: 'POST' }),
};
