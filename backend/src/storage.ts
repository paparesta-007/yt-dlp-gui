import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { configManager } from './config.js'
import { DownloadOptions } from './builder.js'

export interface Preset {
  id: string
  name: string
  description: string
  icon: string
  isBuiltin: boolean
  options: DownloadOptions
  createdAt: string
}

export interface StoredJob {
  id: string
  url: string
  title: string
  thumbnail: string
  duration: number
  durationString: string
  uploader: string
  status: string
  outputFile: string
  files: string[]
  downloadedBytes: number
  totalBytes: number
  options: DownloadOptions
  createdAt: string
  completedAt?: string
  errorMessage?: string
}

class StorageManager {
  private historyPath: string
  private presetsPath: string
  private jobs: Map<string, StoredJob> = new Map()
  private presets: Map<string, Preset> = new Map()

  constructor() {
    const dataDir = configManager.getDataDir()
    this.historyPath = path.join(dataDir, 'history.json')
    this.presetsPath = path.join(dataDir, 'presets.json')
    this.load()
  }

  private load() {
    // History - only keep jobs whose files actually exist on disk
    try {
      if (fs.existsSync(this.historyPath)) {
        const raw = fs.readFileSync(this.historyPath, 'utf-8')
        const list: StoredJob[] = JSON.parse(raw)
        for (const j of list) {
          const fileExists =
            (j.outputFile && fs.existsSync(j.outputFile)) ||
            (Array.isArray(j.files) && j.files.some((f) => f && fs.existsSync(f)))

          if (!fileExists) {
            continue
          }

          this.jobs.set(j.id, j)
        }
        this.saveHistory()
      }
    } catch {
      // Ignored
    }

    // Presets
    try {
      if (fs.existsSync(this.presetsPath)) {
        const raw = fs.readFileSync(this.presetsPath, 'utf-8')
        const list: Preset[] = JSON.parse(raw)
        for (const p of list) {
          this.presets.set(p.id, p)
        }
      }
    } catch {
      // Ignored
    }

    if (this.presets.size === 0) {
      this.seedDefaultPresets()
    }
  }

  private seedDefaultPresets() {
    const defaults: Preset[] = [
      {
        id: 'preset-best-video',
        name: 'Best Quality Video (4K/HD)',
        description: 'Downloads the highest available video & audio, remuxed to MP4 with embedded metadata and thumbnail',
        icon: 'film',
        isBuiltin: true,
        options: {
          url: '',
          mode: 'video',
          videoQuality: 'best',
          videoContainer: 'mp4',
          embedMetadata: true,
          embedThumbnail: true,
          embedChapters: true,
          sponsorBlockAction: 'remove',
        },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'preset-1080p-mp4',
        name: 'Standard 1080p MP4',
        description: 'Maximum 1080p Full HD MP4 for broad compatibility and fast download speeds',
        icon: 'monitor',
        isBuiltin: true,
        options: {
          url: '',
          mode: 'video',
          videoQuality: '1080',
          videoContainer: 'mp4',
          embedMetadata: true,
          embedThumbnail: true,
        },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'preset-mp3-hq',
        name: 'High Quality MP3 (320 kbps)',
        description: 'Extracts audio converted to 320 kbps MP3 with album art and ID3 metadata tags',
        icon: 'music',
        isBuiltin: true,
        options: {
          url: '',
          mode: 'audio',
          audioFormat: 'mp3',
          audioQuality: '320k',
          embedMetadata: true,
          embedThumbnail: true,
        },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'preset-flac-lossless',
        name: 'Lossless Audio (FLAC)',
        description: 'Extracts pristine lossless FLAC audio with high resolution embedded metadata',
        icon: 'disc',
        isBuiltin: true,
        options: {
          url: '',
          mode: 'audio',
          audioFormat: 'flac',
          audioQuality: '0',
          embedMetadata: true,
          embedThumbnail: true,
        },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'preset-archival-mkv',
        name: 'Full Archival MKV',
        description: 'Preserves all subtitles, auto-subs, original streams, chapters, and metadata in an MKV container',
        icon: 'archive',
        isBuiltin: true,
        options: {
          url: '',
          mode: 'video',
          videoQuality: 'best',
          videoContainer: 'mkv',
          embedMetadata: true,
          embedThumbnail: true,
          embedChapters: true,
          embedSubtitles: true,
          autoSubtitles: true,
          subtitleLanguages: 'all',
          sponsorBlockAction: 'mark',
        },
        createdAt: new Date().toISOString(),
      },
    ]

    for (const d of defaults) {
      this.presets.set(d.id, d)
    }
    this.savePresets()
  }

  public saveJob(job: StoredJob) {
    this.jobs.set(job.id, job)
    this.saveHistory()
  }

  public deleteJob(id: string) {
    this.jobs.delete(id)
    this.saveHistory()
  }

  public renameJobFile(oldPath: string, newPath: string) {
    const oldNorm = path.resolve(oldPath).toLowerCase()
    const newName = path.basename(newPath)
    for (const job of this.jobs.values()) {
      let matched = false
      if (job.outputFile && path.resolve(job.outputFile).toLowerCase() === oldNorm) {
        job.outputFile = newPath
        matched = true
      }
      if (Array.isArray(job.files)) {
        job.files = job.files.map((f) => {
          if (f && path.resolve(f).toLowerCase() === oldNorm) {
            matched = true
            return newPath
          }
          return f
        })
      }
      if (matched) {
        job.title = newName
      }
    }
    this.saveHistory()
  }

  public clearCompleted() {
    for (const [id, job] of this.jobs.entries()) {
      if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
        this.jobs.delete(id)
      }
    }
    this.saveHistory()
  }

  public getAllJobs(): StoredJob[] {
    return Array.from(this.jobs.values())
  }

  public getPresets(): Preset[] {
    return Array.from(this.presets.values())
  }

  public savePreset(preset: Partial<Preset>): Preset {
    const id = preset.id || `preset-${crypto.randomBytes(4).toString('hex')}`
    const full: Preset = {
      id,
      name: preset.name || 'Custom Preset',
      description: preset.description || '',
      icon: preset.icon || 'sparkles',
      isBuiltin: Boolean(preset.isBuiltin),
      options: preset.options || { url: '', mode: 'video' },
      createdAt: preset.createdAt || new Date().toISOString(),
    }
    this.presets.set(id, full)
    this.savePresets()
    return full
  }

  public deletePreset(id: string): boolean {
    const p = this.presets.get(id)
    if (!p || p.isBuiltin) return false
    this.presets.delete(id)
    this.savePresets()
    return true
  }

  private saveHistory() {
    try {
      const list = Array.from(this.jobs.values())
      fs.writeFileSync(this.historyPath, JSON.stringify(list, null, 2), 'utf-8')
    } catch {
      // Ignored
    }
  }

  private savePresets() {
    try {
      const list = Array.from(this.presets.values())
      fs.writeFileSync(this.presetsPath, JSON.stringify(list, null, 2), 'utf-8')
    } catch {
      // Ignored
    }
  }
}

export const storageManager = new StorageManager()
