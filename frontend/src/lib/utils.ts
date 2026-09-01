import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { FormatItem } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0 || isNaN(bytes)) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export function formatSpeed(speedBytesPerSec: number): string {
  if (!speedBytesPerSec || speedBytesPerSec <= 0) return '0 B/s'
  return `${formatBytes(speedBytesPerSec)}/s`
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function formatSecondsToTimestamp(seconds: number): string {
  if (!seconds || seconds < 0 || isNaN(seconds)) return '00:00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function formatSecondsToFriendly(seconds: number): string {
  if (!seconds || seconds <= 0) return '0 sec'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  const parts: string[] = []
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  if (s > 0 || parts.length === 0) parts.push(`${s}s`)
  return parts.join(' ')
}

export function parseTimeToSeconds(input?: string): number | null {
  if (!input) return null
  const trimmed = input.trim().toLowerCase()
  if (!trimmed || trimmed === 'inf' || trimmed === 'infinite' || trimmed === 'end') return null

  // Check if plain number (seconds)
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

export function extractYouTubeId(url: string): string | null {
  if (!url) return null
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([^#&?]*).*/
  const match = url.match(regExp)
  return match && match[2].length === 11 ? match[2] : null
}

export function formatNumber(num?: number): string {
  if (num === undefined || num === null) return '0'
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B'
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  }
  return num.toLocaleString()
}

export function formatDate(dateString?: string): string {
  if (!dateString) return ''
  try {
    const d = new Date(dateString)
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}

export function estimateVideoSize(
  formats: FormatItem[] | undefined,
  duration: number,
  quality: string = 'best'
): number {
  if (!formats || formats.length === 0) {
    if (!duration || duration <= 0) return 0
    const bitrates: Record<string, number> = {
      '2160': 15000,
      '1440': 8000,
      '1080': 3500,
      '720': 1800,
      '480': 900,
      '360': 500,
      'best': 4000,
    }
    const kbps = bitrates[quality] || 3000
    return Math.round((kbps * 1000 * duration) / 8)
  }

  // Find best audio stream
  const audioStreams = formats.filter(
    (f) => !(f.has_video ?? (f.vcodec && f.vcodec !== 'none')) && (f.has_audio ?? (f.acodec && f.acodec !== 'none'))
  )
  const bestAudio = audioStreams.sort((a, b) => (b.abr || b.filesize || 0) - (a.abr || a.filesize || 0))[0]
  let audioBytes = 0
  if (bestAudio) {
    audioBytes = bestAudio.filesize || bestAudio.filesize_approx || 0
    if (!audioBytes && bestAudio.abr && duration > 0) {
      audioBytes = Math.round((bestAudio.abr * 1000 * duration) / 8)
    }
    if (!audioBytes && duration > 0) {
      audioBytes = Math.round((128 * 1000 * duration) / 8)
    }
  }

  // Find matching video stream
  const videoStreams = formats.filter(
    (f) => f.has_video ?? (f.vcodec && f.vcodec !== 'none')
  )

  let matchingVideo: FormatItem | undefined
  if (quality === 'best') {
    matchingVideo = videoStreams.sort((a, b) => (b.height || 0) - (a.height || 0) || (b.tbr || 0) - (a.tbr || 0))[0]
  } else {
    const targetHeight = parseInt(quality, 10)
    const candidates = videoStreams.filter((f) => (f.height || 0) <= targetHeight)
    matchingVideo = candidates.sort((a, b) => (b.height || 0) - (a.height || 0) || (b.tbr || 0) - (a.tbr || 0))[0]
    if (!matchingVideo) {
      matchingVideo = videoStreams.sort((a, b) => (a.height || 0) - (b.height || 0))[0]
    }
  }

  if (!matchingVideo) return 0

  // If video is already muxed (has audio)
  const isMuxed = matchingVideo.has_audio ?? (matchingVideo.acodec && matchingVideo.acodec !== 'none')
  let videoBytes = matchingVideo.filesize || matchingVideo.filesize_approx || 0
  if (!videoBytes && (matchingVideo.vbr || matchingVideo.tbr) && duration > 0) {
    const br = matchingVideo.vbr || matchingVideo.tbr || 2000
    videoBytes = Math.round((br * 1000 * duration) / 8)
  }

  if (isMuxed) {
    return videoBytes || Math.round((2500 * 1000 * (duration || 60)) / 8)
  }

  return (videoBytes || Math.round((2000 * 1000 * (duration || 60)) / 8)) + audioBytes
}

export function estimateAudioSize(
  formats: FormatItem[] | undefined,
  duration: number,
  audioFormat: string = 'mp3',
  audioQuality: string = '0'
): number {
  if (!duration || duration <= 0) duration = 180

  let kbps = 160
  if (audioQuality === '320k') kbps = 320
  else if (audioQuality === '256k') kbps = 256
  else if (audioQuality === '192k') kbps = 192
  else if (audioQuality === '128k') kbps = 128
  else if (audioFormat === 'flac') kbps = 750
  else if (audioFormat === 'wav') kbps = 1411
  else if (audioFormat === 'opus') kbps = 160
  else if (audioFormat === 'm4a') kbps = 192

  if (formats && formats.length > 0) {
    const audioStreams = formats.filter(
      (f) => !(f.has_video ?? (f.vcodec && f.vcodec !== 'none')) && (f.has_audio ?? (f.acodec && f.acodec !== 'none'))
    )
    const best = audioStreams.sort((a, b) => (b.abr || 0) - (a.abr || 0))[0]
    if (best && (audioQuality === '0' || audioFormat === best.ext)) {
      if (best.filesize) return best.filesize
      if (best.filesize_approx) return best.filesize_approx
      if (best.abr) kbps = best.abr
    }
  }

  return Math.round((kbps * 1000 * duration) / 8)
}
