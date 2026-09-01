import { useState } from 'react'
import {
  Play,
  Volume2,
  FolderOpen,
  Download,
  FileVideo,
  FileAudio,
} from 'lucide-react'
import { MediaFile } from '@/types'
import { api } from '@/lib/api'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface MediaPlayerModalProps {
  isOpen: boolean
  onClose: () => void
  file: MediaFile | null
}

export function MediaPlayerModal({ isOpen, onClose, file }: MediaPlayerModalProps) {
  if (!file) return null

  const isVideo = file.mediaType === 'video'
  const isAudio = file.mediaType === 'audio'
  const streamUrl = api.getStreamUrl(file.path)

  const handleOpenFolder = async () => {
    try {
      await api.openInExplorer(file.path)
    } catch (e) {
      console.error('Failed to open file in folder:', e)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800">
            {isVideo ? <FileVideo className="h-4 w-4" /> : <FileAudio className="h-4 w-4" />}
          </div>
          <div className="overflow-hidden max-w-xl">
            <h2 className="text-sm font-semibold text-zinc-900 truncate dark:text-zinc-100">{file.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="text-[10px]">
                {file.sizeFormatted}
              </Badge>
              <span className="text-[11px] font-mono text-zinc-500 uppercase">
                {file.extension}
              </span>
            </div>
          </div>
        </div>
      }
      maxWidth="4xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenFolder}
            className="gap-1.5 h-8 text-xs"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Mostra nella Cartella
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose} className="h-8 text-xs">
            Chiudi
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {isVideo && (
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black border border-zinc-200 shadow-sm flex items-center justify-center dark:border-zinc-800">
            <video
              src={streamUrl}
              controls
              autoPlay
              className="h-full w-full object-contain"
            >
              Il browser non supporta la riproduzione video HTML5.
            </video>
          </div>
        )}

        {isAudio && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 flex flex-col items-center justify-center space-y-4 dark:border-zinc-800 dark:bg-zinc-900/60">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-50 shadow-sm dark:bg-zinc-50 dark:text-zinc-900">
              <Volume2 className="h-8 w-8" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-semibold text-zinc-900 max-w-md truncate dark:text-zinc-100">{file.name}</h3>
              <p className="text-xs text-zinc-500 mt-0.5 dark:text-zinc-400">{file.sizeFormatted}</p>
            </div>
            <audio src={streamUrl} controls autoPlay className="w-full max-w-md">
              Il browser non supporta la riproduzione audio HTML5.
            </audio>
          </div>
        )}
      </div>
    </Modal>
  )
}
