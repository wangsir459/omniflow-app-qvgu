import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-md rounded-[var(--radius-lg)] border bg-white p-10 text-center shadow-md">
      <p className="mb-2 text-4xl font-bold text-primary">404</p>
      <h1 className="mb-1 text-lg font-bold">页面走丢了</h1>
      <p className="mb-5 text-sm text-muted-foreground">你访问的页面不存在，回到首页继续训练吧。</p>
      <Button className="min-h-11 px-6 font-bold" onClick={() => navigate('/')}>
        返回首页
      </Button>
    </div>
  );
};

export default NotFound;
