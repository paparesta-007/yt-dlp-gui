import { useState, useEffect } from 'react'
import {
  Sliders,
  Plus,
  Trash2,
  Copy,
  Check,
  Sparkles,
  Film,
  Music,
  Archive,
  Monitor,
  Disc,
} from 'lucide-react'
import { Preset } from '@/types'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Switch } from '@/components/ui/Switch'
import { Badge } from '@/components/ui/Badge'

export function PresetsPage() {
  const [presets, setPresets] = useState<Preset[]>([])
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // New Preset Form State
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [mode, setMode] = useState<'video' | 'audio'>('video')
  const [videoQuality, setVideoQuality] = useState('best')
  const [videoContainer, setVideoContainer] = useState('mp4')
  const [audioFormat, setAudioFormat] = useState('mp3')
  const [audioQuality, setAudioQuality] = useState('0')
  const [embedMetadata, setEmbedMetadata] = useState(true)
  const [embedThumbnail, setEmbedThumbnail] = useState(true)
  const [embedSubtitles, setEmbedSubtitles] = useState(false)
  const [sponsorBlockAction, setSponsorBlockAction] = useState<'remove' | 'mark' | 'none'>('remove')

  const fetchPresets = async () => {
    try {
      const list = await api.getPresets()
      setPresets(list)
    } catch (e) {
      console.error('Failed to load presets:', e)
    }
  }

  useEffect(() => {
    fetchPresets()
  }, [])

  const handleCreate = async () => {
    if (!name.trim()) return

    try {
      await api.savePreset({
        name: name.trim(),
        description: description.trim(),
        icon: mode === 'audio' ? 'music' : 'film',
        isBuiltin: false,
        options: {
          url: '',
          mode,
          videoQuality: mode === 'video' ? videoQuality : undefined,
          videoContainer: mode === 'video' ? videoContainer : undefined,
          audioFormat: mode === 'audio' ? audioFormat : undefined,
          audioQuality: mode === 'audio' ? audioQuality : undefined,
          embedMetadata,
          embedThumbnail,
          embedSubtitles,
          sponsorBlockAction,
        },
      })
      setIsCreateOpen(false)
      setName('')
      setDescription('')
      fetchPresets()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this preset?')) return
    try {
      await api.deletePreset(id)
      fetchPresets()
    } catch (e) {
      console.error(e)
    }
  }

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'film':
        return <Film className="h-5 w-5 text-blue-400" />
      case 'music':
        return <Music className="h-5 w-5 text-purple-400" />
      case 'monitor':
        return <Monitor className="h-5 w-5 text-cyan-400" />
      case 'disc':
        return <Disc className="h-5 w-5 text-emerald-400" />
      case 'archive':
        return <Archive className="h-5 w-5 text-amber-400" />
      default:
        return <Sparkles className="h-5 w-5 text-blue-400" />
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-zinc-900 tracking-tight dark:text-zinc-100">Preset di Download</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Crea e gestisci modelli di download personalizzati per scaricare con un solo clic
          </p>
        </div>

        <Button
          variant="default"
          size="sm"
          onClick={() => setIsCreateOpen(true)}
          className="h-8 text-xs gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Nuovo Preset
        </Button>
      </div>

      {/* Preset Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {presets.map((preset) => {
          const opts = preset.options
          return (
            <Card
              key={preset.id}
              className="relative p-4 border-zinc-200 bg-white hover:border-zinc-300 shadow-xs transition-colors flex flex-col justify-between dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
                      {getIcon(preset.icon)}
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{preset.name}</h3>
                      {preset.isBuiltin ? (
                        <Badge variant="secondary" className="text-[9px] py-0 px-1 mt-0.5">
                          Predefinito
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] py-0 px-1 mt-0.5">
                          Personalizzato
                        </Badge>
                      )}
                    </div>
                  </div>

                  {!preset.isBuiltin && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(preset.id)}
                      className="text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                      title="Elimina Preset"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <p className="text-xs text-zinc-500 leading-relaxed min-h-[32px] dark:text-zinc-400">
                  {preset.description || 'Nessuna descrizione specificata.'}
                </p>

                {/* Configuration tags */}
                <div className="flex flex-wrap gap-1 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                  <Badge variant="secondary" className="text-[10px] font-mono uppercase">
                    {opts.mode || 'video'}
                  </Badge>
                  {opts.videoQuality && (
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      {opts.videoQuality === 'best' ? 'Migliore Qualità' : `${opts.videoQuality}p`}
                    </Badge>
                  )}
                  {opts.videoContainer && (
                    <Badge variant="secondary" className="text-[10px] font-mono uppercase">
                      {opts.videoContainer}
                    </Badge>
                  )}
                  {opts.audioFormat && (
                    <Badge variant="secondary" className="text-[10px] font-mono uppercase">
                      {opts.audioFormat} ({opts.audioQuality || '320k'})
                    </Badge>
                  )}
                  {opts.embedMetadata && (
                    <Badge variant="outline" className="text-[10px]">
                      Metadati
                    </Badge>
                  )}
                  {opts.embedThumbnail && (
                    <Badge variant="outline" className="text-[10px]">
                      Copertina
                    </Badge>
                  )}
                  {opts.embedSubtitles && (
                    <Badge variant="outline" className="text-[10px]">
                      Sottotitoli
                    </Badge>
                  )}
                  {opts.sponsorBlockAction && opts.sponsorBlockAction !== 'none' && (
                    <Badge variant="outline" className="text-[10px]">
                      SponsorBlock ({opts.sponsorBlockAction})
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Create Preset Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Preset"
        description="Configure a reusable download profile with your preferred settings"
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleCreate}
              disabled={!name.trim()}
              className="bg-blue-600 hover:bg-blue-500"
            >
              Save Preset
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-zinc-300 mb-1.5 block">
              Preset Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 4K High Bitrate MKV"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300 mb-1.5 block">
              Description
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. For archival with full subtitles and chapters"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-zinc-300 mb-1.5 block">
                Download Mode
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as any)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
              >
                <option value="video">Video (Audio + Video)</option>
                <option value="audio">Audio Only (Extracted)</option>
              </select>
            </div>

            {mode === 'video' ? (
              <div>
                <label className="text-xs font-semibold text-zinc-300 mb-1.5 block">
                  Container Format
                </label>
                <select
                  value={videoContainer}
                  onChange={(e) => setVideoContainer(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="mp4">MP4</option>
                  <option value="mkv">MKV</option>
                  <option value="webm">WebM</option>
                  <option value="mov">MOV</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="text-xs font-semibold text-zinc-300 mb-1.5 block">
                  Audio Format
                </label>
                <select
                  value={audioFormat}
                  onChange={(e) => setAudioFormat(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="mp3">MP3</option>
                  <option value="m4a">M4A</option>
                  <option value="flac">FLAC</option>
                  <option value="opus">Opus</option>
                  <option value="wav">WAV</option>
                </select>
              </div>
            )}
          </div>

          <div className="space-y-3 pt-2">
            <Switch
              checked={embedMetadata}
              onChange={setEmbedMetadata}
              label="Embed Metadata & Tags"
              description="Add tags, artist, uploader, date into media file"
            />
            <Switch
              checked={embedThumbnail}
              onChange={setEmbedThumbnail}
              label="Embed Cover Art / Thumbnail"
              description="Embed artwork into video or audio cover"
            />
            <Switch
              checked={embedSubtitles}
              onChange={setEmbedSubtitles}
              label="Embed Subtitles"
              description="Automatically mux available subtitle tracks"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
