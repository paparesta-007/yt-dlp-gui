import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-xs font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
  {
    variants: {
      variant: {
        default:
          'bg-zinc-900 text-zinc-50 hover:bg-zinc-800 shadow-xs dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200',
        primary:
          'bg-blue-600 text-white hover:bg-blue-500 shadow-xs active:bg-blue-700',
        secondary:
          'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 border border-zinc-200/80 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700',
        outline:
          'border border-zinc-200 bg-white hover:bg-zinc-100 hover:text-zinc-900 text-zinc-700 shadow-xs dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-800 dark:text-zinc-300',
        destructive:
          'bg-red-600 text-white hover:bg-red-500 shadow-xs active:bg-red-700',
        ghost:
          'hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100',
        link: 'text-blue-600 underline-offset-4 hover:underline p-0 h-auto',
        success:
          'bg-emerald-600 text-white hover:bg-emerald-500 shadow-xs',
      },
      size: {
        default: 'h-9 px-3.5 py-2',
        sm: 'h-8 rounded-lg px-2.5 text-xs',
        lg: 'h-10 rounded-xl px-5 text-sm font-semibold',
        icon: 'h-9 w-9 p-0',
        'icon-sm': 'h-7 w-7 p-0 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
