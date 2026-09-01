import { useState, useEffect } from 'react'
import {
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sun,
  Moon,
  Sparkles,
  Server,
  Radio,
  ExternalLink,
} from 'lucide-react'
import { SystemStatus } from '@/types'
import { api } from '@/lib/api'
import { wsClient } from '@/lib/ws'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SystemModal } from '@/components/SystemModal'

interface HeaderProps {
  activeJobsCount: number
  theme: string
  onToggleTheme: () => void
}

export function Header({ activeJobsCount, theme, onToggleTheme }: HeaderProps) {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [isSystemModalOpen, setIsSystemModalOpen] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)

  const fetchStatus = async () => {
    setLoadingStatus(true)
    try {
      const status = await api.getSystemStatus()
      setSystemStatus(status)
    } catch (e) {
      console.error('Failed to fetch system status:', e)
    } finally {
      setLoadingStatus(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 25000)

    const checkWs = setInterval(() => {
      setWsConnected(wsClient.isConnected)
    }, 1000)

    return () => {
      clearInterval(interval)
      clearInterval(checkWs)
    }
  }, [])

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-zinc-200 bg-white/80 px-4 sm:px-6 backdrop-blur-md transition-colors dark:border-zinc-800 dark:bg-zinc-950/80">
        {/* Left: Brand / Title */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white shadow-xs dark:bg-zinc-50 dark:text-zinc-900">
            <Download className="h-4 w-4 stroke-[2.25]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                yt-dlp <span className="text-blue-600 dark:text-blue-400">GUI</span>
              </span>
              <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
                v2.0
              </Badge>
            </div>
          </div>
        </div>

        {/* Right: Badges & Controls */}
        <div className="flex items-center gap-2">
          {/* Active downloads badge */}
          {activeJobsCount > 0 && (
            <Badge variant="primary" dot className="animate-pulse">
              <span>{activeJobsCount} Attivo{activeJobsCount > 1 ? 'i' : ''}</span>
            </Badge>
          )}

          {/* System Binary Badges */}
          <div className="hidden sm:flex items-center gap-2">
            {/* Live WS Status */}
            <div
              className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                wsConnected
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400'
              }`}
              title={wsConnected ? 'WebSocket Connesso in tempo reale' : 'Connessione al server in corso...'}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'
                }`}
              />
              <span>{wsConnected ? 'Online' : 'Connessione'}</span>
            </div>

            {/* yt-dlp Status */}
            <button
              type="button"
              onClick={() => setIsSystemModalOpen(true)}
              className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 shadow-xs transition-colors cursor-pointer dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              title="Gestione binario yt-dlp"
            >
              {systemStatus?.ytDlpValid ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-mono text-[11px]">yt-dlp {systemStatus.ytDlpVer}</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Installa yt-dlp</span>
                </>
              )}
            </button>

            {/* FFmpeg Status */}
            <button
              type="button"
              onClick={() => setIsSystemModalOpen(true)}
              className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 shadow-xs transition-colors cursor-pointer dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              title="Visualizza dettagli FFmpeg"
            >
              {systemStatus?.ffmpegValid ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-mono text-[11px]">FFmpeg Pronto</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">FFmpeg Assente</span>
                </>
              )}
            </button>
          </div>

          {/* Theme switcher */}
          <Button
            variant="outline"
            size="icon-sm"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Passa al Tema Chiaro' : 'Passa al Tema Scuro'}
          >
            {theme === 'dark' ? (
              <Sun className="h-3.5 w-3.5 text-amber-500" />
            ) : (
              <Moon className="h-3.5 w-3.5 text-zinc-700" />
            )}
          </Button>

          {/* System status button */}
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setIsSystemModalOpen(true)}
            title="Impostazioni di Sistema & Binari"
          >
            <Server className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {/* System Status / Binary Install Modal */}
      <SystemModal
        isOpen={isSystemModalOpen}
        onClose={() => {
          setIsSystemModalOpen(false)
          fetchStatus()
        }}
        status={systemStatus}
        onRefresh={fetchStatus}
        isLoading={loadingStatus}
      />
    </>
  )
}
