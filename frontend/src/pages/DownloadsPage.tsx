import { useState, useEffect } from 'react'
import {
  DownloadCloud,
  CheckCircle2,
  Trash2,
  Filter,
  Play,
  RotateCcw,
  Inbox,
  FileQuestion,
  RefreshCw,
  XOctagon,
  FolderOpen,
  Search,
} from 'lucide-react'
import { DownloadOptions, Job, MediaFile } from '@/types'
import { api } from '@/lib/api'
import { wsClient } from '@/lib/ws'
import { UrlBar } from '@/components/UrlBar'
import { DownloadItem } from '@/components/DownloadItem'
import { InspectModal } from '@/components/InspectModal'
import { LogViewerModal } from '@/components/LogViewerModal'
import { MediaPlayerModal } from '@/components/MediaPlayerModal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'

export function DownloadsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [filter, setFilter] = useState<'all' | 'active' | 'video' | 'audio'>('all')
  const [search, setSearch] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [inspectUrl, setInspectUrl] = useState('')
  const [isInspectOpen, setIsInspectOpen] = useState(false)
  const [activeLogJob, setActiveLogJob] = useState<Job | null>(null)
  const [activeMediaFile, setActiveMediaFile] = useState<MediaFile | null>(null)

  const fetchJobs = async () => {
    setIsRefreshing(true)
    try {
      const list = await api.getDownloads()
      setJobs(list)
    } catch (e) {
      console.error('Failed to load downloads:', e)
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchJobs()

    // Subscribe to WebSocket events
    const unsubAll = wsClient.subscribe('*', (msg) => {
      if (msg.type === 'job_added') {
        setJobs((prev) => [msg.payload, ...prev.filter((j) => j.id !== msg.payload.id)])
      } else if (msg.type === 'job_updated') {
        setJobs((prev) =>
          prev.map((j) => (j.id === msg.payload.id ? { ...j, ...msg.payload } : j))
        )
      } else if (msg.type === 'job_progress') {
        setJobs((prev) =>
          prev.map((j) => (j.id === msg.payload.id ? { ...j, ...msg.payload } : j))
        )
      } else if (msg.type === 'job_completed') {
        setJobs((prev) =>
          prev.map((j) => (j.id === msg.payload.id ? { ...j, ...msg.payload } : j))
        )
      } else if (msg.type === 'job_failed' || msg.type === 'job_cancelled') {
        setJobs((prev) =>
          prev.map((j) => (j.id === msg.payload.id ? { ...j, ...msg.payload } : j))
        )
      } else if (msg.type === 'job_removed') {
        setJobs((prev) => prev.filter((j) => j.id !== msg.payload.id))
      }
    })

    return () => unsubAll()
  }, [])

  const handleQuickDownload = async (options: DownloadOptions) => {
    try {
      await api.createDownload(options)
    } catch (err: any) {
      alert(`Download Error: ${err.message}`)
    }
  }

  const handleBatchDownload = async (urls: string[], options: DownloadOptions) => {
    try {
      await api.createBatchDownloads({ urls, options })
    } catch (err: any) {
      alert(`Batch Download Error: ${err.message}`)
    }
  }

  const handleInspect = (targetUrl: string) => {
    setInspectUrl(targetUrl)
    setIsInspectOpen(true)
  }

  const handleCancel = async (id: string) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, status: 'cancelled', stage: 'Interrotto da utente' } : j))
    )
    try {
      await api.cancelDownload(id)
    } catch (e) {
      console.error(e)
    }
  }

  const handleCancelAll = async () => {
    if (!confirm('Sei sicuro di voler interrompere tutti i download attivi?')) return
    setJobs((prev) =>
      prev.map((j) =>
        j.status === 'downloading' || j.status === 'queued' || j.status === 'preparing'
          ? { ...j, status: 'cancelled', stage: 'Interrotto da utente' }
          : j
      )
    )
    try {
      await api.cancelAllDownloads()
    } catch (e) {
      console.error(e)
    }
  }

  const handleRetry = async (id: string) => {
    try {
      await api.retryDownload(id)
    } catch (e) {
      console.error(e)
    }
  }

  const handleDelete = async (id: string, deleteFile: boolean) => {
    setJobs((prev) => prev.filter((j) => j.id !== id))
    try {
      await api.deleteDownload(id, deleteFile)
    } catch (e) {
      console.error(e)
      fetchJobs()
    }
  }

  const handleClearCompleted = async () => {
    try {
      await api.clearCompletedDownloads()
      setJobs((prev) =>
        prev.filter((j) => j.status === 'downloading' || j.status === 'queued' || j.status === 'preparing')
      )
    } catch (e) {
      console.error(e)
    }
  }

  const handleOpenDownloadsFolder = async () => {
    try {
      await api.openInExplorer()
    } catch (e) {
      console.error(e)
    }
  }

  // Filter calculations
  const activeCount = jobs.filter(
    (j) => j.status === 'downloading' || j.status === 'queued' || j.status === 'preparing'
  ).length
  const videoCount = jobs.filter(
    (j) => j.options.mode === 'video' || (j.outputFile && /\.(mp4|mkv|webm|mov|avi|flv)$/i.test(j.outputFile))
  ).length
  const audioCount = jobs.filter(
    (j) => j.options.mode === 'audio' || (j.outputFile && /\.(mp3|m4a|flac|opus|wav|aac|ogg)$/i.test(j.outputFile))
  ).length

  const filteredJobs = jobs.filter((j) => {
    if (filter === 'active') {
      if (j.status !== 'downloading' && j.status !== 'queued' && j.status !== 'preparing') return false
    } else if (filter === 'video') {
      const isV = j.options.mode === 'video' || (j.outputFile && /\.(mp4|mkv|webm|mov|avi|flv)$/i.test(j.outputFile))
      if (!isV) return false
    } else if (filter === 'audio') {
      const isA = j.options.mode === 'audio' || (j.outputFile && /\.(mp3|m4a|flac|opus|wav|aac|ogg)$/i.test(j.outputFile))
      if (!isA) return false
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      const titleMatch = (j.title || '').toLowerCase().includes(q)
      const urlMatch = (j.url || '').toLowerCase().includes(q)
      const fileMatch = (j.outputFile || '').toLowerCase().includes(q)
      if (!titleMatch && !urlMatch && !fileMatch) return false
    }

    return true
  })

  return (
    <div className="space-y-5">
      {/* Top URL Input Bar */}
      <UrlBar
        onQuickDownload={handleQuickDownload}
        onInspect={handleInspect}
        onBatchDownload={handleBatchDownload}
      />

      {/* Queue Header & Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex h-8 items-center rounded-lg bg-zinc-100 p-0.5 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            {[
              { id: 'all', label: 'Tutti', count: jobs.length },
              { id: 'active', label: 'In scaricamento', count: activeCount },
              { id: 'video', label: 'Video', count: videoCount },
              { id: 'audio', label: 'Audio', count: audioCount },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id as any)}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer select-none ${
                  filter === tab.id
                    ? 'bg-white text-zinc-950 shadow-xs font-semibold dark:bg-zinc-950 dark:text-zinc-50'
                    : 'hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                    filter === tab.id
                      ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                      : 'bg-zinc-200/80 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="w-full sm:w-56">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtra per titolo o URL..."
              icon={<Search className="h-3.5 w-3.5 text-zinc-400" />}
              className="h-8 text-xs"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {activeCount > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancelAll}
              className="h-8 text-xs"
              title="Interrompi tutti i download attivi"
            >
              <XOctagon className="h-3.5 w-3.5" />
              Interrompi ({activeCount})
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={fetchJobs}
            isLoading={isRefreshing}
            className="h-8 text-xs"
            title="Ricarica elenco file"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Aggiorna
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenDownloadsFolder}
            className="h-8 text-xs"
            title="Apri cartella file su Windows Explorer"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Apri Cartella
          </Button>

          {jobs.some((j) => j.status === 'completed') && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCompleted}
              className="h-8 text-xs"
              title="Pulisci storico completati"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Pulisci
            </Button>
          )}
        </div>
      </div>

      {/* Downloads List */}
      <div className="space-y-2.5">
        {filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white py-14 px-4 text-center dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400 mb-3 dark:bg-zinc-900">
              <Inbox className="h-6 w-6 stroke-[1.5]" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Nessun download trovato</h3>
            <p className="mt-1 text-xs text-zinc-500 max-w-sm dark:text-zinc-400">
              Incolla un link sopra per avviare il download di video, musica o playlist con yt-dlp.
            </p>
          </div>
        ) : (
          filteredJobs.map((job) => (
            <DownloadItem
              key={job.id}
              job={job}
              onCancel={handleCancel}
              onRetry={handleRetry}
              onDelete={handleDelete}
              onViewLogs={setActiveLogJob}
              onPlayMedia={setActiveMediaFile}
            />
          ))
        )}
      </div>

      {/* Inspect & Download Modal */}
      <InspectModal
        isOpen={isInspectOpen}
        onClose={() => setIsInspectOpen(false)}
        initialUrl={inspectUrl}
        onStartDownload={handleQuickDownload}
      />

      {/* Live Log Viewer Modal */}
      <LogViewerModal
        isOpen={!!activeLogJob}
        onClose={() => setActiveLogJob(null)}
        job={activeLogJob}
      />

      {/* Media Player Modal */}
      <MediaPlayerModal
        isOpen={!!activeMediaFile}
        onClose={() => setActiveMediaFile(null)}
        file={activeMediaFile}
      />
    </div>
  )
}
