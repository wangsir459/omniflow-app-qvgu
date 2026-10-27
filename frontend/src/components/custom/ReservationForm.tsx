import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, Trash2, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import type { BodyPart, Equipment, Reservation } from '@shared/types/reservation';
import { BODY_PARTS, GYM_RULES, formatMinute, planTotalMinutes } from '@shared/gym';
import { api } from '@/lib/api';
import { addDays, dateLabel, parseTime, todayCN } from '@/lib/date';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DraftSegment {
  uid: string;
  equipmentId: string;
  duration: number;
}

interface Props {
  equipment: Equipment[];
  editing: Reservation | null;
}

const DURATIONS = Array.from({ length: 12 }, (_, i) => (i + 1) * 5);
const selectClass = 'h-11 rounded-md border bg-white px-3 text-sm';
const uid = () => Math.random().toString(36).slice(2, 10);

const ReservationForm = ({ equipment, editing }: Props) => {
  const navigate = useNavigate();
  const today = todayCN();
  const dates = Array.from({ length: GYM_RULES.OPEN_DAYS_AHEAD + 1 }, (_, i) => addDays(today, i));

  const [date, setDate] = useState(editing?.date ?? today);
  const [dayName, setDayName] = useState(editing?.dayName ?? '推日');
  const [windowStart, setWindowStart] = useState(editing?.windowStart ?? 18 * 60);
  const [windowEnd, setWindowEnd] = useState(editing?.windowEnd ?? 20 * 60);
  const [segments, setSegments] = useState<DraftSegment[]>(
    editing?.segments.map((s) => ({ uid: uid(), equipmentId: s.equipmentId, duration: s.duration })) ?? []
  );
  const [part, setPart] = useState<BodyPart>('胸');
  const [newDuration, setNewDuration] = useState(20);
  const [submitting, setSubmitting] = useState(false);

  const byId = new Map(equipment.map((e) => [e.id, e]));
  const total = planTotalMinutes(segments.map((s) => s.duration));
  const windowLen = windowEnd - windowStart;
  const slack = windowLen - total;
  const hasBroken = segments.some((s) => byId.get(s.equipmentId)?.status !== 'normal');

  const problem =
    segments.length === 0
      ? '请至少添加一个训练段'
      : total > GYM_RULES.MAX_TOTAL_MINUTES
        ? `训练总时长不能超过 ${GYM_RULES.MAX_TOTAL_MINUTES} 分钟`
        : hasBroken
          ? '计划中含维修或已下线的器械，请先替换'
          : windowStart < GYM_RULES.OPEN_MINUTE || windowEnd > GYM_RULES.CLOSE_MINUTE
            ? `营业时间为 ${formatMinute(GYM_RULES.OPEN_MINUTE)}-${formatMinute(GYM_RULES.CLOSE_MINUTE)}`
            : windowLen <= 0
              ? '结束时间必须晚于开始时间'
              : slack < 0
                ? `时间段长度不足：训练总时长需 ${total} 分钟`
                : null;

  const flexibility =
    slack < 0 || segments.length === 0
      ? null
      : slack < 15
        ? { text: '时间段较紧，可能排不上', cls: 'text-amber-700' }
        : { text: `弹性充足，约 ${Math.floor(slack / GYM_RULES.STEP) + 1} 个候选入场时间`, cls: 'text-emerald-700' };

  const addSegment = (e: Equipment) => {
    if (e.status !== 'normal') return;
    if (segments.length >= GYM_RULES.MAX_SEGMENTS) {
      toast.error(`每个训练日最多 ${GYM_RULES.MAX_SEGMENTS} 段`);
      return;
    }
    setSegments((prev) => [...prev, { uid: uid(), equipmentId: e.id, duration: newDuration }]);
  };

  const move = (index: number, dir: -1 | 1) =>
    setSegments((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const setDuration = (id: string, duration: number) =>
    setSegments((prev) => prev.map((s) => (s.uid === id ? { ...s, duration } : s)));

  const submit = async () => {
    if (problem) {
      toast.error(problem);
      return;
    }
    const input = {
      date,
      dayName: dayName.trim() || '训练日',
      windowStart,
      windowEnd,
      segments: segments.map((s) => ({ equipmentId: s.equipmentId, duration: s.duration })),
    };
    setSubmitting(true);
    try {
      const result = editing
        ? await api.updateReservation(editing.id, input)
        : await api.createReservation({ ...input, clientKey: `${uid()}${uid()}` });
      if (result.status === 'waiting') {
        toast.warning('暂时排不上，已进入等待队列');
      } else {
        toast.success(
          `${editing ? '修改成功' : '预约成功'}，入场时间 ${formatMinute(result.startMinute ?? 0)}`
        );
      }
      navigate('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const partEquipment = equipment.filter((e) => e.bodyPart === part);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
      <div className="space-y-6 lg:col-span-2">
        <section className="rounded-[var(--radius-lg)] border bg-white p-5 shadow-md">
          <h2 className="mb-4 text-lg font-bold">1. 选择训练日与期望时间段</h2>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {dates.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDate(d)}
                className={`min-h-11 cursor-pointer rounded-lg border px-2 text-sm ${
                  d === date ? 'border-primary bg-secondary font-bold text-primary' : 'bg-white'
                }`}
              >
                {d === today ? '今天 ' : ''}
                {dateLabel(d)}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">训练日名称</span>
              <Input className="h-11" value={dayName} maxLength={20} onChange={(e) => setDayName(e.target.value)} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">最早到场</span>
              <Input
                className="h-11"
                type="time"
                step={300}
                value={formatMinute(windowStart)}
                onChange={(e) => setWindowStart(parseTime(e.target.value) ?? windowStart)}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">最晚结束</span>
              <Input
                className="h-11"
                type="time"
                step={300}
                value={formatMinute(windowEnd)}
                onChange={(e) => setWindowEnd(parseTime(e.target.value) ?? windowEnd)}
              />
            </label>
          </div>
        </section>

        <section className="rounded-[var(--radius-lg)] border bg-white p-5 shadow-md">
          <h2 className="mb-4 text-lg font-bold">2. 选部位、选器械、设时长</h2>
          <div className="mb-3 flex flex-wrap gap-2">
            {BODY_PARTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPart(p)}
                className={`min-h-11 min-w-14 cursor-pointer rounded-full border px-4 text-sm ${
                  p === part ? 'border-primary bg-primary font-bold text-white' : 'bg-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <label className="mb-3 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">新增训练段时长</span>
            <select className={selectClass} value={newDuration} onChange={(e) => setNewDuration(Number(e.target.value))}>
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {d} 分钟
                </option>
              ))}
            </select>
          </label>
          {partEquipment.length === 0 ? (
            <p className="rounded-lg bg-background p-4 text-sm text-muted-foreground">该部位暂无器械</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {partEquipment.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  disabled={e.status !== 'normal'}
                  onClick={() => addSegment(e)}
                  className="flex min-h-14 cursor-pointer items-center justify-between rounded-xl border bg-white p-3 text-left text-sm transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>
                    <span className="block font-medium">{e.name}</span>
                    <span className="text-xs text-muted-foreground">{e.location}</span>
                  </span>
                  {e.status !== 'normal' ? (
                    <span className="flex items-center gap-1 text-xs text-red-600">
                      <Wrench className="size-3" />
                      维修中
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-primary">+ 添加</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className="space-y-6">
        <section className="rounded-[var(--radius-lg)] border bg-white p-5 shadow-md">
          <h2 className="mb-4 text-lg font-bold">3. 训练顺序（{segments.length}/{GYM_RULES.MAX_SEGMENTS}）</h2>
          {segments.length === 0 ? (
            <p className="rounded-lg bg-background p-4 text-sm text-muted-foreground">
              还没有训练段，从左侧选择器械开始编排你的第一个计划。
            </p>
          ) : (
            <ul className="space-y-2">
              {segments.map((s, i) => {
                const eq = byId.get(s.equipmentId);
                const broken = !eq || eq.status !== 'normal';
                return (
                  <li
                    key={s.uid}
                    className={`rounded-xl border p-3 ${broken ? 'border-red-300 bg-red-50' : 'bg-background'}`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-sm font-bold">
                        {i + 1}. {eq?.name ?? '器械已下线'}
                      </span>
                      {broken && <span className="shrink-0 text-xs font-bold text-red-600">需替换</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <select
                        className={`${selectClass} flex-1`}
                        aria-label="时长"
                        value={s.duration}
                        onChange={(e) => setDuration(s.uid, Number(e.target.value))}
                      >
                        {DURATIONS.map((d) => (
                          <option key={d} value={d}>
                            {d} 分钟
                          </option>
                        ))}
                      </select>
                      <Button variant="outline" size="icon" className="size-11" aria-label="上移" disabled={i === 0} onClick={() => move(i, -1)}>
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="size-11" aria-label="下移" disabled={i === segments.length - 1} onClick={() => move(i, 1)}>
                        <ArrowDown className="size-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-11 text-destructive"
                        aria-label="删除"
                        onClick={() => setSegments((prev) => prev.filter((x) => x.uid !== s.uid))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-4 space-y-1 rounded-xl bg-secondary p-4 text-sm">
            <p>
              总时长（含转场 {GYM_RULES.TRANSITION} 分钟/段间）：<b>{total} 分钟</b>
            </p>
            <p>
              时间段下限：<b>≥ {total} 分钟</b>（当前 {Math.max(windowLen, 0)} 分钟）
            </p>
            {flexibility && <p className={`font-medium ${flexibility.cls}`}>{flexibility.text}</p>}
          </div>
          {problem && segments.length > 0 && (
            <p role="alert" className="mt-3 text-sm font-medium text-destructive">
              {problem}
            </p>
          )}
          <Button className="mt-4 min-h-12 w-full text-base font-bold" disabled={submitting} onClick={() => void submit()}>
            {submitting ? '提交中…' : editing ? '保存修改并重新排班' : '提交预约'}
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            系统不会改变训练顺序与时长，只调整整体入场时间。
          </p>
        </section>
      </aside>
    </div>
  );
};

export default ReservationForm;
