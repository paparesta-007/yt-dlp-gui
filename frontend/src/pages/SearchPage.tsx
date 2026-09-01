import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Search,
  Film,
  Music,
  Sliders,
  Play,
  Clock,
  User,
  Eye,
  Download,
  Loader2,
  Sparkles,
  TrendingUp,
  X,
  History,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Filter,
  Plus,
  Radio,
} from 'lucide-react'
import { SearchResultItem, DownloadOptions, Metadata } from '@/types'
import { api } from '@/lib/api'
import { formatNumber, formatDuration, formatBytes, extractYouTubeId } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { InspectModal } from '@/components/InspectModal'

interface SearchPageProps {
  onStartDownload?: (options: DownloadOptions, meta?: Metadata) => void
}

type DurationFilter = 'all' | 'short' | 'medium' | 'long'

export function SearchPage({ onStartDownload }: SearchPageProps) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [currentLimit, setCurrentLimit] = useState(12)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [durationFilter, setDurationFilter] = useState<DurationFilter>('all')

  // Preview Player Modal State
  const [previewItem, setPreviewItem] = useState<SearchResultItem | null>(null)

  // Inspect Modal State
  const [inspectUrl, setInspectUrl] = useState('')
  const [isInspectOpen, setIsInspectOpen] = useState(false)

  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('yt_recent_searches') || '[]')
      if (Array.isArray(saved)) setRecentSearches(saved.slice(0, 8))
    } catch {
      // ignore
    }
  }, [])

  // Fast search with smaller initial limit (12) for lightning-fast response
  const handleSearch = async (targetQuery?: string, limit = 12) => {
    const q = (targetQuery !== undefined ? targetQuery : query).trim()
    if (!q) return

    setLoading(true)
    setError(null)
    setCurrentLimit(limit)
    setHasMore(true)

    // Update recent searches
    const updated = [q, ...recentSearches.filter((s) => s.toLowerCase() !== q.toLowerCase())].slice(0, 8)
    setRecentSearches(updated)
    try {
      localStorage.setItem('yt_recent_searches', JSON.stringify(updated))
    } catch {
      // ignore
    }

    try {
      const items = await api.searchYouTube(q, limit)
      setResults(items)
      if (items.length === 0) {
        setError('Nessun video trovato per questa ricerca.')
        setHasMore(false)
      } else if (items.length < limit) {
        setHasMore(false)
      }
    } catch (err: any) {
      setError(err.message || 'Errore durante la ricerca su YouTube')
    } finally {
      setLoading(false)
    }
  }

  // Load next batch progressively when scrolling down
  const handleLoadMore = async () => {
    if (loading || loadingMore || !query.trim() || !hasMore) return
    const nextLimit = currentLimit + 12
    setLoadingMore(true)
    try {
      const items = await api.searchYouTube(query.trim(), nextLimit)
      if (items.length <= results.length) {
        setHasMore(false)
      } else {
        setResults(items)
        setCurrentLimit(nextLimit)
        if (items.length < nextLimit || nextLimit >= 48) {
          setHasMore(false)
        }
      }
    } catch (err) {
      console.error('Failed to load more results:', err)
    } finally {
      setLoadingMore(false)
    }
  }

  // Auto load more with IntersectionObserver
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || loading || loadingMore || results.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore()
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [results.length, hasMore, loading, loadingMore, currentLimit, query])

  const quickSearch = (tag: string) => {
    setQuery(tag)
    handleSearch(tag, 12)
  }

  const handleQuickDownload = (item: SearchResultItem, mode: 'video' | 'audio') => {
    const options: DownloadOptions = {
      url: item.url,
      mode,
      videoQuality: mode === 'video' ? '1080' : undefined,
      videoContainer: mode === 'video' ? 'mp4' : undefined,
      audioFormat: mode === 'audio' ? 'mp3' : undefined,
      audioQuality: mode === 'audio' ? '0' : undefined,
      embedMetadata: true,
      embedThumbnail: true,
    }

    if (onStartDownload) {
      onStartDownload(options)
    } else {
      api.createDownload(options).catch(console.error)
    }
  }

  const handleOpenInspect = (item: SearchResultItem) => {
    setInspectUrl(item.url)
    setIsInspectOpen(true)
  }

  const copyUrl = (item: SearchResultItem) => {
    navigator.clipboard.writeText(item.url)
    setCopiedId(item.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const clearRecent = () => {
    setRecentSearches([])
    localStorage.removeItem('yt_recent_searches')
  }

  // Filter results by duration
  const filteredResults = useMemo(() => {
    if (durationFilter === 'all') return results
    return results.filter((item) => {
      const d = item.duration || 0
      if (durationFilter === 'short') return d > 0 && d <= 300 // <= 5 min
      if (durationFilter === 'medium') return d > 300 && d <= 1200 // 5 - 20 min
      if (durationFilter === 'long') return d > 1200 // > 20 min
      return true
    })
  }, [results, durationFilter])

  const popularTags = [
    'Lo-Fi Hip Hop Beats',
    'Musica 2026',
    'Podcast',
    'Documentari HD',
    'Tutorial React TypeScript',
    'Gaming Highlights',
    'Synthwave Chill',
    'Top Hits',
  ]

  const previewYtId = previewItem ? extractYouTubeId(previewItem.url) || previewItem.id : null

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Search Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span>Cerca su YouTube</span>
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Ricerca rapida con caricamento progressivo e riproduzione anteprima in 1 clic
            </p>
          </div>
        </div>

        {/* Search Input Box */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(undefined, 12)}
              placeholder="Cerca canzoni, artisti, titoli, podcast o incolla link YouTube..."
              icon={<Search className="h-4 w-4 text-zinc-400" />}
              className="h-10 text-xs pl-9 pr-8 shadow-xs"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button
            onClick={() => handleSearch(undefined, 12)}
            isLoading={loading}
            disabled={!query.trim()}
            className="h-10 px-5 font-semibold shrink-0 gap-1.5 shadow-xs"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Cerca</span>
          </Button>
        </div>

        {/* Popular Tags & Recent Searches */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-semibold text-zinc-500 mr-1 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-500" />
            Suggeriti:
          </span>
          {popularTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => quickSearch(tag)}
              className="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition-colors cursor-pointer dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs">
            <span className="text-[11px] text-zinc-400 mr-1 flex items-center gap-1">
              <History className="h-3 w-3" />
              Ricerche recenti:
            </span>
            {recentSearches.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => quickSearch(s)}
                className="text-[11px] text-zinc-600 hover:text-zinc-900 underline decoration-zinc-300 underline-offset-2 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
              >
                {s}
              </button>
            ))}
            <button
              type="button"
              onClick={clearRecent}
              className="text-[10px] text-zinc-400 hover:text-red-500 ml-1 cursor-pointer"
            >
              (cancella cronologia)
            </button>
          </div>
        )}
      </div>

      {/* Filter Row if results exist */}
      {results.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mr-1">Durata:</span>
            {[
              { id: 'all', label: 'Tutti' },
              { id: 'short', label: 'Brevi (< 5m)' },
              { id: 'medium', label: 'Medi (5-20m)' },
              { id: 'long', label: 'Lunghi (> 20m)' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setDurationFilter(f.id as any)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                  durationFilter === f.id
                    ? 'bg-zinc-900 text-zinc-50 border-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 dark:border-zinc-50'
                    : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-zinc-500 font-medium">
            Mostrati {filteredResults.length} di {results.length} video
          </span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 flex items-start gap-2.5 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Risultato ricerca:</p>
            <p className="mt-0.5 text-[11px]">{error}</p>
          </div>
        </div>
      )}

      {/* Initial Loading Skeletons */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-zinc-200 bg-white p-3 space-y-3 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="aspect-video w-full rounded-lg bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-3 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-8 w-full rounded bg-zinc-100 dark:bg-zinc-900" />
            </div>
          ))}
        </div>
      )}

      {/* Results Grid */}
      {!loading && filteredResults.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredResults.map((item) => (
              <Card
                key={item.id}
                className="overflow-hidden flex flex-col justify-between border-zinc-200 hover:shadow-md transition-all group dark:border-zinc-800 dark:bg-zinc-950"
              >
                {/* Thumbnail Header with Clickable Preview Player */}
                <div
                  onClick={() => setPreviewItem(item)}
                  className="relative aspect-video w-full overflow-hidden bg-zinc-900 cursor-pointer select-none"
                  title="Clicca per guardare l'anteprima video"
                >
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-zinc-100 dark:bg-zinc-900">
                      <Film className="h-8 w-8 text-zinc-400" />
                    </div>
                  )}

                  {/* Play Overlay on Hover */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transform group-hover:scale-110 transition-transform">
                      <Play className="h-4 w-4 fill-white ml-0.5" />
                    </div>
                  </div>

                  {item.duration_string && (
                    <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/85 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white backdrop-blur-xs">
                      {item.duration_string}
                    </span>
                  )}
                </div>

                {/* Video Info Content */}
                <div className="p-3 flex-1 flex flex-col justify-between space-y-2.5">
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-1.5">
                      <h3
                        onClick={() => setPreviewItem(item)}
                        className="text-xs font-bold text-zinc-900 leading-snug line-clamp-2 hover:text-blue-600 dark:text-zinc-100 dark:hover:text-blue-400 cursor-pointer"
                        title={item.title}
                      >
                        {item.title}
                      </h3>

                      {/* Copy link button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          copyUrl(item)
                        }}
                        className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 shrink-0 p-0.5 rounded cursor-pointer"
                        title="Copia link video"
                      >
                        {copiedId === item.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                      {item.uploader && (
                        <div className="flex items-center gap-1 max-w-[130px] truncate">
                          <User className="h-3 w-3 text-zinc-400 shrink-0" />
                          <span className="truncate">{item.uploader}</span>
                        </div>
                      )}
                      {item.view_count !== undefined && item.view_count > 0 && (
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3 text-zinc-400 shrink-0" />
                          <span>{formatNumber(item.view_count)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3 Quick Action Buttons */}
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-850 space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickDownload(item, 'video')}
                        className="h-7 text-[11px] font-medium px-2 gap-1 justify-center"
                        title="Scarica Video Full HD (1080p MP4)"
                      >
                        <Film className="h-3 w-3 text-blue-600" />
                        <span>Video HD</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickDownload(item, 'audio')}
                        className="h-7 text-[11px] font-medium px-2 gap-1 justify-center"
                        title="Scarica Traccia Audio (MP3 320k)"
                      >
                        <Music className="h-3 w-3 text-purple-600" />
                        <span>Solo Audio</span>
                      </Button>
                    </div>

                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleOpenInspect(item)}
                      className="w-full h-7 text-[11px] font-semibold gap-1 justify-center"
                      title="Personalizza risoluzione, taglia spezzone, sottotitoli"
                    >
                      <Sliders className="h-3 w-3" />
                      <span>Personalizza / Taglia</span>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Infinite scroll loader trigger / Load more button */}
          <div ref={loadMoreRef} className="py-6 flex flex-col items-center justify-center">
            {loadingMore ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span>Caricamento altri video in corso...</span>
              </div>
            ) : hasMore ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                className="text-xs px-4 h-8 gap-1.5 shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Carica altri risultati</span>
              </Button>
            ) : (
              <span className="text-[11px] text-zinc-400">
                Tutti i video trovati per questa ricerca sono stati caricati
              </span>
            )}
          </div>
        </div>
      )}

      {/* Initial Empty State with tips */}
      {!loading && results.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 rounded-2xl border border-dashed border-zinc-200 bg-white/60 p-8 dark:border-zinc-800 dark:bg-zinc-950/40">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
            <Search className="h-6 w-6" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Esplora e Scarica Direttamente da YouTube
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Scrivi qualsiasi parola chiave o titolo sopra per trovare video, musica e interviste senza uscire dall'app.
            </p>
          </div>
        </div>
      )}

      {/* 🎬 Floating Full-size Video Player Preview Modal */}
      {previewItem && (
        <Modal
          isOpen={!!previewItem}
          onClose={() => setPreviewItem(null)}
          title={
            <div className="flex items-center gap-2 min-w-0 pr-4">
              <Play className="h-4 w-4 text-red-600 fill-red-600 shrink-0" />
              <span className="text-sm font-bold text-zinc-900 truncate dark:text-zinc-100 max-w-lg">
                {previewItem.title}
              </span>
            </div>
          }
          maxWidth="4xl"
          footer={
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
              <div className="flex items-center gap-2 text-xs text-zinc-500 truncate">
                {previewItem.uploader && <span className="font-semibold text-zinc-700 dark:text-zinc-300">{previewItem.uploader}</span>}
                {previewItem.duration_string && <span>• {previewItem.duration_string}</span>}
                {previewItem.view_count && <span>• {formatNumber(previewItem.view_count)} visualizzazioni</span>}
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleQuickDownload(previewItem, 'video')
                    setPreviewItem(null)
                  }}
                  className="gap-1 text-xs"
                >
                  <Film className="h-3.5 w-3.5 text-blue-600" />
                  <span>Scarica Video 1080p</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleQuickDownload(previewItem, 'audio')
                    setPreviewItem(null)
                  }}
                  className="gap-1 text-xs"
                >
                  <Music className="h-3.5 w-3.5 text-purple-600" />
                  <span>Scarica MP3</span>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    const it = previewItem
                    setPreviewItem(null)
                    handleOpenInspect(it)
                  }}
                  className="gap-1 text-xs font-semibold"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  <span>Personalizza / Taglia</span>
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-3">
            {/* Embedded Responsive YouTube Player */}
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black shadow-lg">
              {previewYtId ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${previewYtId}?autoplay=1&rel=0`}
                  title={previewItem.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-white text-xs">
                  Impossibile caricare anteprima per questo elemento.
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Inspect Modal Instance */}
      <InspectModal
        isOpen={isInspectOpen}
        onClose={() => setIsInspectOpen(false)}
        initialUrl={inspectUrl}
        onStartDownload={(opts, meta) => {
          if (onStartDownload) {
            onStartDownload(opts, meta)
          } else {
            api.createDownload(opts).catch(console.error)
          }
        }}
      />
    </div>
  )
}
