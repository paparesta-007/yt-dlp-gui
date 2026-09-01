package manager

import (
	"encoding/json"
	"sync"

	"github.com/gofiber/websocket/v2"
)

type EventType string

const (
	EventJobAdded     EventType = "job_added"
	EventJobUpdated   EventType = "job_updated"
	EventJobProgress  EventType = "job_progress"
	EventJobCompleted EventType = "job_completed"
	EventJobFailed    EventType = "job_failed"
	EventJobCancelled EventType = "job_cancelled"
	EventJobRemoved   EventType = "job_removed"
	EventJobLog       EventType = "job_log"
	EventSystemStatus EventType = "system_status"
)

type WSMessage struct {
	Type    EventType   `json:"type"`
	Payload interface{} `json:"payload"`
}

type JobLogPayload struct {
	JobID string `json:"jobId"`
	Line  string `json:"line"`
}

type Hub struct {
	clients    map[*websocket.Conn]bool
	broadcast  chan WSMessage
	register   chan *websocket.Conn
	unregister chan *websocket.Conn
	mu         sync.RWMutex
}

var (
	hubInstance *Hub
	hubOnce     sync.Once
)

func GetHub() *Hub {
	hubOnce.Do(func() {
		hubInstance = &Hub{
			clients:    make(map[*websocket.Conn]bool),
			broadcast:  make(chan WSMessage, 256),
			register:   make(chan *websocket.Conn),
			unregister: make(chan *websocket.Conn),
		}
		go hubInstance.run()
	})
	return hubInstance
}

func (h *Hub) run() {
	for {
		select {
		case conn := <-h.register:
			h.mu.Lock()
			h.clients[conn] = true
			h.mu.Unlock()

		case conn := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[conn]; ok {
				delete(h.clients, conn)
				conn.Close()
			}
			h.mu.Unlock()

		case msg := <-h.broadcast:
			data, err := json.Marshal(msg)
			if err != nil {
				continue
			}

			h.mu.RLock()
			for conn := range h.clients {
				go func(c *websocket.Conn, payload []byte) {
					_ = c.WriteMessage(websocket.TextMessage, payload)
				}(conn, data)
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) Register(conn *websocket.Conn) {
	h.register <- conn
}

func (h *Hub) Unregister(conn *websocket.Conn) {
	h.unregister <- conn
}

func (h *Hub) Broadcast(eventType EventType, payload interface{}) {
	select {
	case h.broadcast <- WSMessage{Type: eventType, Payload: payload}:
	default:
		// Drop if buffer full to avoid blocking worker routines
	}
}
