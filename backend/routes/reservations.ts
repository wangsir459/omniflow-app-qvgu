import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import type { ApiResponse } from '../../shared/types/api';
import type { Equipment, Reservation, ReservationInput } from '../../shared/types/reservation';
import {
  cancelReservation,
  checkInReservation,
  listEquipmentWithHeat,
  listMyReservations,
  modifyReservation,
  submitReservation,
} from '../services/reservationService';

const router = Router();

const reservationSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式不正确'),
  dayName: z.string().trim().min(1).max(20),
  windowStart: z.number().int().min(0).max(1440),
  windowEnd: z.number().int().min(0).max(1440),
  segments: z
    .array(
      z.object({
        equipmentId: z.string().min(1),
        duration: z.number().int(),
      })
    )
    .min(1)
    .max(12),
  clientKey: z.string().min(1).max(64).optional(),
});

type Handler<T> = (req: Request, res: Response<ApiResponse<T>>) => Promise<void>;

function wrap<T>(handler: Handler<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

router.get(
  '/equipment',
  wrap<Equipment[]>(async (_req, res) => {
    res.json({ success: true, data: await listEquipmentWithHeat() });
  })
);

router.get(
  '/reservations',
  wrap<Reservation[]>(async (_req, res) => {
    res.json({ success: true, data: await listMyReservations() });
  })
);

router.post(
  '/reservations',
  wrap<Reservation>(async (req, res) => {
    const input = reservationSchema.parse(req.body) as ReservationInput;
    res.status(201).json({ success: true, data: await submitReservation(input) });
  })
);

router.put(
  '/reservations/:id',
  wrap<Reservation>(async (req, res) => {
    const input = reservationSchema.parse(req.body) as ReservationInput;
    res.json({ success: true, data: await modifyReservation(req.params.id as string, input) });
  })
);

router.post(
  '/reservations/:id/cancel',
  wrap<Reservation>(async (req, res) => {
    res.json({ success: true, data: await cancelReservation(req.params.id) });
  })
);

router.post(
  '/reservations/:id/check-in',
  wrap<Reservation>(async (req, res) => {
    res.json({ success: true, data: await checkInReservation(req.params.id) });
  })
);

export default router;
