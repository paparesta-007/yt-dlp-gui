import { spawn } from 'child_process'
import { configManager } from './config.js'
import { resolveYtDlpPath } from './ytdlp.js'
import { resolveFFmpegPath } from './ffmpeg.js'

export type StreamType = 'muxed' | 'video_only' | 'audio_only' | 'unknown'

export interface FormatItem {
  format_id: string
  format_note?: string
  ext: string
  resolution?: string
  width?: number
  height?: number
  fps?: number
  vcodec?: string
  acodec?: string
  tbr?: number
  vbr?: number
  abr?: number
  filesize?: number
  filesize_approx?: number
  protocol?: string
  is_video: boolean
  is_audio: boolean
  is_video_only: boolean
  is_audio_only: boolean
  has_video: boolean
  has_audio: boolean
  stream_type: StreamType
  quality_label?: string
}

export interface SubtitleItem {
  language: string
  name?: string
  ext?: string
  is_auto: boolean
}

export interface ChapterItem {
  start_time: number
  end_time: number
  title: string
}

export interface PlaylistEntry {
  id: string
  title: string
  url: string
  duration?: number
  duration_string?: string
  thumbnail?: string
  uploader?: string
  index?: number
}

export interface Metadata {
  id: string
  title: string
  description?: string
  thumbnail?: string
  duration: number
  duration_string?: string
  uploader?: string
  uploader_url?: string
  channel?: string
  channel_url?: string
  upload_date?: string
  view_count?: number
  like_count?: number
  webpage_url: string
  extractor?: string
  is_playlist: boolean
  playlist_count?: number
  playlist_title?: string
  formats?: FormatItem[]
  subtitles?: SubtitleItem[]
  chapters?: ChapterItem[]
  entries?: PlaylistEntry[]
}

export interface ExtractOptions {
  url: string
  cookiesBrowser?: string
  cookiesFile?: string
  proxy?: string
  includeFormats?: boolean
  flatPlaylist?: boolean
  timeoutSeconds?: number
}

export function extractMetadata(opts: ExtractOptions): Promise<Metadata> {
  return new Promise((resolve, reject) => {
    const cfg = configManager.get()
    const binaryPath = resolveYtDlpPath(cfg.ytDlpPath)

    if (!binaryPath) {
      return reject(new Error('yt-dlp executable not found'))
    }

    const args = ['--dump-single-json', '--no-warnings', '--skip-download']

    if (opts.flatPlaylist) {
      args.push('--flat-playlist')
    }

    // Attach FFmpeg location if available
    const ffmpegPath = resolveFFmpegPath(cfg.ffmpegPath)
    if (ffmpegPath) {
      args.push('--ffmpeg-location', ffmpegPath)
    }

    // Cookies
    const cookiesBrowser = opts.cookiesBrowser || cfg.cookiesBrowser
    if (cookiesBrowser && cookiesBrowser !== 'none') {
      args.push('--cookies-from-browser', cookiesBrowser)
    } else {
      const cookiesFile = opts.cookiesFile || cfg.cookiesFilePath
      if (cookiesFile) {
        args.push('--cookies', cookiesFile)
      }
    }

    // Proxy
    const proxy = opts.proxy || cfg.proxy
    if (proxy) {
      args.push('--proxy', proxy)
    }

    args.push(opts.url)

    const child = spawn(binaryPath, args, {
      windowsHide: true,
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (d) => {
      stdout += d.toString()
    })

    child.stderr.on('data', (d) => {
      stderr += d.toString()
    })

    const timeout = setTimeout(() => {
      child.kill()
      reject(new Error('Metadata extraction timed out after 45 seconds'))
    }, (opts.timeoutSeconds || 45) * 1000)

    child.on('close', (code) => {
      clearTimeout(timeout)
      if (code !== 0) {
        return reject(new Error(stderr.trim() || `Extraction failed with exit code ${code}`))
      }

      try {
        const raw = JSON.parse(stdout)
        const result = transformRawMetadata(raw)
        resolve(result)
      } catch (e: any) {
        reject(new Error(`Failed to parse yt-dlp JSON: ${e.message}`))
      }
    })

    child.on('error', (err) => {
      clearTimeout(timeout)
      reject(err)
    })
  })
}

function transformRawMetadata(raw: any): Metadata {
  const isPlaylist = raw._type === 'playlist' || (Array.isArray(raw.entries) && raw.entries.length > 0)

  const meta: Metadata = {
    id: raw.id || '',
    title: raw.title || '',
    description: raw.description,
    thumbnail: raw.thumbnail,
    duration: raw.duration || 0,
    duration_string: raw.duration_string || (raw.duration ? formatDuration(raw.duration) : ''),
    uploader: raw.uploader,
    uploader_url: raw.uploader_url,
    channel: raw.channel,
    channel_url: raw.channel_url,
    upload_date: raw.upload_date,
    view_count: raw.view_count,
    like_count: raw.like_count,
    webpage_url: raw.webpage_url || raw.url || '',
    extractor: raw.extractor,
    is_playlist: isPlaylist,
    playlist_count: isPlaylist && raw.entries ? raw.entries.length : undefined,
    playlist_title: isPlaylist ? raw.title : undefined,
  }

  // Formats
  if (Array.isArray(raw.formats)) {
    const formats: FormatItem[] = []
    for (const rf of raw.formats) {
      const isVideo = Boolean(rf.vcodec && rf.vcodec !== 'none')
      const isAudio = Boolean(rf.acodec && rf.acodec !== 'none')
      const isVideoOnly = Boolean(isVideo && !isAudio)
      const isAudioOnly = Boolean(isAudio && !isVideo)

      let stream_type: StreamType = 'unknown'
      if (isVideo && isAudio) stream_type = 'muxed'
      else if (isVideoOnly) stream_type = 'video_only'
      else if (isAudioOnly) stream_type = 'audio_only'

      let qualityLabel = rf.resolution
      if (!qualityLabel && rf.height) {
        qualityLabel = `${rf.height}p`
      } else if (isAudioOnly && rf.abr) {
        qualityLabel = `${Math.round(rf.abr)} kbps audio`
      } else if (!qualityLabel) {
        qualityLabel = rf.ext
      }

      formats.push({
        format_id: rf.format_id,
        format_note: rf.format_note,
        ext: rf.ext,
        resolution: rf.resolution,
        width: rf.width,
        height: rf.height,
        fps: rf.fps,
        vcodec: rf.vcodec,
        acodec: rf.acodec,
        tbr: rf.tbr,
        vbr: rf.vbr,
        abr: rf.abr,
        filesize: rf.filesize,
        filesize_approx: rf.filesize_approx,
        protocol: rf.protocol,
        is_video: isVideo,
        is_audio: isAudio,
        is_video_only: isVideoOnly,
        is_audio_only: isAudioOnly,
        has_video: isVideo,
        has_audio: isAudio,
        stream_type,
        quality_label: qualityLabel,
      })
    }

    // Sort formats: video by height desc, audio by abr desc
    formats.sort((a, b) => {
      if (a.is_video && b.is_video) {
        if ((a.height || 0) !== (b.height || 0)) {
          return (b.height || 0) - (a.height || 0)
        }
        return (b.tbr || 0) - (a.tbr || 0)
      }
      if (a.is_audio_only && b.is_audio_only) {
        return (b.abr || 0) - (a.abr || 0)
      }
      return a.is_video ? -1 : 1
    })

    meta.formats = formats
  }

  // Subtitles
  const subs: SubtitleItem[] = []
  if (raw.subtitles) {
    for (const [lang, tracks] of Object.entries<any>(raw.subtitles)) {
      subs.push({
        language: lang,
        name: tracks[0]?.name || lang,
        ext: tracks[0]?.ext || 'vtt',
        is_auto: false,
      })
    }
  }
  if (raw.automatic_captions) {
    for (const [lang, tracks] of Object.entries<any>(raw.automatic_captions)) {
      subs.push({
        language: lang,
        name: (tracks[0]?.name || lang) + ' (auto)',
        ext: tracks[0]?.ext || 'vtt',
        is_auto: true,
      })
    }
  }
  meta.subtitles = subs

  // Chapters
  if (Array.isArray(raw.chapters)) {
    meta.chapters = raw.chapters.map((ch: any) => ({
      start_time: ch.start_time,
      end_time: ch.end_time,
      title: ch.title,
    }))
  }

  // Playlist Entries
  if (Array.isArray(raw.entries)) {
    meta.entries = raw.entries.map((e: any, idx: number) => ({
      id: e.id || `${idx}`,
      title: e.title || '',
      url: e.webpage_url || e.url || e.id || '',
      duration: e.duration,
      duration_string: e.duration_string || (e.duration ? formatDuration(e.duration) : ''),
      thumbnail: e.thumbnail,
      uploader: e.uploader,
      index: idx + 1,
    }))
  }

  return meta
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}
