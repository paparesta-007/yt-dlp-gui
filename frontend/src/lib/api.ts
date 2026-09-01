import {
  DownloadOptions,
  Job,
  MediaFile,
  Metadata,
  Preset,
  Settings,
  SystemStatus,
} from '@/types'

const API_BASE = '/api'

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}: ${res.statusText}`
    try {
      const data = await res.json()
      if (data.error) {
        errorMsg = data.error
      }
    } catch {
      // Ignored
    }
    throw new Error(errorMsg)
  }

  return res.json()
}

export const api = {
  // System
  getSystemStatus: () => request<SystemStatus>('/system/status'),
  updateYtDlp: () =>
    request<{ message: string; output: string }>('/system/yt-dlp/update', {
      method: 'POST',
    }),
  installYtDlp: () =>
    request<{ message: string; path: string }>('/system/yt-dlp/install', {
      method: 'POST',
    }),

  // Info & Search Extraction
  extractInfo: (params: {
    url: string
    cookiesBrowser?: string
    cookiesFile?: string
    proxy?: string
    includeFormats?: boolean
    flatPlaylist?: boolean
  }) =>
    request<Metadata>('/info', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  searchYouTube: (query: string, limit = 20) =>
    request<import('@/types').SearchResultItem[]>(
      `/search?q=${encodeURIComponent(query)}&limit=${limit}`
    ),

  // Downloads Queue
  getDownloads: () => request<Job[]>('/downloads'),
  createDownload: (options: DownloadOptions) =>
    request<Job>('/downloads', {
      method: 'POST',
      body: JSON.stringify(options),
    }),
  createBatchDownloads: (req: {
    items?: DownloadOptions[]
    urls?: string[]
    options?: DownloadOptions
  }) =>
    request<{ count: number; jobs: Job[] }>('/downloads/batch', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  getDownload: (id: string) => request<Job>(`/downloads/${id}`),
  cancelDownload: (id: string) =>
    request<{ message: string }>(`/downloads/${id}/cancel`, {
      method: 'POST',
    }),
  cancelAllDownloads: () =>
    request<{ message: string; count: number }>('/downloads/cancel-all', {
      method: 'POST',
    }),
  retryDownload: (id: string) =>
    request<Job>(`/downloads/${id}/retry`, {
      method: 'POST',
    }),
  deleteDownload: (id: string, deleteFile = false) =>
    request<{ message: string }>(`/downloads/${id}?deleteFile=${deleteFile}`, {
      method: 'DELETE',
    }),
  clearCompletedDownloads: () =>
    request<{ message: string }>('/downloads/clear', {
      method: 'POST',
    }),
  cleanMissingDownloads: () =>
    request<{ message: string; count: number }>('/downloads/clean-missing', {
      method: 'POST',
    }),

  // Library
  getLibrary: () => request<MediaFile[]>('/library'),
  openInExplorer: (path?: string) =>
    request<{ message: string }>('/library/open', {
      method: 'POST',
      body: JSON.stringify({ path: path || '' }),
    }),
  deleteMediaFile: (path: string) =>
    request<{ message: string }>('/library/file', {
      method: 'DELETE',
      body: JSON.stringify({ path }),
    }),
  renameMediaFile: (oldPath: string, newName: string) =>
    request<{ newPath: string; newName: string }>('/library/rename', {
      method: 'POST',
      body: JSON.stringify({ oldPath, newName }),
    }),
  getStreamUrl: (filePath: string) =>
    `${API_BASE}/library/stream?path=${encodeURIComponent(filePath)}`,

  // Presets
  getPresets: () => request<Preset[]>('/presets'),
  savePreset: (preset: Partial<Preset>) =>
    request<Preset>('/presets', {
      method: 'POST',
      body: JSON.stringify(preset),
    }),
  deletePreset: (id: string) =>
    request<{ message: string }>(`/presets/${id}`, {
      method: 'DELETE',
    }),

  // Settings
  getSettings: () => request<Settings>('/settings'),
  updateSettings: (settings: Partial<Settings>) =>
    request<Settings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),
}
