import { db } from '../db';
import { equipment } from '../db/schema';

export type EquipmentRow = typeof equipment.$inferSelect;

export async function listAllEquipment(ex: typeof db = db): Promise<EquipmentRow[]> {
  return ex.select().from(equipment).orderBy(equipment.id);
}
