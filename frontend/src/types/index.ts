export type JobStatus =
  | 'queued'
  | 'preparing'
  | 'downloading'
  | 'postprocessing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused'

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

export interface Job {
  id: string
  url: string
  title: string
  thumbnail: string
  duration: number
  durationString: string
  uploader: string
  status: JobStatus
  stage: string
  percent: number
  speed: number
  speedStr: string
  eta: number
  etaStr: string
  downloadedBytes: number
  totalBytes: number
  outputFile: string
  files: string[]
  fileExists?: boolean
  options: DownloadOptions
  logs: string[]
  errorMessage?: string
  createdAt: string
  startedAt?: string
  completedAt?: string
  isPlaylist?: boolean
  playlistIndex?: number
  playlistTotal?: number
  retryCount?: number
}

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
  has_video?: boolean
  has_audio?: boolean
  stream_type?: StreamType
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
  durationString?: string
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

export interface Preset {
  id: string
  name: string
  description: string
  icon: string
  isBuiltin: boolean
  options: DownloadOptions
  createdAt: string
}

export interface Settings {
  downloadDir: string
  tempDir: string
  ytDlpPath: string
  ffmpegPath: string
  maxConcurrentDownloads: number
  defaultFormat: string
  defaultVideoContainer: string
  defaultAudioFormat: string
  defaultAudioQuality: string
  defaultOutputTemplate: string
  defaultSponsorBlockCategories: string[]
  defaultSponsorBlockAction: 'remove' | 'mark' | 'none'
  cookiesBrowser: string
  cookiesFilePath: string
  proxy: string
  rateLimit: string
  concurrentFragments: number
  embedMetadata: boolean
  embedThumbnail: boolean
  embedSubtitles: boolean
  subtitlesLanguages: string
  autoSubtitles: boolean
  splitChapters: boolean
  theme: string
  customArgs: string[]
  port: number
}

export interface SystemStatus {
  os: string
  ytDlpPath: string
  ytDlpVer: string
  ytDlpValid: boolean
  ffmpegPath: string
  ffmpegVer: string
  ffmpegValid: boolean
  downloadDir: string
}

export interface MediaFile {
  name: string
  path: string
  size: number
  sizeFormatted: string
  modifiedAt: string
  extension: string
  mediaType: 'video' | 'audio' | 'other'
}

export type WSEventType =
  | 'job_added'
  | 'job_updated'
  | 'job_progress'
  | 'job_completed'
  | 'job_failed'
  | 'job_cancelled'
  | 'job_removed'
  | 'job_log'
  | 'system_status'

export interface WSMessage<T = any> {
  type: WSEventType
  payload: T
}

export interface SearchResultItem {
  id: string
  title: string
  url: string
  thumbnail?: string
  duration?: number
  duration_string?: string
  uploader?: string
  channel?: string
  view_count?: number
  upload_date?: string
}
