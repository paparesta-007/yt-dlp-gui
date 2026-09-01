import { WSEventType, WSMessage } from '@/types'

type Listener = (msg: WSMessage) => void
type StatusListener = (connected: boolean) => void

class WebSocketClient {
  private ws: WebSocket | null = null
  private listeners: Map<WSEventType | '*', Set<Listener>> = new Map()
  private statusListeners: Set<StatusListener> = new Set()
  private reconnectTimeout: number | null = null
  private isConnecting = false
  private reconnectAttempts = 0
  public isConnected = false

  constructor() {
    this.listeners.set('*', new Set())
  }

  public connect() {
    if (this.ws || this.isConnecting) return

    this.isConnecting = true
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/ws`

    try {
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        this.isConnected = true
        this.isConnecting = false
        this.reconnectAttempts = 0
        this.notifyStatus(true)
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout)
          this.reconnectTimeout = null
        }
      }

      this.ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data)
          this.dispatch(msg)
        } catch {
          // Ignored
        }
      }

      this.ws.onclose = () => {
        this.isConnected = false
        this.isConnecting = false
        this.ws = null
        this.notifyStatus(false)
        this.scheduleReconnect()
      }

      this.ws.onerror = () => {
        this.isConnected = false
        this.isConnecting = false
        this.notifyStatus(false)
        if (this.ws) {
          try {
            this.ws.close()
          } catch {
            // Ignored
          }
        }
      }
    } catch {
      this.isConnecting = false
      this.notifyStatus(false)
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return
    this.reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(1.5, Math.min(this.reconnectAttempts, 5)), 6000)
    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectTimeout = null
      this.connect()
    }, delay)
  }

  public subscribe(eventType: WSEventType | '*', listener: Listener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    this.listeners.get(eventType)!.add(listener)

    return () => {
      this.listeners.get(eventType)?.delete(listener)
    }
  }

  public onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener)
    listener(this.isConnected)
    return () => {
      this.statusListeners.delete(listener)
    }
  }

  private notifyStatus(connected: boolean) {
    this.statusListeners.forEach((fn) => fn(connected))
  }

  private dispatch(msg: WSMessage) {
    const specific = this.listeners.get(msg.type)
    if (specific) {
      specific.forEach((fn) => fn(msg))
    }
    const wildcard = this.listeners.get('*')
    if (wildcard) {
      wildcard.forEach((fn) => fn(msg))
    }
  }
}

export const wsClient = new WebSocketClient()
