import { useState, useEffect } from 'react'
import {
  FolderKanban,
  FolderOpen,
  RefreshCw,
  Search,
  FileVideo,
  FileAudio,
  Play,
  Grid,
  List,
  Calendar,
  HardDrive,
  ExternalLink,
  Trash2,
  Pencil,
} from 'lucide-react'
import { MediaFile } from '@/types'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { MediaPlayerModal } from '@/components/MediaPlayerModal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'

export function LibraryPage() {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [mediaFilter, setMediaFilter] = useState<'all' | 'video' | 'audio'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [activeMediaFile, setActiveMediaFile] = useState<MediaFile | null>(null)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [renameTargetFile, setRenameTargetFile] = useState<MediaFile | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameLoading, setRenameLoading] = useState(false)

  const fetchLibrary = async () => {
    setLoading(true)
    try {
      const list = await api.getLibrary()
      setFiles(list)
    } catch (e) {
      console.error('Failed to scan library:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLibrary()
  }, [])

  const handleOpenFolder = async (path?: string) => {
    try {
      await api.openInExplorer(path)
    } catch (e) {
      console.error('Failed to open folder:', e)
    }
  }

  const handleDeleteFile = async (filePath: string) => {
    if (!confirm('Are you sure you want to permanently delete this file from disk?')) return
    setFiles((prev) => prev.filter((f) => f.path !== filePath))
    try {
      await api.deleteMediaFile(filePath)
    } catch (e) {
      console.error('Failed to delete file:', e)
      fetchLibrary()
    }
  }

  const handleOpenRename = (file: MediaFile) => {
    setRenameTargetFile(file)
    setRenameValue(file.name)
    setShowRenameModal(true)
  }

  const handleRenameConfirm = async () => {
    if (!renameTargetFile || !renameValue.trim()) return
    setRenameLoading(true)
    try {
      await api.renameMediaFile(renameTargetFile.path, renameValue.trim())
      setShowRenameModal(false)
      fetchLibrary()
    } catch (err: any) {
      alert(`Errore rinomina: ${err.message}`)
    } finally {
      setRenameLoading(false)
    }
  }

  const filteredFiles = files.filter((f) => {
    if (mediaFilter !== 'all' && f.mediaType !== mediaFilter) return false
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const videoCount = files.filter((f) => f.mediaType === 'video').length
  const audioCount = files.filter((f) => f.mediaType === 'audio').length

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-zinc-900 tracking-tight dark:text-zinc-100">Libreria File</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Esplora, riproduci e gestisci tutti i file multimediali scaricati sul tuo disco
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLibrary}
            isLoading={loading}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Aggiorna
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => handleOpenFolder()}
            className="h-8 text-xs gap-1.5"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Apri Cartella
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Media type filter */}
          <div className="inline-flex h-8 items-center rounded-lg bg-zinc-100 p-0.5 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            {[
              { id: 'all', label: 'Tutti', count: files.length },
              { id: 'video', label: 'Video', count: videoCount },
              { id: 'audio', label: 'Audio', count: audioCount },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMediaFilter(tab.id as any)}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer select-none ${
                  mediaFilter === tab.id
                    ? 'bg-white text-zinc-950 shadow-xs font-semibold dark:bg-zinc-950 dark:text-zinc-50'
                    : 'hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] opacity-70">({tab.count})</span>
              </button>
            ))}
          </div>

          {/* View mode toggle */}
          <div className="inline-flex h-8 items-center rounded-lg bg-zinc-100 p-0.5 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-zinc-950 shadow-xs dark:bg-zinc-950 dark:text-zinc-50' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400'
              }`}
              title="Vista Griglia"
            >
              <Grid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-zinc-950 shadow-xs dark:bg-zinc-950 dark:text-zinc-50' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400'
              }`}
              title="Vista Elenco"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="w-full sm:w-64">
          <Input
            placeholder="Cerca nella libreria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-3.5 w-3.5 text-zinc-400" />}
            className="h-8 text-xs"
          />
        </div>
      </div>

      {/* Files Grid / List */}
      {filteredFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white py-16 text-center dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400 mb-3 dark:bg-zinc-900">
            <FolderKanban className="h-6 w-6 stroke-[1.5]" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Nessun file multimediale</h3>
          <p className="mt-1 text-xs text-zinc-500 max-w-sm dark:text-zinc-400">
            {search
              ? 'Nessun file corrisponde al filtro di ricerca.'
              : 'I file scaricati appariranno qui automaticamente.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {filteredFiles.map((file) => {
            const isVideo = file.mediaType === 'video'
            return (
              <Card
                key={file.path}
                className="group relative overflow-hidden p-0 border-zinc-200 bg-white hover:border-zinc-300 shadow-xs dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
              >
                {/* Media Icon & Play Action */}
                <div className="relative aspect-video w-full bg-zinc-100 flex items-center justify-center border-b border-zinc-100 dark:bg-zinc-900 dark:border-zinc-800">
                  {isVideo ? (
                    <FileVideo className="h-10 w-10 text-zinc-400 group-hover:text-blue-600 transition-colors dark:text-zinc-600 dark:group-hover:text-blue-400" />
                  ) : (
                    <FileAudio className="h-10 w-10 text-zinc-400 group-hover:text-purple-600 transition-colors dark:text-zinc-600 dark:group-hover:text-purple-400" />
                  )}

                  <div className="absolute top-2 left-2">
                    <Badge variant={isVideo ? 'primary' : 'secondary'} className="text-[9px] uppercase font-mono px-1.5 py-0">
                      {file.extension.replace('.', '')}
                    </Badge>
                  </div>

                  {/* Play overlay button */}
                  <button
                    type="button"
                    onClick={() => setActiveMediaFile(file)}
                    className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-zinc-900 shadow-md">
                      <Play className="h-4 w-4 fill-zinc-900 ml-0.5" />
                    </div>
                  </button>
                </div>

                {/* Details */}
                <div className="p-3 space-y-2">
                  <h4 className="text-xs font-semibold text-zinc-900 truncate dark:text-zinc-100" title={file.name}>
                    {file.name}
                  </h4>
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono dark:text-zinc-400">
                    <span>{file.sizeFormatted}</span>
                    <span className="font-sans text-zinc-400">{formatDate(file.modifiedAt)}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveMediaFile(file)}
                        className="h-6 text-xs gap-1 px-1.5"
                      >
                        <Play className="h-3 w-3" />
                        Play
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenFolder(file.path)}
                        className="h-6 text-xs gap-1 px-1.5"
                      >
                        <FolderOpen className="h-3 w-3" />
                        Cartella
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenRename(file)}
                        className="h-6 text-xs gap-1 px-1.5"
                      >
                        <Pencil className="h-3 w-3" />
                        Rinomina
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDeleteFile(file.path)}
                      className="text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                      title="Elimina file dal disco"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        /* List View */
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filteredFiles.map((file) => {
              const isVideo = file.mediaType === 'video'
              return (
                <div
                  key={file.path}
                  className="flex items-center justify-between p-3 hover:bg-zinc-50/80 transition-colors dark:hover:bg-zinc-900/60"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                      {isVideo ? <FileVideo className="h-4 w-4" /> : <FileAudio className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-900 truncate max-w-md dark:text-zinc-100" title={file.name}>
                        {file.name}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono mt-0.5 dark:text-zinc-400">
                        <span className="uppercase font-semibold">{file.extension}</span>
                        <span>•</span>
                        <span>{file.sizeFormatted}</span>
                        <span>•</span>
                        <span className="font-sans">{formatDate(file.modifiedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveMediaFile(file)}
                      className="text-xs gap-1 h-7 px-2"
                    >
                      <Play className="h-3 w-3" />
                      Play
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenFolder(file.path)}
                      className="text-xs gap-1 h-7 px-2"
                    >
                      <FolderOpen className="h-3 w-3" />
                      Cartella
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenRename(file)}
                      className="text-xs gap-1 h-7 px-2"
                    >
                      <Pencil className="h-3 w-3" />
                      Rinomina
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDeleteFile(file.path)}
                      className="text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                      title="Elimina file dal disco"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Rename File Modal */}
      <Modal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        title={
          <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
            <Pencil className="h-4 w-4" />
            <span>Rinomina File</span>
          </div>
        }
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowRenameModal(false)}>
              Annulla
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleRenameConfirm}
              isLoading={renameLoading}
            >
              Salva Nuovo Nome
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs text-zinc-600 dark:text-zinc-400">
          <p>
            Rinomina il file <strong className="text-zinc-900 dark:text-zinc-100">{renameTargetFile?.name}</strong> per evitare duplicati o riordinare la tua libreria:
          </p>
          <div>
            <label className="text-xs font-semibold text-zinc-900 mb-1 block dark:text-zinc-200">Nuovo Nome:</label>
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Inserisci il nuovo nome del file..."
              className="h-9 text-xs font-mono"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameConfirm()
                }
              }}
            />
          </div>
        </div>
      </Modal>

      {/* Media Player Modal */}
      <MediaPlayerModal
        isOpen={!!activeMediaFile}
        onClose={() => setActiveMediaFile(null)}
        file={activeMediaFile}
      />
    </div>
  )
}
