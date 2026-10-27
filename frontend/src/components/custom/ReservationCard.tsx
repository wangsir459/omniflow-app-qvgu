import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Hourglass, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import type { Reservation } from '@shared/types/reservation';
import { GYM_RULES, STATUS_LABELS, formatMinute } from '@shared/gym';
import { api } from '@/lib/api';
import { dateLabel, todayCN } from '@/lib/date';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  reservation: Reservation;
  onChanged: () => void;
}

const ReservationCard = ({ reservation: r, onChanged }: Props) => {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const checkedIn = r.status === 'checked_in';
  const editable = r.status === 'scheduled' || r.status === 'waiting';
  const isToday = r.date === todayCN();

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败，请重试');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-[var(--radius-lg)] border bg-white p-5 shadow-md sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <span className="h-6 w-1.5 rounded-full bg-primary" />
          {isToday ? '今日训练排班' : `训练排班 · ${dateLabel(r.date)}`}
        </h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            r.status === 'waiting' ? 'bg-amber-50 text-amber-700' : 'bg-secondary text-primary'
          }`}
        >
          {STATUS_LABELS[r.status]}
        </span>
      </div>

      {r.status === 'waiting' && (
        <div className="mb-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <Hourglass className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-bold">
              等待中{r.queuePosition ? `，队列第 ${r.queuePosition} 位` : ''}
            </p>
            <p className="mt-1 text-xs leading-relaxed">{r.waitReason}</p>
            <p className="mt-1 text-xs">有空位时系统会自动为你递补，无需反复刷新。</p>
          </div>
        </div>
      )}

      <ol className="relative space-y-6 pl-8 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-0.5 before:bg-border before:content-['']">
        {r.startMinute !== null && (
          <li className="relative">
            <span className="absolute -left-[27px] top-1 size-4 rounded-full border-4 border-white bg-primary shadow-sm" />
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-bold">入场签到</p>
                <p className="text-xs text-muted-foreground">
                  入场时间 {formatMinute(r.startMinute)} · 签到窗口 {formatMinute(r.startMinute - GYM_RULES.CHECKIN_BEFORE)} -{' '}
                  {formatMinute(r.startMinute + GYM_RULES.CHECKIN_AFTER)}
                </p>
              </div>
              <Button
                className="min-h-11 px-6 font-bold"
                disabled={busy || checkedIn || r.status !== 'scheduled'}
                onClick={() => void run(() => api.checkIn(r.id), '签到成功，祝训练愉快！')}
              >
                <QrCode className="size-4" />
                {checkedIn ? '已签到' : '扫码签到'}
              </Button>
            </div>
          </li>
        )}
        {r.segments.map((s) => (
          <li key={s.order} className="relative">
            <span className="absolute -left-[27px] top-1 size-4 rounded-full border-4 border-white bg-border" />
            <div className="rounded-xl border bg-background p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-1">
                <span className="text-xs font-bold tracking-wider text-primary">{s.bodyPart}部训练</span>
                <span className="text-xs text-muted-foreground">
                  {r.startMinute !== null
                    ? `${formatMinute(s.start)} - ${formatMinute(s.end)} `
                    : ''}
                  ({s.duration}min)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                  <Dumbbell className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-bold">{s.equipmentName}</p>
                  <p className="truncate text-xs text-muted-foreground">位置：{s.location}</p>
                </div>
                <button
                  type="button"
                  className="ml-auto min-h-11 shrink-0 cursor-pointer px-2 text-xs font-medium text-primary hover:underline"
                  onClick={() => navigate(`/equipment?id=${s.equipmentId}`)}
                >
                  查看教学
                </button>
              </div>
            </div>
          </li>
        ))}
      </ol>

      {editable && (
        <div className="mt-6 flex items-center justify-between border-t pt-4">
          <button
            type="button"
            className="min-h-11 cursor-pointer text-sm text-muted-foreground transition-colors hover:text-destructive"
            disabled={busy}
            onClick={() => setConfirmOpen(true)}
          >
            取消预约
          </button>
          <button
            type="button"
            className="min-h-11 cursor-pointer text-sm font-bold text-primary"
            onClick={() => navigate(`/reserve?edit=${r.id}`)}
          >
            修改计划
          </button>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定取消这次预约吗？</AlertDialogTitle>
            <AlertDialogDescription>
              取消后名额会立即释放并触发等待队列递补。开始前 {GYM_RULES.MODIFY_LOCK} 分钟内取消将记为“晚取消”。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>再想想</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void run(() => api.cancelReservation(r.id), '预约已取消，名额已释放')}
            >
              确认取消
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export default ReservationCard;
