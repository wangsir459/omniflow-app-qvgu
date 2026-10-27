export type BodyPart = '胸' | '背' | '腿' | '肩' | '手臂' | '核心' | '有氧';

export type EquipmentStatus = 'normal' | 'maintenance';

export interface Equipment {
  id: string;
  name: string;
  location: string;
  bodyPart: BodyPart;
  muscles: string;
  description: string;
  safetyNotes: string;
  maxConcurrent: number;
  status: EquipmentStatus;
  maintenanceNote: string | null;
  expectedRecovery: string | null;
  /** Peak-hour booking utilization, 0-100 */
  heat: number;
}

export type ReservationStatus =
  | 'scheduled'
  | 'waiting'
  | 'checked_in'
  | 'completed'
  | 'cancelled'
  | 'released'
  | 'expired';

export type WaitReasonCode =
  | 'WINDOW_TOO_NARROW'
  | 'EQUIPMENT_FULL'
  | 'MAINTENANCE'
  | 'GYM_FULL';

export interface PlanSegmentInput {
  equipmentId: string;
  duration: number;
}

export interface ReservationSegment {
  order: number;
  equipmentId: string;
  equipmentName: string;
  bodyPart: BodyPart;
  location: string;
  duration: number;
  /** minutes since midnight */
  start: number;
  end: number;
}

export interface Reservation {
  id: string;
  date: string;
  dayName: string;
  windowStart: number;
  windowEnd: number;
  status: ReservationStatus;
  startMinute: number | null;
  totalMinutes: number;
  segments: ReservationSegment[];
  waitReasonCode: WaitReasonCode | null;
  waitReason: string | null;
  queuePosition: number | null;
  lateCancel: boolean;
  checkedInAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReservationInput {
  date: string;
  dayName: string;
  windowStart: number;
  windowEnd: number;
  segments: PlanSegmentInput[];
  clientKey?: string;
}
