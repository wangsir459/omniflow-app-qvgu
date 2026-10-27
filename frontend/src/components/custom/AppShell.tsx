import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Bell, CalendarPlus, Home, PlayCircle, User } from 'lucide-react';
import OmniflowBadge from '@/components/custom/OmniflowBadge';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { IS_EMBEDDED, requestBuild } from '@/lib/unbuilt';

const PLAN_PROMPT = '实现「我的计划」页面：学生可创建、编辑、复制、删除训练循环计划，并在预约时直接选用。';
const PROFILE_PROMPT = '实现「个人中心」：微信登录后绑定学号和姓名，查看违约记录与个人信息。';
const MESSAGE_PROMPT = '实现「消息中心」：展示排班确定、递补成功、预约临近提醒、未签到释放等通知，支持已读。';

const desktopLink = ({ isActive }: { isActive: boolean }) =>
  cn(
    'transition-colors hover:text-primary',
    isActive ? 'text-primary font-semibold' : 'text-muted-foreground'
  );

const mobileLink = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex min-h-11 min-w-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium',
    isActive ? 'text-primary' : 'text-muted-foreground'
  );

const AppShell = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen bg-background text-foreground">
    <nav className="sticky top-0 z-40 border-b bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <NavLink to="/" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary font-bold text-white">
            智
          </span>
          <span className="text-lg font-bold tracking-tight text-primary sm:text-xl">智健排班助手</span>
        </NavLink>
        <div className="hidden items-center gap-8 text-sm md:flex">
          <NavLink to="/" end className={desktopLink}>
            首页
          </NavLink>
          <NavLink to="/reserve" className={desktopLink}>
            新建预约
          </NavLink>
          <NavLink to="/equipment" className={desktopLink}>
            器械库
          </NavLink>
          {IS_EMBEDDED && (
            <>
              <button
                type="button"
                data-omniflow-feature-status="unbuilt"
                data-omniflow-feature="我的计划"
                data-omniflow-build-prompt={PLAN_PROMPT}
                className="cursor-pointer text-muted-foreground transition-colors hover:text-primary"
                onClick={() => requestBuild('我的计划', PLAN_PROMPT)}
              >
                我的计划
              </button>
              <button
                type="button"
                data-omniflow-feature-status="unbuilt"
                data-omniflow-feature="个人中心"
                data-omniflow-build-prompt={PROFILE_PROMPT}
                className="cursor-pointer text-muted-foreground transition-colors hover:text-primary"
                onClick={() => requestBuild('个人中心', PROFILE_PROMPT)}
              >
                个人中心
              </button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {IS_EMBEDDED && (
            <button
              type="button"
              aria-label="消息中心"
              data-omniflow-feature-status="unbuilt"
              data-omniflow-feature="消息中心"
              data-omniflow-build-prompt={MESSAGE_PROMPT}
              className="flex size-11 cursor-pointer items-center justify-center text-muted-foreground"
              onClick={() => requestBuild('消息中心', MESSAGE_PROMPT)}
            >
              <Bell className="size-5" />
            </button>
          )}
          <span className="flex size-8 items-center justify-center rounded-full border bg-secondary text-sm font-semibold text-primary">
            张
          </span>
        </div>
      </div>
    </nav>

    <main className="mx-auto max-w-screen-xl px-4 pb-28 pt-6 sm:px-6 md:pb-10 md:pt-8 lg:px-8">
      {children}
    </main>

    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t bg-white px-2 pb-[env(safe-area-inset-bottom)] pt-1 md:hidden">
      <NavLink to="/" end className={mobileLink}>
        <Home className="size-6" />
        <span>首页</span>
      </NavLink>
      <NavLink to="/reserve" className={mobileLink}>
        <CalendarPlus className="size-6" />
        <span>预约</span>
      </NavLink>
      <NavLink to="/equipment" className={mobileLink}>
        <PlayCircle className="size-6" />
        <span>器械</span>
      </NavLink>
      {IS_EMBEDDED && (
        <button
          type="button"
          data-omniflow-feature-status="unbuilt"
          data-omniflow-feature="个人中心"
          data-omniflow-build-prompt={PROFILE_PROMPT}
          className={cn(mobileLink({ isActive: false }), 'cursor-pointer')}
          onClick={() => requestBuild('个人中心', PROFILE_PROMPT)}
        >
          <User className="size-6" />
          <span>我的</span>
        </button>
      )}
    </div>

    <OmniflowBadge />
    <Toaster />
  </div>
);

export default AppShell;
