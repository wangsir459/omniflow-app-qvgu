export const GYM_RULES = {
  OPEN_MINUTE: 6 * 60 + 30,
  CLOSE_MINUTE: 22 * 60,
  STEP: 5,
  TRANSITION: 2,
  MAX_SEGMENTS: 12,
  MAX_TOTAL_MINUTES: 120,
  MIN_SEGMENT: 5,
  MAX_SEGMENT: 60,
  CHECKIN_BEFORE: 10,
  CHECKIN_AFTER: 15,
  MODIFY_LOCK: 30,
  GYM_CAPACITY: 150,
  OPEN_DAYS_AHEAD: 3,
  PEAK_START: 17 * 60,
  PEAK_END: 21 * 60,
} as const;

export const BODY_PARTS = ['胸', '背', '腿', '肩', '手臂', '核心', '有氧'] as const;

export function formatMinute(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function planTotalMinutes(durations: number[]): number {
  if (durations.length === 0) return 0;
  const sum = durations.reduce((a, b) => a + b, 0);
  return sum + GYM_RULES.TRANSITION * (durations.length - 1);
}

export const STATUS_LABELS: Record<string, string> = {
  scheduled: '已排定',
  waiting: '等待中',
  checked_in: '已签到',
  completed: '已完成',
  cancelled: '已取消',
  released: '已释放',
  expired: '已失效',
};
