import React from 'react'
import { cn } from '@/lib/utils'

export interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
  description?: string
  className?: string
}

export function Switch({
  checked,
  onChange,
  disabled,
  label,
  description,
  className,
}: SwitchProps) {
  return (
    <label
      className={cn(
        'flex items-center justify-between gap-3 cursor-pointer select-none py-1',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{label}</span>}
          {description && <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{description}</span>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2',
          checked ? 'bg-zinc-900 dark:bg-zinc-50' : 'bg-zinc-200 dark:bg-zinc-800'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-150 ease-in-out dark:bg-zinc-950',
            checked ? 'translate-x-4' : 'translate-x-0'
          )}
        />
      </button>
    </label>
  )
}
