'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { Fragment } from 'react';

import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center gap-1 text-sm', className)}
    >
      <Link
        href="/dashboard"
        className="text-muted-foreground flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100"
      >
        <Home className="h-4 w-4" />
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <Fragment key={index}>
            <ChevronRight className="text-muted-foreground h-4 w-4" />
            {isLast || !item.href ? (
              <span
                className={cn(
                  'truncate',
                  isLast
                    ? 'font-medium text-slate-900 dark:text-slate-100'
                    : 'text-muted-foreground'
                )}
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-muted-foreground truncate hover:text-slate-900 dark:hover:text-slate-100"
              >
                {item.label}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
