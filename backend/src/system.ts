import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'

export interface MediaFile {
  name: string
  path: string
  size: number
  sizeFormatted: string
  modifiedAt: string
  extension: string
  mediaType: 'video' | 'audio' | 'other'
}

const videoExtensions = new Set([
  '.mp4', '.mkv', '.webm', '.mov', '.avi', '.flv', '.wmv', '.m4v', '.ts',
])

const audioExtensions = new Set([
  '.mp3', '.m4a', '.flac', '.opus', '.wav', '.aac', '.ogg', '.alac', '.wma',
])

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export function scanLibrary(dirPath: string): MediaFile[] {
  if (!dirPath || !fs.existsSync(dirPath)) {
    return []
  }

  const results: MediaFile[] = []

  function walk(currentDir: string) {
    try {
      const items = fs.readdirSync(currentDir)
      for (const item of items) {
        const fullPath = path.join(currentDir, item)
        const stat = fs.statSync(fullPath)
        if (stat.isDirectory()) {
          walk(fullPath)
        } else if (stat.isFile()) {
          const ext = path.extname(item).toLowerCase()
          let mediaType: 'video' | 'audio' | 'other' = 'other'
          if (videoExtensions.has(ext)) mediaType = 'video'
          else if (audioExtensions.has(ext)) mediaType = 'audio'
          else continue

          results.push({
            name: item,
            path: fullPath,
            size: stat.size,
            sizeFormatted: formatBytes(stat.size),
            modifiedAt: stat.mtime.toISOString(),
            extension: ext,
            mediaType,
          })
        }
      }
    } catch {
      // Ignored
    }
  }

  walk(dirPath)

  results.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime())
  return results
}

export function openInExplorer(targetPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!targetPath) return reject(new Error('Path is empty'))

    let p = targetPath
    if (!fs.existsSync(p)) {
      const parent = path.dirname(p)
      if (fs.existsSync(parent)) {
        p = parent
      } else {
        return reject(new Error(`Path not found: ${targetPath}`))
      }
    }

    const isDir = fs.statSync(p).isDirectory()

    if (process.platform === 'win32') {
      const args = isDir ? [p] : ['/select,', p]
      const child = spawn('explorer.exe', args, { detached: true, stdio: 'ignore' })
      child.unref()
      resolve()
    } else if (process.platform === 'darwin') {
      const args = isDir ? [p] : ['-R', p]
      const child = spawn('open', args, { detached: true, stdio: 'ignore' })
      child.unref()
      resolve()
    } else {
      const dir = isDir ? p : path.dirname(p)
      const child = spawn('xdg-open', [dir], { detached: true, stdio: 'ignore' })
      child.unref()
      resolve()
    }
  })
}

export function renameMediaFile(oldPath: string, newName: string): { newPath: string; newName: string } {
  if (!oldPath || !fs.existsSync(oldPath)) {
    throw new Error('Original file does not exist')
  }

  const dir = path.dirname(oldPath)
  const oldExt = path.extname(oldPath)

  // Clean the new name
  let cleanName = newName.trim().replace(/[<>:"/\\|?*]/g, '_')
  if (!cleanName) {
    throw new Error('New name cannot be empty')
  }

  // Preserve or apply extension
  const newExt = path.extname(cleanName)
  let base = cleanName
  let finalExt = oldExt
  if (newExt && (videoExtensions.has(newExt.toLowerCase()) || audioExtensions.has(newExt.toLowerCase()))) {
    finalExt = newExt
    base = cleanName.slice(0, -newExt.length)
  } else if (cleanName.endsWith(oldExt)) {
    base = cleanName.slice(0, -oldExt.length)
  }

  let finalName = `${base}${finalExt}`
  let targetPath = path.join(dir, finalName)

  // If different file exists with same name, increment counter to avoid collision
  if (path.resolve(oldPath) !== path.resolve(targetPath) && fs.existsSync(targetPath)) {
    let counter = 1
    while (fs.existsSync(path.join(dir, `${base} (${counter})${finalExt}`))) {
      counter++
    }
    finalName = `${base} (${counter})${finalExt}`
    targetPath = path.join(dir, finalName)
  }

  if (path.resolve(oldPath) !== path.resolve(targetPath)) {
    fs.renameSync(oldPath, targetPath)
  }

  return { newPath: targetPath, newName: finalName }
}
