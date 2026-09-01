import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors select-none',
  {
    variants: {
      variant: {
        default:
          'bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900',
        secondary:
          'bg-zinc-100 text-zinc-900 border border-zinc-200/80 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700',
        outline:
          'text-zinc-700 border border-zinc-200 bg-transparent dark:text-zinc-300 dark:border-zinc-800',
        primary:
          'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
        success:
          'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
        warning:
          'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
        destructive:
          'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
}

export function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            variant === 'success' && 'bg-emerald-400',
            variant === 'warning' && 'bg-amber-400',
            variant === 'destructive' && 'bg-red-400',
            variant === 'primary' && 'bg-blue-400',
            variant === 'secondary' && 'bg-purple-400',
            (!variant || variant === 'default' || variant === 'outline') && 'bg-zinc-400'
          )}
        />
      )}
      {children}
    </div>
  )
}
