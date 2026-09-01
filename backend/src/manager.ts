import { spawn, execFile, ChildProcess } from 'child_process'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { configManager } from './config.js'
import { resolveYtDlpPath } from './ytdlp.js'
import { resolveFFmpegPath } from './ffmpeg.js'
import { buildArguments, DownloadOptions } from './builder.js'
import { parseLine } from './parser.js'
import { storageManager, StoredJob } from './storage.js'
import { Metadata } from './extractor.js'
import { scanLibrary, renameMediaFile } from './system.js'

export type JobStatus =
  | 'queued'
  | 'preparing'
  | 'downloading'
  | 'postprocessing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused'

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

export type EventType =
  | 'job_added'
  | 'job_updated'
  | 'job_progress'
  | 'job_completed'
  | 'job_failed'
  | 'job_cancelled'
  | 'job_removed'
  | 'job_log'
  | 'system_status'

type BroadcastFn = (type: EventType, payload: any) => void

export class DownloadManager {
  private jobs: Map<string, Job> = new Map()
  private processes: Map<string, ChildProcess> = new Map()
  private queue: string[] = []
  private activeCount = 0
  private lastUpdate: Map<string, number> = new Map()
  private lastPercent: Map<string, number> = new Map()
  private broadcaster: BroadcastFn | null = null

  constructor() {
    this.restoreFromStorage()
  }

  public setBroadcaster(fn: BroadcastFn) {
    this.broadcaster = fn
  }

  private broadcast(type: EventType, payload: any) {
    if (this.broadcaster) {
      this.broadcaster(type, payload)
    }
  }

  private restoreFromStorage() {
    const stored = storageManager.getAllJobs()
    for (const sj of stored) {
      let status = sj.status as JobStatus
      if (status === 'downloading' || status === 'preparing' || status === 'postprocessing') {
        status = 'failed'
      }

      let fileExists = false
      if (sj.outputFile && fs.existsSync(sj.outputFile)) {
        fileExists = true
      } else if (Array.isArray(sj.files) && sj.files.some((f) => f && fs.existsSync(f))) {
        fileExists = true
      }

      // Automatically prune phantom records from storage so they never reappear
      if (!fileExists) {
        storageManager.deleteJob(sj.id)
        continue
      }

      this.jobs.set(sj.id, {
        id: sj.id,
        url: sj.url,
        title: sj.title,
        thumbnail: sj.thumbnail,
        duration: sj.duration,
        durationString: sj.durationString,
        uploader: sj.uploader,
        status: 'completed',
        stage: 'Completed',
        percent: 100,
        speed: 0,
        speedStr: '',
        eta: 0,
        etaStr: '',
        downloadedBytes: sj.downloadedBytes,
        totalBytes: sj.totalBytes,
        outputFile: sj.outputFile,
        files: sj.files || [],
        fileExists: true,
        options: sj.options,
        logs: [],
        errorMessage: sj.errorMessage,
        createdAt: sj.createdAt,
        completedAt: sj.completedAt,
      })
    }
  }

  public addJob(opts: DownloadOptions, meta?: Metadata): Job {
    const id = `job-${crypto.randomBytes(6).toString('hex')}`

    let title = opts.url
    let thumbnail = ''
    let duration = 0
    let durationString = ''
    let uploader = ''

    if (meta) {
      if (meta.title) title = meta.title
      thumbnail = meta.thumbnail || ''
      duration = meta.duration || 0
      durationString = meta.duration_string || ''
      uploader = meta.uploader || ''
    }

    const job: Job = {
      id,
      url: opts.url,
      title,
      thumbnail,
      duration,
      durationString,
      uploader,
      status: 'queued',
      stage: 'Queued in download list',
      percent: 0,
      speed: 0,
      speedStr: '',
      eta: 0,
      etaStr: '',
      downloadedBytes: 0,
      totalBytes: 0,
      outputFile: '',
      files: [],
      options: opts,
      logs: [],
      createdAt: new Date().toISOString(),
      retryCount: 0,
    }

    this.jobs.set(id, job)
    this.queue.push(id)

    this.broadcast('job_added', job)
    this.processQueue()

    return job
  }

  private processQueue() {
    const cfg = configManager.get()
    const maxConcurrent = cfg.maxConcurrentDownloads || 3

    while (this.activeCount < maxConcurrent && this.queue.length > 0) {
      const nextId = this.queue.shift()!
      const job = this.jobs.get(nextId)
      if (job && job.status === 'queued') {
        this.activeCount++
        this.executeJob(job)
      }
    }
  }

  private executeJob(job: Job) {
    const cfg = configManager.get()
    const binaryPath = resolveYtDlpPath(cfg.ytDlpPath)

    if (!binaryPath) {
      job.status = 'failed'
      job.errorMessage = 'yt-dlp executable not found'
      job.stage = 'Failed'
      this.broadcast('job_failed', job)
      this.persistJob(job)
      this.activeCount--
      this.processQueue()
      return
    }

    job.status = 'downloading'
    job.stage = 'Preparing download...'
    job.startedAt = new Date().toISOString()
    this.broadcast('job_updated', job)

    const args = buildArguments(job.options, cfg)

    const child = spawn(binaryPath, args, {
      windowsHide: true,
    })

    this.processes.set(job.id, child)

    // Handle stdout with real-time lines
    if (child.stdout) {
      const rlOut = readline.createInterface({ input: child.stdout })
      rlOut.on('line', (line) => {
        this.handleOutputLine(job, line, false)
      })
    }

    // Handle stderr
    if (child.stderr) {
      const rlErr = readline.createInterface({ input: child.stderr })
      rlErr.on('line', (line) => {
        this.handleOutputLine(job, line, true)
      })
    }

    child.on('close', async (code, signal) => {
      this.processes.delete(job.id)
      this.activeCount--
      job.completedAt = new Date().toISOString()

      if (signal === 'SIGINT' || signal === 'SIGTERM' || job.status === 'cancelled') {
        job.status = 'cancelled'
        job.stage = 'Aborted by user'
        this.broadcast('job_cancelled', job)
      } else if (code !== 0) {
        job.status = 'failed'
        if (!job.errorMessage) {
          job.errorMessage = `Download ended with exit code ${code}`
        }
        job.stage = 'Failed'
        this.broadcast('job_failed', job)
      } else {
        job.status = 'completed'
        job.percent = 100
        job.stage = 'Finished successfully'
        job.speedStr = ''
        job.etaStr = '00:00'

        // Clean up leftover intermediate fragment files (.f*.mp4, .f*.m4a)
        await this.postDownloadCleanup(job, cfg)

        let fileExists = false
        if (job.outputFile && fs.existsSync(job.outputFile)) {
          fileExists = true
          if (!job.files.includes(job.outputFile)) {
            job.files.push(job.outputFile)
          }
        }
        job.fileExists = fileExists
        this.broadcast('job_completed', job)
      }

      // Prune any previous non-existent records
      this.clearMissingFiles()

      this.persistJob(job)
      this.processQueue()
    })

    child.on('error', (err) => {
      this.processes.delete(job.id)
      this.activeCount--
      job.status = 'failed'
      job.errorMessage = err.message
      job.stage = 'Process error'
      this.broadcast('job_failed', job)
      this.persistJob(job)
      this.processQueue()
    })
  }

  private async postDownloadCleanup(job: Job, cfg: any) {
    const downloadDir = job.options.outputFolder || cfg.downloadDir
    if (!fs.existsSync(downloadDir)) return

    try {
      const files = fs.readdirSync(downloadDir)

      // If output file is known and exists
      if (job.outputFile && fs.existsSync(job.outputFile)) {
        const baseNameWithoutExt = path.basename(job.outputFile, path.extname(job.outputFile))
        // Look for leftover .f*.mp4 or .f*.m4a intermediate streams
        for (const file of files) {
          if (file.startsWith(baseNameWithoutExt) && (file.includes('.f') || file.endsWith('.part') || file.endsWith('.ytdl'))) {
            const fullPath = path.join(downloadDir, file)
            if (fullPath !== job.outputFile && fs.existsSync(fullPath)) {
              try {
                fs.unlinkSync(fullPath)
              } catch {
                // Ignored
              }
            }
          }
        }
      } else {
        // If output file was not set, find newest media file in folder
        const mediaFiles = files
          .map((f) => ({
            name: f,
            path: path.join(downloadDir, f),
            stat: fs.statSync(path.join(downloadDir, f)),
          }))
          .filter((f) => f.stat.isFile() && !f.name.endsWith('.part') && !f.name.endsWith('.ytdl'))
          .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)

        if (mediaFiles.length > 0) {
          job.outputFile = mediaFiles[0].path
          job.files = [mediaFiles[0].path]
        }
      }
    } catch {
      // Ignored
    }
  }

  private handleOutputLine(job: Job, line: string, isErr: boolean) {
    line = line.trim()
    if (!line) return

    if (job.logs.length > 500) {
      job.logs = job.logs.slice(-450)
    }
    job.logs.push(line)

    this.broadcast('job_log', {
      jobId: job.id,
      line,
    })

    if (isErr && line.toLowerCase().includes('error:')) {
      job.errorMessage = line
    }

    const update = parseLine(line)
    if (update) {
      let percentChanged = false
      if (update.percent !== undefined && update.percent >= 0) {
        if (Math.abs(job.percent - update.percent) >= 0.2) {
          percentChanged = true
        }
        job.percent = update.percent
      }
      if (update.percentStr) {
        job.stage = `Downloading ${update.percentStr}`
      }
      if (update.downloadedBytes) job.downloadedBytes = update.downloadedBytes
      if (update.totalBytes) job.totalBytes = update.totalBytes
      if (update.speed) job.speed = update.speed
      if (update.speedStr) job.speedStr = update.speedStr
      if (update.eta) job.eta = update.eta
      if (update.etaStr) job.etaStr = update.etaStr
      if (update.stage) job.stage = update.stage
      if (update.outputFile) {
        job.outputFile = update.outputFile
        if (!job.files.includes(update.outputFile)) {
          job.files.push(update.outputFile)
        }
      }

      const now = Date.now()
      const last = this.lastUpdate.get(job.id) || 0
      // Send updates immediately when percent changes or every 50ms
      if (percentChanged || now - last > 50) {
        this.lastUpdate.set(job.id, now)
        this.broadcast('job_progress', { ...job })
      }
    }
  }

  public cancelJob(id: string): boolean {
    const job = this.jobs.get(id)
    if (!job) return false

    if (job.status === 'queued') {
      job.status = 'cancelled'
      job.stage = 'Cancelled'
      this.queue = this.queue.filter((qid) => qid !== id)
      this.broadcast('job_cancelled', job)
      this.persistJob(job)
      return true
    }

    const proc = this.processes.get(id)
    if (proc) {
      job.status = 'cancelled'
      job.stage = 'Aborted by user'

      if (process.platform === 'win32' && proc.pid) {
        try {
          spawn('taskkill', ['/pid', String(proc.pid), '/T', '/F'])
        } catch {
          proc.kill('SIGKILL')
        }
      } else {
        try {
          proc.kill('SIGKILL')
        } catch {
          // Ignored
        }
      }

      this.processes.delete(id)
      this.activeCount--

      this.cleanupPartialFiles(job)

      this.broadcast('job_cancelled', job)
      this.persistJob(job)
      this.processQueue()
      return true
    }

    return false
  }

  public cancelAll(): number {
    let count = 0
    for (const id of Array.from(this.processes.keys())) {
      if (this.cancelJob(id)) {
        count++
      }
    }
    for (const id of [...this.queue]) {
      if (this.cancelJob(id)) {
        count++
      }
    }
    return count
  }

  private cleanupPartialFiles(job: Job) {
    if (!job.outputFile) return
    const possiblePartials = [
      `${job.outputFile}.part`,
      `${job.outputFile}.ytdl`,
      job.outputFile,
    ]
    for (const p of possiblePartials) {
      if (fs.existsSync(p)) {
        try {
          fs.unlinkSync(p)
        } catch {
          // Ignored
        }
      }
    }
  }

  public retryJob(id: string): Job | null {
    const job = this.jobs.get(id)
    if (!job) return null

    if (job.status === 'downloading' || job.status === 'preparing') {
      return null
    }

    job.status = 'queued'
    job.stage = 'Queued for retry'
    job.percent = 0
    job.downloadedBytes = 0
    job.speed = 0
    job.speedStr = ''
    job.etaStr = ''
    job.errorMessage = undefined
    job.logs = []
    job.retryCount = (job.retryCount || 0) + 1

    this.queue.push(job.id)
    this.broadcast('job_updated', job)
    this.processQueue()

    return job
  }

  public deleteJob(id: string, deleteFile = false): boolean {
    const job = this.jobs.get(id)
    if (job) {
      this.cancelJob(id)
      this.queue = this.queue.filter((qid) => qid !== id)
      this.jobs.delete(id)

      if (deleteFile) {
        if (job.files) {
          for (const f of job.files) {
            if (f && fs.existsSync(f)) {
              try {
                fs.unlinkSync(f)
              } catch {
                // Ignored
              }
            }
          }
        }
        if (job.outputFile && fs.existsSync(job.outputFile)) {
          try {
            fs.unlinkSync(job.outputFile)
          } catch {
            // Ignored
          }
        }
      }
    }

    storageManager.deleteJob(id)
    this.broadcast('job_removed', { id })
    return true
  }

  public clearCompleted() {
    for (const [id, job] of this.jobs.entries()) {
      if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
        this.jobs.delete(id)
        this.broadcast('job_removed', { id })
      }
    }
    storageManager.clearCompleted()
  }

  public clearMissingFiles(): number {
    let count = 0
    for (const [id, job] of this.jobs.entries()) {
      // Keep active running downloads
      if (
        job.status === 'downloading' ||
        job.status === 'queued' ||
        job.status === 'preparing' ||
        job.status === 'postprocessing'
      ) {
        continue
      }

      let exists = false
      if (job.outputFile && fs.existsSync(job.outputFile)) {
        exists = true
      } else if (job.files && job.files.some((f) => f && fs.existsSync(f))) {
        exists = true
      }

      if (!exists) {
        this.jobs.delete(id)
        storageManager.deleteJob(id)
        this.broadcast('job_removed', { id })
        count++
      }
    }
    return count
  }

  public renameFile(oldPath: string, newName: string): { newPath: string; newName: string } {
    const res = renameMediaFile(oldPath, newName)
    const oldNorm = path.resolve(oldPath).toLowerCase()

    for (const job of this.jobs.values()) {
      let matched = false
      if (job.outputFile && path.resolve(job.outputFile).toLowerCase() === oldNorm) {
        job.outputFile = res.newPath
        matched = true
      }
      if (Array.isArray(job.files)) {
        job.files = job.files.map((f) => {
          if (f && path.resolve(f).toLowerCase() === oldNorm) {
            matched = true
            return res.newPath
          }
          return f
        })
      }
      if (matched) {
        job.title = res.newName
        this.persistJob(job)
        this.broadcast('job_updated', job)
      }
    }

    storageManager.renameJobFile(oldPath, res.newPath)
    return res
  }

  public getAllJobs(): Job[] {
    // 1. Automatically purge any missing files from memory and storage
    this.clearMissingFiles()

    // 2. Scan downloadDir and make sure all actual media files on disk are included in card list
    const cfg = configManager.get()
    const diskFiles = scanLibrary(cfg.downloadDir)

    const jobsByPath = new Map<string, Job>()
    for (const job of this.jobs.values()) {
      if (job.outputFile) {
        jobsByPath.set(path.resolve(job.outputFile).toLowerCase(), job)
      }
      if (Array.isArray(job.files)) {
        for (const f of job.files) {
          if (f) jobsByPath.set(path.resolve(f).toLowerCase(), job)
        }
      }
    }

    for (const file of diskFiles) {
      const norm = path.resolve(file.path).toLowerCase()
      if (!jobsByPath.has(norm)) {
        const id = `file-${crypto.createHash('md5').update(norm).digest('hex').slice(0, 12)}`
        const isAudio = file.mediaType === 'audio'
        const job: Job = {
          id,
          url: '',
          title: file.name,
          thumbnail: '',
          duration: 0,
          durationString: '',
          uploader: '',
          status: 'completed',
          stage: 'Completed',
          percent: 100,
          speed: 0,
          speedStr: '',
          eta: 0,
          etaStr: '',
          downloadedBytes: file.size,
          totalBytes: file.size,
          outputFile: file.path,
          files: [file.path],
          fileExists: true,
          options: {
            url: '',
            mode: isAudio ? 'audio' : 'video',
          },
          logs: [],
          createdAt: file.modifiedAt,
          completedAt: file.modifiedAt,
        }
        this.jobs.set(id, job)
        jobsByPath.set(norm, job)
      }
    }

    const list: Job[] = Array.from(this.jobs.values())
    list.sort((a, b) => {
      const aActive = a.status === 'downloading' || a.status === 'queued' || a.status === 'preparing'
      const bActive = b.status === 'downloading' || b.status === 'queued' || b.status === 'preparing'
      if (aActive && !bActive) return -1
      if (!aActive && bActive) return 1
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    })

    return list
  }

  public getJob(id: string): Job | undefined {
    const job = this.jobs.get(id)
    if (!job) return undefined

    let fileExists = false
    if (job.outputFile && fs.existsSync(job.outputFile)) {
      fileExists = true
    } else if (Array.isArray(job.files) && job.files.some((f) => f && fs.existsSync(f))) {
      fileExists = true
    }

    return {
      ...job,
      fileExists: job.status === 'completed' ? fileExists : undefined,
    }
  }

  private persistJob(job: Job) {
    storageManager.saveJob({
      id: job.id,
      url: job.url,
      title: job.title,
      thumbnail: job.thumbnail,
      duration: job.duration,
      durationString: job.durationString,
      uploader: job.uploader,
      status: job.status,
      outputFile: job.outputFile,
      files: job.files,
      downloadedBytes: job.downloadedBytes,
      totalBytes: job.totalBytes,
      options: job.options,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      errorMessage: job.errorMessage,
    })
  }
}

export const downloadManager = new DownloadManager()
