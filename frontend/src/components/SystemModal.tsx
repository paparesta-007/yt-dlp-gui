import { useState } from 'react'
import {
  Server,
  CheckCircle2,
  AlertTriangle,
  DownloadCloud,
  RefreshCw,
  FileCode,
  Check,
  ExternalLink,
} from 'lucide-react'
import { SystemStatus } from '@/types'
import { api } from '@/lib/api'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'

interface SystemModalProps {
  isOpen: boolean
  onClose: () => void
  status: SystemStatus | null
  onRefresh: () => void
  isLoading: boolean
}

export function SystemModal({
  isOpen,
  onClose,
  status,
  onRefresh,
  isLoading,
}: SystemModalProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const handleUpdate = async () => {
    setIsUpdating(true)
    setActionMessage(null)
    setActionError(null)
    try {
      const res = await api.updateYtDlp()
      setActionMessage(res.output || res.message)
      onRefresh()
    } catch (err: any) {
      setActionError(err.message || 'Update failed')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleInstall = async () => {
    setIsInstalling(true)
    setActionMessage(null)
    setActionError(null)
    try {
      const res = await api.installYtDlp()
      setActionMessage(`yt-dlp successfully installed to: ${res.path}`)
      onRefresh()
    } catch (err: any) {
      setActionError(err.message || 'Installation failed')
    } finally {
      setIsInstalling(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800">
            <Server className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Stato Sistema & Eseguibili</h2>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Verifica e aggiorna i motori yt-dlp e FFmpeg</p>
          </div>
        </div>
      }
      maxWidth="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            isLoading={isLoading}
            className="gap-1.5 h-8 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Verifica
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose} className="h-8 text-xs">
            Chiudi
          </Button>
        </div>
      }
    >
      <div className="space-y-3.5">
        {/* Messages */}
        {actionMessage && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <p className="font-semibold">Operazione Completata</p>
            <p className="mt-1 font-mono text-[11px] whitespace-pre-wrap">{actionMessage}</p>
          </div>
        )}
        {actionError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-300">
            <p className="font-semibold">Errore</p>
            <p className="mt-1 font-mono text-[11px] whitespace-pre-wrap">{actionError}</p>
          </div>
        )}

        {/* yt-dlp Card */}
        <Card className="p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-900 text-xs dark:text-zinc-100">Motore yt-dlp</span>
                {status?.ytDlpValid ? (
                  <Badge variant="success" dot>
                    Installato ({status.ytDlpVer})
                  </Badge>
                ) : (
                  <Badge variant="destructive" dot>
                    Non Trovato
                  </Badge>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Strumento principale di estrazione flussi e download
              </p>
              {status?.ytDlpPath && (
                <p className="text-[11px] font-mono text-zinc-400 break-all">
                  {status.ytDlpPath}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {status?.ytDlpValid ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleUpdate}
                  isLoading={isUpdating}
                  className="gap-1.5 h-8 text-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Aggiorna
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleInstall}
                  isLoading={isInstalling}
                  className="gap-1.5 h-8 text-xs"
                >
                  <DownloadCloud className="h-3.5 w-3.5" />
                  Auto-Installa
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* FFmpeg Card */}
        <Card className="p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-900 text-xs dark:text-zinc-100">FFmpeg & FFprobe</span>
                {status?.ffmpegValid ? (
                  <Badge variant="success" dot>
                    Installato ({status.ffmpegVer})
                  </Badge>
                ) : (
                  <Badge variant="warning" dot>
                    Mancante
                  </Badge>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Utilizzato per il remuxing audio/video HD, conversioni MP3/FLAC e incorporamento sottotitoli
              </p>
              {status?.ffmpegPath ? (
                <p className="text-[11px] font-mono text-zinc-400 break-all">
                  {status.ffmpegPath}
                </p>
              ) : (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  Assicurati che ffmpeg sia presente nel PATH o configuralo nelle Impostazioni
                </p>
              )}
            </div>
            <a
              href="https://ffmpeg.org/download.html"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 pt-1 dark:hover:text-zinc-100"
            >
              <span>Download</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </Card>

        {/* Info notice */}
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 leading-relaxed dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
          <span className="font-semibold text-zinc-900 dark:text-zinc-200">Consiglio: </span>
          yt-dlp viene aggiornato frequentemente dai suoi sviluppatori open-source. Clicca &quot;Aggiorna&quot; in qualsiasi momento se un video non viene estratto.
        </div>
      </div>
    </Modal>
  )
}
