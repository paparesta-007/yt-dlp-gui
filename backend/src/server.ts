import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import fastifyStatic from '@fastify/static'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { configManager } from './config.js'
import { detectYtDlp, installLatestYtDlp, updateYtDlp } from './ytdlp.js'
import { detectFFmpeg } from './ffmpeg.js'
import { extractMetadata } from './extractor.js'
import { downloadManager } from './manager.js'
import { storageManager } from './storage.js'
import { scanLibrary, openInExplorer } from './system.js'
import { DownloadOptions } from './builder.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..', '..')

const server = Fastify({
  logger: false,
  bodyLimit: 64 * 1024 * 1024,
})

// Support empty bodies and various content types without 415 errors
server.addContentTypeParser('*', { parseAs: 'string' }, (req, body, done) => {
  if (!body || (typeof body === 'string' && !body.trim())) {
    return done(null, {})
  }
  try {
    const json = JSON.parse(body as string)
    done(null, json)
  } catch {
    done(null, {})
  }
})

// CORS
await server.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
})

// WebSockets
await server.register(websocket)

// Connected WebSocket clients
const clients = new Set<any>()

server.get('/ws', { websocket: true }, (socket) => {
  clients.add(socket)

  socket.on('close', () => {
    clients.delete(socket)
  })

  socket.on('error', () => {
    clients.delete(socket)
  })
})

// Wire DownloadManager to broadcast to WebSocket clients
downloadManager.setBroadcaster((type, payload) => {
  const msg = JSON.stringify({ type, payload })
  for (const client of clients) {
    try {
      if (client.readyState === 1) {
        client.send(msg)
      }
    } catch {
      // Ignored
    }
  }
})

// System status
server.get('/api/system/status', async () => {
  const cfg = configManager.get()
  const ytDlp = detectYtDlp(cfg.ytDlpPath)
  const ffmpeg = detectFFmpeg(cfg.ffmpegPath)

  return {
    os: process.platform,
    ytDlpPath: ytDlp.path,
    ytDlpVer: ytDlp.version,
    ytDlpValid: ytDlp.available,
    ffmpegPath: ffmpeg.path,
    ffmpegVer: ffmpeg.version,
    ffmpegValid: ffmpeg.available,
    downloadDir: cfg.downloadDir,
  }
})

server.post('/api/system/yt-dlp/update', async (req, reply) => {
  const cfg = configManager.get()
  try {
    const res = await updateYtDlp(cfg.ytDlpPath)
    return res
  } catch (err: any) {
    reply.status(500)
    return { error: err.message }
  }
})

server.post('/api/system/yt-dlp/install', async (req, reply) => {
  try {
    const installedPath = await installLatestYtDlp()
    return {
      message: 'yt-dlp installed successfully',
      path: installedPath,
    }
  } catch (err: any) {
    reply.status(500)
    return { error: err.message }
  }
})

// Metadata Extraction
interface InfoBody {
  url?: string
  cookiesBrowser?: string
  cookiesFile?: string
  proxy?: string
  includeFormats?: boolean
  flatPlaylist?: boolean
}

server.post<{ Body: InfoBody }>('/api/info', async (req, reply) => {
  const { url, cookiesBrowser, cookiesFile, proxy, includeFormats, flatPlaylist } = req.body || {}
  if (!url || !url.trim()) {
    reply.status(400)
    return { error: 'url is required' }
  }

  try {
    const data = await extractMetadata({
      url: url.trim(),
      cookiesBrowser,
      cookiesFile,
      proxy,
      includeFormats,
      flatPlaylist,
    })
    return data
  } catch (err: any) {
    reply.status(500)
    return { error: err.message || 'Failed to inspect metadata' }
  }
})

// Downloads
server.get('/api/downloads', async () => {
  return downloadManager.getAllJobs()
})

server.post<{ Body: DownloadOptions }>('/api/downloads', async (req, reply) => {
  const options = req.body
  if (!options || !options.url || !options.url.trim()) {
    reply.status(400)
    return { error: 'url is required' }
  }

  const job = downloadManager.addJob(options)
  return job
})

interface BatchBody {
  items?: DownloadOptions[]
  urls?: string[]
  options?: DownloadOptions
}

server.post<{ Body: BatchBody }>('/api/downloads/batch', async (req) => {
  const { items, urls, options } = req.body || {}
  const created: any[] = []

  if (Array.isArray(items)) {
    for (const item of items) {
      if (item && item.url) {
        created.push(downloadManager.addJob(item))
      }
    }
  } else if (Array.isArray(urls) && options) {
    for (const u of urls) {
      if (u && typeof u === 'string' && u.trim()) {
        created.push(downloadManager.addJob({ ...options, url: u.trim() }))
      }
    }
  }

  return {
    count: created.length,
    jobs: created,
  }
})

server.get<{ Params: { id: string } }>('/api/downloads/:id', async (req, reply) => {
  const job = downloadManager.getJob(req.params.id)
  if (!job) {
    reply.status(404)
    return { error: 'job not found' }
  }
  return job
})

server.post<{ Params: { id: string } }>('/api/downloads/:id/cancel', async (req, reply) => {
  const ok = downloadManager.cancelJob(req.params.id)
  if (!ok) {
    reply.status(400)
    return { error: 'unable to cancel job' }
  }
  return { message: 'job cancelled' }
})

server.post('/api/downloads/cancel-all', async () => {
  const count = downloadManager.cancelAll()
  return { message: `cancelled ${count} jobs`, count }
})

server.post<{ Params: { id: string } }>('/api/downloads/:id/retry', async (req, reply) => {
  const job = downloadManager.retryJob(req.params.id)
  if (!job) {
    reply.status(400)
    return { error: 'unable to retry job' }
  }
  return job
})

server.delete<{ Params: { id: string }; Querystring: { deleteFile?: string } }>(
  '/api/downloads/:id',
  async (req, reply) => {
    const deleteFile = req.query.deleteFile === 'true'
    const ok = downloadManager.deleteJob(req.params.id, deleteFile)
    if (!ok) {
      reply.status(404)
      return { error: 'job not found' }
    }
    return { message: 'job deleted' }
  }
)

server.post('/api/downloads/clear', async () => {
  downloadManager.clearCompleted()
  return { message: 'completed jobs cleared' }
})

server.post('/api/downloads/clean-missing', async () => {
  const count = downloadManager.clearMissingFiles()
  return { message: `cleared ${count} missing records`, count }
})

// Library
server.get('/api/library', async () => {
  const cfg = configManager.get()
  return scanLibrary(cfg.downloadDir)
})

interface OpenBody {
  path?: string
}

server.post<{ Body: OpenBody }>('/api/library/open', async (req, reply) => {
  const cfg = configManager.get()
  const targetPath = req.body?.path || cfg.downloadDir
  try {
    await openInExplorer(targetPath)
    return { message: 'opened in file explorer' }
  } catch (err: any) {
    reply.status(500)
    return { error: err.message }
  }
})

server.delete<{ Body: { path?: string } }>('/api/library/file', async (req, reply) => {
  const filePath = req.body?.path
  if (!filePath) {
    reply.status(400)
    return { error: 'path is required' }
  }
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath)
      return { message: 'file deleted successfully' }
    } catch (err: any) {
      reply.status(500)
      return { error: err.message }
    }
  } else {
    return { message: 'file already deleted' }
  }
})

interface RenameBody {
  oldPath?: string
  newName?: string
}

server.post<{ Body: RenameBody }>('/api/library/rename', async (req, reply) => {
  const { oldPath, newName } = req.body || {}
  if (!oldPath || !newName) {
    reply.status(400)
    return { error: 'oldPath and newName are required' }
  }
  try {
    const res = downloadManager.renameFile(oldPath, newName)
    return res
  } catch (err: any) {
    reply.status(500)
    return { error: err.message }
  }
})

server.get<{ Querystring: { path?: string } }>('/api/library/stream', async (req, reply) => {
  const filePath = req.query.path
  if (!filePath) {
    reply.status(400)
    return 'path query parameter is required'
  }

  const decoded = decodeURIComponent(filePath)
  if (!fs.existsSync(decoded)) {
    reply.status(404)
    return 'file not found'
  }

  const stat = fs.statSync(decoded)
  const range = req.headers.range

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-')
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1
    const chunkSize = end - start + 1
    const stream = fs.createReadStream(decoded, { start, end })

    reply.status(206).headers({
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': decoded.endsWith('.mp3') ? 'audio/mpeg' : 'video/mp4',
    })

    return reply.send(stream)
  } else {
    reply.headers({
      'Content-Length': stat.size,
      'Content-Type': decoded.endsWith('.mp3') ? 'audio/mpeg' : 'video/mp4',
    })
    return reply.send(fs.createReadStream(decoded))
  }
})

// Presets
server.get('/api/presets', async () => {
  return storageManager.getPresets()
})

server.post<{ Body: any }>('/api/presets', async (req) => {
  const saved = storageManager.savePreset(req.body)
  return saved
})

server.delete<{ Params: { id: string } }>('/api/presets/:id', async (req, reply) => {
  const ok = storageManager.deletePreset(req.params.id)
  if (!ok) {
    reply.status(400)
    return { error: 'cannot delete preset' }
  }
  return { message: 'preset deleted' }
})

// Settings
server.get('/api/settings', async () => {
  return configManager.get()
})

server.put<{ Body: any }>('/api/settings', async (req) => {
  const updated = configManager.update(req.body || {})
  return updated
})

// Serve static frontend if built
const distPath = path.join(rootDir, 'frontend', 'dist')
if (fs.existsSync(distPath)) {
  await server.register(fastifyStatic, {
    root: distPath,
    wildcard: false,
  })

  server.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api') || req.url.startsWith('/ws')) {
      reply.status(404).send({ error: 'Not found' })
    } else {
      reply.sendFile('index.html')
    }
  })
}

// Start Server
const port = configManager.get().port || 8080

try {
  const cfg = configManager.get()
  const ytDlp = detectYtDlp(cfg.ytDlpPath)
  const ffmpeg = detectFFmpeg(cfg.ffmpegPath)

  console.log('==================================================')
  console.log('         🚀 yt-dlp GUI Node Server                ')
  console.log('==================================================')
  console.log(`OS: ${process.platform}`)
  console.log(`yt-dlp: ${ytDlp.available ? `Found (${ytDlp.version}) at ${ytDlp.path}` : 'NOT FOUND'}`)
  console.log(`FFmpeg: ${ffmpeg.available ? `Found (${ffmpeg.version}) at ${ffmpeg.path}` : 'NOT FOUND'}`)
  console.log(`Downloads Directory: ${cfg.downloadDir}`)
  console.log('==================================================')

  await server.listen({ port, host: '0.0.0.0' })
  console.log(`✅ Server listening on http://localhost:${port}`)
} catch (err) {
  console.error('Server error:', err)
  process.exit(1)
}
