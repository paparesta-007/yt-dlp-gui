import path from 'path'
import { Config } from './config.js'
import { resolveFFmpegPath } from './ffmpeg.js'

export interface DownloadOptions {
  url: string
  mode: 'video' | 'audio' | 'custom'
  customFilename?: string
  addDateTimeToFilename?: boolean
  outputFolder?: string
  outputTemplate?: string
  formatId?: string
  videoQuality?: string
  videoContainer?: string
  videoCodec?: 'h264' | 'h265' | 'vp9' | 'av1' | 'any'
  maxFps?: number
  recodeVideo?: string
  audioFormat?: string
  audioQuality?: string
  audioNormalize?: boolean
  audioVolume?: string
  keepVideo?: boolean
  embedMetadata?: boolean
  embedThumbnail?: boolean
  embedChapters?: boolean
  writeThumbnail?: boolean
  writeDescription?: boolean
  writeInfoJson?: boolean
  writeComments?: boolean
  downloadSubtitles?: boolean
  embedSubtitles?: boolean
  burnSubtitles?: boolean
  autoSubtitles?: boolean
  subtitleLanguages?: string
  convertSubtitles?: string
  sponsorBlockAction?: 'remove' | 'mark' | 'none'
  sponsorBlockCategories?: string[]
  splitChapters?: boolean
  sectionStart?: string
  sectionEnd?: string
  playlistItems?: string
  playlistStart?: number
  playlistEnd?: number
  playlistReverse?: boolean
  dateAfter?: string
  dateBefore?: string
  minDuration?: number
  maxDuration?: number
  maxDownloads?: number
  rateLimit?: string
  concurrentFragments?: number
  cookiesBrowser?: string
  cookiesFile?: string
  proxy?: string
  geoBypass?: boolean
  liveFromStart?: boolean
  customArgs?: string[]
}

export function parseTimeToSeconds(input?: string): number | null {
  if (!input) return null
  const trimmed = input.trim().toLowerCase()
  if (!trimmed || trimmed === 'inf' || trimmed === 'infinite' || trimmed === 'end') return null

  // Check if standard number (seconds)
  if (/^[0-9]+(?:\.[0-9]+)?$/.test(trimmed)) {
    const n = parseFloat(trimmed)
    return isNaN(n) ? null : n
  }

  // Check if hh:mm:ss or mm:ss
  const colonParts = trimmed.split(':')
  if (colonParts.length === 3) {
    const h = parseFloat(colonParts[0]) || 0
    const m = parseFloat(colonParts[1]) || 0
    const s = parseFloat(colonParts[2]) || 0
    return h * 3600 + m * 60 + s
  } else if (colonParts.length === 2) {
    const m = parseFloat(colonParts[0]) || 0
    const s = parseFloat(colonParts[1]) || 0
    return m * 60 + s
  }

  // Check unit format like 1h20m30s or 90s or 1.5m
  let total = 0
  let matched = false
  const hMatch = trimmed.match(/([0-9.]+)\s*h/)
  if (hMatch) {
    total += parseFloat(hMatch[1]) * 3600
    matched = true
  }
  const mMatch = trimmed.match(/([0-9.]+)\s*m(?:in)?/)
  if (mMatch) {
    total += parseFloat(mMatch[1]) * 60
    matched = true
  }
  const sMatch = trimmed.match(/([0-9.]+)\s*s(?:ec)?/)
  if (sMatch) {
    total += parseFloat(sMatch[1])
    matched = true
  }

  if (matched) return total
  return null
}

export function formatSecondsToTimestamp(seconds: number): string {
  if (seconds < 0 || isNaN(seconds)) return '00:00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function buildArguments(opts: DownloadOptions, cfg: Config): string[] {
  const args: string[] = []

  // Real-time progress streaming templates with newline guarantee
  args.push(
    '--newline',
    '--progress',
    '--windows-filenames',
    '--progress-template',
    'download:{"status":"downloading","downloaded_bytes":%(progress.downloaded_bytes)s,"total_bytes":%(progress.total_bytes)s,"total_bytes_estimate":%(progress.total_bytes_estimate)s,"speed":%(progress.speed)s,"eta":%(progress.eta)s,"percent":"%(progress._percent_str)s","speed_str":"%(progress._speed_str)s","eta_str":"%(progress._eta_str)s"}',
    '--progress-template',
    'postprocess:{"status":"postprocessing","postprocessor":"%(progress.postprocessor)s"}'
  )

  // FFmpeg path resolution
  const ffmpegPath = resolveFFmpegPath(cfg.ffmpegPath)
  const hasFFmpeg = !!ffmpegPath
  if (ffmpegPath) {
    args.push('--ffmpeg-location', ffmpegPath)
  }

  // Output folder & template
  const outputFolder = opts.outputFolder || cfg.downloadDir
  let outputTemplate = opts.outputTemplate || cfg.defaultOutputTemplate || '%(title)s [%(id)s].%(ext)s'

  if (opts.customFilename && opts.customFilename.trim()) {
    let clean = opts.customFilename.trim().replace(/[<>:"/\\|?*]/g, '_')
    clean = clean.replace(/\.(mp4|mkv|webm|mp3|m4a|flac|opus|wav|aac|ogg|mov|ts|m4v)$/i, '').trim()
    if (clean) {
      if (opts.addDateTimeToFilename) {
        outputTemplate = `${clean}_%(epoch>%Y-%m-%d_%H-%M-%S)s.%(ext)s`
      } else {
        outputTemplate = `${clean}.%(ext)s`
      }
    }
  } else if (opts.addDateTimeToFilename) {
    outputTemplate = '%(title)s_%(epoch>%Y-%m-%d_%H-%M-%S)s.%(ext)s'
  }

  const fullPattern = path.join(outputFolder, outputTemplate)
  args.push('-o', fullPattern)

  const container = opts.videoContainer || cfg.defaultVideoContainer || 'mp4'

  // Codec filter prefix
  let codecFilter = ''
  if (opts.videoCodec && opts.videoCodec !== 'any') {
    if (opts.videoCodec === 'h264') codecFilter = '[vcodec^=avc1]'
    else if (opts.videoCodec === 'h265') codecFilter = '[vcodec^=hev1]'
    else if (opts.videoCodec === 'vp9') codecFilter = '[vcodec^=vp9]'
    else if (opts.videoCodec === 'av1') codecFilter = '[vcodec^=av01]'
  }

  let fpsFilter = ''
  if (opts.maxFps && opts.maxFps > 0) {
    fpsFilter = `[fps<=${opts.maxFps}]`
  }

  // Mode and formats (with graceful fallback if FFmpeg is absent)
  if (opts.mode === 'audio') {
    if (hasFFmpeg) {
      args.push('-x')
      const audioFmt = opts.audioFormat || cfg.defaultAudioFormat || 'mp3'
      args.push('--audio-format', audioFmt)
      const audioQual = opts.audioQuality || cfg.defaultAudioQuality || '0'
      args.push('--audio-quality', audioQual)
      if (opts.keepVideo) {
        args.push('-k')
      }
    } else {
      // Fallback: extract best direct audio format
      args.push('-f', 'bestaudio/b')
    }
  } else if (opts.formatId) {
    if (hasFFmpeg) {
      args.push('-f', `${opts.formatId}+bestaudio/best`)
      args.push('--merge-output-format', container !== 'none' ? container : 'mp4')
      if (container && container !== 'none') {
        args.push('--remux-video', container)
      }
    } else {
      args.push('-f', opts.formatId)
    }
  } else if (opts.videoQuality && opts.videoQuality !== 'best') {
    const vFilters = `${codecFilter}${fpsFilter}[height<=${opts.videoQuality}]`
    if (hasFFmpeg) {
      args.push('-f', `bestvideo${vFilters}+bestaudio/best${vFilters}/best`)
      args.push('--merge-output-format', container !== 'none' ? container : 'mp4')
      if (container && container !== 'none') {
        args.push('--remux-video', container)
      }
    } else {
      args.push('-f', `best${vFilters}/best`)
    }
  } else {
    const vFilters = `${codecFilter}${fpsFilter}`
    if (hasFFmpeg) {
      if (vFilters) {
        args.push('-f', `bestvideo${vFilters}+bestaudio/best${vFilters}/best`)
      } else {
        args.push('-f', cfg.defaultFormat || 'bestvideo+bestaudio/best')
      }
      args.push('--merge-output-format', container !== 'none' ? container : 'mp4')
      if (container && container !== 'none') {
        args.push('--remux-video', container)
      }
    } else {
      args.push('-f', 'best/b')
    }
  }

  if (opts.mode !== 'audio' && opts.recodeVideo && opts.recodeVideo !== 'none' && hasFFmpeg) {
    args.push('--recode-video', opts.recodeVideo)
  }

  // Audio Filters (Normalization & Volume Boost)
  const audioFilters: string[] = []
  if (opts.audioNormalize && hasFFmpeg) {
    audioFilters.push('loudnorm=I=-16:TP=-1.5:LRA=11')
  }
  if (opts.audioVolume && opts.audioVolume !== '100%' && opts.audioVolume !== '1.0' && hasFFmpeg) {
    const cleanVol = opts.audioVolume.replace('%', '')
    const volRatio = parseFloat(cleanVol) > 0 ? (parseFloat(cleanVol) / 100).toFixed(2) : '1.0'
    audioFilters.push(`volume=${volRatio}`)
  }
  if (audioFilters.length > 0) {
    args.push('--postprocessor-args', `ffmpeg:-af ${audioFilters.join(',')}`)
  }

  // Subtitles
  if (opts.downloadSubtitles || opts.embedSubtitles || cfg.embedSubtitles) {
    args.push('--write-sub')
    if (opts.autoSubtitles || cfg.autoSubtitles) {
      args.push('--write-auto-sub')
    }
    const subLangs = opts.subtitleLanguages || cfg.subtitlesLanguages
    if (subLangs) {
      args.push('--sub-langs', subLangs)
    }
    if ((opts.embedSubtitles || cfg.embedSubtitles) && hasFFmpeg) {
      args.push('--embed-subs')
    }
    if (opts.convertSubtitles && opts.convertSubtitles !== 'none' && hasFFmpeg) {
      args.push('--convert-subs', opts.convertSubtitles)
    }
  }

  // Metadata & Artwork
  if (opts.embedMetadata || cfg.embedMetadata) {
    args.push('--embed-metadata')
  }
  if (opts.embedThumbnail || cfg.embedThumbnail) {
    args.push('--embed-thumbnail')
  }
  if (opts.embedChapters) {
    args.push('--embed-chapters')
  }
  if (opts.writeThumbnail) args.push('--write-thumbnail')
  if (opts.writeDescription) args.push('--write-description')
  if (opts.writeInfoJson) args.push('--write-info-json')
  if (opts.writeComments) args.push('--write-comments')

  // SponsorBlock
  const sponsorAction = opts.sponsorBlockAction || cfg.defaultSponsorBlockAction
  if (sponsorAction && sponsorAction !== 'none') {
    const cats = opts.sponsorBlockCategories || cfg.defaultSponsorBlockCategories || ['sponsor']
    const catList = cats.join(',') || 'all'
    if (sponsorAction === 'remove') {
      args.push('--sponsorblock-remove', catList)
    } else if (sponsorAction === 'mark') {
      args.push('--sponsorblock-mark', catList)
    }
  }

  // Chapters & Sections
  if (opts.splitChapters || cfg.splitChapters) {
    args.push('--split-chapters')
  }
  if (opts.sectionStart || opts.sectionEnd) {
    const startSec = parseTimeToSeconds(opts.sectionStart)
    const endSec = parseTimeToSeconds(opts.sectionEnd)

    const startStr = startSec !== null && startSec > 0 ? formatSecondsToTimestamp(startSec) : '0'
    const endStr = endSec !== null && endSec > 0 ? formatSecondsToTimestamp(endSec) : 'inf'

    if (startStr !== '0' || endStr !== 'inf') {
      args.push('--download-sections', `*${startStr}-${endStr}`)
      if (hasFFmpeg) {
        args.push('--force-keyframes-at-cuts')
      }
    }
  }

  // Live stream from beginning
  if (opts.liveFromStart) {
    args.push('--live-from-start')
  }

  // Playlists & Filters
  if (opts.playlistItems) {
    args.push('--playlist-items', opts.playlistItems)
  }
  if (opts.playlistStart && opts.playlistStart > 0) {
    args.push('--playlist-start', `${opts.playlistStart}`)
  }
  if (opts.playlistEnd && opts.playlistEnd > 0) {
    args.push('--playlist-end', `${opts.playlistEnd}`)
  }
  if (opts.playlistReverse) {
    args.push('--playlist-reverse')
  }
  if (opts.dateAfter) {
    args.push('--dateafter', opts.dateAfter)
  }
  if (opts.dateBefore) {
    args.push('--datebefore', opts.dateBefore)
  }
  if (opts.minDuration && opts.minDuration > 0) {
    args.push('--min-duration', `${opts.minDuration}`)
  }
  if (opts.maxDuration && opts.maxDuration > 0) {
    args.push('--max-duration', `${opts.maxDuration}`)
  }

  // Network & Limits
  if (opts.maxDownloads && opts.maxDownloads > 0) {
    args.push('--max-downloads', `${opts.maxDownloads}`)
  }
  if (opts.rateLimit) {
    args.push('--limit-rate', opts.rateLimit)
  }
  if (opts.concurrentFragments && opts.concurrentFragments > 1) {
    args.push('-N', `${opts.concurrentFragments}`)
  } else if (cfg.concurrentFragments && cfg.concurrentFragments > 1) {
    args.push('-N', `${cfg.concurrentFragments}`)
  }

  // Cookies & Auth
  if (opts.cookiesBrowser && opts.cookiesBrowser !== 'none') {
    args.push('--cookies-from-browser', opts.cookiesBrowser)
  } else if (cfg.cookiesBrowser && cfg.cookiesBrowser !== 'none') {
    args.push('--cookies-from-browser', cfg.cookiesBrowser)
  }
  if (opts.cookiesFile) {
    args.push('--cookies', opts.cookiesFile)
  } else if (cfg.cookiesFilePath) {
    args.push('--cookies', cfg.cookiesFilePath)
  }

  // Proxy & Geo
  if (opts.proxy) {
    args.push('--proxy', opts.proxy)
  } else if (cfg.proxy) {
    args.push('--proxy', cfg.proxy)
  }
  if (opts.geoBypass) {
    args.push('--geo-bypass')
  }

  // Additional custom CLI arguments
  if (opts.customArgs && opts.customArgs.length > 0) {
    args.push(...opts.customArgs)
  }

  // Video URL is the last argument
  args.push(opts.url)

  return args
}
