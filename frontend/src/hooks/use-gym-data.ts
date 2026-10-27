import { useCallback, useEffect, useState } from 'react';
import type { Equipment, Reservation } from '@shared/types/reservation';
import { api } from '@/lib/api';

interface GymDataState {
  equipment: Equipment[];
  reservations: Reservation[];
  loading: boolean;
  error: string | null;
}

export function useGymData() {
  const [state, setState] = useState<GymDataState>({
    equipment: [],
    reservations: [],
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    try {
      const [equipment, reservations] = await Promise.all([
        api.listEquipment(),
        api.listReservations(),
      ]);
      setState({ equipment, reservations, loading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载失败';
      setState((s) => ({ ...s, loading: false, error: message }));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const retry = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    void load();
  }, [load]);

  return { ...state, reload: load, retry };
}
