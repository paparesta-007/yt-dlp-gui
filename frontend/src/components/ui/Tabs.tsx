import React from 'react'
import { cn } from '@/lib/utils'

export interface TabItem {
  id: string
  label: string
  icon?: React.ReactNode
  badge?: string | number
}

export interface TabsProps {
  tabs: TabItem[]
  activeTab: string
  onChange: (id: string) => void
  className?: string
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div
      className={cn(
        'inline-flex h-9 items-center justify-start rounded-lg bg-zinc-100 p-1 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400 overflow-x-auto no-scrollbar',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
              isActive
                ? 'bg-white text-zinc-950 shadow-xs font-semibold dark:bg-zinc-950 dark:text-zinc-50'
                : 'hover:text-zinc-900 dark:hover:text-zinc-100'
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-semibold',
                  isActive
                    ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                    : 'bg-zinc-200/80 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
