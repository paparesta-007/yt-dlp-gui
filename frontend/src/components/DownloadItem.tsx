import { useState } from 'react'
import {
  Play,
  RotateCcw,
  XCircle,
  FolderOpen,
  Terminal,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Film,
  Music,
  ExternalLink,
  FileQuestion,
  Sparkles,
  Download,
  Pencil,
} from 'lucide-react'
import { Job, MediaFile } from '@/types'
import { api } from '@/lib/api'
import { formatBytes, formatDuration } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'

interface DownloadItemProps {
  job: Job
  onCancel: (id: string) => void
  onRetry: (id: string) => void
  onDelete: (id: string, deleteFile: boolean) => void
  onViewLogs: (job: Job) => void
  onPlayMedia: (file: MediaFile) => void
}

export function DownloadItem({
  job,
  onCancel,
  onRetry,
  onDelete,
  onViewLogs,
  onPlayMedia,
}: DownloadItemProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteFromDisk, setDeleteFromDisk] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [renameLoading, setRenameLoading] = useState(false)

  const isDownloading = job.status === 'downloading' || job.status === 'preparing'
  const isCompleted = job.status === 'completed'
  const isFailed = job.status === 'failed'
  const isCancelled = job.status === 'cancelled'
  const isAudio = job.options.mode === 'audio'
  const isMissing = isCompleted && job.fileExists === false

  const handleOpenFolder = async () => {
    try {
      await api.openInExplorer(job.outputFile || '')
    } catch (e) {
      console.error('Failed to open in explorer:', e)
    }
  }

  const handleRenameConfirm = async () => {
    if (!job.outputFile || !renameValue.trim()) return
    setRenameLoading(true)
    try {
      await api.renameMediaFile(job.outputFile, renameValue.trim())
      setShowRenameModal(false)
    } catch (err: any) {
      alert(`Errore rinomina: ${err.message}`)
    } finally {
      setRenameLoading(false)
    }
  }

  const handlePlay = () => {
    if (!job.outputFile || isMissing) return
    const filename = job.outputFile.split(/[/\\]/).pop() || job.title
    const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase()
    const mediaType = isAudio ? 'audio' : 'video'

    onPlayMedia({
      name: filename,
      path: job.outputFile,
      size: job.totalBytes || job.downloadedBytes,
      sizeFormatted: formatBytes(job.totalBytes || job.downloadedBytes),
      modifiedAt: job.completedAt || new Date().toISOString(),
      extension: ext,
      mediaType,
    })
  }

  const confirmDelete = () => {
    onDelete(job.id, deleteFromDisk)
    setShowDeleteModal(false)
  }

  return (
    <>
      <div
        className={`group relative overflow-hidden rounded-xl border transition-colors ${
          isDownloading
            ? 'border-blue-400 bg-white shadow-xs dark:border-blue-700/60 dark:bg-zinc-950'
            : isMissing
            ? 'border-amber-300 bg-amber-50/40 dark:border-amber-800/50 dark:bg-amber-950/20'
            : isCompleted
            ? 'border-zinc-200 bg-white hover:border-zinc-300 shadow-xs dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700'
            : isFailed
            ? 'border-red-300 bg-red-50/40 dark:border-red-900/40 dark:bg-red-950/20'
            : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 p-3.5 sm:p-4">
          {/* Thumbnail or Media Icon */}
          <div className="relative aspect-video w-full sm:w-36 shrink-0 overflow-hidden rounded-lg bg-zinc-100 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
            {job.thumbnail ? (
              <img
                src={job.thumbnail}
                alt={job.title}
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-102"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-600">
                {isAudio ? <Music className="h-6 w-6" /> : <Film className="h-6 w-6" />}
              </div>
            )}

            {/* Mode Pill badge */}
            <div className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-xs">
              {isAudio ? (
                <Music className="h-2.5 w-2.5 text-purple-300" />
              ) : (
                <Film className="h-2.5 w-2.5 text-blue-300" />
              )}
              <span>{isAudio ? 'AUDIO' : 'VIDEO'}</span>
            </div>

            {/* Duration */}
            {job.duration > 0 && (
              <div className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[9px] font-medium text-zinc-200 backdrop-blur-xs">
                {job.durationString || formatDuration(job.duration)}
              </div>
            )}

            {/* Play button overlay on completed */}
            {isCompleted && !isMissing && job.outputFile && (
              <button
                type="button"
                onClick={handlePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer"
                title="Riproduci anteprima"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-zinc-900 shadow-md">
                  <Play className="h-4 w-4 fill-zinc-900 ml-0.5" />
                </div>
              </button>
            )}
          </div>

          {/* Content & Progress Area */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-xs font-semibold text-zinc-900 truncate dark:text-zinc-100" title={job.title || job.url}>
                  {job.title || job.url}
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500 mt-0.5 dark:text-zinc-400">
                  {job.uploader && <span className="font-medium text-zinc-700 dark:text-zinc-300">{job.uploader}</span>}
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-700 truncate max-w-[220px] dark:hover:text-zinc-200"
                  >
                    <span>{job.url}</span>
                    <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                  </a>
                </div>
              </div>

              {/* Status Badges */}
              <div className="shrink-0 flex items-center gap-1">
                {isDownloading && (
                  <Badge variant="primary" dot className="animate-pulse">
                    {job.percent > 0 ? `${job.percent.toFixed(1)}%` : 'In avvio...'}
                  </Badge>
                )}
                {isCompleted && !isMissing && (
                  <Badge variant="success" dot>
                    Completato
                  </Badge>
                )}
                {isMissing && (
                  <Badge variant="warning">
                    <FileQuestion className="h-3 w-3" />
                    <span>File Mancante</span>
                  </Badge>
                )}
                {isFailed && (
                  <Badge variant="destructive" dot>
                    Fallito
                  </Badge>
                )}
                {isCancelled && <Badge variant="outline">Annullato</Badge>}
                {job.status === 'queued' && (
                  <Badge variant="default" dot>
                    In Coda
                  </Badge>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className={`h-full transition-all duration-150 ease-out ${
                    isMissing
                      ? 'bg-amber-500'
                      : isCompleted
                      ? 'bg-emerald-600 dark:bg-emerald-500'
                      : isFailed
                      ? 'bg-red-500'
                      : 'bg-zinc-900 dark:bg-zinc-50'
                  }`}
                  style={{
                    width: `${isCompleted ? 100 : Math.max(isDownloading ? 2 : 0, Math.min(100, job.percent))}%`,
                  }}
                />
              </div>

              {/* Progress metrics row */}
              <div className="flex flex-wrap items-center justify-between text-[11px] text-zinc-500 font-mono dark:text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="font-sans text-zinc-700 font-medium dark:text-zinc-300">
                    {isMissing
                      ? 'File rimosso dalla cartella'
                      : job.stage || (isCompleted ? 'Completato' : 'Elaborazione...')}
                  </span>
                  {job.totalBytes > 0 && !isMissing && (
                    <span className="text-zinc-400 text-[10px]">
                      ({formatBytes(job.downloadedBytes)} / {formatBytes(job.totalBytes)})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  {isDownloading && job.speedStr && (
                    <span className="text-zinc-900 font-semibold dark:text-zinc-100">{job.speedStr}</span>
                  )}
                  {isDownloading && job.etaStr && (
                    <span className="text-zinc-500">ETA: {job.etaStr}</span>
                  )}
                  {isDownloading && job.percent > 0 && (
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{job.percent.toFixed(1)}%</span>
                  )}
                </div>
              </div>
            </div>

            {/* Error message alert */}
            {isFailed && job.errorMessage && (
              <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700 flex items-start gap-1.5 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                <p className="line-clamp-2 break-all font-mono text-[11px]">
                  {job.errorMessage}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons Column */}
          <div className="flex sm:flex-col items-center justify-end gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 sm:border-l border-zinc-100 sm:pl-2.5 dark:border-zinc-800">
            {isCompleted && !isMissing && (
              <>
                {job.outputFile && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handlePlay}
                    title="Riproduci"
                  >
                    <Play className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleOpenFolder}
                  title="Mostra nella cartella"
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    const currentName = job.outputFile.split(/[/\\]/).pop() || job.title
                    setRenameValue(currentName)
                    setShowRenameModal(true)
                  }}
                  title="Rinomina file su disco"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </>
            )}

            {isMissing && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onRetry(job.id)}
                title="Riscarica file mancante"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            )}

            {isDownloading && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onCancel(job.id)}
                title="Interrompi download"
                className="h-7 text-xs font-semibold"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>Interrompi</span>
              </Button>
            )}

            {(isFailed || isCancelled) && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onRetry(job.id)}
                title="Riprova download"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}

            {/* Console logs */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onViewLogs(job)}
              title="Visualizza log yt-dlp"
            >
              <Terminal className="h-3.5 w-3.5" />
            </Button>

            {/* Delete button */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowDeleteModal(true)}
              title="Elimina voce"
              className="hover:text-red-600 dark:hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Rename File Modal */}
      <Modal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        title={
          <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
            <Pencil className="h-4 w-4" />
            <span>Rinomina File su Disco</span>
          </div>
        }
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowRenameModal(false)}>
              Annulla
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleRenameConfirm}
              isLoading={renameLoading}
            >
              Salva Nuovo Nome
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs text-zinc-600 dark:text-zinc-400">
          <p>
            Modifica il nome del file salvato su disco per evitare duplicati o per organizzarlo al meglio:
          </p>
          <div>
            <label className="text-xs font-semibold text-zinc-900 mb-1 block dark:text-zinc-200">Nuovo Nome File:</label>
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Inserisci il nuovo nome del file..."
              className="h-9 text-xs font-mono"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameConfirm()
                }
              }}
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <Trash2 className="h-4 w-4" />
            <span>Elimina Download</span>
          </div>
        }
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowDeleteModal(false)}>
              Annulla
            </Button>
            <Button variant="destructive" size="sm" onClick={confirmDelete}>
              Elimina
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs text-zinc-600 dark:text-zinc-400">
          <p>
            Sei sicuro di voler rimuovere <strong className="text-zinc-900 dark:text-zinc-100">{job.title || job.url}</strong> dalla lista?
          </p>

          {isCompleted && !isMissing && (
            <label className="flex items-center gap-2.5 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 cursor-pointer select-none dark:border-zinc-800 dark:bg-zinc-900/60">
              <input
                type="checkbox"
                checked={deleteFromDisk}
                onChange={(e) => setDeleteFromDisk(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-zinc-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-xs text-zinc-700 font-medium dark:text-zinc-300">
                Elimina permanentemente anche il file multimediale dal disco
              </span>
            </label>
          )}
        </div>
      </Modal>
    </>
  )
}
