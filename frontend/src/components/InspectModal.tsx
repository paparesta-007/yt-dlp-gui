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
  Globe,
  Tag,
  Scissors,
  Layers,
  Volume2,
  HardDrive,
  Pencil,
  RotateCcw,
  AlertCircle,
  Sparkles,
  Calendar,
  CheckSquare,
  Square,
  VolumeX,
  FastForward,
  Rewind,
  ArrowRight,
  Shield,
  Sparkle,
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
  const [presets, setPresets] = useState<Preset[]>([])

  // 3 Primary Distinct Modes: 'video' | 'audio' | 'clip' | 'custom'
  const [mainMode, setMainMode] = useState<'video' | 'audio' | 'clip' | 'custom'>('video')
  const [clipTargetFormat, setClipTargetFormat] = useState<'video' | 'audio'>('video')

  const [activeTab, setActiveTab] = useState('config')

  // Selected format id for advanced raw stream mode
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

  // Trimming / Spezzone Options
  const [sectionStart, setSectionStart] = useState('00:00:00')
  const [sectionEnd, setSectionEnd] = useState('')
  const [splitChapters, setSplitChapters] = useState(false)

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
    if (opts.mode === 'audio') {
      setMainMode('audio')
    } else {
      setMainMode('video')
    }
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

  // Calculation of trimming start/end seconds
  const startSec = useMemo(() => parseTimeToSeconds(sectionStart) || 0, [sectionStart])
  const endSec = useMemo(() => {
    const parsed = parseTimeToSeconds(sectionEnd)
    return parsed !== null && parsed > 0 ? parsed : duration || 0
  }, [sectionEnd, duration])

  const clipDuration = useMemo(() => {
    if (endSec <= startSec) return 0
    return endSec - startSec
  }, [startSec, endSec])

  // Live estimated file size
  const currentEstimatedSize = useMemo(() => {
    const activeDuration = mainMode === 'clip' ? (clipDuration > 0 ? clipDuration : duration) : duration
    if (mainMode === 'audio' || (mainMode === 'clip' && clipTargetFormat === 'audio')) {
      return estimateAudioSize(metadata?.formats, activeDuration, audioFormat, audioQuality)
    }
    if (mainMode === 'custom' && selectedFormatId) {
      const f = metadata?.formats?.find((fmt) => fmt.format_id === selectedFormatId)
      if (f) {
        if (f.filesize && f.filesize > 0) return f.filesize
        if (f.filesize_approx && f.filesize_approx > 0) return f.filesize_approx
        if ((f.vbr || f.tbr || f.abr) && activeDuration > 0) {
          const br = f.tbr || (f.vbr || 0) + (f.abr || 0) || 2000
          return Math.round((br * 1000 * activeDuration) / 8)
        }
      }
    }
    return estimateVideoSize(metadata?.formats, activeDuration, videoQuality)
  }, [mainMode, clipTargetFormat, clipDuration, duration, metadata, audioFormat, audioQuality, selectedFormatId, videoQuality])

  // Adjust time by delta seconds
  const adjustStartTime = (delta: number) => {
    const current = parseTimeToSeconds(sectionStart) || 0
    const next = Math.max(0, Math.min(duration || 999999, current + delta))
    setSectionStart(formatSecondsToTimestamp(next))
  }

  const adjustEndTime = (delta: number) => {
    const current = parseTimeToSeconds(sectionEnd) ?? (duration || 0)
    const next = Math.max(0, Math.min(duration || 999999, current + delta))
    setSectionEnd(formatSecondsToTimestamp(next))
  }

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

    const effectiveMode =
      mainMode === 'clip'
        ? clipTargetFormat === 'audio' ? 'audio' : 'video'
        : mainMode === 'audio'
        ? 'audio'
        : mainMode === 'custom'
        ? 'custom'
        : 'video'

    const isClip = mainMode === 'clip'

    const options: DownloadOptions = {
      url: url.trim(),
      mode: effectiveMode,
      customFilename: customFilename.trim() || undefined,
      outputFolder: outputFolder || undefined,
      outputTemplate: outputTemplate || undefined,
      formatId: selectedFormatId || undefined,
      videoQuality: effectiveMode === 'video' ? videoQuality : undefined,
      videoContainer: effectiveMode === 'video' ? videoContainer : undefined,
      videoCodec: effectiveMode === 'video' && videoCodec !== 'any' ? videoCodec : undefined,
      maxFps: effectiveMode === 'video' && maxFps > 0 ? maxFps : undefined,
      recodeVideo: recodeVideo !== 'none' ? recodeVideo : undefined,
      audioFormat: effectiveMode === 'audio' ? audioFormat : undefined,
      audioQuality: effectiveMode === 'audio' ? audioQuality : undefined,
      audioNormalize,
      audioVolume: audioVolume !== '100%' ? audioVolume : undefined,
      keepVideo: effectiveMode === 'audio' ? keepVideo : undefined,
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
      sectionStart: isClip ? sectionStart : undefined,
      sectionEnd: isClip ? sectionEnd : undefined,
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
    {
      id: 'config',
      label: mainMode === 'clip' ? 'Configura Spezzone' : mainMode === 'audio' ? 'Opzioni Audio' : 'Qualità & Formato',
      icon: mainMode === 'clip' ? <Scissors className="h-3.5 w-3.5" /> : mainMode === 'audio' ? <Music className="h-3.5 w-3.5" /> : <Film className="h-3.5 w-3.5" />,
    },
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
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Scegli tra Video Completo, Solo Audio o Spezzone Tagliato</p>
          </div>
        </div>
      }
      maxWidth="5xl"
      footer={
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-zinc-600 dark:text-zinc-300">
            {currentEstimatedSize > 0 && (
              <span className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800">
                <HardDrive className="h-3.5 w-3.5" />
                Dimensione Stimata: ~{formatBytes(currentEstimatedSize)}
              </span>
            )}
            {mainMode === 'clip' && clipDuration > 0 && (
              <span className="flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-2 py-1 dark:text-blue-300 dark:bg-blue-950/40 dark:border-blue-800">
                <Scissors className="h-3 w-3" />
                Spezzone: {formatDuration(clipDuration)}
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

        {/* Metadata Hero Preview Card */}
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
                      Playlist ({metadata.playlist_count} video)
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

        {/* 🌟 3 Clear Distinct Mode Selection Cards (Video Intero vs Solo Audio vs Spezzone) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
              Scegli Cosa Vuoi Scaricare:
            </span>
            <span className="text-[11px] text-zinc-500">
              Modalità selezionata:{' '}
              <strong className="text-zinc-900 dark:text-zinc-100">
                {mainMode === 'video'
                  ? '🎬 Video Intero'
                  : mainMode === 'audio'
                  ? '🎵 Solo Audio'
                  : mainMode === 'clip'
                  ? '✂️ Spezzone / Clip'
                  : '⚙️ Flussi Singoli'}
              </strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Mode 1: Video Intero */}
            <div
              onClick={() => {
                setMainMode('video')
                setSelectedFormatId('')
              }}
              className={`relative flex flex-col justify-between p-3.5 rounded-xl border-2 transition-all cursor-pointer select-none ${
                mainMode === 'video'
                  ? 'border-blue-600 bg-blue-50/40 shadow-xs dark:border-blue-500 dark:bg-blue-950/20'
                  : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${mainMode === 'video' ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'}`}>
                    <Film className="h-4 w-4" />
                  </div>
                  <Badge variant={mainMode === 'video' ? 'primary' : 'outline'} className="text-[10px]">
                    Video + Audio
                  </Badge>
                </div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  1. Video Intero
                </h4>
                <p className="text-[11px] text-zinc-500 leading-relaxed dark:text-zinc-400">
                  Scarica tutto il video in alta risoluzione con audio stereo fuso insieme in un unico file.
                </p>
              </div>
            </div>

            {/* Mode 2: Solo Audio */}
            <div
              onClick={() => {
                setMainMode('audio')
                setSelectedFormatId('')
              }}
              className={`relative flex flex-col justify-between p-3.5 rounded-xl border-2 transition-all cursor-pointer select-none ${
                mainMode === 'audio'
                  ? 'border-purple-600 bg-purple-50/40 shadow-xs dark:border-purple-500 dark:bg-purple-950/20'
                  : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${mainMode === 'audio' ? 'bg-purple-600 text-white' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'}`}>
                    <Music className="h-4 w-4" />
                  </div>
                  <Badge variant={mainMode === 'audio' ? 'secondary' : 'outline'} className="text-[10px]">
                    Musica & Podcast
                  </Badge>
                </div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  2. Solo Audio
                </h4>
                <p className="text-[11px] text-zinc-500 leading-relaxed dark:text-zinc-400">
                  Estrae e converte solo la traccia audio in MP3, FLAC o M4A con copertina e tag ID3.
                </p>
              </div>
            </div>

            {/* Mode 3: Taglia un Pezzo (Clip) */}
            <div
              onClick={() => {
                setMainMode('clip')
                setSelectedFormatId('')
              }}
              className={`relative flex flex-col justify-between p-3.5 rounded-xl border-2 transition-all cursor-pointer select-none ${
                mainMode === 'clip'
                  ? 'border-emerald-600 bg-emerald-50/40 shadow-xs dark:border-emerald-500 dark:bg-emerald-950/20'
                  : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${mainMode === 'clip' ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'}`}>
                    <Scissors className="h-4 w-4" />
                  </div>
                  <Badge variant={mainMode === 'clip' ? 'success' : 'outline'} className="text-[10px]">
                    Clip & Taglio
                  </Badge>
                </div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  3. Taglia uno Spezzone
                </h4>
                <p className="text-[11px] text-zinc-500 leading-relaxed dark:text-zinc-400">
                  Scarica solo una parte specifica impostando secondo di inizio e fine con timeline visuale.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Output Filename & Format Box */}
        <div className="rounded-lg border border-zinc-200 bg-white p-3 space-y-2 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5 dark:text-zinc-100">
              <Pencil className="h-3.5 w-3.5 text-zinc-500" />
              <span>Nome con cui verrà salvato il file su disco:</span>
            </label>
            <span className="text-[11px] font-mono text-zinc-500">
              Estensione: {mainMode === 'audio' || (mainMode === 'clip' && clipTargetFormat === 'audio') ? `.${audioFormat}` : `.${videoContainer}`}
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

        {/* Tab 1: Configurazione Principale (adatta in base alla modalità scelta) */}
        {activeTab === 'config' && (
          <div className="space-y-4">
            {/* Modalità 1: Video Intero */}
            {mainMode === 'video' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 mb-1 block dark:text-zinc-300">
                      Risoluzione Video
                    </label>
                    <select
                      value={videoQuality}
                      onChange={(e) => setVideoQuality(e.target.value)}
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
                      Formato Contenitore
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

                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 flex items-center justify-between text-xs dark:border-zinc-800 dark:bg-zinc-900/40">
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">Normalizzazione Volume Audio Integrata</p>
                    <p className="text-zinc-500">Livella l'audio del video per evitare sbalzi tra scene e dialoghi</p>
                  </div>
                  <Switch checked={audioNormalize} onChange={setAudioNormalize} />
                </div>
              </div>
            )}

            {/* Modalità 2: Solo Audio */}
            {mainMode === 'audio' && (
              <div className="space-y-3">
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
                      <option value="flac">FLAC (Lossless Audio ad altissima fedeltà)</option>
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
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 space-y-1.5 dark:border-zinc-800 dark:bg-zinc-900/40">
                    <Switch
                      checked={audioNormalize}
                      onChange={setAudioNormalize}
                      label="Normalizzazione Volume (EBU R128)"
                      description="Livella automaticamente l'audio a uno standard broadcast uniforme"
                    />
                  </div>

                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 space-y-1.5 dark:border-zinc-800 dark:bg-zinc-900/40">
                    <label className="text-xs font-semibold text-zinc-900 block dark:text-zinc-100">
                      Amplificazione Volume (Boost)
                    </label>
                    <select
                      value={audioVolume}
                      onChange={(e) => setAudioVolume(e.target.value)}
                      className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                    >
                      <option value="100%">100% (Volume originale)</option>
                      <option value="125%">125% (+25% volume)</option>
                      <option value="150%">150% (+50% volume)</option>
                      <option value="200%">200% (+100% raddoppiato)</option>
                    </select>
                  </div>
                </div>

                <Switch
                  checked={keepVideo}
                  onChange={setKeepVideo}
                  label="Conserva anche il file video originale"
                  description="Salva sia il file audio estratto che il file video sorgente"
                />
              </div>
            )}

            {/* Modalità 3: Taglio Spezzone (Clip) */}
            {mainMode === 'clip' && (
              <div className="space-y-4">
                {/* Scegli se la clip deve essere Video o Audio */}
                <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900">
                  <span className="text-xs font-semibold text-zinc-700 mr-2 dark:text-zinc-300">Salva Spezzone Come:</span>
                  <button
                    type="button"
                    onClick={() => setClipTargetFormat('video')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      clipTargetFormat === 'video'
                        ? 'bg-white text-zinc-950 shadow-xs dark:bg-zinc-950 dark:text-zinc-50'
                        : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400'
                    }`}
                  >
                    <Film className="h-3.5 w-3.5" />
                    <span>Clip Video</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setClipTargetFormat('audio')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      clipTargetFormat === 'audio'
                        ? 'bg-white text-zinc-950 shadow-xs dark:bg-zinc-950 dark:text-zinc-50'
                        : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400'
                    }`}
                  >
                    <Music className="h-3.5 w-3.5" />
                    <span>Clip Audio</span>
                  </button>
                </div>

                {/* Box Selezione Timestamp Inizio e Fine */}
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Timestamp Inizio */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                          <span>Punto di Inizio:</span>
                          <span className="font-mono text-blue-600 dark:text-blue-400">({sectionStart})</span>
                        </label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSectionStart('00:00:00')}
                          className="h-6 text-[10px] px-1.5"
                        >
                          Dall'inizio (00:00)
                        </Button>
                      </div>
                      <Input
                        value={sectionStart}
                        onChange={(e) => setSectionStart(e.target.value)}
                        placeholder="00:00:00"
                        className="h-9 text-xs font-mono font-bold"
                      />
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" onClick={() => adjustStartTime(-5)} className="h-6 text-[10px] px-1.5">
                          -5s
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => adjustStartTime(-1)} className="h-6 text-[10px] px-1.5">
                          -1s
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => adjustStartTime(1)} className="h-6 text-[10px] px-1.5">
                          +1s
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => adjustStartTime(5)} className="h-6 text-[10px] px-1.5">
                          +5s
                        </Button>
                      </div>
                    </div>

                    {/* Timestamp Fine */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                          <span>Punto di Fine:</span>
                          <span className="font-mono text-blue-600 dark:text-blue-400">({sectionEnd})</span>
                        </label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => duration > 0 && setSectionEnd(formatSecondsToTimestamp(duration))}
                          className="h-6 text-[10px] px-1.5"
                        >
                          Fino alla fine
                        </Button>
                      </div>
                      <Input
                        value={sectionEnd}
                        onChange={(e) => setSectionEnd(e.target.value)}
                        placeholder={duration > 0 ? formatSecondsToTimestamp(duration) : 'Fine'}
                        className="h-9 text-xs font-mono font-bold"
                      />
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" onClick={() => adjustEndTime(-5)} className="h-6 text-[10px] px-1.5">
                          -5s
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => adjustEndTime(-1)} className="h-6 text-[10px] px-1.5">
                          -1s
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => adjustEndTime(1)} className="h-6 text-[10px] px-1.5">
                          +1s
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => adjustEndTime(5)} className="h-6 text-[10px] px-1.5">
                          +5s
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Summary Banner of the Clip */}
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-800 flex items-center justify-between dark:border-emerald-800/80 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <div className="flex items-center gap-2">
                      <Scissors className="h-4 w-4 shrink-0" />
                      <span>
                        Spezzone selezionato: da <strong>{sectionStart}</strong> a <strong>{sectionEnd}</strong>{' '}
                        (Durata totale clip: <strong>{formatDuration(clipDuration)}</strong>)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSectionStart('00:00:00')
                        if (duration > 0) setSectionEnd(formatSecondsToTimestamp(duration))
                      }}
                      className="h-6 text-[10px] px-2 text-emerald-800 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                    >
                      Resetta a Video Intero
                    </Button>
                  </div>
                </div>

                {/* Capitoli rilevati con click per impostare il taglio */}
                {metadata?.chapters && metadata.chapters.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        Oppure Seleziona un Capitolo Rilevato ({metadata.chapters.length})
                      </span>
                      <Switch
                        checked={splitChapters}
                        onChange={setSplitChapters}
                        label="Dividi in file separati per capitolo"
                      />
                    </div>

                    <div className="max-h-44 overflow-y-auto rounded-lg border border-zinc-200 bg-white divide-y divide-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:divide-zinc-800">
                      {metadata.chapters.map((ch, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 hover:bg-zinc-50 transition-colors text-xs dark:hover:bg-zinc-900/60"
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
                              Taglia Questo Capitolo
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Sottotitoli */}
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
                  <option value="ass">ASS (Advanced SubStation Alpha)</option>
                  <option value="lrc">LRC (Testo sincronizzato)</option>
                  <option value="none">Formato originale</option>
                </select>
              </div>
            </div>

            <Switch
              checked={autoSubtitles}
              onChange={setAutoSubtitles}
              label="Includi sottotitoli generati automaticamente (Auto-sub AI)"
              description="Scarica le trascrizioni automatiche se i sottotitoli manuali non sono disponibili"
            />

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

        {/* Tab 3: SponsorBlock */}
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

        {/* Tab 4: Playlist (if metadata is playlist) */}
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

        {/* Tab 5: Rete & Avanzate */}
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
