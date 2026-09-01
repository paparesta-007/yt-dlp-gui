import { execSync, spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { configManager } from './config.js'

export interface FFmpegInfo {
  available: boolean
  path: string
  version: string
}

let cachedFFmpeg: FFmpegInfo | null = null

function findWinGetFFmpeg(): string | null {
  const localAppData = process.env.LOCALAPPDATA
  if (!localAppData) return null

  // 1. Direct winget links
  const linksPath = path.join(localAppData, 'Microsoft', 'WinGet', 'Links', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg')
  if (fs.existsSync(linksPath)) return linksPath

  const wingetPackages = path.join(localAppData, 'Microsoft', 'WinGet', 'Packages')
  if (!fs.existsSync(wingetPackages)) return null

  try {
    const entries = fs.readdirSync(wingetPackages)
    for (const entry of entries) {
      if (entry.toLowerCase().includes('ffmpeg')) {
        const fullDir = path.join(wingetPackages, entry)
        // Check direct or bin/ffmpeg.exe or nested directory
        const directExe = path.join(fullDir, 'bin', 'ffmpeg.exe')
        if (fs.existsSync(directExe)) return directExe

        // Check 1 level deeper
        const subEntries = fs.readdirSync(fullDir)
        for (const sub of subEntries) {
          const nestedExe = path.join(fullDir, sub, 'bin', 'ffmpeg.exe')
          if (fs.existsSync(nestedExe)) return nestedExe
          const directSub = path.join(fullDir, sub, 'ffmpeg.exe')
          if (fs.existsSync(directSub)) return directSub
        }
      }
    }
  } catch {
    // Ignored
  }

  return null
}

export function resolveFFmpegPath(customPath?: string): string | null {
  if (customPath && fs.existsSync(customPath)) {
    return customPath
  }

  const isWin = process.platform === 'win32'
  const execName = isWin ? 'ffmpeg.exe' : 'ffmpeg'

  // 1. Check AppData bin directory (.yt-dlp-gui/bin/ffmpeg.exe)
  try {
    const dataDir = configManager.getDataDir()
    const appDataBinary = path.join(dataDir, 'bin', execName)
    if (fs.existsSync(appDataBinary)) {
      return appDataBinary
    }
  } catch {
    // Ignored
  }

  // 2. Check WinGet packages on Windows
  if (isWin) {
    const wingetPath = findWinGetFFmpeg()
    if (wingetPath && fs.existsSync(wingetPath)) {
      return wingetPath
    }
  }

  // 2. Common Windows paths
  if (isWin) {
    const commonPaths = [
      'C:\\ffmpeg\\bin\\ffmpeg.exe',
      'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
      'C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe',
      'C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'ffmpeg', 'bin', 'ffmpeg.exe'),
    ]
    for (const p of commonPaths) {
      if (fs.existsSync(p)) return p
    }
  }

  // 3. Check relative / project bin paths
  const localCandidates = [
    path.join('bin', execName),
    path.join('..', 'bin', execName),
    path.join('backend', 'bin', execName),
    path.join('..', 'backend', 'bin', execName),
  ]
  for (const cand of localCandidates) {
    if (fs.existsSync(cand)) {
      return path.resolve(cand)
    }
  }

  // 4. Try standard where / which command
  try {
    const cmd = isWin ? `where ${execName}` : `which ${execName}`
    const output = execSync(cmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
    const firstLine = output.split(/[\r\n]+/)[0]?.trim()
    if (firstLine && fs.existsSync(firstLine)) {
      return firstLine
    }
  } catch {
    // Ignored
  }

  return null
}

export function detectFFmpeg(customPath?: string): FFmpegInfo {
  const binaryPath = resolveFFmpegPath(customPath)
  if (!binaryPath) {
    cachedFFmpeg = {
      available: false,
      path: '',
      version: '',
    }
    return cachedFFmpeg
  }

  let version = 'unknown'
  try {
    const res = spawnSync(binaryPath, ['-version'], {
      encoding: 'utf-8',
      timeout: 5000,
    })
    const out = res.stdout || res.stderr || ''
    const match = out.match(/ffmpeg version ([^\s]+)/i)
    if (match && match[1]) {
      version = match[1]
    } else {
      const line = out.split(/[\r\n]+/)[0]?.trim()
      if (line) version = line
    }
  } catch {
    // Ignored
  }

  cachedFFmpeg = {
    available: true,
    path: binaryPath,
    version,
  }
  return cachedFFmpeg
}
