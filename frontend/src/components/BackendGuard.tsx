import React, { useState, useEffect, useCallback } from 'react'
import { ServerOff, RefreshCw, AlertCircle, Wifi, ShieldAlert } from 'lucide-react'
import { api } from '@/lib/api'
import { wsClient } from '@/lib/ws'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface BackendGuardProps {
  children: React.ReactNode
}

export function BackendGuard({ children }: BackendGuardProps) {
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState<boolean>(false)
  const [retryCount, setRetryCount] = useState<number>(0)
  const [lastError, setLastError] = useState<string | null>(null)

  const checkConnection = useCallback(async () => {
    setIsChecking(true)
    try {
      await api.getSystemStatus()
      setIsConnected(true)
      setLastError(null)
      wsClient.connect()
    } catch (err: any) {
      setIsConnected(false)
      setLastError(err.message || 'Impossibile contattare il server locale.')
    } finally {
      setIsChecking(false)
    }
  }, [])

  useEffect(() => {
    // Initial check
    checkConnection()

    // Subscribe to WS connection status
    const unsub = wsClient.onStatusChange((connected) => {
      if (connected) {
        setIsConnected(true)
        setLastError(null)
      } else {
        setIsConnected(false)
      }
    })

    // Background interval check if disconnected
    const interval = setInterval(() => {
      if (!isConnected) {
        setRetryCount((c) => c + 1)
        checkConnection()
      }
    }, 4000)

    return () => {
      unsub()
      clearInterval(interval)
    }
  }, [isConnected, checkConnection])

  if (isConnected === null || isChecking && isConnected === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3 text-center">
          <RefreshCw className="h-6 w-6 animate-spin text-zinc-400" />
          <p className="text-xs font-medium text-zinc-500">Connessione al backend locale in corso...</p>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-zinc-100/90 backdrop-blur-sm p-4 dark:bg-zinc-950/95">
        <Card className="w-full max-w-md border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400">
              <ServerOff className="h-6 w-6 stroke-[1.75]" />
            </div>
            <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              Backend Non Collegato
            </CardTitle>
            <CardDescription className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mt-1">
              Impossibile stabilire una connessione con il server yt-dlp locale. L'applicazione non può funzionare finché il backend non è attivo.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3 pt-2">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs space-y-1.5 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Stato Connessione:</span>
                <Badge variant="destructive" dot>
                  Offline
                </Badge>
              </div>
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-zinc-500 font-sans">Endpoint API:</span>
                <span className="text-zinc-700 dark:text-zinc-300">http://localhost:3001</span>
              </div>
              {lastError && (
                <p className="text-[11px] text-red-600 dark:text-red-400 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                  {lastError}
                </p>
              )}
            </div>

            <p className="text-[11px] text-zinc-400 text-center leading-relaxed">
              Tentativo di riconnessione automatica in corso... (tentativo #{retryCount + 1})
            </p>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 pt-0">
            <Button
              variant="default"
              className="w-full h-9 font-semibold"
              onClick={checkConnection}
              isLoading={isChecking}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Riprova Connessione Ora
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
