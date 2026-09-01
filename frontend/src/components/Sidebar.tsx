import { NavLink } from 'react-router'
import {
  DownloadCloud,
  Search,
  FolderKanban,
  Sliders,
  Settings as SettingsIcon,
  Sparkles,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  activeCount: number
  completedCount: number
}

export function Sidebar({ activeCount, completedCount }: SidebarProps) {
  const navItems = [
    {
      to: '/',
      label: 'Downloads',
      icon: DownloadCloud,
      badge: activeCount > 0 ? activeCount : undefined,
      badgeColor: 'bg-blue-600 text-white',
    },
    {
      to: '/search',
      label: 'Cerca YouTube',
      icon: Search,
    },
    {
      to: '/library',
      label: 'Libreria',
      icon: FolderKanban,
      badge: completedCount > 0 ? completedCount : undefined,
      badgeColor: 'bg-zinc-800 text-zinc-300',
    },
    {
      to: '/presets',
      label: 'Preset',
      icon: Sliders,
    },
    {
      to: '/settings',
      label: 'Impostazioni',
      icon: SettingsIcon,
    },
  ]

  return (
    <aside className="w-56 shrink-0 border-r border-zinc-200 bg-white p-3.5 flex flex-col justify-between hidden md:flex dark:border-zinc-800 dark:bg-zinc-950">
      {/* Navigation Links */}
      <div className="space-y-1">
        <p className="px-2.5 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
          Menu
        </p>
        <div className="space-y-0.5 pt-1.5">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-zinc-100 text-zinc-950 font-semibold dark:bg-zinc-900 dark:text-zinc-50'
                      : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900/60 dark:hover:text-zinc-200'
                  )
                }
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 stroke-[2]" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={cn(
                      'flex h-4 min-w-4 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold',
                      item.badgeColor
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            )
          })}
        </div>
      </div>

      {/* Footer info card */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-200">
          <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          <span>yt-dlp Engine</span>
        </div>
        <p className="mt-1 text-[11px] text-zinc-500 leading-relaxed dark:text-zinc-400">
          Supporta oltre 1.700 siti web tra cui YouTube, Twitch, TikTok, Vimeo, Bilibili e altri.
        </p>
        <a
          href="https://github.com/yt-dlp/yt-dlp"
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          <span>Documentazione</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </aside>
  )
}
