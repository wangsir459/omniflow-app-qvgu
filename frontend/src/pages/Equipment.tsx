import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Dumbbell, Play, Search, ShieldAlert, Wrench } from 'lucide-react';
import type { BodyPart, Equipment as EquipmentItem } from '@shared/types/reservation';
import { useGymData } from '@/hooks/use-gym-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { IS_EMBEDDED, requestBuild } from '@/lib/unbuilt';

const VIDEO_PROMPT = '实现器械教学视频播放：详情页播放器、封面、加载进度、失败重试，管理员可上传 mp4。';

const PARTS: BodyPart[] = ['胸', '背', '腿', '肩', '手臂', '核心', '有氧'];

const StatusTag = ({ item }: { item: EquipmentItem }) =>
  item.status === 'maintenance' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">
      <Wrench className="size-3" />
      维修中
    </span>
  ) : (
    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-primary">可使用</span>
  );

const Detail = ({ item, onBack }: { item: EquipmentItem; onBack: () => void }) => {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="flex min-h-11 cursor-pointer items-center gap-1 text-sm font-medium text-primary"
      >
        <ArrowLeft className="size-4" />
        返回器械库
      </button>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{item.name}</h1>
        <StatusTag item={item} />
      </div>

      <section className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <ShieldAlert className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="mb-1 font-bold">安全注意事项</p>
          <p className="leading-relaxed">{item.safetyNotes}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[var(--radius-lg)] border bg-white shadow-md">
        <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-secondary text-primary">
          {IS_EMBEDDED ? (
            <button
              type="button"
              data-omniflow-feature-status="unbuilt"
              data-omniflow-feature="器械教学视频"
              data-omniflow-build-prompt={VIDEO_PROMPT}
              aria-label="播放教学视频"
              onClick={() => requestBuild('器械教学视频', VIDEO_PROMPT)}
              className="flex size-16 cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-lg"
            >
              <Play className="size-7" />
            </button>
          ) : (
            <span className="flex size-16 items-center justify-center rounded-full bg-primary/20 text-primary">
              <Play className="size-7" />
            </span>
          )}
          <p className="text-sm">教学视频准备中，先看文字说明吧</p>
        </div>
      </section>

      <section className="space-y-3 rounded-[var(--radius-lg)] border bg-white p-5 shadow-md">
        <h2 className="text-lg font-bold">器械信息</h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">位置</dt>
            <dd className="font-medium">{item.location}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">训练部位</dt>
            <dd className="font-medium">{item.bodyPart}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">适用肌群</dt>
            <dd className="font-medium">{item.muscles}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">同时使用上限</dt>
            <dd className="font-medium">{item.maxConcurrent} 人</dd>
          </div>
        </dl>
        <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
        {item.status === 'maintenance' && (
          <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
            {item.maintenanceNote ?? '该器械正在维修，暂时不可预约'}
            {item.expectedRecovery ? `。预计恢复：${item.expectedRecovery}` : ''}
          </p>
        )}
      </section>

      <Button className="min-h-11 w-full font-bold sm:w-auto" onClick={() => navigate('/reserve')}>
        去预约训练
      </Button>
    </div>
  );
};

const Equipment = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const selectedId = params.get('id');
  const { equipment, loading, error, retry } = useGymData();
  const [part, setPart] = useState<BodyPart | 'all'>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return equipment.filter(
      (e) =>
        (part === 'all' || e.bodyPart === part) &&
        (!q || e.name.toLowerCase().includes(q) || e.muscles.toLowerCase().includes(q))
    );
  }, [equipment, part, query]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {['a', 'b', 'c', 'd', 'e', 'f'].map((k) => (
          <Skeleton key={k} className="h-28 w-full rounded-[var(--radius-lg)]" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[var(--radius-lg)] border bg-white p-8 text-center shadow-md">
        <p className="mb-1 font-bold">加载失败</p>
        <p className="mb-4 text-sm text-muted-foreground">{error}</p>
        <Button className="min-h-11" onClick={retry}>
          重试
        </Button>
      </div>
    );
  }

  if (selectedId) {
    const item = equipment.find((e) => e.id === selectedId);
    if (item) return <Detail item={item} onBack={() => navigate('/equipment')} />;
    return (
      <div className="rounded-[var(--radius-lg)] border bg-white p-8 text-center shadow-md">
        <p className="mb-4 font-bold">没有找到这台器械</p>
        <Button className="min-h-11" onClick={() => navigate('/equipment')}>
          返回器械库
        </Button>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="mb-2 text-2xl font-bold">器械库</h1>
        <p className="text-muted-foreground">按部位筛选器械，查看适用肌群、安全须知与教学。</p>
      </header>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索器械名称或肌群"
          className="h-11 bg-white pl-9"
        />
      </div>

      <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {(['all', ...PARTS] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPart(p)}
            className={`min-h-11 shrink-0 cursor-pointer rounded-full border px-4 text-sm font-medium transition-colors ${
              part === p ? 'border-primary bg-primary text-white' : 'bg-white text-muted-foreground hover:border-primary'
            }`}
          >
            {p === 'all' ? '全部' : p}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border bg-white p-10 text-center shadow-md">
          <p className="mb-1 font-bold">没有符合条件的器械</p>
          <p className="text-sm text-muted-foreground">换个部位或关键词试试</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => navigate(`/equipment?id=${e.id}`)}
              className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-lg)] border bg-white p-4 text-left shadow-sm transition-all hover:border-primary hover:shadow-md"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                <Dumbbell className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-bold">{e.name}</span>
                  <StatusTag item={e} />
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {e.bodyPart} · {e.muscles}
                </span>
                <span className="block truncate text-xs text-muted-foreground">位置：{e.location}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Equipment;
