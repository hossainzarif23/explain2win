'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Library,
  Mic,
  Award,
  Crown,
  Sparkles,
  Zap,
  Loader2,
} from 'lucide-react';
import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { APP_NAME } from '@/lib/constants';
import { api } from '@/trpc/react';

const items = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  // {
  //   title: 'Explain Topic',
  //   href: '/explain',
  //   icon: Mic,
  // },
  {
    title: 'Study Sessions',
    href: '/study-sessions',
    icon: Library,
  },
  // {
  //   title: 'Question Bank',
  //   href: '/question-bank',
  //   icon: Brain,
  // },
  // {
  //   title: 'My Progress',
  //   href: '/progress',
  //   icon: Trophy,
  // },
  // {
  //   title: 'Settings',
  //   href: '/settings',
  //   icon: Settings,
  // },
];

type SidebarProps = HTMLAttributes<HTMLDivElement>;

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { data: billing, isLoading } = api.billing.getSubscription.useQuery();

  const subscription = billing?.subscription;
  const credits = billing?.credits;

  const tier = subscription?.tier ?? 'FREE';
  const creditBalance = credits?.balance ?? 0;

  const tierConfig = {
    FREE: {
      label: 'Free Plan',
      icon: Award,
      gradient: 'from-violet-100 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/10',
      border: 'border-violet-200 dark:border-violet-800/50',
      textColor: 'text-violet-900 dark:text-violet-100',
      subTextColor: 'text-violet-700 dark:text-violet-300',
      iconColor: 'text-violet-600 dark:text-violet-400',
      showUpgrade: true,
    },
    PRO: {
      label: 'Pro Plan',
      icon: Zap,
      gradient: 'from-amber-100 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/10',
      border: 'border-amber-200 dark:border-amber-800/50',
      textColor: 'text-amber-900 dark:text-amber-100',
      subTextColor: 'text-amber-700 dark:text-amber-300',
      iconColor: 'text-amber-600 dark:text-amber-400',
      showUpgrade: true,
    },
    PREMIUM: {
      label: 'Premium Plan',
      icon: Crown,
      gradient: 'from-emerald-100 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/10',
      border: 'border-emerald-200 dark:border-emerald-800/50',
      textColor: 'text-emerald-900 dark:text-emerald-100',
      subTextColor: 'text-emerald-700 dark:text-emerald-300',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      showUpgrade: false,
    },
  };

  const config = tierConfig[tier as keyof typeof tierConfig] ?? tierConfig.FREE;
  const TierIcon = config.icon;

  return (
    <div
      className={cn('min-h-screen border-r bg-slate-50/50 pb-12 dark:bg-slate-950/20', className)}
    >
      <div className="space-y-4 py-4">
        {/* Logo */}
        <div className="text-primary flex items-center gap-2 px-6 py-2 text-xl font-bold">
          <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-lg">
            <Mic className="h-5 w-5" />
          </div>
          {APP_NAME}
        </div>

        {/* Navigation */}
        <div className="px-3 py-2">
          <div className="space-y-1">
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

        {/* Subscription Section */}
        {/* <div className="px-3 py-2">
          <h2 className="font-heading mb-2 px-4 text-xs font-semibold tracking-tight text-slate-500 uppercase dark:text-slate-400">
            Subscription
          </h2>
          <div
            className={cn(
              'mx-4 mt-2 rounded-xl border bg-linear-to-br p-4',
              config.gradient,
              config.border
            )}
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : (
              <>
                <div className="mb-2 flex items-center gap-2">
                  <TierIcon className={cn('h-4 w-4', config.iconColor)} />
                  <span className={cn('text-sm font-semibold', config.textColor)}>
                    {config.label}
                  </span>
                </div>
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className={cn('h-3 w-3', config.iconColor)} />
                  <p className={cn('text-xs', config.subTextColor)}>
                    <span className="font-semibold">{creditBalance}</span> credits remaining
                  </p>
                </div>
                <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-white/50 dark:bg-slate-800/50">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      tier === 'FREE'
                        ? 'bg-violet-500'
                        : tier === 'PRO'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                    )}
                    style={{ width: `${Math.min((creditBalance / 100) * 100, 100)}%` }}
                  />
                </div>
                {config.showUpgrade && (
                  <Link href="/billing">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 w-full border border-white/50 bg-white text-xs shadow-sm hover:bg-white/90 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                    >
                      {tier === 'FREE' ? 'Upgrade to Pro' : 'Upgrade to Premium'}
                    </Button>
                  </Link>
                )}
                {tier === 'PREMIUM' && (
                  <p className="text-center text-xs text-emerald-600 dark:text-emerald-400">
                    ✨ Unlimited access
                  </p>
                )}
              </>
            )}
          </div>
        </div> */}
      </div>
    </div>
  );
}
