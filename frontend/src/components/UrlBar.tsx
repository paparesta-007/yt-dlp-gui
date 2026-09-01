import { useState, useEffect, useRef } from 'react'
import {
  Link as LinkIcon,
  Download,
  Sliders,
  ClipboardPaste,
  ListPlus,
  X,
  Film,
  Music,
  Tv,
  Pencil,
  FileText,
  Gauge,
  Cookie,
} from 'lucide-react'
import { DownloadOptions, Preset } from '@/types'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface UrlBarProps {
  onQuickDownload: (options: DownloadOptions) => void
  onInspect: (url: string) => void
  onBatchDownload: (urls: string[], options: DownloadOptions) => void
}

export function UrlBar({
  onQuickDownload,
  onInspect,
  onBatchDownload,
}: UrlBarProps) {
  const [url, setUrl] = useState('')
  const [customFilename, setCustomFilename] = useState('')
  const [showFilenameInput, setShowFilenameInput] = useState(false)
  const [isBatch, setIsBatch] = useState(false)
  const [batchText, setBatchText] = useState('')
  const [presets, setPresets] = useState<Preset[]>([])
  const [selectedQuality, setSelectedQuality] = useState<string>('best')
  const [rateLimit, setRateLimit] = useState<string>('')
  const [cookiesFromBrowser, setCookiesFromBrowser] = useState<string>('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.getPresets().then(setPresets).catch(console.error)

    // Global Ctrl+V handler to capture links pasted anywhere on page
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }
      const text = e.clipboardData?.getData('text')
      if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
        setUrl(text.trim())
        inputRef.current?.focus()
      }
    }

    window.addEventListener('paste', handleGlobalPaste)
    return () => window.removeEventListener('paste', handleGlobalPaste)
  }, [])

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        if (isBatch) {
          setBatchText((prev) => (prev ? `${prev}\n${text.trim()}` : text.trim()))
        } else {
          setUrl(text.trim())
          inputRef.current?.focus()
        }
      }
    } catch {
      // Ignored
    }
  }

  const buildDownloadOptions = (): DownloadOptions => {
    const filenameOpt = customFilename.trim() ? { customFilename: customFilename.trim() } : {}
    const extraOpts: Partial<DownloadOptions> = {}
    if (rateLimit) extraOpts.rateLimit = rateLimit
    if (cookiesFromBrowser) extraOpts.cookiesBrowser = cookiesFromBrowser

    if (selectedQuality === 'mp3') {
      return {
        url: '',
        mode: 'audio',
        audioFormat: 'mp3',
        audioQuality: '320k',
        embedMetadata: true,
        embedThumbnail: true,
        ...extraOpts,
        ...filenameOpt,
      }
    }
    if (selectedQuality === 'flac') {
      return {
        url: '',
        mode: 'audio',
        audioFormat: 'flac',
        audioQuality: '0',
        embedMetadata: true,
        embedThumbnail: true,
        ...extraOpts,
        ...filenameOpt,
      }
    }
    if (selectedQuality === 'm4a') {
      return {
        url: '',
        mode: 'audio',
        audioFormat: 'm4a',
        audioQuality: '256k',
        embedMetadata: true,
        embedThumbnail: true,
        ...extraOpts,
        ...filenameOpt,
      }
    }
    if (selectedQuality !== 'best') {
      return {
        url: '',
        mode: 'video',
        videoQuality: selectedQuality,
        videoContainer: 'mp4',
        embedMetadata: true,
        embedThumbnail: true,
        ...extraOpts,
        ...filenameOpt,
      }
    }

    return {
      url: '',
      mode: 'video',
      videoQuality: 'best',
      videoContainer: 'mp4',
      embedMetadata: true,
      embedThumbnail: true,
      ...extraOpts,
      ...filenameOpt,
    }
  }

  const handleQuickSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const baseOpts = buildDownloadOptions()

    if (isBatch) {
      const urls = batchText
        .split('\n')
        .map((u) => u.trim())
        .filter((u) => u.startsWith('http://') || u.startsWith('https://'))
      if (urls.length === 0) return
      onBatchDownload(urls, baseOpts)
      setBatchText('')
      setCustomFilename('')
    } else {
      if (!url.trim()) return
      onQuickDownload({
        ...baseOpts,
        url: url.trim(),
      })
      setUrl('')
      setCustomFilename('')
    }
  }

  const batchUrlsCount = batchText
    .split('\n')
    .map((u) => u.trim())
    .filter((u) => u.startsWith('http://') || u.startsWith('https://')).length

  return (
    <Card className="p-4 sm:p-5">
      <form onSubmit={handleQuickSubmit} className="space-y-3.5">
        {/* Preset & Quality Chips Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-zinc-500 flex items-center gap-1 mr-1 text-[11px] uppercase tracking-wider dark:text-zinc-400">
              <Tv className="h-3 w-3" />
              Qualità:
            </span>
            <div className="flex flex-wrap gap-1">
              {[
                { id: 'best', label: 'Migliore (4K/HD)', icon: Film },
                { id: '1080', label: '1080p FHD', icon: Film },
                { id: '720', label: '720p HD', icon: Film },
                { id: '480', label: '480p', icon: Film },
                { id: 'mp3', label: 'MP3 320k', icon: Music },
                { id: 'm4a', label: 'M4A / AAC', icon: Music },
                { id: 'flac', label: 'FLAC Lossless', icon: Music },
              ].map((q) => {
                const isSelected = selectedQuality === q.id
                const Icon = q.icon
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setSelectedQuality(q.id)}
                    className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors cursor-pointer border select-none ${
                      isSelected
                        ? 'bg-zinc-900 text-zinc-50 border-zinc-900 shadow-xs dark:bg-zinc-50 dark:text-zinc-900 dark:border-zinc-50'
                        : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    <span>{q.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={showAdvanced ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="h-7 text-xs"
            >
              <Sliders className="h-3 w-3" />
              <span>Opzioni Veloci</span>
            </Button>

            <Button
              type="button"
              variant={isBatch ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setIsBatch(!isBatch)}
              className="h-7 text-xs"
            >
              <ListPlus className="h-3 w-3" />
              <span>Batch {isBatch ? 'Attivo' : ''}</span>
            </Button>
          </div>
        </div>

        {/* Advanced Quick Filters Bar (Speed limit & Cookies) */}
        {showAdvanced && (
          <div className="flex flex-wrap items-center gap-3 p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs dark:bg-zinc-900/60 dark:border-zinc-800">
            <div className="flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-zinc-600 dark:text-zinc-400 font-medium">Limite Velocità:</span>
              <select
                value={rateLimit}
                onChange={(e) => setRateLimit(e.target.value)}
                className="h-7 rounded border border-zinc-200 bg-white px-2 text-xs text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="">Illimitata</option>
                <option value="50M">50 MB/s</option>
                <option value="20M">20 MB/s</option>
                <option value="10M">10 MB/s</option>
                <option value="5M">5 MB/s</option>
                <option value="2M">2 MB/s</option>
                <option value="1M">1 MB/s</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <Cookie className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-zinc-600 dark:text-zinc-400 font-medium">Cookie Browser (video privati):</span>
              <select
                value={cookiesFromBrowser}
                onChange={(e) => setCookiesFromBrowser(e.target.value)}
                className="h-7 rounded border border-zinc-200 bg-white px-2 text-xs text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="">Nessuno</option>
                <option value="chrome">Google Chrome</option>
                <option value="firefox">Mozilla Firefox</option>
                <option value="edge">Microsoft Edge</option>
                <option value="brave">Brave</option>
                <option value="vivaldi">Vivaldi</option>
                <option value="opera">Opera</option>
              </select>
            </div>
          </div>
        )}

        {/* Input Controls */}
        {isBatch ? (
          <div className="space-y-3">
            <textarea
              rows={4}
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              placeholder="Incolla qui una lista di link (uno per riga):&#10;https://www.youtube.com/watch?v=...&#10;https://www.youtube.com/watch?v=..."
              className="w-full rounded-lg border border-zinc-200 bg-white p-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-950 font-mono resize-y dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">
                {batchUrlsCount} link valid{batchUrlsCount === 1 ? 'o' : 'i'} ({selectedQuality.toUpperCase()})
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePaste}
                >
                  <ClipboardPaste className="h-3.5 w-3.5" />
                  Incolla
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  disabled={batchUrlsCount === 0}
                >
                  <Download className="h-3.5 w-3.5" />
                  Scarica Batch ({batchUrlsCount})
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Input
                ref={inputRef}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Incolla link di video, musica, playlist, canale o shorts..."
                icon={<LinkIcon className="h-4 w-4 text-zinc-400" />}
                className="h-10 text-xs pr-16"
              />

              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {url ? (
                  <button
                    type="button"
                    onClick={() => setUrl('')}
                    className="rounded p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer dark:hover:text-zinc-200"
                    title="Cancella"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePaste}
                    title="Incolla dagli appunti (o premi Ctrl+V)"
                    className="flex items-center gap-1 rounded bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 transition-colors cursor-pointer dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    <ClipboardPaste className="h-3 w-3" />
                    <span>Incolla</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (url.trim()) {
                    onInspect(url.trim())
                  }
                }}
                disabled={!url.trim()}
                className="h-10 px-3.5 font-medium"
                title="Ispeziona formati, flussi, audio e anteprima di taglio"
              >
                <Sliders className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Personalizza</span>
              </Button>

              <Button
                type="submit"
                variant="default"
                disabled={!url.trim()}
                className="h-10 px-4 font-semibold"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Scarica ({selectedQuality.toUpperCase()})</span>
              </Button>
            </div>
          </div>
        )}

        {/* Custom Output Filename Option */}
        {!isBatch && (
          <div className="space-y-1.5 pt-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowFilenameInput(!showFilenameInput)}
                className="text-xs font-medium text-zinc-500 hover:text-zinc-900 flex items-center gap-1.5 transition-colors cursor-pointer dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                <Pencil className="h-3 w-3" />
                <span>{showFilenameInput ? 'Nascondi nome file personalizzato' : 'Salva con nome personalizzato'}</span>
              </button>
              {customFilename && !showFilenameInput && (
                <Badge variant="secondary" className="font-mono">
                  Salva come: {customFilename}
                </Badge>
              )}
            </div>

            {showFilenameInput && (
              <div className="flex items-center gap-2 pt-1">
                <div className="relative flex-1">
                  <Input
                    value={customFilename}
                    onChange={(e) => setCustomFilename(e.target.value)}
                    placeholder="Nome personalizzato (es: MioVideo) senza estensione..."
                    icon={<FileText className="h-3.5 w-3.5 text-zinc-400" />}
                    className="h-8 text-xs"
                  />
                  {customFilename && (
                    <button
                      type="button"
                      onClick={() => setCustomFilename('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer"
                      title="Reset nome"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </form>
    </Card>
  )
}
