import React, { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl'
  className?: string
}

const widthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = '2xl',
  className,
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        className={cn(
          'relative w-full z-10 my-8 overflow-hidden rounded-xl border border-zinc-200 bg-white text-zinc-950 shadow-xl transition-all duration-150 animate-in fade-in-0 zoom-in-95 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50',
          widthClasses[maxWidth],
          className
        )}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800/80">
            <div className="space-y-1 pr-4">
              {title && typeof title === 'string' ? (
                <h2 className="text-sm font-semibold text-zinc-900 tracking-tight dark:text-zinc-100">{title}</h2>
              ) : (
                title
              )}
              {description && (
                <p className="text-xs text-zinc-500 leading-relaxed dark:text-zinc-400">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors cursor-pointer dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2.5 border-t border-zinc-100 bg-zinc-50/50 px-5 py-3.5 dark:border-zinc-800/80 dark:bg-zinc-900/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
