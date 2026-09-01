import { useState, useEffect, useMemo } from 'react'
import {
  Film,
  Music,
  FileText,
  Sliders,
  ShieldAlert,
  ListVideo,
  Settings,
  Clock,
  User,
  Eye,
  Check,
  Download,
  Loader2,
  FolderOpen,
  Globe,
  Tag,
  Scissors,
  Layers,
  Volume2,
  HardDrive,
  Pencil,
  Play,
  RotateCcw,
  AlertCircle,
  Sparkles,
  Radio,
  Calendar,
  CheckSquare,
  Square,
  VolumeX,
} from 'lucide-react'
import {
  DownloadOptions,
  FormatItem,
  Metadata,
  Preset,
  SubtitleItem,
} from '@/types'
import { api } from '@/lib/api'
import {
  formatBytes,
  formatDuration,
  formatNumber,
  estimateVideoSize,
  estimateAudioSize,
  formatSecondsToTimestamp,
  parseTimeToSeconds,
} from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Tabs } from '@/components/ui/Tabs'
import { Switch } from '@/components/ui/Switch'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'

interface InspectModalProps {
  isOpen: boolean
  onClose: () => void
  initialUrl: string
  onStartDownload: (options: DownloadOptions, meta?: Metadata) => void
}

export function InspectModal({
  isOpen,
  onClose,
  initialUrl,
  onStartDownload,
}: InspectModalProps) {
  const [url, setUrl] = useState('')
  const [customFilename, setCustomFilename] = useState('')
  const [loading, setLoading] = useState(false)
  const [metadata, setMetadata] = useState<Metadata | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('format')
  const [presets, setPresets] = useState<Preset[]>([])

  // Download Form State
  const [mode, setMode] = useState<'video' | 'audio' | 'custom'>('video')
  const [selectedFormatId, setSelectedFormatId] = useState<string>('')
  const [formatFilter, setFormatFilter] = useState<'all' | 'muxed' | 'video_only' | 'audio_only'>('all')

  // Video Options
  const [videoQuality, setVideoQuality] = useState<string>('best')
  const [videoContainer, setVideoContainer] = useState<string>('mp4')
  const [videoCodec, setVideoCodec] = useState<'any' | 'h264' | 'h265' | 'vp9' | 'av1'>('any')
  const [maxFps, setMaxFps] = useState<number>(0)
  const [recodeVideo, setRecodeVideo] = useState<string>('none')

  // Audio Options
  const [audioFormat, setAudioFormat] = useState<string>('mp3')
  const [audioQuality, setAudioQuality] = useState<string>('0')
  const [audioNormalize, setAudioNormalize] = useState<boolean>(false)
  const [audioVolume, setAudioVolume] = useState<string>('100%')
  const [keepVideo, setKeepVideo] = useState<boolean>(false)

  // Subtitles
  const [subtitlesMode, setSubtitlesMode] = useState<'none' | 'embed' | 'separate'>('none')
  const [autoSubtitles, setAutoSubtitles] = useState(false)
  const [selectedSubs, setSelectedSubs] = useState<string[]>(['it.*', 'en.*'])
  const [convertSubtitles, setConvertSubtitles] = useState('srt')

  // Metadata & Artwork
  const [embedMetadata, setEmbedMetadata] = useState(true)
  const [embedThumbnail, setEmbedThumbnail] = useState(true)
  const [embedChapters, setEmbedChapters] = useState(true)
  const [writeThumbnail, setWriteThumbnail] = useState(false)
  const [writeDescription, setWriteDescription] = useState(false)
  const [writeInfoJson, setWriteInfoJson] = useState(false)

  // SponsorBlock
  const [sponsorAction, setSponsorAction] = useState<'remove' | 'mark' | 'none'>('remove')
  const [sponsorCats, setSponsorCats] = useState<string[]>([
    'sponsor',
    'intro',
    'outro',
    'selfpromo',
  ])

  // Trimming & Chapters
  const [splitChapters, setSplitChapters] = useState(false)
  const [sectionStart, setSectionStart] = useState('')
  const [sectionEnd, setSectionEnd] = useState('')

  // Playlist items
  const [selectedEntries, setSelectedEntries] = useState<Record<string, boolean>>({})
  const [playlistReverse, setPlaylistReverse] = useState(false)
  const [minDurationFilter, setMinDurationFilter] = useState<number>(0)
  const [maxDurationFilter, setMaxDurationFilter] = useState<number>(0)
  const [dateAfterFilter, setDateAfterFilter] = useState('')

  // Advanced & Network
  const [cookiesBrowser, setCookiesBrowser] = useState('none')
  const [proxy, setProxy] = useState('')
  const [rateLimit, setRateLimit] = useState('')
  const [concurrentFragments, setConcurrentFragments] = useState(4)
  const [outputFolder, setOutputFolder] = useState('')
  const [outputTemplate, setOutputTemplate] = useState('')
  const [liveFromStart, setLiveFromStart] = useState(false)
  const [geoBypass, setGeoBypass] = useState(false)
  const [customArgs, setCustomArgs] = useState('')

  useEffect(() => {
    if (initialUrl && isOpen) {
      setUrl(initialUrl)
      fetchInfo(initialUrl)
    }
  }, [initialUrl, isOpen])

  useEffect(() => {
    if (isOpen) {
      api.getPresets().then(setPresets).catch(console.error)
    }
  }, [isOpen])

  const fetchInfo = async (targetUrl: string) => {
    if (!targetUrl.trim()) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.extractInfo({
        url: targetUrl.trim(),
        includeFormats: true,
        flatPlaylist: false,
      })
      setMetadata(data)

      if (data.title) {
        const clean = data.title.replace(/[<>:"/\\|?*]/g, '_').trim()
        setCustomFilename(clean)
      }

      if (data.duration && data.duration > 0) {
        setSectionEnd(formatSecondsToTimestamp(data.duration))
      }

      // Initialize playlist selection
      if (data.is_playlist && data.entries) {
        const initialSelected: Record<string, boolean> = {}
        data.entries.forEach((e) => {
          initialSelected[e.id] = true
        })
        setSelectedEntries(initialSelected)
      }
    } catch (err: any) {
      setError(err.message || 'Impossibile ispezionare URL')
    } finally {
      setLoading(false)
    }
  }

  const applyPreset = (preset: Preset) => {
    const opts = preset.options
    if (opts.mode) setMode(opts.mode)
    if (opts.videoQuality) setVideoQuality(opts.videoQuality)
    if (opts.videoContainer) setVideoContainer(opts.videoContainer)
    if (opts.audioFormat) setAudioFormat(opts.audioFormat)
    if (opts.audioQuality) setAudioQuality(opts.audioQuality)
    if (opts.embedMetadata !== undefined) setEmbedMetadata(opts.embedMetadata)
    if (opts.embedThumbnail !== undefined) setEmbedThumbnail(opts.embedThumbnail)
    if (opts.embedSubtitles !== undefined) {
      setSubtitlesMode(opts.embedSubtitles ? 'embed' : 'none')
    }
    if (opts.autoSubtitles !== undefined) setAutoSubtitles(opts.autoSubtitles)
    if (opts.sponsorBlockAction) setSponsorAction(opts.sponsorBlockAction)
  }

  const duration = metadata?.duration || 0

  const currentEstimatedSize = useMemo(() => {
    if (mode === 'audio') {
      return estimateAudioSize(metadata?.formats, duration, audioFormat, audioQuality)
    }
    if (mode === 'custom' && selectedFormatId) {
      const f = metadata?.formats?.find((fmt) => fmt.format_id === selectedFormatId)
      if (f) {
        if (f.filesize && f.filesize > 0) return f.filesize
        if (f.filesize_approx && f.filesize_approx > 0) return f.filesize_approx
        if ((f.vbr || f.tbr || f.abr) && duration > 0) {
          const br = f.tbr || (f.vbr || 0) + (f.abr || 0) || 2000
          return Math.round((br * 1000 * duration) / 8)
        }
      }
    }
    return estimateVideoSize(metadata?.formats, duration, videoQuality)
  }, [mode, metadata, duration, audioFormat, audioQuality, selectedFormatId, videoQuality])

  // Trimming duration calculation
  const trimDuration = useMemo(() => {
    if (!duration || duration <= 0) return null
    const s = parseTimeToSeconds(sectionStart) || 0
    const e = parseTimeToSeconds(sectionEnd) !== null ? parseTimeToSeconds(sectionEnd)! : duration
    const diff = Math.max(0, e - s)
    return diff
  }, [sectionStart, sectionEnd, duration])

  const handleStart = () => {
    let playlistItems = ''
    if (metadata?.is_playlist && metadata.entries) {
      const selectedIndices = metadata.entries
        .map((entry, idx) => (selectedEntries[entry.id] ? idx + 1 : null))
        .filter((idx): idx is number => idx !== null)

      if (selectedIndices.length > 0 && selectedIndices.length < metadata.entries.length) {
        playlistItems = selectedIndices.join(',')
      }
    }

    const options: DownloadOptions = {
      url: url.trim(),
      mode,
      customFilename: customFilename.trim() || undefined,
      outputFolder: outputFolder || undefined,
      outputTemplate: outputTemplate || undefined,
      formatId: selectedFormatId || undefined,
      videoQuality: mode === 'video' ? videoQuality : undefined,
      videoContainer: mode === 'video' ? videoContainer : undefined,
      videoCodec: mode === 'video' && videoCodec !== 'any' ? videoCodec : undefined,
      maxFps: mode === 'video' && maxFps > 0 ? maxFps : undefined,
      recodeVideo: recodeVideo !== 'none' ? recodeVideo : undefined,
      audioFormat: mode === 'audio' ? audioFormat : undefined,
      audioQuality: mode === 'audio' ? audioQuality : undefined,
      audioNormalize,
      audioVolume: audioVolume !== '100%' ? audioVolume : undefined,
      keepVideo,
      embedMetadata,
      embedThumbnail,
      embedChapters,
      writeThumbnail,
      writeDescription,
      writeInfoJson,
      downloadSubtitles: subtitlesMode !== 'none',
      embedSubtitles: subtitlesMode === 'embed',
      autoSubtitles,
      subtitleLanguages: selectedSubs.join(','),
      convertSubtitles: convertSubtitles !== 'none' ? convertSubtitles : undefined,
      sponsorBlockAction: sponsorAction,
      sponsorBlockCategories: sponsorCats,
      splitChapters,
      sectionStart: sectionStart || undefined,
      sectionEnd: sectionEnd || undefined,
      playlistItems: playlistItems || undefined,
      playlistReverse,
      dateAfter: dateAfterFilter || undefined,
      minDuration: minDurationFilter > 0 ? minDurationFilter : undefined,
      maxDuration: maxDurationFilter > 0 ? maxDurationFilter : undefined,
      rateLimit: rateLimit || undefined,
      concurrentFragments: concurrentFragments > 1 ? concurrentFragments : undefined,
      cookiesBrowser: cookiesBrowser !== 'none' ? cookiesBrowser : undefined,
      proxy: proxy || undefined,
      geoBypass,
      liveFromStart,
      customArgs: customArgs ? customArgs.split(' ').filter(Boolean) : undefined,
    }

    onStartDownload(options, metadata || undefined)
    onClose()
  }

  const tabs = [
    { id: 'format', label: 'Formato & Qualità', icon: <Film className="h-3.5 w-3.5" /> },
    { id: 'audio', label: 'Audio & Volume', icon: <Music className="h-3.5 w-3.5" /> },
    { id: 'trim', label: 'Taglio & Capitoli', icon: <Scissors className="h-3.5 w-3.5" /> },
    { id: 'subtitles', label: 'Sottotitoli', icon: <FileText className="h-3.5 w-3.5" /> },
    { id: 'sponsorblock', label: 'SponsorBlock', icon: <ShieldAlert className="h-3.5 w-3.5" /> },
    ...(metadata?.is_playlist
      ? [
          {
            id: 'playlist',
            label: `Playlist (${metadata.playlist_count})`,
            icon: <ListVideo className="h-3.5 w-3.5" />,
          },
        ]
      : []),
    { id: 'advanced', label: 'Rete & Avanzate', icon: <Settings className="h-3.5 w-3.5" /> },
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-zinc-50 shadow-xs dark:bg-zinc-50 dark:text-zinc-900">
            <Sliders className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Personalizza Download</h2>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Configura risoluzione, codec, audio, sottotitoli e taglio spezzoni</p>
          </div>
        </div>
      }
      maxWidth="5xl"
      footer={
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
            {currentEstimatedSize > 0 && (
              <span className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800">
                <HardDrive className="h-3.5 w-3.5" />
                Dim. Stimata: ~{formatBytes(currentEstimatedSize)}
              </span>
            )}
            {trimDuration !== null && trimDuration < duration && (
              <span className="flex items-center gap-1 text-zinc-600 bg-zinc-100 rounded-md px-2 py-1 dark:bg-zinc-800 dark:text-zinc-300">
                <Scissors className="h-3 w-3" />
                Taglio: {formatDuration(trimDuration)}
              </span>
            )}
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Annulla
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleStart}
              disabled={loading || !url.trim()}
              className="font-semibold px-4"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Avvia Download</span>
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* URL Inspector Bar if empty or changing URL */}
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchInfo(url)}
            placeholder="Incolla link video o playlist (YouTube, TikTok, Instagram, Vimeo, ecc.)..."
            icon={<Globe className="h-4 w-4 text-zinc-400" />}
            className="h-9 text-xs"
          />
          <Button
            onClick={() => fetchInfo(url)}
            isLoading={loading}
            disabled={!url.trim()}
            size="sm"
            className="h-9 px-3 gap-1.5 shrink-0"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Ispeziona</span>
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-start gap-2 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Errore ispezione URL:</p>
              <p className="font-mono mt-0.5 text-[11px] break-all">{error}</p>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-700 dark:text-zinc-300" />
            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Estrazione metadati e flussi con yt-dlp...</p>
            <p className="text-[11px] text-zinc-500">Rilevamento risoluzioni, bitrate audio, sottotitoli e capitoli</p>
          </div>
        )}

        {/* Metadata Preview Card */}
        {metadata && !loading && (
          <Card className="p-3 bg-zinc-50/70 border-zinc-200 dark:bg-zinc-900/40 dark:border-zinc-800">
            <div className="flex flex-col sm:flex-row gap-3">
              {metadata.thumbnail && (
                <div className="relative aspect-video w-full sm:w-40 shrink-0 overflow-hidden rounded-lg bg-zinc-100 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
                  <img
                    src={metadata.thumbnail}
                    alt={metadata.title}
                    className="h-full w-full object-cover"
                  />
                  {metadata.duration > 0 && (
                    <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[9px] font-medium text-zinc-200 backdrop-blur-xs">
                      {metadata.duration_string || formatDuration(metadata.duration)}
                    </span>
                  )}
                </div>
              )}

              <div className="flex-1 min-w-0 space-y-1.5">
                <h3 className="text-xs font-semibold text-zinc-900 leading-snug line-clamp-2 dark:text-zinc-100">
                  {metadata.title}
                </h3>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                  {metadata.uploader && (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3 text-zinc-400" />
                      <span className="text-zinc-700 font-medium dark:text-zinc-300">{metadata.uploader}</span>
                    </div>
                  )}
                  {metadata.view_count !== undefined && metadata.view_count > 0 && (
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3 text-zinc-400" />
                      <span>{formatNumber(metadata.view_count)} visualizzazioni</span>
                    </div>
                  )}
                  {metadata.extractor && (
                    <Badge variant="outline" className="text-[9px] font-mono uppercase">
                      {metadata.extractor}
                    </Badge>
                  )}
                  {metadata.is_playlist && (
                    <Badge variant="primary" className="text-[9px]">
                      Playlist ({metadata.playlist_count} elementi)
                    </Badge>
                  )}
                </div>

                {/* Quick Presets Picker */}
                {presets.length > 0 && (
                  <div className="pt-1.5 border-t border-zinc-200/80 dark:border-zinc-800/60">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-[10px] font-semibold text-zinc-500 mr-1 flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-amber-500" />
                        Preset Rapidi:
                      </span>
                      {presets.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => applyPreset(p)}
                          className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-medium text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Mode Selector Segment */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => {
              setMode('video')
              setSelectedFormatId('')
            }}
            className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-colors cursor-pointer select-none ${
              mode === 'video'
                ? 'border-zinc-900 bg-zinc-900 text-zinc-50 shadow-xs dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900'
                : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900'
            }`}
          >
            <Film className="h-4 w-4 mb-1" />
            <span className="text-xs font-semibold">Video Completo</span>
            <span className="text-[10px] opacity-70">Video + Audio stereo integrato</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('audio')
              setSelectedFormatId('')
            }}
            className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-colors cursor-pointer select-none ${
              mode === 'audio'
                ? 'border-zinc-900 bg-zinc-900 text-zinc-50 shadow-xs dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900'
                : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900'
            }`}
          >
            <Music className="h-4 w-4 mb-1" />
            <span className="text-xs font-semibold">Solo Audio</span>
            <span className="text-[10px] opacity-70">MP3 / FLAC / OPUS con tag ID3</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('custom')}
            className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-colors cursor-pointer select-none ${
              mode === 'custom'
                ? 'border-zinc-900 bg-zinc-900 text-zinc-50 shadow-xs dark:border-zinc-50 dark:bg-zinc-900 dark:text-zinc-900'
                : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900'
            }`}
          >
            <Layers className="h-4 w-4 mb-1" />
            <span className="text-xs font-semibold">Flussi Singoli</span>
            <span className="text-[10px] opacity-70">Scegli lo stream esatto (format_id)</span>
          </button>
        </div>

        {/* Output Filename & Destination Box */}
        <div className="rounded-lg border border-zinc-200 bg-white p-3 space-y-2 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5 dark:text-zinc-100">
              <Pencil className="h-3.5 w-3.5 text-zinc-500" />
              <span>Nome con cui verrà salvato il file:</span>
            </label>
            <span className="text-[11px] font-mono text-zinc-500">
              Estensione: {mode === 'audio' ? `.${audioFormat}` : `.${videoContainer}`}
            </span>
          </div>
          <Input
            value={customFilename}
            onChange={(e) => setCustomFilename(e.target.value)}
            placeholder="Nome del file su disco (es: IlMioVideo)..."
            className="h-8 text-xs font-medium"
          />
        </div>

        {/* Navigation Tabs */}
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {/* Tab 1: Video Format & Quality */}
        {activeTab === 'format' && (
          <div className="space-y-4">
            {mode !== 'audio' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 mb-1 block dark:text-zinc-300">
                    Risoluzione Video
                  </label>
                  <select
                    value={videoQuality}
                    onChange={(e) => {
                      setVideoQuality(e.target.value)
                      setMode('video')
                      setSelectedFormatId('')
                    }}
                    className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    <option value="best">
                      Migliore Disponibile — (~{formatBytes(estimateVideoSize(metadata?.formats, duration, 'best'))})
                    </option>
                    <option value="2160">
                      4K Ultra HD (2160p) — (~{formatBytes(estimateVideoSize(metadata?.formats, duration, '2160'))})
                    </option>
                    <option value="1440">
                      2K Quad HD (1440p) — (~{formatBytes(estimateVideoSize(metadata?.formats, duration, '1440'))})
                    </option>
                    <option value="1080">
                      Full HD (1080p) — (~{formatBytes(estimateVideoSize(metadata?.formats, duration, '1080'))})
                    </option>
                    <option value="720">
                      HD (720p) — (~{formatBytes(estimateVideoSize(metadata?.formats, duration, '720'))})
                    </option>
                    <option value="480">
                      SD (480p) — (~{formatBytes(estimateVideoSize(metadata?.formats, duration, '480'))})
                    </option>
                    <option value="360">
                      Bassa (360p) — (~{formatBytes(estimateVideoSize(metadata?.formats, duration, '360'))})
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-700 mb-1 block dark:text-zinc-300">
                    Contenitore File
                  </label>
                  <select
                    value={videoContainer}
                    onChange={(e) => setVideoContainer(e.target.value)}
                    className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    <option value="mp4">MP4 (Massima compatibilità)</option>
                    <option value="mkv">MKV (Matroska - Multi-traccia e sottotitoli)</option>
                    <option value="webm">WebM (VP9/AV1 + Opus)</option>
                    <option value="mov">MOV (Apple QuickTime)</option>
                    <option value="none">Contenitore originale dello stream</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-700 mb-1 block dark:text-zinc-300">
                    Codec Video Preferito
                  </label>
                  <select
                    value={videoCodec}
                    onChange={(e) => setVideoCodec(e.target.value as any)}
                    className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    <option value="any">Auto (Miglior codec disponibile)</option>
                    <option value="h264">H.264 / AVC (Compatibile con TV/vecchi lettori)</option>
                    <option value="h265">H.265 / HEVC (Alta compressione)</option>
                    <option value="vp9">VP9 (Standard YouTube Web)</option>
                    <option value="av1">AV1 (Ultima generazione ad altissima efficienza)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-700 mb-1 block dark:text-zinc-300">
                    Limite Framerate (FPS)
                  </label>
                  <select
                    value={maxFps}
                    onChange={(e) => setMaxFps(parseInt(e.target.value) || 0)}
                    className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    <option value={0}>Qualsiasi Framerate (es. 60fps se disponibile)</option>
                    <option value={60}>Massimo 60 FPS</option>
                    <option value={30}>Massimo 30 FPS (Risparmia banda)</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
                <p className="font-semibold mb-1">Modalità Solo Audio Attiva</p>
                <p>Configura il formato audio, il bitrate e l'ottimizzazione del volume nella scheda <strong>Audio & Volume</strong>.</p>
              </div>
            )}

            {/* Individual Formats Table */}
            {mode === 'custom' && metadata?.formats && metadata.formats.length > 0 && (() => {
              const allFormats = metadata.formats
              const muxedCount = allFormats.filter((f) => (f.has_video ?? Boolean(f.vcodec && f.vcodec !== 'none')) && (f.has_audio ?? Boolean(f.acodec && f.acodec !== 'none'))).length
              const videoOnlyCount = allFormats.filter((f) => (f.has_video ?? Boolean(f.vcodec && f.vcodec !== 'none')) && !(f.has_audio ?? Boolean(f.acodec && f.acodec !== 'none'))).length
              const audioOnlyCount = allFormats.filter((f) => !(f.has_video ?? Boolean(f.vcodec && f.vcodec !== 'none')) && (f.has_audio ?? Boolean(f.acodec && f.acodec !== 'none'))).length

              const displayedFormats = allFormats.filter((f) => {
                const hasV = f.has_video ?? Boolean(f.vcodec && f.vcodec !== 'none')
                const hasA = f.has_audio ?? Boolean(f.acodec && f.acodec !== 'none')
                if (formatFilter === 'muxed') return hasV && hasA
                if (formatFilter === 'video_only') return hasV && !hasA
                if (formatFilter === 'audio_only') return !hasV && hasA
                return true
              })

              return (
                <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-xs font-semibold text-zinc-600 mr-1 dark:text-zinc-400">Tipo Flusso:</span>
                      {[
                        { id: 'all', label: 'Tutti', count: allFormats.length },
                        { id: 'muxed', label: 'Video + Audio', count: muxedCount },
                        { id: 'video_only', label: 'Solo Video', count: videoOnlyCount },
                        { id: 'audio_only', label: 'Solo Audio', count: audioOnlyCount },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setFormatFilter(tab.id as any)}
                          className={`flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium transition-colors cursor-pointer border ${
                            formatFilter === tab.id
                              ? 'bg-zinc-900 text-zinc-50 border-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 dark:border-zinc-50'
                              : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                          }`}
                        >
                          <span>{tab.label}</span>
                          <span className="rounded-full bg-zinc-200 px-1 py-0.2 text-[10px] dark:bg-zinc-800">
                            {tab.count}
                          </span>
                        </button>
                      ))}
                    </div>

                    {selectedFormatId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedFormatId('')}
                        className="text-xs h-7 text-zinc-600 dark:text-zinc-400"
                      >
                        Reset selezione stream
                      </Button>
                    )}
                  </div>

                  <div className="max-h-56 overflow-y-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-zinc-100 text-[10px] uppercase font-semibold text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                        <tr>
                          <th className="p-2">ID</th>
                          <th className="p-2">Estensione</th>
                          <th className="p-2">Risoluzione</th>
                          <th className="p-2">Codec Video</th>
                          <th className="p-2">Codec Audio</th>
                          <th className="p-2">Bitrate</th>
                          <th className="p-2">Dimensione</th>
                          <th className="p-2 text-right">Azione</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 font-mono text-[11px] text-zinc-700 dark:divide-zinc-800 dark:text-zinc-300">
                        {displayedFormats.map((f) => {
                          const isSelected = selectedFormatId === f.format_id
                          const hasV = f.has_video ?? Boolean(f.vcodec && f.vcodec !== 'none')
                          const hasA = f.has_audio ?? Boolean(f.acodec && f.acodec !== 'none')

                          return (
                            <tr
                              key={f.format_id}
                              className={`hover:bg-zinc-50/80 transition-colors ${
                                isSelected ? 'bg-zinc-100 font-semibold dark:bg-zinc-900' : ''
                              }`}
                            >
                              <td className="p-2 font-bold">{f.format_id}</td>
                              <td className="p-2 uppercase">{f.ext}</td>
                              <td className="p-2">{f.resolution || (f.height ? `${f.height}p` : 'N/A')}</td>
                              <td className="p-2 truncate max-w-[100px]">{f.vcodec && f.vcodec !== 'none' ? f.vcodec : '—'}</td>
                              <td className="p-2 truncate max-w-[100px]">{f.acodec && f.acodec !== 'none' ? f.acodec : '—'}</td>
                              <td className="p-2">{f.tbr ? `${Math.round(f.tbr)}k` : '—'}</td>
                              <td className="p-2 font-sans text-zinc-500">
                                {f.filesize ? formatBytes(f.filesize) : f.filesize_approx ? `~${formatBytes(f.filesize_approx)}` : '—'}
                              </td>
                              <td className="p-2 text-right">
                                <Button
                                  variant={isSelected ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => {
                                    setSelectedFormatId(f.format_id)
                                    setMode('custom')
                                  }}
                                  className="h-6 text-[10px] px-2"
                                >
                                  {isSelected ? 'Selezionato' : 'Seleziona'}
                                </Button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* Tab 2: Audio & Volume */}
        {activeTab === 'audio' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-700 mb-1 block dark:text-zinc-300">
                  Formato File Audio
                </label>
                <select
                  value={audioFormat}
                  onChange={(e) => setAudioFormat(e.target.value)}
                  className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="mp3">MP3 (Massima compatibilità ovunque)</option>
                  <option value="m4a">M4A / AAC (Ideale per Apple & smartphone)</option>
                  <option value="flac">FLAC (Lossless Audio ad alta fedeltà)</option>
                  <option value="opus">OPUS (Migliore efficienza e fedeltà per YouTube)</option>
                  <option value="wav">WAV (Audio non compresso da studio)</option>
                  <option value="alac">ALAC (Apple Lossless)</option>
                  <option value="vorbis">OGG Vorbis</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 mb-1 block dark:text-zinc-300">
                  Qualità / Bitrate Audio
                </label>
                <select
                  value={audioQuality}
                  onChange={(e) => setAudioQuality(e.target.value)}
                  className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="0">320 kbps / Best VBR (Massima Qualità)</option>
                  <option value="256k">256 kbps (Ottima Qualità)</option>
                  <option value="192k">192 kbps (Standard)</option>
                  <option value="128k">128 kbps (Compatto)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 space-y-2 dark:border-zinc-800 dark:bg-zinc-900/40">
                <Switch
                  checked={audioNormalize}
                  onChange={setAudioNormalize}
                  label="Normalizzazione Volume (EBU R128)"
                  description="Livella automaticamente l'audio a uno standard broadcast uniforme evitando sbalzi di volume"
                />
              </div>

              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 space-y-2 dark:border-zinc-800 dark:bg-zinc-900/40">
                <label className="text-xs font-semibold text-zinc-900 block dark:text-zinc-100">
                  Amplificazione Volume (Boost)
                </label>
                <select
                  value={audioVolume}
                  onChange={(e) => setAudioVolume(e.target.value)}
                  className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="100%">100% (Volume originale normale)</option>
                  <option value="125%">125% (Aumenta volume del +25%)</option>
                  <option value="150%">150% (Aumenta volume del +50%)</option>
                  <option value="200%">200% (Volume raddoppiato +100%)</option>
                  <option value="75%">75% (Riduci leggermente)</option>
                </select>
                <p className="text-[11px] text-zinc-500">Utile per video registrati con microfono troppo basso.</p>
              </div>
            </div>

            {mode === 'audio' && (
              <Switch
                checked={keepVideo}
                onChange={setKeepVideo}
                label="Conserva anche il file video originale"
                description="Salva sia il file audio estratto che il file video sorgente"
              />
            )}
          </div>
        )}

        {/* Tab 3: Trimming & Chapters */}
        {activeTab === 'trim' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 space-y-3 dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5 dark:text-zinc-100">
                  <Scissors className="h-3.5 w-3.5" />
                  <span>Taglia Spezzone / Clip Temporale</span>
                </label>
                {duration > 0 && (
                  <span className="text-[11px] font-mono text-zinc-500">
                    Durata Totale: {formatDuration(duration)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-zinc-600 mb-1 block dark:text-zinc-400">
                    Punto di Inizio (HH:MM:SS o Secondi):
                  </label>
                  <div className="flex gap-1.5">
                    <Input
                      value={sectionStart}
                      onChange={(e) => setSectionStart(e.target.value)}
                      placeholder="00:00:00"
                      className="h-8 text-xs font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSectionStart('00:00:00')}
                      className="h-8 text-[11px] px-2 shrink-0"
                    >
                      Inizio
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-zinc-600 mb-1 block dark:text-zinc-400">
                    Punto di Fine (HH:MM:SS o Secondi):
                  </label>
                  <div className="flex gap-1.5">
                    <Input
                      value={sectionEnd}
                      onChange={(e) => setSectionEnd(e.target.value)}
                      placeholder={duration > 0 ? formatSecondsToTimestamp(duration) : 'Fine'}
                      className="h-8 text-xs font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => duration > 0 && setSectionEnd(formatSecondsToTimestamp(duration))}
                      className="h-8 text-[11px] px-2 shrink-0"
                    >
                      Fine
                    </Button>
                  </div>
                </div>
              </div>

              {trimDuration !== null && trimDuration < duration && (
                <div className="rounded-md border border-zinc-200 bg-white p-2.5 text-xs text-zinc-700 flex items-center justify-between dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Durata spezzone: <strong>{formatDuration(trimDuration)}</strong></span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSectionStart('00:00:00')
                      if (duration > 0) setSectionEnd(formatSecondsToTimestamp(duration))
                    }}
                    className="h-6 text-[10px] px-2"
                  >
                    Resetta Taglio
                  </Button>
                </div>
              )}
            </div>

            {/* Chapters list if detected in metadata */}
            {metadata?.chapters && metadata.chapters.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Capitoli Rilevati ({metadata.chapters.length})
                  </span>
                  <Switch
                    checked={splitChapters}
                    onChange={setSplitChapters}
                    label="Dividi in file separati per ogni capitolo"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto rounded-lg border border-zinc-200 bg-white divide-y divide-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:divide-zinc-800">
                  {metadata.chapters.map((ch, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 hover:bg-zinc-50 transition-colors text-xs dark:hover:bg-zinc-900/60"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="font-mono text-[10px] text-zinc-400 select-none">
                          #{(idx + 1).toString().padStart(2, '0')}
                        </span>
                        <p className="font-medium text-zinc-900 truncate dark:text-zinc-100">{ch.title}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-[11px] text-zinc-500">
                          {formatSecondsToTimestamp(ch.start_time)} - {formatSecondsToTimestamp(ch.end_time)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSectionStart(formatSecondsToTimestamp(ch.start_time))
                            setSectionEnd(formatSecondsToTimestamp(ch.end_time))
                          }}
                          className="h-6 text-[10px] px-2"
                        >
                          Imposta Taglio
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Subtitles */}
        {activeTab === 'subtitles' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-700 mb-1 block dark:text-zinc-300">
                  Modalità Sottotitoli
                </label>
                <select
                  value={subtitlesMode}
                  onChange={(e) => setSubtitlesMode(e.target.value as any)}
                  className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="none">Nessun sottotitolo</option>
                  <option value="embed">Incorpora nel video (Softsubs integrati nel file)</option>
                  <option value="separate">Scarica file sottotitoli separato (.srt / .vtt)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 mb-1 block dark:text-zinc-300">
                  Formato Conversione Sottotitoli
                </label>
                <select
                  value={convertSubtitles}
                  onChange={(e) => setConvertSubtitles(e.target.value)}
                  className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="srt">SRT (SubRip - Massima compatibilità)</option>
                  <option value="vtt">VTT (WebVTT)</option>
                  <option value="ass">ASS (Advanced SubStation Alpha con stili)</option>
                  <option value="lrc">LRC (Testo sincronizzato per musica)</option>
                  <option value="none">Formato originale</option>
                </select>
              </div>
            </div>

            <Switch
              checked={autoSubtitles}
              onChange={setAutoSubtitles}
              label="Includi sottotitoli generati automaticamente (Auto-sub AI)"
              description="Scarica le trascrizioni generate automaticamente dalla piattaforma se i sottotitoli manuali non sono presenti"
            />

            {/* Subtitles Languages Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 block dark:text-zinc-300">
                Lingue Sottotitoli Preferite:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { code: 'it.*', label: 'Italiano' },
                  { code: 'en.*', label: 'Inglese' },
                  { code: 'es.*', label: 'Spagnolo' },
                  { code: 'fr.*', label: 'Francese' },
                  { code: 'de.*', label: 'Tedesco' },
                  { code: 'ja.*', label: 'Giapponese' },
                  { code: 'all', label: 'Tutte le Lingue' },
                ].map((lang) => {
                  const isChecked = selectedSubs.includes(lang.code)
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        if (isChecked) {
                          setSelectedSubs((prev) => prev.filter((c) => c !== lang.code))
                        } else {
                          setSelectedSubs((prev) => [...prev, lang.code])
                        }
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                        isChecked
                          ? 'bg-zinc-900 text-zinc-50 border-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 dark:border-zinc-50'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      {lang.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: SponsorBlock */}
        {activeTab === 'sponsorblock' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-700 mb-1 block dark:text-zinc-300">
                Azione SponsorBlock
              </label>
              <select
                value={sponsorAction}
                onChange={(e) => setSponsorAction(e.target.value as any)}
                className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="remove">Rimuovi e taglia automaticamente i segmenti sponsor</option>
                <option value="mark">Crea capitoli nei segmenti sponsor senza tagliarli</option>
                <option value="none">Disabilitato</option>
              </select>
            </div>

            {sponsorAction !== 'none' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-700 block dark:text-zinc-300">
                  Categorie da Rilevare & Filtrare:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: 'sponsor', label: 'Sponsor & Pubblicità', desc: 'Promozioni di prodotti e sponsor integrati' },
                    { id: 'intro', label: 'Intro & Animazioni Iniziali', desc: 'Sigle e intermezzi di apertura' },
                    { id: 'outro', label: 'Outro & Titoli di Coda', desc: 'Endcards e schermate finali' },
                    { id: 'selfpromo', label: 'Auto-Promozione', desc: 'Merchandise e canali secondari' },
                    { id: 'preview', label: 'Anteprima / Recap', desc: 'Sintesi di inizio o puntate precedenti' },
                    { id: 'music_offtopic', label: 'Parti non musicali', desc: 'Dialoghi in videoclip musicali' },
                  ].map((cat) => {
                    const isChecked = sponsorCats.includes(cat.id)
                    return (
                      <div
                        key={cat.id}
                        onClick={() => {
                          if (isChecked) {
                            setSponsorCats((prev) => prev.filter((c) => c !== cat.id))
                          } else {
                            setSponsorCats((prev) => [...prev, cat.id])
                          }
                        }}
                        className={`p-2.5 rounded-lg border cursor-pointer select-none transition-colors ${
                          isChecked
                            ? 'border-zinc-900 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900'
                            : 'border-zinc-200 bg-white opacity-70 dark:border-zinc-800 dark:bg-zinc-950'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isChecked ? (
                            <CheckSquare className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
                          ) : (
                            <Square className="h-4 w-4 text-zinc-400" />
                          )}
                          <div>
                            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{cat.label}</p>
                            <p className="text-[10px] text-zinc-500">{cat.desc}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 6: Playlist (if metadata is playlist) */}
        {activeTab === 'playlist' && metadata?.is_playlist && metadata.entries && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Elementi Playlist ({metadata.entries.length} video)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const all: Record<string, boolean> = {}
                    metadata.entries?.forEach((e) => (all[e.id] = true))
                    setSelectedEntries(all)
                  }}
                  className="h-7 text-xs px-2"
                >
                  Seleziona Tutti
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedEntries({})}
                  className="h-7 text-xs px-2"
                >
                  Deseleziona Tutti
                </Button>
                <Switch
                  checked={playlistReverse}
                  onChange={setPlaylistReverse}
                  label="Inverti Ordine"
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-lg border border-zinc-200 bg-white divide-y divide-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:divide-zinc-800">
              {metadata.entries.map((entry, idx) => {
                const isSelected = selectedEntries[entry.id] ?? true
                return (
                  <div
                    key={entry.id}
                    onClick={() =>
                      setSelectedEntries((prev) => ({
                        ...prev,
                        [entry.id]: !isSelected,
                      }))
                    }
                    className="flex items-center justify-between p-2.5 hover:bg-zinc-50 cursor-pointer text-xs dark:hover:bg-zinc-900/60"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-zinc-900 shrink-0 dark:text-zinc-100" />
                      ) : (
                        <Square className="h-4 w-4 text-zinc-400 shrink-0" />
                      )}
                      <span className="font-mono text-[10px] text-zinc-400 select-none">
                        #{(idx + 1).toString().padStart(2, '0')}
                      </span>
                      <p className="font-medium text-zinc-900 truncate dark:text-zinc-100">{entry.title}</p>
                    </div>
                    {entry.duration_string && (
                      <span className="font-mono text-[10px] text-zinc-500 shrink-0">
                        {entry.duration_string}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Tab 7: Advanced & Network */}
        {activeTab === 'advanced' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-700 mb-1 block dark:text-zinc-300">
                  Limite Velocità (Rate Limit)
                </label>
                <select
                  value={rateLimit}
                  onChange={(e) => setRateLimit(e.target.value)}
                  className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="">Velocità Massima Illimitata</option>
                  <option value="50M">50 MB/s</option>
                  <option value="20M">20 MB/s</option>
                  <option value="10M">10 MB/s</option>
                  <option value="5M">5 MB/s</option>
                  <option value="1M">1 MB/s</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 mb-1 block dark:text-zinc-300">
                  Cookie dal Browser (Bypass restrizioni)
                </label>
                <select
                  value={cookiesBrowser}
                  onChange={(e) => setCookiesBrowser(e.target.value)}
                  className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="none">Disabilitato</option>
                  <option value="chrome">Google Chrome</option>
                  <option value="edge">Microsoft Edge</option>
                  <option value="firefox">Mozilla Firefox</option>
                  <option value="brave">Brave</option>
                  <option value="opera">Opera</option>
                  <option value="vivaldi">Vivaldi</option>
                  <option value="safari">Safari</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-700 mb-1 block dark:text-zinc-300">
                  Connessioni Parallele (-N Frammenti)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="16"
                  value={concurrentFragments}
                  onChange={(e) => setConcurrentFragments(parseInt(e.target.value) || 4)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 mb-1 block dark:text-zinc-300">
                  Proxy HTTP / SOCKS5
                </label>
                <Input
                  value={proxy}
                  onChange={(e) => setProxy(e.target.value)}
                  placeholder="socks5://127.0.0.1:1080"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <Switch
                checked={embedMetadata}
                onChange={setEmbedMetadata}
                label="Incorpora Metadati & Tag ID3"
                description="Scrive artista, titolo e data nel file"
              />
              <Switch
                checked={embedThumbnail}
                onChange={setEmbedThumbnail}
                label="Incorpora Copertina / Thumbnail"
                description="Applica la locandina come copertina del file"
              />
              <Switch
                checked={liveFromStart}
                onChange={setLiveFromStart}
                label="Registra Live Stream dall'inizio (--live-from-start)"
                description="Se si tratta di una diretta streaming in corso, scarica dal momento di avvio"
              />
              <Switch
                checked={geoBypass}
                onChange={setGeoBypass}
                label="Bypass Geografico (--geo-bypass)"
                description="Simula IP del paese d'origine per video con blocco geografico"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700 mb-1 block dark:text-zinc-300">
                Argomenti yt-dlp Personalizzati Aggiuntivi:
              </label>
              <Input
                value={customArgs}
                onChange={(e) => setCustomArgs(e.target.value)}
                placeholder="--referer https://example.com --user-agent ..."
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
