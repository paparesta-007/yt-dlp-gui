import { useState, useEffect } from 'react'
import { Routes, Route, NavLink } from 'react-router'
import {
  DownloadCloud,
  FolderKanban,
  Sliders,
  Settings as SettingsIcon,
} from 'lucide-react'
import { Job } from '@/types'
import { api } from '@/lib/api'
import { wsClient } from '@/lib/ws'
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { BackendGuard } from '@/components/BackendGuard'
import { DownloadsPage } from '@/pages/DownloadsPage'
import { LibraryPage } from '@/pages/LibraryPage'
import { PresetsPage } from '@/pages/PresetsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { cn } from '@/lib/utils'

export function App() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [theme, setTheme] = useState<'dark' | 'light'>('light')

  useEffect(() => {
    const saved = localStorage.getItem('yt_theme') as 'dark' | 'light' | null
    const initialTheme = saved || 'light'
    setTheme(initialTheme)
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark')
      document.body.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
      document.body.classList.remove('dark')
    }

    // Connect WebSocket
    wsClient.connect()

    // Subscribe to state updates
    const unsub = wsClient.subscribe('*', (msg) => {
      if (msg.type === 'job_added') {
        setJobs((prev) => [msg.payload, ...prev.filter((j) => j.id !== msg.payload.id)])
      } else if (
        msg.type === 'job_updated' ||
        msg.type === 'job_progress' ||
        msg.type === 'job_completed' ||
        msg.type === 'job_failed' ||
        msg.type === 'job_cancelled'
      ) {
        setJobs((prev) =>
          prev.map((j) => (j.id === msg.payload.id ? { ...j, ...msg.payload } : j))
        )
      } else if (msg.type === 'job_removed') {
        setJobs((prev) => prev.filter((j) => j.id !== msg.payload.id))
      }
    })

    return () => {
      unsub()
    }
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    localStorage.setItem('yt_theme', nextTheme)
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark')
      document.body.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
      document.body.classList.remove('dark')
    }
  }

  const activeCount = jobs.filter(
    (j) => j.status === 'downloading' || j.status === 'queued' || j.status === 'preparing'
  ).length
  const completedCount = jobs.filter((j) => j.status === 'completed').length

  const mobileNav = [
    { to: '/', label: 'Downloads', icon: DownloadCloud, badge: activeCount > 0 ? activeCount : undefined },
    { to: '/library', label: 'Libreria', icon: FolderKanban, badge: completedCount > 0 ? completedCount : undefined },
    { to: '/presets', label: 'Preset', icon: Sliders },
    { to: '/settings', label: 'Impostazioni', icon: SettingsIcon },
  ]

  return (
    <BackendGuard>
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-50 text-slate-900 antialiased dark:bg-zinc-950 dark:text-zinc-50">
        {/* Top Header */}
        <Header
          activeJobsCount={activeCount}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        {/* Main App Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar for Desktop */}
          <Sidebar activeCount={activeCount} completedCount={completedCount} />

          {/* Dynamic Route Content */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7">
            <div className="mx-auto max-w-6xl">
              <Routes>
                <Route path="/" element={<DownloadsPage />} />
                <Route path="/library" element={<LibraryPage />} />
                <Route path="/presets" element={<PresetsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </div>
          </main>
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <div className="flex md:hidden items-center justify-around border-t border-zinc-200 bg-white/95 py-2 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95">
          {mobileNav.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'relative flex flex-col items-center gap-1 p-1 text-[10px] font-semibold transition-colors',
                    isActive ? 'text-zinc-950 dark:text-zinc-50' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                  )
                }
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {item.badge !== undefined && (
                    <span className="absolute -top-1 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </div>
    </BackendGuard>
  )
}
