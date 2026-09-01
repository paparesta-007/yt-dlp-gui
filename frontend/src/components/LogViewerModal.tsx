import { useState, useEffect, useRef } from 'react'
import {
  Terminal,
  Copy,
  Check,
  Search,
  ArrowDownCircle,
  Trash2,
} from 'lucide-react'
import { Job } from '@/types'
import { wsClient } from '@/lib/ws'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

interface LogViewerModalProps {
  isOpen: boolean
  onClose: () => void
  job: Job | null
}

export function LogViewerModal({ isOpen, onClose, job }: LogViewerModalProps) {
  const [logs, setLogs] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const [copied, setCopied] = useState(false)
  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (job) {
      setLogs(job.logs || [])
    }
  }, [job])

  useEffect(() => {
    if (!job || !isOpen) return

    const unsub = wsClient.subscribe('job_log', (msg) => {
      if (msg.payload && msg.payload.jobId === job.id) {
        setLogs((prev) => [...prev, msg.payload.line])
      }
    })

    return () => unsub()
  }, [job, isOpen])

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  const filteredLogs = search
    ? logs.filter((l) => l.toLowerCase().includes(search.toLowerCase()))
    : logs

  const handleCopy = () => {
    navigator.clipboard.writeText(logs.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!job) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800">
            <Terminal className="h-4 w-4" />
          </div>
          <div className="overflow-hidden max-w-lg">
            <h2 className="text-sm font-semibold text-zinc-900 truncate dark:text-zinc-100">
              {job.title || job.url}
            </h2>
            <p className="text-[11px] text-zinc-500 font-mono">Job ID: {job.id}</p>
          </div>
        </div>
      }
      maxWidth="4xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px]">
              {logs.length} righe
            </Badge>
            {job.status === 'downloading' && (
              <Badge variant="primary" dot className="animate-pulse text-[10px]">
                In Tempo Reale
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoScroll(!autoScroll)}
              className="text-xs h-8"
            >
              <ArrowDownCircle className="mr-1.5 h-3.5 w-3.5" />
              Auto-Scroll: {autoScroll ? 'ON' : 'OFF'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopy} className="text-xs h-8">
              {copied ? (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Copiato
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copia Log
                </>
              )}
            </Button>
            <Button variant="secondary" size="sm" onClick={onClose} className="text-xs h-8">
              Chiudi
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        {/* Search bar */}
        <div className="flex items-center gap-2">
          <Input
            placeholder="Filtra all'interno dei log..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-3.5 w-3.5 text-zinc-400" />}
            className="h-8 text-xs"
          />
          {search && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearch('')}
              className="h-8 px-2 text-xs"
            >
              Cancella
            </Button>
          )}
        </div>

        {/* Terminal Log Console */}
        <div className="h-96 w-full overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-950 p-3.5 font-mono text-[11px] leading-relaxed text-zinc-300 select-text dark:border-zinc-800">
          {filteredLogs.length === 0 ? (
            <div className="flex h-full items-center justify-center text-zinc-600 text-xs">
              Nessun messaggio nei log per questo download...
            </div>
          ) : (
            filteredLogs.map((line, idx) => {
              const isError = line.toLowerCase().includes('error:')
              const isWarning = line.toLowerCase().includes('warning:')
              const isDownload = line.startsWith('[download]') || line.startsWith('download:')
              const isMerger = line.startsWith('[Merger]')
              const isExtract = line.startsWith('[ExtractAudio]')

              return (
                <div
                  key={idx}
                  className={`py-0.5 hover:bg-zinc-900/60 ${
                    isError
                      ? 'text-red-400 font-semibold'
                      : isWarning
                      ? 'text-amber-400'
                      : isDownload
                      ? 'text-blue-300'
                      : isMerger || isExtract
                      ? 'text-purple-300'
                      : 'text-zinc-300'
                  }`}
                >
                  <span className="mr-2 select-none text-zinc-600 text-[10px]">
                    {(idx + 1).toString().padStart(3, '0')}
                  </span>
                  <span>{line}</span>
                </div>
              )
            })
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </Modal>
  )
}
