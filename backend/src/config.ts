import fs from 'fs'
import path from 'path'
import os from 'os'

export interface Config {
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

class ConfigManager {
  private configPath: string
  private dataDir: string
  private cfg: Config

  constructor() {
    const userHome = os.homedir() || '.'
    this.dataDir = path.join(userHome, '.yt-dlp-gui')
    fs.mkdirSync(this.dataDir, { recursive: true })

    const defaultDownloadDir = path.join(userHome, 'Downloads', 'yt-dlp')
    fs.mkdirSync(defaultDownloadDir, { recursive: true })

    this.configPath = path.join(this.dataDir, 'config.json')

    this.cfg = {
      downloadDir: defaultDownloadDir,
      tempDir: '',
      ytDlpPath: '',
      ffmpegPath: '',
      maxConcurrentDownloads: 3,
      defaultFormat: 'bestvideo+bestaudio/best',
      defaultVideoContainer: 'mp4',
      defaultAudioFormat: 'mp3',
      defaultAudioQuality: '0',
      defaultOutputTemplate: '%(title)s [%(id)s].%(ext)s',
      defaultSponsorBlockCategories: ['sponsor', 'intro', 'outro', 'selfpromo'],
      defaultSponsorBlockAction: 'remove',
      cookiesBrowser: 'none',
      cookiesFilePath: '',
      proxy: '',
      rateLimit: '',
      concurrentFragments: 4,
      embedMetadata: true,
      embedThumbnail: true,
      embedSubtitles: false,
      subtitlesLanguages: 'en.*,it.*,es.*,all',
      autoSubtitles: false,
      splitChapters: false,
      theme: 'dark',
      customArgs: [],
      port: 8080,
    }

    this.load()
  }

  public get(): Config {
    return { ...this.cfg }
  }

  public getDataDir(): string {
    return this.dataDir
  }

  public update(newCfg: Partial<Config>): Config {
    this.cfg = { ...this.cfg, ...newCfg }
    this.save()
    return this.get()
  }

  private load() {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf-8')
        const loaded = JSON.parse(raw)
        this.cfg = { ...this.cfg, ...loaded }
      } else {
        this.save()
      }
    } catch {
      this.save()
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.cfg, null, 2), 'utf-8')
    } catch (e) {
      console.error('Failed to save config:', e)
    }
  }
}

export const configManager = new ConfigManager()
