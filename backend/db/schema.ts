import {
  pgTable,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { ReservationSegment } from '../../shared/types/reservation';

export const equipment = pgTable('equipment', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  location: text('location').notNull(),
  bodyPart: text('body_part').notNull(),
  muscles: text('muscles').notNull().default(''),
  description: text('description').notNull().default(''),
  safetyNotes: text('safety_notes').notNull().default(''),
  maxConcurrent: integer('max_concurrent').notNull().default(1),
  status: text('status').notNull().default('normal'),
  maintenanceNote: text('maintenance_note'),
  expectedRecovery: text('expected_recovery'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const reservations = pgTable(
  'reservations',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    date: text('date').notNull(),
    dayName: text('day_name').notNull().default('训练日'),
    windowStart: integer('window_start').notNull(),
    windowEnd: integer('window_end').notNull(),
    status: text('status').notNull(),
    startMinute: integer('start_minute'),
    totalMinutes: integer('total_minutes').notNull(),
    segments: jsonb('segments').$type<ReservationSegment[]>().notNull(),
    waitReasonCode: text('wait_reason_code'),
    waitReason: text('wait_reason'),
    clientKey: text('client_key'),
    lateCancel: boolean('late_cancel').notNull().default(false),
    version: integer('version').notNull().default(1),
    checkedInAt: timestamp('checked_in_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('reservations_user_date_active_idx')
      .on(t.userId, t.date)
      .where(sql`${t.status} in ('scheduled','waiting','checked_in')`),
  ]
);
