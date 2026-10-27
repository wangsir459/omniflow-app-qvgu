import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, BarChart3, CalendarPlus, ClipboardList, Flame, PlayCircle, Plus } from 'lucide-react';
import type { Equipment, Reservation } from '@shared/types/reservation';
import { useGymData } from '@/hooks/use-gym-data';
import { IS_EMBEDDED, requestBuild } from '@/lib/unbuilt';
import ReservationCard from '@/components/custom/ReservationCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const ACTIVE = ['scheduled', 'waiting', 'checked_in'];

const heatTone = (heat: number) =>
  heat >= 80
    ? { text: 'text-red-600', bar: 'bg-red-500' }
    : heat >= 50
      ? { text: 'text-amber-600', bar: 'bg-amber-500' }
      : { text: 'text-emerald-600', bar: 'bg-emerald-500' };

const HeatPanel = ({ equipment }: { equipment: Equipment[] }) => {
  const top = [...equipment]
    .filter((e) => e.status === 'normal')
    .sort((a, b) => b.heat - a.heat)
    .slice(0, 4);
  return (
    <section className="rounded-[var(--radius-lg)] border bg-white p-5 shadow-md sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
        <Flame className="size-5 text-[#FF9F43]" />
        器械实时热度
      </h2>
      {top.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无器械数据</p>
      ) : (
        <div className="space-y-4">
          {top.map((e) => {
            const tone = heatTone(e.heat);
            return (
              <div key={e.id}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {e.name}
                    {e.heat >= 80 ? '（热门）' : ''}
                  </span>
                  <span className={`font-bold ${tone.text}`}>{e.heat}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div className={`h-full ${tone.bar}`} style={{ width: `${e.heat}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        * 数据基于高峰时段（17:00-21:00）的预约情况计算，建议错峰使用热门器械。
      </p>
    </section>
  );
};

const MaintenancePanel = ({ equipment }: { equipment: Equipment[] }) => {
  const broken = equipment.filter((e) => e.status === 'maintenance');
  return (
    <section className="rounded-[var(--radius-lg)] border bg-white p-5 shadow-md sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
        <AlertTriangle className="size-5 text-destructive" />
        器械维护公告
      </h2>
      {broken.length === 0 ? (
        <p className="text-sm text-muted-foreground">目前所有器械运行正常 👍</p>
      ) : (
        <div className="space-y-3">
          {broken.map((e) => (
            <div key={e.id} className="rounded-xl border border-red-100 bg-red-50 p-3">
              <p className="mb-1 text-xs font-bold text-red-700">{e.name} 维修中</p>
              <p className="text-[11px] leading-relaxed text-red-600">
                {e.maintenanceNote ?? '暂时不可预约'}
                {e.expectedRecovery ? `。预计恢复时间：${e.expectedRecovery}` : ''}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

const Index = () => {
  const navigate = useNavigate();
  const { equipment, reservations, loading, error, reload, retry } = useGymData();

  const current: Reservation | undefined = useMemo(
    () =>
      reservations
        .filter((r) => ACTIVE.includes(r.status))
        .sort((a, b) => a.date.localeCompare(b.date) || (a.startMinute ?? 0) - (b.startMinute ?? 0))[0],
    [reservations]
  );
  const doneCount = reservations.filter((r) => r.status === 'completed' || r.status === 'checked_in').length;

  const quick = [
    { label: '新建预约', icon: Plus, onClick: () => navigate('/reserve'), unbuilt: false, prompt: '' },
    {
      label: '我的计划',
      icon: ClipboardList,
      onClick: () => requestBuild('我的计划', '实现「我的计划」页面：学生可创建、编辑、复制、删除训练循环计划，并在预约时直接选用。'),
      unbuilt: true,
      prompt: '实现「我的计划」页面：学生可创建、编辑、复制、删除训练循环计划，并在预约时直接选用。',
    },
    { label: '器械教学', icon: PlayCircle, onClick: () => navigate('/equipment'), unbuilt: false, prompt: '' },
    {
      label: '使用统计',
      icon: BarChart3,
      onClick: () => requestBuild('使用统计', '实现使用统计看板：按日、周展示各部位和器械的使用率、热门冷门排行与未签到率。'),
      unbuilt: true,
      prompt: '实现使用统计看板：按日、周展示各部位和器械的使用率、热门冷门排行与未签到率。',
    },
  ].filter((q) => !q.unbuilt || IS_EMBEDDED);

  return (
    <div>
      <header className="mb-6 md:mb-8">
        <h1 className="mb-2 text-2xl font-bold">你好，张同学 👋</h1>
        <p className="text-muted-foreground">
          {doneCount > 0 ? `你已完成 ${doneCount} 次预约训练，继续加油！` : '提前预约，错峰训练，告别排队。'}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="space-y-6 lg:col-span-2">
          {loading ? (
            <div className="space-y-4 rounded-[var(--radius-lg)] border bg-white p-6 shadow-md">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : error ? (
            <div className="rounded-[var(--radius-lg)] border bg-white p-8 text-center shadow-md">
              <p className="mb-1 font-bold">加载失败</p>
              <p className="mb-4 text-sm text-muted-foreground">{error}</p>
              <Button onClick={retry} className="min-h-11">
                重试
              </Button>
            </div>
          ) : current ? (
            <ReservationCard key={`${current.id}-${current.updatedAt}`} reservation={current} onChanged={() => void reload()} />
          ) : (
            <section className="rounded-[var(--radius-lg)] border bg-white p-8 text-center shadow-md">
              <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-secondary text-primary">
                <CalendarPlus className="size-7" />
              </span>
              <h2 className="mb-1 text-lg font-bold">今日训练排班</h2>
              <p className="mb-5 text-sm text-muted-foreground">你还没有进行中的预约，编排一份训练计划，系统帮你错峰入场。</p>
              <Button className="min-h-11 px-6 font-bold" onClick={() => navigate('/reserve')}>
                新建预约
              </Button>
            </section>
          )}

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {quick.map((q) => (
              <button
                key={q.label}
                type="button"
                data-omniflow-feature-status={q.unbuilt ? 'unbuilt' : undefined}
                data-omniflow-feature={q.unbuilt ? q.label : undefined}
                data-omniflow-build-prompt={q.unbuilt ? q.prompt : undefined}
                onClick={q.onClick}
                className="group flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border bg-white p-4 transition-all hover:border-primary hover:shadow-sm"
              >
                <span className="mb-2 flex size-10 items-center justify-center rounded-full bg-secondary transition-transform group-hover:scale-110">
                  <q.icon className="size-5 text-primary" />
                </span>
                <span className="text-xs font-medium">{q.label}</span>
              </button>
            ))}
          </section>
        </div>

        <div className="space-y-6">
          {loading ? (
            <Skeleton className="h-48 w-full rounded-[var(--radius-lg)]" />
          ) : (
            <>
              <HeatPanel equipment={equipment} />
              <MaintenancePanel equipment={equipment} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
