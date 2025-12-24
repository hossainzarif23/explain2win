import * as React from 'react';

import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2 text-base ring-offset-white transition-all duration-200',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-slate-950',
          'placeholder:text-slate-400',
          'focus-visible:border-violet-500 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'dark:border-slate-700 dark:bg-slate-900 dark:ring-offset-slate-950 dark:file:text-slate-50 dark:placeholder:text-slate-500 dark:focus-visible:ring-violet-400',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
