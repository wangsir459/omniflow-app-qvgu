import { and, asc, eq, inArray, lte, ne } from 'drizzle-orm';
import { db } from '../db';
import { reservations } from '../db/schema';

export type ReservationRow = typeof reservations.$inferSelect;
export type ReservationInsert = typeof reservations.$inferInsert;

type Executor = typeof db;

const OPEN_STATUSES = ['scheduled', 'waiting', 'checked_in'];
const OCCUPYING_STATUSES = ['scheduled', 'checked_in'];

export async function findReservationById(ex: Executor, id: string) {
  const rows = await ex.select().from(reservations).where(eq(reservations.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listReservationsByUser(ex: Executor, userId: string) {
  return ex
    .select()
    .from(reservations)
    .where(eq(reservations.userId, userId))
    .orderBy(asc(reservations.date), asc(reservations.createdAt));
}

export async function listOccupyingByDates(ex: Executor, dates: string[], excludeId?: string) {
  const conditions = [
    inArray(reservations.date, dates),
    inArray(reservations.status, OCCUPYING_STATUSES),
  ];
  if (excludeId) conditions.push(ne(reservations.id, excludeId));
  return ex.select().from(reservations).where(and(...conditions));
}

export async function listWaitingByDate(ex: Executor, date: string) {
  return ex
    .select()
    .from(reservations)
    .where(and(eq(reservations.date, date), eq(reservations.status, 'waiting')))
    .orderBy(asc(reservations.createdAt));
}

export async function findOpenByUserDate(ex: Executor, userId: string, date: string, excludeId?: string) {
  const conditions = [
    eq(reservations.userId, userId),
    eq(reservations.date, date),
    inArray(reservations.status, OPEN_STATUSES),
  ];
  if (excludeId) conditions.push(ne(reservations.id, excludeId));
  const rows = await ex.select().from(reservations).where(and(...conditions)).limit(1);
  return rows[0] ?? null;
}

export async function findByClientKey(ex: Executor, userId: string, clientKey: string) {
  const rows = await ex
    .select()
    .from(reservations)
    .where(and(eq(reservations.userId, userId), eq(reservations.clientKey, clientKey)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listOpenUpToDate(ex: Executor, date: string) {
  return ex
    .select()
    .from(reservations)
    .where(and(lte(reservations.date, date), inArray(reservations.status, OPEN_STATUSES)));
}

export async function insertReservation(ex: Executor, values: ReservationInsert) {
  const rows = await ex.insert(reservations).values(values).returning();
  return rows[0];
}

export async function updateReservation(
  ex: Executor,
  id: string,
  patch: Partial<ReservationInsert>
) {
  const rows = await ex
    .update(reservations)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(reservations.id, id))
    .returning();
  return rows[0];
}
