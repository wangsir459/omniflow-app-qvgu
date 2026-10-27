import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGymData } from '@/hooks/use-gym-data';
import ReservationForm from '@/components/custom/ReservationForm';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const Reserve = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get('edit');
  const { equipment, reservations, loading, error, retry } = useGymData();

  const editing = editId ? (reservations.find((r) => r.id === editId) ?? null) : null;
  const notEditable = editId && !loading && !error && (!editing || !['scheduled', 'waiting'].includes(editing.status));

  return (
    <div>
      <header className="mb-6">
        <h1 className="mb-2 text-2xl font-bold">{editId ? '修改预约' : '新建预约'}</h1>
        <p className="text-muted-foreground">录入训练循环，系统在不改变顺序和时长的前提下为你错峰排班。</p>
      </header>
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-[var(--radius-lg)]" />
          <Skeleton className="h-64 w-full rounded-[var(--radius-lg)]" />
        </div>
      ) : error ? (
        <div className="rounded-[var(--radius-lg)] border bg-white p-8 text-center shadow-md">
          <p className="mb-1 font-bold">加载失败</p>
          <p className="mb-4 text-sm text-muted-foreground">{error}</p>
          <Button className="min-h-11" onClick={retry}>
            重试
          </Button>
        </div>
      ) : notEditable ? (
        <div className="rounded-[var(--radius-lg)] border bg-white p-8 text-center shadow-md">
          <p className="mb-4 font-bold">这份预约不存在或当前状态不可修改</p>
          <Button className="min-h-11" onClick={() => navigate('/')}>
            返回首页
          </Button>
        </div>
      ) : (
        <ReservationForm key={editing?.id ?? 'new'} equipment={equipment} editing={editing} />
      )}
    </div>
  );
};

export default Reserve;
