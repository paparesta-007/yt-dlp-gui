import { useState, useEffect } from 'react'
import {
  Settings as SettingsIcon,
  Save,
  FolderOpen,
  Server,
  RefreshCw,
  Check,
  HardDrive,
  Shield,
  Sliders,
  Globe,
  Tag,
} from 'lucide-react'
import { Settings, SystemStatus } from '@/types'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Switch } from '@/components/ui/Switch'
import { Badge } from '@/components/ui/Badge'

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [s, sys] = await Promise.all([
        api.getSettings(),
        api.getSystemStatus(),
      ])
      setSettings(s)
      setSystemStatus(sys)
    } catch (e) {
      console.error('Failed to load settings:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    setSavedSuccess(false)
    try {
      const updated = await api.updateSettings(settings)
      setSettings(updated)
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 3000)
    } catch (e) {
      console.error('Failed to save settings:', e)
    } finally {
      setSaving(false)
    }
  }

  const handleOpenDownloadFolder = async () => {
    if (settings?.downloadDir) {
      try {
        await api.openInExplorer(settings.downloadDir)
      } catch (e) {
        console.error(e)
      }
    }
  }

  if (!settings) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-500">
        Loading application settings...
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-4xl pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-zinc-900 tracking-tight dark:text-zinc-100">Impostazioni Applicazione</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Configura cartella di download, binari yt-dlp & FFmpeg, velocità di rete e parametri predefiniti
          </p>
        </div>

        <Button
          variant="default"
          size="sm"
          onClick={handleSave}
          isLoading={saving}
          className="h-8 text-xs font-semibold px-4"
        >
          {savedSuccess ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-300" />
              Salvato!
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              Salva Modifiche
            </>
          )}
        </Button>
      </div>

      {savedSuccess && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 flex items-center gap-2 dark:border-emerald-800/80 dark:bg-emerald-950/40 dark:text-emerald-300">
          <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Impostazioni aggiornate e salvate con successo!</span>
        </div>
      )}

      {/* Section 1: Storage & Paths */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
            <CardTitle>Archiviazione & Cartelle</CardTitle>
          </div>
          <CardDescription>
            Percorso sul disco dove verranno salvati i file video e audio scaricati
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-zinc-900 mb-1 block dark:text-zinc-200">
              Cartella Download Predefinita
            </label>
            <div className="flex gap-2">
              <Input
                value={settings.downloadDir}
                onChange={(e) =>
                  setSettings({ ...settings, downloadDir: e.target.value })
                }
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenDownloadFolder}
                className="gap-1.5 shrink-0 h-9 text-xs"
              >
                <FolderOpen className="h-3.5 w-3.5" />
                Apri
              </Button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-900 mb-1 block dark:text-zinc-200">
              Modello Nome File (Template)
            </label>
            <Input
              value={settings.defaultOutputTemplate}
              onChange={(e) =>
                setSettings({ ...settings, defaultOutputTemplate: e.target.value })
              }
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Variabili supportate: %(title)s, %(id)s, %(uploader)s, %(resolution)s, %(playlist_title)s, %(ext)s
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Core Engine & Binaries */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
            <CardTitle>Eseguibili yt-dlp & FFmpeg</CardTitle>
          </div>
          <CardDescription>
            Configura percorsi binari personalizzati se non desideri usare quelli automatici inclusi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3.5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-200">
                Percorso Personalizzato yt-dlp (Lascia vuoto per rilevamento automatico)
              </label>
              {systemStatus?.ytDlpValid && (
                <Badge variant="success" dot className="text-[10px]">
                  Rilevato: {systemStatus.ytDlpVer}
                </Badge>
              )}
            </div>
            <Input
              value={settings.ytDlpPath}
              onChange={(e) => setSettings({ ...settings, ytDlpPath: e.target.value })}
              placeholder="es: C:\tools\yt-dlp.exe o /usr/local/bin/yt-dlp"
              className="font-mono text-xs"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-200">
                Percorso Personalizzato FFmpeg (Lascia vuoto per rilevamento automatico)
              </label>
              {systemStatus?.ffmpegValid ? (
                <Badge variant="success" dot className="text-[10px]">
                  Rilevato: {systemStatus.ffmpegVer}
                </Badge>
              ) : (
                <Badge variant="warning" dot className="text-[10px]">
                  Assente
                </Badge>
              )}
            </div>
            <Input
              value={settings.ffmpegPath}
              onChange={(e) => setSettings({ ...settings, ffmpegPath: e.target.value })}
              placeholder="es: C:\ffmpeg\bin\ffmpeg.exe"
              className="font-mono text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Queue & Concurrency */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
            <CardTitle>Coda & Limiti di Rete</CardTitle>
          </div>
          <CardDescription>
            Controlla i download simultanei e il limite di banda
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-semibold text-zinc-900 mb-1 block dark:text-zinc-200">
                Download Simultanei Massimi
              </label>
              <Input
                type="number"
                min="1"
                max="10"
                value={settings.maxConcurrentDownloads}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxConcurrentDownloads: parseInt(e.target.value) || 3,
                  })
                }
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-900 mb-1 block dark:text-zinc-200">
                Frammenti Paralleli per Download (-N)
              </label>
              <Input
                type="number"
                min="1"
                max="16"
                value={settings.concurrentFragments}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    concurrentFragments: parseInt(e.target.value) || 4,
                  })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-semibold text-zinc-900 mb-1 block dark:text-zinc-200">
                Limite Velocità Download
              </label>
              <Input
                value={settings.rateLimit}
                onChange={(e) => setSettings({ ...settings, rateLimit: e.target.value })}
                placeholder="es: 10M, 500K (vuoto = illimitata)"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-900 mb-1 block dark:text-zinc-200">
                Proxy HTTP / SOCKS5
              </label>
              <Input
                value={settings.proxy}
                onChange={(e) => setSettings({ ...settings, proxy: e.target.value })}
                placeholder="socks5://127.0.0.1:1080"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Post-Processing & Metadata */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
            <CardTitle>Metadati & Sottotitoli Predefiniti</CardTitle>
          </div>
          <CardDescription>
            Comportamenti automatici di incorporamento tag e copertine
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Switch
            checked={settings.embedMetadata}
            onChange={(c) => setSettings({ ...settings, embedMetadata: c })}
            label="Incorpora Metadati & Tag ID3"
            description="Scrive artista, titolo, data di caricamento e descrizione nel file"
          />
          <Switch
            checked={settings.embedThumbnail}
            onChange={(c) => setSettings({ ...settings, embedThumbnail: c })}
            label="Incorpora Copertina / Thumbnail"
            description="Applica l'immagine di anteprima del video come copertina del file"
          />
          <Switch
            checked={settings.embedSubtitles}
            onChange={(c) => setSettings({ ...settings, embedSubtitles: c })}
            label="Incorpora Sottotitoli Automaticamente"
            description="Muxa i flussi dei sottotitoli all'interno del contenitore video"
          />
          <Switch
            checked={settings.splitChapters}
            onChange={(c) => setSettings({ ...settings, splitChapters: c })}
            label="Dividi per Capitoli Automaticamente"
            description="Taglia i file di output per ciascun capitolo rilevato"
          />
        </CardContent>
      </Card>

      {/* Section 5: Cookies & Authentication */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
            <CardTitle>Cookie & Autenticazione Browser</CardTitle>
          </div>
          <CardDescription>
            Estrai i cookie dal tuo browser per scaricare video con restrizioni di età o per soli abbonati
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-zinc-900 mb-1 block dark:text-zinc-200">
              Browser Predefinito per Estrazione Cookie
            </label>
            <select
              value={settings.cookiesBrowser}
              onChange={(e) => setSettings({ ...settings, cookiesBrowser: e.target.value })}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="none">Disabilitato</option>
              <option value="chrome">Google Chrome</option>
              <option value="edge">Microsoft Edge</option>
              <option value="firefox">Mozilla Firefox</option>
              <option value="brave">Brave Browser</option>
              <option value="opera">Opera</option>
              <option value="vivaldi">Vivaldi</option>
              <option value="safari">Safari</option>
            </select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
