import React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  icon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, icon, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            'flex h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-900 shadow-xs placeholder:text-zinc-400 transition-colors',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 focus-visible:border-zinc-400',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus-visible:ring-zinc-300',
            icon && 'pl-9',
            error && 'border-red-500 focus-visible:ring-red-500',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
      </div>
    )
  }
)

Input.displayName = 'Input'
