import { execSync, spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import https from 'https'
import http from 'http'
import { configManager } from './config.js'

export interface YtDlpInfo {
  available: boolean
  path: string
  version: string
  executable: string
}

export function getExecutableName(): string {
  return process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
}

export function resolveYtDlpPath(customPath?: string): string | null {
  if (customPath && fs.existsSync(customPath)) {
    return customPath
  }

  const execName = getExecutableName()

  // 1. Check relative project candidates
  const candidates = [
    execName,
    path.join('bin', execName),
    path.join('backend', 'bin', execName),
    path.join('..', execName),
    path.join('..', 'bin', execName),
    path.join('..', 'backend', 'bin', execName),
  ]

  for (const cand of candidates) {
    if (fs.existsSync(cand)) {
      return path.resolve(cand)
    }
  }

  // 2. Check AppData directory
  const dataDir = configManager.getDataDir()
  const appDataBinary = path.join(dataDir, 'bin', execName)
  if (fs.existsSync(appDataBinary)) {
    return appDataBinary
  }

  // 3. Check system PATH
  try {
    const isWin = process.platform === 'win32'
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

export function detectYtDlp(customPath?: string): YtDlpInfo {
  const binaryPath = resolveYtDlpPath(customPath)
  if (!binaryPath) {
    return {
      available: false,
      path: '',
      version: '',
      executable: getExecutableName(),
    }
  }

  let version = 'unknown'
  try {
    const res = spawnSync(binaryPath, ['--version'], {
      encoding: 'utf-8',
      timeout: 5000,
    })
    version = (res.stdout || '').trim() || 'unknown'
  } catch {
    // Ignored
  }

  return {
    available: true,
    path: binaryPath,
    version,
    executable: getExecutableName(),
  }
}

export function updateYtDlp(customPath?: string): Promise<{ message: string; output: string }> {
  return new Promise((resolve, reject) => {
    const binaryPath = resolveYtDlpPath(customPath)
    if (!binaryPath) {
      return reject(new Error('yt-dlp executable not found'))
    }

    try {
      const res = spawnSync(binaryPath, ['-U'], {
        encoding: 'utf-8',
        timeout: 60000,
      })
      const output = (res.stdout || res.stderr || '').trim()
      resolve({
        message: 'yt-dlp update executed',
        output,
      })
    } catch (e: any) {
      reject(new Error(`Update failed: ${e.message}`))
    }
  })
}

export function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath)

    const request = (targetUrl: string) => {
      const client = targetUrl.startsWith('https') ? https : http
      client
        .get(targetUrl, (res) => {
          // Follow redirect
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return request(res.headers.location)
          }

          if (res.statusCode !== 200) {
            file.close()
            fs.unlink(destPath, () => {})
            return reject(new Error(`Download failed with HTTP ${res.statusCode}`))
          }

          res.pipe(file)

          file.on('finish', () => {
            file.close(() => resolve())
          })
        })
        .on('error', (err) => {
          file.close()
          fs.unlink(destPath, () => {})
          reject(err)
        })
    }

    request(url)
  })
}

export async function installLatestYtDlp(): Promise<string> {
  const isWin = process.platform === 'win32'
  const isMac = process.platform === 'darwin'
  const execName = getExecutableName()

  let downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp'
  if (isWin) {
    downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
  } else if (isMac) {
    downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos'
  }

  const dataDir = configManager.getDataDir()
  const binDir = path.join(dataDir, 'bin')
  fs.mkdirSync(binDir, { recursive: true })

  const targetPath = path.join(binDir, execName)
  const tempPath = targetPath + '.tmp'

  await downloadFile(downloadUrl, tempPath)

  if (fs.existsSync(targetPath)) {
    try {
      fs.unlinkSync(targetPath)
    } catch {
      // Ignored
    }
  }

  fs.renameSync(tempPath, targetPath)

  if (!isWin) {
    fs.chmodSync(targetPath, 0o755)
  }

  return targetPath
}
