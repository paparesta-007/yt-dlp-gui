import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const backendDir = path.join(rootDir, 'backend')
const binaryExe = path.join(backendDir, 'bin', process.platform === 'win32' ? 'server.exe' : 'server')

// Find Go executable
function findGoExecutable() {
  const possiblePaths = [
    'go',
    'C:\\Program Files\\Go\\bin\\go.exe',
    'C:\\Go\\bin\\go.exe',
    '/usr/local/go/bin/go',
    '/opt/homebrew/bin/go',
  ]

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) return p
    } catch {
      // Ignored
    }
  }

  return 'go'
}

const goExe = findGoExecutable()

// Add Go bin to PATH
const env = { ...process.env }
if (process.platform === 'win32') {
  env.PATH = `C:\\Program Files\\Go\\bin;${env.PATH || ''}`
}

console.log('🚀 Starting Go Fiber Backend on http://localhost:8080...')

let child

function startWithGo() {
  child = spawn(goExe, ['run', './cmd/server'], {
    cwd: backendDir,
    stdio: 'inherit',
    env,
  })

  child.on('error', (err) => {
    console.warn('⚠️ Could not start with "go run", falling back to pre-compiled binary:', err.message)
    startWithBinary()
  })

  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.warn(`⚠️ Go run exited with code ${code}, trying precompiled binary...`)
      startWithBinary()
    }
  })
}

function startWithBinary() {
  if (fs.existsSync(binaryExe)) {
    console.log(`📦 Running binary: ${binaryExe}`)
    child = spawn(binaryExe, [], {
      cwd: backendDir,
      stdio: 'inherit',
      env,
    })
    child.on('exit', (code) => {
      process.exit(code || 0)
    })
  } else {
    console.error('❌ Could not find Go or precompiled server binary at:', binaryExe)
  }
}

startWithGo()

process.on('SIGINT', () => {
  if (child) child.kill('SIGINT')
  process.exit(0)
})

process.on('SIGTERM', () => {
  if (child) child.kill('SIGTERM')
  process.exit(0)
})
