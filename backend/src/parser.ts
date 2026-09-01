export interface ProgressUpdate {
  status: 'downloading' | 'postprocessing' | 'merging' | 'embedding' | 'finished'
  percent?: number
  percentStr?: string
  downloadedBytes?: number
  totalBytes?: number
  totalBytesEstimate?: number
  speed?: number
  speedStr?: string
  eta?: number
  etaStr?: string
  stage?: string
  outputFile?: string
}

const destRegex = /\[(?:download|ExtractAudio)\]\s+Destination:\s+(.+)/
const mergerRegex = /\[Merger\]\s+Merging formats into\s+"?([^"]+)"?/
const alreadyRegex = /\[download\]\s+(.+)\s+has already been downloaded/
const ffmpegFixRegex = /\[Fixup[A-Za-z0-9]+\]\s+.*into\s+"?([^"]+)"?/
const percentRegex = /([0-9]+(?:\.[0-9]+)?)\s*%/
const stdDownloadRegex = /\[download\]\s+([0-9.]+)%\s+of\s+~?([0-9.]+[A-Za-z]+)\s+at\s+([0-9.]+[A-Za-z]+\/s)(?:\s+ETA\s+([0-9:]+))?/i

export function parseLine(line: string): ProgressUpdate | null {
  line = line.trim()
  if (!line) return null

  // 1. Custom JSON progress template
  if (line.startsWith('download:{')) {
    try {
      const jsonStr = line.slice('download:'.length)
      const raw = JSON.parse(jsonStr)
      const percent = parsePercent(raw.percent)
      const speed = Number(raw.speed) || 0
      const eta = Number(raw.eta) || 0
      const downloadedBytes = Number(raw.downloaded_bytes) || 0
      let totalBytes = Number(raw.total_bytes) || 0
      if (!totalBytes || isNaN(totalBytes)) {
        totalBytes = Number(raw.total_bytes_estimate) || 0
      }

      return {
        status: 'downloading',
        percent: isNaN(percent) ? 0 : percent,
        percentStr: raw.percent?.trim() || `${percent.toFixed(1)}%`,
        downloadedBytes,
        totalBytes,
        totalBytesEstimate: Number(raw.total_bytes_estimate) || 0,
        speed,
        speedStr: raw.speed_str?.trim(),
        eta,
        etaStr: raw.eta_str?.trim(),
        stage: `Downloading ${raw.percent?.trim() || `${percent.toFixed(1)}%`}`,
      }
    } catch {
      // Ignored
    }
  }

  // 2. Standard yt-dlp progress fallback: [download]  45.2% of 150.00MiB at 5.20MiB/s ETA 00:20
  const stdMatch = line.match(stdDownloadRegex)
  if (stdMatch) {
    const percent = parseFloat(stdMatch[1])
    const speedStr = stdMatch[3]
    const etaStr = stdMatch[4] || ''
    return {
      status: 'downloading',
      percent: isNaN(percent) ? 0 : percent,
      percentStr: `${percent.toFixed(1)}%`,
      speedStr,
      etaStr,
      stage: `Downloading ${percent.toFixed(1)}%`,
    }
  }

  // 3. Custom JSON postprocess template
  if (line.startsWith('postprocess:{')) {
    try {
      const jsonStr = line.slice('postprocess:'.length)
      const raw = JSON.parse(jsonStr)
      return {
        status: 'postprocessing',
        stage: raw.postprocessor || 'Postprocessing',
      }
    } catch {
      // Ignored
    }
  }

  // 4. Output files and merging detection
  const mergerMatch = line.match(mergerRegex)
  if (mergerMatch && mergerMatch[1]) {
    return {
      status: 'merging',
      stage: 'Merging video & audio with FFmpeg',
      outputFile: mergerMatch[1].trim(),
    }
  }

  const destMatch = line.match(destRegex)
  if (destMatch && destMatch[1]) {
    return {
      status: 'downloading',
      outputFile: destMatch[1].trim(),
    }
  }

  const alreadyMatch = line.match(alreadyRegex)
  if (alreadyMatch && alreadyMatch[1]) {
    return {
      status: 'finished',
      percent: 100,
      percentStr: '100%',
      stage: 'Already downloaded',
      outputFile: alreadyMatch[1].trim(),
    }
  }

  const fixMatch = line.match(ffmpegFixRegex)
  if (fixMatch && fixMatch[1]) {
    return {
      status: 'postprocessing',
      stage: 'Fixing container',
      outputFile: fixMatch[1].trim(),
    }
  }

  // 5. Standard text stage detection
  if (line.includes('[EmbedSubtitle]')) {
    return { status: 'postprocessing', stage: 'Embedding subtitles' }
  }
  if (line.includes('[EmbedThumbnail]')) {
    return { status: 'postprocessing', stage: 'Embedding thumbnail' }
  }
  if (line.includes('[SponsorBlock]')) {
    return { status: 'postprocessing', stage: 'Processing SponsorBlock' }
  }
  if (line.includes('[ExtractAudio]')) {
    return { status: 'postprocessing', stage: 'Extracting audio' }
  }
  if (line.includes('[SplitChapters]')) {
    return { status: 'postprocessing', stage: 'Splitting chapters' }
  }
  if (line.includes('[Merger]')) {
    return { status: 'merging', stage: 'Merging video & audio' }
  }

  return null
}

function parsePercent(str?: string): number {
  if (!str) return 0
  str = str.replace('%', '').trim()
  const val = parseFloat(str)
  if (!isNaN(val)) return val
  const m = str.match(percentRegex)
  if (m && m[1]) return parseFloat(m[1])
  return 0
}
