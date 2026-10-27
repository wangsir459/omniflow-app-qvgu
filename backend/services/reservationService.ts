import { randomUUID } from 'crypto';
import { sql } from 'drizzle-orm';
import { db } from '../db';
import { AppError } from '../middleware/errorHandler';
import { GYM_RULES, formatMinute, planTotalMinutes } from '../../shared/gym';
import type {
  BodyPart,
  Equipment,
  Reservation,
  ReservationInput,
  ReservationSegment,
  WaitReasonCode,
} from '../../shared/types/reservation';
import { EquipmentRow, listAllEquipment } from '../repositories/equipmentRepository';
import {
  ReservationRow,
  findByClientKey,
  findOpenByUserDate,
  findReservationById,
  insertReservation,
  listOccupyingByDates,
  listOpenUpToDate,
  listReservationsByUser,
  listWaitingByDate,
  updateReservation,
} from '../repositories/reservationRepository';
import {
  ScheduleContext,
  ScheduleRequest,
  buildSegmentTimes,
  relaxHint,
  schedule,
} from './scheduler';

export const DEMO_USER_ID = 'demo-student';

type Executor = typeof db;

export function nowInCN() {
  const d = new Date(Date.now() + 8 * 3600 * 1000);
  return { date: d.toISOString().slice(0, 10), minute: d.getUTCHours() * 60 + d.getUTCMinutes() };
}

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function withDateLocks<T>(dates: string[], fn: (ex: Executor) => Promise<T>): Promise<T> {
  const unique = Array.from(new Set(dates)).sort();
  return db.transaction(async (tx) => {
    for (const date of unique) {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${date}))`);
    }
    return fn(tx as unknown as Executor);
  });
}

async function buildContext(ex: Executor, date: string, equipmentRows: EquipmentRow[], excludeId?: string): Promise<ScheduleContext> {
  const active = await listOccupyingByDates(ex, [date], excludeId);
  return {
    equipment: new Map(
      equipmentRows.map((e) => [e.id, { id: e.id, maxConcurrent: e.maxConcurrent, status: e.status }])
    ),
    busySegments: active.flatMap((r) =>
      r.segments.map((s) => ({ equipmentId: s.equipmentId, start: s.start, end: s.end }))
    ),
    gymIntervals: active
      .filter((r) => r.startMinute !== null)
      .map((r) => ({ start: r.startMinute as number, end: (r.startMinute as number) + r.totalMinutes })),
  };
}

function earliestFor(date: string): number {
  const now = nowInCN();
  return date === now.date ? now.minute : 0;
}

function toRequest(input: ReservationInput): ScheduleRequest {
  return {
    segments: input.segments,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
    earliest: earliestFor(input.date),
  };
}

function validateInput(input: ReservationInput, equipmentRows: EquipmentRow[]) {
  const now = nowInCN();
  const lastDate = addDays(now.date, GYM_RULES.OPEN_DAYS_AHEAD);
  if (input.date < now.date || input.date > lastDate) {
    throw new AppError(`仅可预约今天至 ${lastDate} 的训练日`, 400, 'OUT_OF_OPEN_PERIOD');
  }
  if (input.windowStart >= input.windowEnd) {
    throw new AppError('结束时间必须晚于开始时间', 400, 'INVALID_WINDOW');
  }
  if (input.windowStart < GYM_RULES.OPEN_MINUTE || input.windowEnd > GYM_RULES.CLOSE_MINUTE) {
    throw new AppError(
      `健身房营业时间为 ${formatMinute(GYM_RULES.OPEN_MINUTE)}-${formatMinute(GYM_RULES.CLOSE_MINUTE)}`,
      400,
      'OUT_OF_BUSINESS_HOURS'
    );
  }
  if (input.date === now.date && input.windowEnd <= now.minute) {
    throw new AppError('期望时间段已经过去', 400, 'WINDOW_PASSED');
  }
  if (input.segments.length < 1 || input.segments.length > GYM_RULES.MAX_SEGMENTS) {
    throw new AppError(`训练段数量需在 1-${GYM_RULES.MAX_SEGMENTS} 之间`, 400, 'INVALID_SEGMENTS');
  }
  const byId = new Map(equipmentRows.map((e) => [e.id, e]));
  for (const seg of input.segments) {
    const eq = byId.get(seg.equipmentId);
    if (!eq) throw new AppError('器械不存在', 400, 'EQUIPMENT_NOT_FOUND');
    if (eq.status !== 'normal') {
      throw new AppError(`「${eq.name}」维修中，请先替换器械`, 400, 'EQUIPMENT_MAINTENANCE');
    }
    if (
      seg.duration < GYM_RULES.MIN_SEGMENT ||
      seg.duration > GYM_RULES.MAX_SEGMENT ||
      seg.duration % 5 !== 0
    ) {
      throw new AppError('每段时长需为 5-60 分钟，以 5 分钟递增', 400, 'INVALID_DURATION');
    }
  }
  const total = planTotalMinutes(input.segments.map((s) => s.duration));
  if (total > GYM_RULES.MAX_TOTAL_MINUTES) {
    throw new AppError(`训练总时长不能超过 ${GYM_RULES.MAX_TOTAL_MINUTES} 分钟`, 400, 'TOTAL_TOO_LONG');
  }
  if (input.windowEnd - input.windowStart < total) {
    throw new AppError(`时间段长度不足：训练总时长需 ${total} 分钟`, 400, 'WINDOW_TOO_SHORT');
  }
  return { total, byId };
}

function placeSegments(
  input: ReservationInput,
  byId: Map<string, EquipmentRow>,
  start: number | null
): ReservationSegment[] {
  const times = start === null ? null : buildSegmentTimes(input.segments, start);
  return input.segments.map((seg, i) => {
    const eq = byId.get(seg.equipmentId) as EquipmentRow;
    return {
      order: i + 1,
      equipmentId: eq.id,
      equipmentName: eq.name,
      bodyPart: eq.bodyPart as BodyPart,
      location: eq.location,
      duration: seg.duration,
      start: times ? times[i].start : 0,
      end: times ? times[i].end : 0,
    };
  });
}

function composeWaitReason(message: string, hint: string | null) {
  return hint ? `${message}。建议：${hint}` : message;
}

export function toReservation(row: ReservationRow, queuePosition: number | null = null): Reservation {
  return {
    id: row.id,
    date: row.date,
    dayName: row.dayName,
    windowStart: row.windowStart,
    windowEnd: row.windowEnd,
    status: row.status as Reservation['status'],
    startMinute: row.startMinute,
    totalMinutes: row.totalMinutes,
    segments: row.segments,
    waitReasonCode: row.waitReasonCode as WaitReasonCode | null,
    waitReason: row.waitReason,
    queuePosition,
    lateCancel: row.lateCancel,
    checkedInAt: row.checkedInAt ? row.checkedInAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function tightness(r: ReservationRow) {
  return r.windowEnd - r.windowStart - r.totalMinutes;
}

async function rematchWaiting(ex: Executor, date: string) {
  if (date < nowInCN().date) return;
  const waiting = (await listWaitingByDate(ex, date)).sort(
    (a, b) => tightness(a) - tightness(b) || a.createdAt.getTime() - b.createdAt.getTime()
  );
  if (waiting.length === 0) return;
  const equipmentRows = await listAllEquipment(ex);
  for (const w of waiting) {
    const ctx = await buildContext(ex, date, equipmentRows);
    const req: ScheduleRequest = {
      segments: w.segments.map((s) => ({ equipmentId: s.equipmentId, duration: s.duration })),
      windowStart: w.windowStart,
      windowEnd: w.windowEnd,
      earliest: earliestFor(date),
    };
    const result = schedule(req, ctx);
    if (!result.ok) continue;
    const times = buildSegmentTimes(req.segments, result.start);
    await updateReservation(ex, w.id, {
      status: 'scheduled',
      startMinute: result.start,
      segments: w.segments.map((s, i) => ({ ...s, start: times[i].start, end: times[i].end })),
      waitReason: null,
      waitReasonCode: null,
    });
  }
}

async function sweep() {
  const now = nowInCN();
  const open = await listOpenUpToDate(db, now.date);
  const dirtyDates = new Set<string>();
  for (const r of open) {
    const past = r.date < now.date;
    if (r.status === 'scheduled' && r.startMinute !== null) {
      if (past || now.minute > r.startMinute + GYM_RULES.CHECKIN_AFTER) {
        await updateReservation(db, r.id, { status: 'released' });
        dirtyDates.add(r.date);
      }
    } else if (r.status === 'checked_in' && r.startMinute !== null) {
      if (past || now.minute >= r.startMinute + r.totalMinutes) {
        await updateReservation(db, r.id, { status: 'completed' });
      }
    } else if (r.status === 'waiting') {
      if (past || now.minute > r.windowEnd - r.totalMinutes) {
        await updateReservation(db, r.id, {
          status: 'expired',
          waitReason: '可用的入场时间已全部过期，等待自动失效',
        });
      }
    }
  }
  for (const date of dirtyDates) {
    if (date >= now.date) await withDateLocks([date], (ex) => rematchWaiting(ex, date));
  }
}

export async function listMyReservations(): Promise<Reservation[]> {
  await sweep();
  const rows = await listReservationsByUser(db, DEMO_USER_ID);
  const positions = new Map<string, number>();
  const waitingDates = Array.from(new Set(rows.filter((r) => r.status === 'waiting').map((r) => r.date)));
  for (const date of waitingDates) {
    const queue = (await listWaitingByDate(db, date)).sort(
      (a, b) => tightness(a) - tightness(b) || a.createdAt.getTime() - b.createdAt.getTime()
    );
    queue.forEach((q, i) => positions.set(q.id, i + 1));
  }
  return rows.map((r) => toReservation(r, positions.get(r.id) ?? null));
}

export async function submitReservation(input: ReservationInput): Promise<Reservation> {
  await sweep();
  const row = await withDateLocks([input.date], async (ex) => {
    if (input.clientKey) {
      const existing = await findByClientKey(ex, DEMO_USER_ID, input.clientKey);
      if (existing) return existing;
    }
    const duplicate = await findOpenByUserDate(ex, DEMO_USER_ID, input.date);
    if (duplicate) {
      throw new AppError('同日已有预约，请在首页修改或取消后再预约', 409, 'DUPLICATE_RESERVATION');
    }
    const equipmentRows = await listAllEquipment(ex);
    const { total, byId } = validateInput(input, equipmentRows);
    const ctx = await buildContext(ex, input.date, equipmentRows);
    const req = toRequest(input);
    const result = schedule(req, ctx);
    const base = {
      id: randomUUID(),
      userId: DEMO_USER_ID,
      date: input.date,
      dayName: input.dayName,
      windowStart: input.windowStart,
      windowEnd: input.windowEnd,
      totalMinutes: total,
      clientKey: input.clientKey ?? null,
    };
    if (result.ok) {
      return insertReservation(ex, {
        ...base,
        status: 'scheduled',
        startMinute: result.start,
        segments: placeSegments(input, byId, result.start),
      });
    }
    return insertReservation(ex, {
      ...base,
      status: 'waiting',
      startMinute: null,
      segments: placeSegments(input, byId, null),
      waitReasonCode: result.code,
      waitReason: composeWaitReason(result.message, relaxHint(req, ctx)),
    });
  });
  return toReservation(row);
}

function assertOwned(row: ReservationRow | null): ReservationRow {
  if (!row || row.userId !== DEMO_USER_ID) throw new AppError('预约不存在', 404, 'NOT_FOUND');
  return row;
}

function minutesUntilStart(row: ReservationRow): number | null {
  if (row.startMinute === null) return null;
  const now = nowInCN();
  if (row.date > now.date) return Infinity;
  if (row.date < now.date) return -Infinity;
  return row.startMinute - now.minute;
}

export async function modifyReservation(id: string, input: ReservationInput): Promise<Reservation> {
  await sweep();
  const current = assertOwned(await findReservationById(db, id));
  const row = await withDateLocks([current.date, input.date], async (ex) => {
    const old = assertOwned(await findReservationById(ex, id));
    if (old.status !== 'scheduled' && old.status !== 'waiting') {
      throw new AppError('当前状态的预约不可修改', 400, 'NOT_MODIFIABLE');
    }
    const until = minutesUntilStart(old);
    if (old.status === 'scheduled' && until !== null && until < GYM_RULES.MODIFY_LOCK) {
      throw new AppError('开始前 30 分钟内不可修改，只能取消', 400, 'MODIFY_LOCKED');
    }
    if (input.date !== old.date) {
      const dup = await findOpenByUserDate(ex, DEMO_USER_ID, input.date, id);
      if (dup) throw new AppError('目标日期已有预约', 409, 'DUPLICATE_RESERVATION');
    }
    const equipmentRows = await listAllEquipment(ex);
    const { total, byId } = validateInput(input, equipmentRows);
    const ctx = await buildContext(ex, input.date, equipmentRows, id);
    const req = toRequest(input);
    const result = schedule(req, ctx);

    if (result.ok) {
      return updateReservation(ex, id, {
        date: input.date,
        dayName: input.dayName,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        totalMinutes: total,
        status: 'scheduled',
        startMinute: result.start,
        segments: placeSegments(input, byId, result.start),
        waitReason: null,
        waitReasonCode: null,
        version: old.version + 1,
      });
    }
    if (old.status === 'scheduled') {
      throw new AppError(
        `新方案暂时排不上（${result.message}），已为你保留原预约`,
        409,
        'RESCHEDULE_FAILED'
      );
    }
    return updateReservation(ex, id, {
      date: input.date,
      dayName: input.dayName,
      windowStart: input.windowStart,
      windowEnd: input.windowEnd,
      totalMinutes: total,
      status: 'waiting',
      startMinute: null,
      segments: placeSegments(input, byId, null),
      waitReasonCode: result.code,
      waitReason: composeWaitReason(result.message, relaxHint(req, ctx)),
      version: old.version + 1,
    });
  });
  if (current.status === 'scheduled') {
    await withDateLocks([current.date], (ex) => rematchWaiting(ex, current.date));
  }
  return toReservation(row);
}

export async function cancelReservation(id: string): Promise<Reservation> {
  await sweep();
  const current = assertOwned(await findReservationById(db, id));
  const row = await withDateLocks([current.date], async (ex) => {
    const old = assertOwned(await findReservationById(ex, id));
    if (old.status === 'checked_in') throw new AppError('已签到的预约不可取消', 400, 'ALREADY_CHECKED_IN');
    if (old.status !== 'scheduled' && old.status !== 'waiting') {
      throw new AppError('当前状态的预约不可取消', 400, 'NOT_CANCELLABLE');
    }
    const until = minutesUntilStart(old);
    const late = old.status === 'scheduled' && until !== null && until < GYM_RULES.MODIFY_LOCK;
    const updated = await updateReservation(ex, id, { status: 'cancelled', lateCancel: late });
    await rematchWaiting(ex, old.date);
    return updated;
  });
  return toReservation(row);
}

export async function checkInReservation(id: string): Promise<Reservation> {
  await sweep();
  const current = assertOwned(await findReservationById(db, id));
  if (current.status === 'checked_in') return toReservation(current);
  if (current.status !== 'scheduled' || current.startMinute === null) {
    throw new AppError('没有可签到的有效预约', 400, 'NO_VALID_RESERVATION');
  }
  const now = nowInCN();
  if (current.date !== now.date) {
    throw new AppError('不在预约日期内，没有有效预约', 400, 'NOT_RESERVATION_DATE');
  }
  const opensAt = current.startMinute - GYM_RULES.CHECKIN_BEFORE;
  if (now.minute < opensAt) {
    throw new AppError(`尚未开放签到，${formatMinute(opensAt)} 起可签到`, 400, 'CHECKIN_TOO_EARLY');
  }
  const row = await updateReservation(db, id, { status: 'checked_in', checkedInAt: new Date() });
  return toReservation(row);
}

export async function listEquipmentWithHeat(): Promise<Equipment[]> {
  const rows = await listAllEquipment(db);
  const today = nowInCN().date;
  const dates = [today, addDays(today, 1)];
  const active = await listOccupyingByDates(db, dates);
  const peakLength = GYM_RULES.PEAK_END - GYM_RULES.PEAK_START;
  return rows.map((e) => {
    let heat = 0;
    for (const date of dates) {
      let minutes = 0;
      for (const r of active) {
        if (r.date !== date) continue;
        for (const s of r.segments) {
          if (s.equipmentId !== e.id) continue;
          const overlap = Math.min(s.end, GYM_RULES.PEAK_END) - Math.max(s.start, GYM_RULES.PEAK_START);
          if (overlap > 0) minutes += overlap;
        }
      }
      heat = Math.max(heat, Math.min(100, Math.round((minutes / (peakLength * e.maxConcurrent)) * 100)));
    }
    return {
      id: e.id,
      name: e.name,
      location: e.location,
      bodyPart: e.bodyPart as BodyPart,
      muscles: e.muscles,
      description: e.description,
      safetyNotes: e.safetyNotes,
      maxConcurrent: e.maxConcurrent,
      status: e.status as Equipment['status'],
      maintenanceNote: e.maintenanceNote,
      expectedRecovery: e.expectedRecovery,
      heat,
    };
  });
}
