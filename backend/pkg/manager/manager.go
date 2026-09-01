package manager

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"ytdlpgui/backend/pkg/config"
	"ytdlpgui/backend/pkg/storage"
	"ytdlpgui/backend/pkg/ytdlp"
)

type Manager struct {
	mu          sync.RWMutex
	jobs        map[string]*Job
	queue       []string // Job IDs in queued state
	activeCount int
	stopChan    chan struct{}
	wakeChan    chan struct{}
}

var (
	mgrInstance *Manager
	mgrOnce     sync.Once
)

func GetManager() *Manager {
	mgrOnce.Do(func() {
		mgrInstance = &Manager{
			jobs:     make(map[string]*Job),
			queue:    make([]string, 0),
			stopChan: make(chan struct{}),
			wakeChan: make(chan struct{}, 1),
		}
		mgrInstance.init()
	})
	return mgrInstance
}

func (m *Manager) init() {
	// Restore completed/failed history from storage
	store := storage.GetStore()
	storedList := store.GetAllJobs()
	for _, sj := range storedList {
		status := JobStatus(sj.Status)
		if status == StatusDownloading || status == StatusPreparing || status == StatusPostprocessing {
			status = StatusFailed // Interrupted prior session
		}
		m.jobs[sj.ID] = &Job{
			ID:              sj.ID,
			URL:             sj.URL,
			Title:           sj.Title,
			Thumbnail:       sj.Thumbnail,
			Duration:        sj.Duration,
			DurationString:  sj.DurationString,
			Uploader:        sj.Uploader,
			Status:          status,
			Stage:           string(status),
			Percent:         100,
			DownloadedBytes: sj.DownloadedBytes,
			TotalBytes:      sj.TotalBytes,
			OutputFile:      sj.OutputFile,
			Files:           sj.Files,
			Options:         sj.Options,
			Logs:            []string{},
			ErrorMessage:    sj.ErrorMessage,
			CreatedAt:       sj.CreatedAt,
			CompletedAt:     sj.CompletedAt,
		}
	}

	go m.processQueue()
}

func (m *Manager) AddJob(opts ytdlp.DownloadOptions, meta *ytdlp.Metadata) (*Job, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	jobID := "job-" + uuid.New().String()

	title := opts.URL
	thumbnail := ""
	duration := int64(0)
	durationStr := ""
	uploader := ""

	if meta != nil {
		if meta.Title != "" {
			title = meta.Title
		}
		thumbnail = meta.Thumbnail
		duration = meta.Duration
		durationStr = meta.DurationString
		uploader = meta.Uploader
	}

	job := &Job{
		ID:             jobID,
		URL:            opts.URL,
		Title:          title,
		Thumbnail:      thumbnail,
		Duration:       duration,
		DurationString: durationStr,
		Uploader:       uploader,
		Status:         StatusQueued,
		Stage:          "Queued in download list",
		Percent:        0,
		Options:        opts,
		Logs:           make([]string, 0),
		Files:          make([]string, 0),
		CreatedAt:      time.Now(),
	}

	m.jobs[jobID] = job
	m.queue = append(m.queue, jobID)

	GetHub().Broadcast(EventJobAdded, job.GetSnapshot())
	m.wakeUpQueue()

	return job, nil
}

func (m *Manager) wakeUpQueue() {
	select {
	case m.wakeChan <- struct{}{}:
	default:
	}
}

func (m *Manager) processQueue() {
	for {
		m.mu.Lock()
		cfg := config.GetManager().Get()
		maxConcurrent := cfg.MaxConcurrentDownloads
		if maxConcurrent <= 0 {
			maxConcurrent = 3
		}

		if m.activeCount < maxConcurrent && len(m.queue) > 0 {
			// Pop next queued job
			nextID := m.queue[0]
			m.queue = m.queue[1:]

			job, exists := m.jobs[nextID]
			if exists && job.Status == StatusQueued {
				m.activeCount++
				go m.executeJob(job)
			}
		}
		m.mu.Unlock()

		select {
		case <-m.wakeChan:
		case <-time.After(1 * time.Second):
		case <-m.stopChan:
			return
		}
	}
}

func (m *Manager) executeJob(job *Job) {
	defer func() {
		m.mu.Lock()
		m.activeCount--
		m.mu.Unlock()
		m.wakeUpQueue()
	}()

	cfg := config.GetManager().Get()
	binaryPath, err := ytdlp.ResolveBinaryPath(cfg.YtDlpPath)
	if err != nil {
		job.mu.Lock()
		job.Status = StatusFailed
		job.ErrorMessage = fmt.Sprintf("yt-dlp executable missing: %v", err)
		job.mu.Unlock()
		GetHub().Broadcast(EventJobFailed, job.GetSnapshot())
		m.persistJob(job)
		return
	}

	ctx, cancel := context.WithCancel(context.Background())
	job.mu.Lock()
	job.cancelFunc = cancel
	job.Status = StatusDownloading
	job.Stage = "Preparing download..."
	now := time.Now()
	job.StartedAt = &now
	job.mu.Unlock()

	GetHub().Broadcast(EventJobUpdated, job.GetSnapshot())

	// Build arguments
	args := ytdlp.BuildArguments(job.Options, cfg)

	cmd := exec.CommandContext(ctx, binaryPath, args...)
	job.mu.Lock()
	job.cmd = cmd
	job.mu.Unlock()

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		job.mu.Lock()
		job.Status = StatusFailed
		job.ErrorMessage = fmt.Sprintf("failed creating stdout pipe: %v", err)
		job.mu.Unlock()
		GetHub().Broadcast(EventJobFailed, job.GetSnapshot())
		m.persistJob(job)
		return
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		job.mu.Lock()
		job.Status = StatusFailed
		job.ErrorMessage = fmt.Sprintf("failed creating stderr pipe: %v", err)
		job.mu.Unlock()
		GetHub().Broadcast(EventJobFailed, job.GetSnapshot())
		m.persistJob(job)
		return
	}

	if err := cmd.Start(); err != nil {
		job.mu.Lock()
		job.Status = StatusFailed
		job.ErrorMessage = fmt.Sprintf("failed to start process: %v", err)
		job.mu.Unlock()
		GetHub().Broadcast(EventJobFailed, job.GetSnapshot())
		m.persistJob(job)
		return
	}

	var wg sync.WaitGroup
	wg.Add(2)

	// Stream stdout
	go func() {
		defer wg.Done()
		m.readStream(job, stdout, false)
	}()

	// Stream stderr
	go func() {
		defer wg.Done()
		m.readStream(job, stderr, true)
	}()

	wg.Wait()
	cmdErr := cmd.Wait()

	job.mu.Lock()
	completedTime := time.Now()
	job.CompletedAt = &completedTime

	if ctx.Err() == context.Canceled {
		job.Status = StatusCancelled
		job.Stage = "Download cancelled"
		job.mu.Unlock()
		GetHub().Broadcast(EventJobCancelled, job.GetSnapshot())
	} else if cmdErr != nil {
		job.Status = StatusFailed
		if job.ErrorMessage == "" {
			job.ErrorMessage = fmt.Sprintf("Download ended with error: %v", cmdErr)
		}
		job.Stage = "Failed"
		job.mu.Unlock()
		GetHub().Broadcast(EventJobFailed, job.GetSnapshot())
	} else {
		job.Status = StatusCompleted
		job.Percent = 100
		job.Stage = "Finished successfully"
		job.ETAStr = "00:00"
		job.SpeedStr = ""

		// Check if destination output file exists
		if job.OutputFile != "" {
			if _, statErr := os.Stat(job.OutputFile); statErr == nil {
				if !containsString(job.Files, job.OutputFile) {
					job.Files = append(job.Files, job.OutputFile)
				}
			}
		}
		job.mu.Unlock()
		GetHub().Broadcast(EventJobCompleted, job.GetSnapshot())
	}

	m.persistJob(job)
}

func (m *Manager) readStream(job *Job, r io.Reader, isErr bool) {
	scanner := bufio.NewScanner(r)
	// Custom split to handle both \n and \r
	scanner.Split(scanLinesOrCarriageReturn)

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}

		job.AppendLog(line)
		GetHub().Broadcast(EventJobLog, JobLogPayload{
			JobID: job.ID,
			Line:  line,
		})

		update := ytdlp.ParseLine(line)
		if update != nil {
			job.mu.Lock()
			if update.Percent > 0 {
				job.Percent = update.Percent
			}
			if update.PercentStr != "" {
				job.Stage = fmt.Sprintf("Downloading %s", update.PercentStr)
			}
			if update.DownloadedBytes > 0 {
				job.DownloadedBytes = update.DownloadedBytes
			}
			if update.TotalBytes > 0 {
				job.TotalBytes = update.TotalBytes
			}
			if update.Speed > 0 {
				job.Speed = update.Speed
			}
			if update.SpeedStr != "" {
				job.SpeedStr = update.SpeedStr
			}
			if update.ETA > 0 {
				job.ETA = update.ETA
			}
			if update.ETAStr != "" {
				job.ETAStr = update.ETAStr
			}
			if update.Stage != "" {
				job.Stage = update.Stage
			}
			if update.OutputFile != "" {
				job.OutputFile = update.OutputFile
				if !containsString(job.Files, update.OutputFile) {
					job.Files = append(job.Files, update.OutputFile)
				}
			}

			// Throttle websocket updates to at most once per 150ms per job
			shouldBroadcast := time.Since(job.lastUpdate) > 150*time.Millisecond
			if shouldBroadcast {
				job.lastUpdate = time.Now()
			}
			job.mu.Unlock()

			if shouldBroadcast {
				GetHub().Broadcast(EventJobProgress, job.GetSnapshot())
			}
		}

		if isErr && strings.Contains(strings.ToLower(line), "error:") {
			job.mu.Lock()
			job.ErrorMessage = line
			job.mu.Unlock()
		}
	}
}

func (m *Manager) CancelJob(id string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()

	job, exists := m.jobs[id]
	if !exists {
		return false
	}

	job.mu.Lock()
	if job.Status == StatusQueued {
		job.Status = StatusCancelled
		job.Stage = "Cancelled"
		job.mu.Unlock()
		// Remove from queue slice
		for i, qid := range m.queue {
			if qid == id {
				m.queue = append(m.queue[:i], m.queue[i+1:]...)
				break
			}
		}
		GetHub().Broadcast(EventJobCancelled, job.GetSnapshot())
		m.persistJob(job)
		return true
	}

	if job.cancelFunc != nil {
		job.cancelFunc()
		job.Status = StatusCancelled
		job.Stage = "Cancelling..."
		job.mu.Unlock()
		return true
	}
	job.mu.Unlock()

	return false
}

func (m *Manager) RetryJob(id string) (*Job, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	job, exists := m.jobs[id]
	if !exists {
		return nil, fmt.Errorf("job not found")
	}

	job.mu.Lock()
	if job.Status == StatusDownloading || job.Status == StatusPreparing {
		job.mu.Unlock()
		return nil, fmt.Errorf("job is already running")
	}

	job.Status = StatusQueued
	job.Stage = "Queued for retry"
	job.Percent = 0
	job.DownloadedBytes = 0
	job.Speed = 0
	job.SpeedStr = ""
	job.ETAStr = ""
	job.ErrorMessage = ""
	job.Logs = make([]string, 0)
	job.RetryCount++
	job.mu.Unlock()

	m.queue = append(m.queue, job.ID)
	GetHub().Broadcast(EventJobUpdated, job.GetSnapshot())
	m.wakeUpQueue()

	return job, nil
}

func (m *Manager) DeleteJob(id string, deleteFiles bool) bool {
	m.mu.Lock()
	defer m.mu.Unlock()

	job, exists := m.jobs[id]
	if !exists {
		return false
	}

	job.mu.Lock()
	if job.cancelFunc != nil {
		job.cancelFunc()
	}

	if deleteFiles {
		for _, f := range job.Files {
			if f != "" {
				_ = os.Remove(f)
			}
		}
		if job.OutputFile != "" {
			_ = os.Remove(job.OutputFile)
		}
	}
	job.mu.Unlock()

	delete(m.jobs, id)
	for i, qid := range m.queue {
		if qid == id {
			m.queue = append(m.queue[:i], m.queue[i+1:]...)
			break
		}
	}

	storage.GetStore().DeleteJob(id)
	GetHub().Broadcast(EventJobRemoved, map[string]string{"id": id})
	return true
}

func (m *Manager) ClearCompleted() {
	m.mu.Lock()
	defer m.mu.Unlock()

	for id, job := range m.jobs {
		job.mu.RLock()
		status := job.Status
		job.mu.RUnlock()

		if status == StatusCompleted || status == StatusFailed || status == StatusCancelled {
			delete(m.jobs, id)
			GetHub().Broadcast(EventJobRemoved, map[string]string{"id": id})
		}
	}
	storage.GetStore().ClearCompleted()
}

func (m *Manager) GetAllJobs() []Job {
	m.mu.RLock()
	defer m.mu.RUnlock()

	list := make([]Job, 0, len(m.jobs))
	for _, j := range m.jobs {
		list = append(list, j.GetSnapshot())
	}
	return list
}

func (m *Manager) GetJob(id string) (*Job, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	j, exists := m.jobs[id]
	return j, exists
}

func (m *Manager) persistJob(job *Job) {
	snap := job.GetSnapshot()
	storage.GetStore().SaveJob(storage.StoredJob{
		ID:              snap.ID,
		URL:             snap.URL,
		Title:           snap.Title,
		Thumbnail:       snap.Thumbnail,
		Duration:        snap.Duration,
		DurationString:  snap.DurationString,
		Uploader:        snap.Uploader,
		Status:          string(snap.Status),
		OutputFile:      snap.OutputFile,
		Files:           snap.Files,
		DownloadedBytes: snap.DownloadedBytes,
		TotalBytes:      snap.TotalBytes,
		Options:         snap.Options,
		CreatedAt:       snap.CreatedAt,
		CompletedAt:     snap.CompletedAt,
		ErrorMessage:    snap.ErrorMessage,
	})
}

func scanLinesOrCarriageReturn(data []byte, atEOF bool) (advance int, token []byte, err error) {
	if atEOF && len(data) == 0 {
		return 0, nil, nil
	}
	for i := 0; i < len(data); i++ {
		if data[i] == '\n' || data[i] == '\r' {
			return i + 1, data[0:i], nil
		}
	}
	if atEOF {
		return len(data), data, nil
	}
	return 0, nil, nil
}

func containsString(slice []string, val string) bool {
	for _, s := range slice {
		if filepath.Clean(s) == filepath.Clean(val) {
			return true
		}
	}
	return false
}
