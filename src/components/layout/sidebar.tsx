'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Mic, Brain, Trophy, Settings, Award } from 'lucide-react';
import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { APP_NAME } from '@/lib/constants';

const items = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Explain Topic',
    href: '/explain',
    icon: Mic,
  },
  {
    title: 'Question Bank',
    href: '/question-bank',
    icon: Brain,
  },
  {
    title: 'My Progress',
    href: '/progress',
    icon: Trophy,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

type SidebarProps = HTMLAttributes<HTMLDivElement>;

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div
      className={cn('min-h-screen border-r bg-slate-50/50 pb-12 dark:bg-slate-950/20', className)}
    >
      <div className="space-y-4 py-4">
        <div className="text-primary flex items-center gap-2 px-6 py-2 text-xl font-bold">
          <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-lg">
            <Mic className="h-5 w-5" />
          </div>
          {APP_NAME}
        </div>
        <div className="px-3 py-2">
          <div className="space-y-1">
            <Link href="/explain">
              <Button className="mb-4 w-full justify-start gap-2" size="lg">
                <Mic className="h-4 w-4" />
                Start Explaining
              </Button>
            </Link>
            <h2 className="font-heading mb-2 px-4 text-xs font-semibold tracking-tight text-slate-500 uppercase dark:text-slate-400">
              Menu
            </h2>
            <nav className="grid items-start gap-1">
              {items.map((item, index) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={index} href={item.href}>
                    <span
                      className={cn(
                        'group flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-50',
                        isActive
                          ? 'text-primary dark:text-primary bg-slate-100 font-semibold dark:bg-slate-800'
                          : 'text-slate-700 dark:text-slate-400'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'mr-2 h-4 w-4',
                          isActive
                            ? 'text-primary'
                            : 'text-slate-500 group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-200'
                        )}
                      />
                      {item.title}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="px-3 py-2">
          <h2 className="font-heading mb-2 px-4 text-xs font-semibold tracking-tight text-slate-500 uppercase dark:text-slate-400">
            Subscription
          </h2>
          <div className="mx-4 mt-2 rounded-xl border border-violet-200 bg-linear-to-br from-violet-100 to-indigo-50 p-4 dark:border-violet-800/50 dark:from-violet-900/20 dark:to-indigo-900/10">
            <div className="mb-2 flex items-center gap-2">
              <Award className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <span className="text-sm font-semibold text-violet-900 dark:text-violet-100">
                Free Plan
              </span>
            </div>
            <p className="mb-3 text-xs text-violet-700 dark:text-violet-300">
              50 credits remaining
            </p>
            <Link href="/pricing">
              <Button
                size="sm"
                variant="secondary"
                className="h-8 w-full border border-violet-100 bg-white text-xs shadow-sm hover:bg-white/90 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-100 dark:hover:bg-violet-900"
              >
                Upgrade to Pro
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
