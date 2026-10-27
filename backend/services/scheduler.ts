import { GYM_RULES, formatMinute, planTotalMinutes } from '../../shared/gym';
import type { WaitReasonCode } from '../../shared/types/reservation';

export interface SchedulerEquipment {
  id: string;
  maxConcurrent: number;
  status: string;
}

export interface SchedulerSegment {
  equipmentId: string;
  duration: number;
}

export interface BusyInterval {
  equipmentId: string;
  start: number;
  end: number;
}

export interface GymInterval {
  start: number;
  end: number;
}

export interface ScheduleRequest {
  segments: SchedulerSegment[];
  windowStart: number;
  windowEnd: number;
  /** earliest allowed entry minute (e.g. now for same-day bookings) */
  earliest: number;
}

export interface ScheduleContext {
  equipment: Map<string, SchedulerEquipment>;
  busySegments: BusyInterval[];
  gymIntervals: GymInterval[];
}

export interface ScheduleResult {
  ok: boolean;
  start?: number;
  code?: WaitReasonCode;
  message?: string;
}

const DAY_MINUTES = 24 * 60 + 1;

export const WAIT_MESSAGES: Record<WaitReasonCode, string> = {
  WINDOW_TOO_NARROW: '期望时间段过窄，无法放下完整训练',
  EQUIPMENT_FULL: '热门器械该时段已满',
  MAINTENANCE: '计划中含维修中的器械',
  GYM_FULL: '该时段全馆人数已满',
};

function offsets(segments: SchedulerSegment[]): { offset: number; duration: number }[] {
  let cursor = 0;
  return segments.map((s) => {
    const item = { offset: cursor, duration: s.duration };
    cursor += s.duration + GYM_RULES.TRANSITION;
    return item;
  });
}

export function schedule(req: ScheduleRequest, ctx: ScheduleContext): ScheduleResult {
  const { segments } = req;
  const fail = (code: WaitReasonCode): ScheduleResult => ({
    ok: false,
    code,
    message: WAIT_MESSAGES[code],
  });
  // Result shape: ok=true carries `start`, ok=false carries `code` and `message`.

  for (const seg of segments) {
    const eq = ctx.equipment.get(seg.equipmentId);
    if (!eq || eq.status !== 'normal') return fail('MAINTENANCE');
  }

  const total = planTotalMinutes(segments.map((s) => s.duration));
  const step = GYM_RULES.STEP;
  const lowerBound = Math.max(req.windowStart, req.earliest, GYM_RULES.OPEN_MINUTE);
  const lo = Math.ceil(lowerBound / step) * step;
  const hi = Math.min(req.windowEnd, GYM_RULES.CLOSE_MINUTE) - total;
  if (req.windowEnd - req.windowStart < total || hi < lo) return fail('WINDOW_TOO_NARROW');

  const eqLoad = new Map<string, Uint16Array>();
  const eqMinutes = new Map<string, number>();
  for (const busy of ctx.busySegments) {
    let arr = eqLoad.get(busy.equipmentId);
    if (!arr) {
      arr = new Uint16Array(DAY_MINUTES);
      eqLoad.set(busy.equipmentId, arr);
    }
    for (let m = busy.start; m < busy.end && m < DAY_MINUTES; m++) arr[m] += 1;
    eqMinutes.set(busy.equipmentId, (eqMinutes.get(busy.equipmentId) ?? 0) + (busy.end - busy.start));
  }
  const gymLoad = new Uint16Array(DAY_MINUTES);
  for (const g of ctx.gymIntervals) {
    for (let m = g.start; m < g.end && m < DAY_MINUTES; m++) gymLoad[m] += 1;
  }

  const plan = offsets(segments);
  let best: { start: number; cost: number } | null = null;
  let gymBlocked = false;

  for (let start = lo; start <= hi; start += step) {
    let feasible = true;
    let cost = 0;

    for (let m = start; m < start + total; m++) {
      if (gymLoad[m] + 1 > GYM_RULES.GYM_CAPACITY) {
        feasible = false;
        gymBlocked = true;
        break;
      }
    }
    if (!feasible) continue;

    for (let i = 0; i < segments.length && feasible; i++) {
      const seg = segments[i];
      const eq = ctx.equipment.get(seg.equipmentId)!;
      const arr = eqLoad.get(seg.equipmentId);
      const segStart = start + plan[i].offset;
      const segEnd = segStart + plan[i].duration;
      const hotness = Math.min(2, (eqMinutes.get(seg.equipmentId) ?? 0) / (eq.maxConcurrent * 120));
      const weight = 1 + hotness;
      for (let m = segStart; m < segEnd; m++) {
        const current = arr ? arr[m] : 0;
        if (current + 1 > eq.maxConcurrent) {
          feasible = false;
          break;
        }
        const ratio = (current + 1) / eq.maxConcurrent;
        cost += ratio * ratio * weight;
      }
    }
    if (!feasible) continue;

    if (!best || cost < best.cost) best = { start, cost };
  }

  if (best) return { ok: true, start: best.start };
  return fail(gymBlocked ? 'GYM_FULL' : 'EQUIPMENT_FULL');
}

export function buildSegmentTimes(segments: SchedulerSegment[], start: number) {
  return offsets(segments).map((o) => ({
    start: start + o.offset,
    end: start + o.offset + o.duration,
  }));
}

export function relaxHint(req: ScheduleRequest, ctx: ScheduleContext, minutes = 30): string | null {
  const relaxed: ScheduleRequest = {
    ...req,
    windowStart: Math.max(GYM_RULES.OPEN_MINUTE, req.windowStart - minutes),
    windowEnd: Math.min(GYM_RULES.CLOSE_MINUTE, req.windowEnd + minutes),
  };
  const result = schedule(relaxed, ctx);
  if (!result.ok) return null;
  return `将时间段放宽 ${minutes} 分钟（${formatMinute(relaxed.windowStart)}-${formatMinute(relaxed.windowEnd)}）可排上`;
}
