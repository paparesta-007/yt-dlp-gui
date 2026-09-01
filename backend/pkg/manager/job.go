package manager

import (
	"context"
	"os/exec"
	"sync"
	"time"

	"ytdlpgui/backend/pkg/ytdlp"
)

type JobStatus string

const (
	StatusQueued         JobStatus = "queued"
	StatusPreparing      JobStatus = "preparing"
	StatusDownloading    JobStatus = "downloading"
	StatusPostprocessing JobStatus = "postprocessing"
	StatusCompleted      JobStatus = "completed"
	StatusFailed         JobStatus = "failed"
	StatusCancelled      JobStatus = "cancelled"
	StatusPaused         JobStatus = "paused"
)

type Job struct {
	ID              string                `json:"id"`
	URL             string                `json:"url"`
	Title           string                `json:"title"`
	Thumbnail       string                `json:"thumbnail"`
	Duration        int64                 `json:"duration"`
	DurationString  string                `json:"durationString"`
	Uploader        string                `json:"uploader"`
	Status          JobStatus             `json:"status"`
	Stage           string                `json:"stage"`
	Percent         float64               `json:"percent"`
	Speed           float64               `json:"speed"`
	SpeedStr        string                `json:"speedStr"`
	ETA             int64                 `json:"eta"`
	ETAStr          string                `json:"etaStr"`
	DownloadedBytes int64                 `json:"downloadedBytes"`
	TotalBytes      int64                 `json:"totalBytes"`
	OutputFile      string                `json:"outputFile"`
	Files           []string              `json:"files"`
	Options         ytdlp.DownloadOptions `json:"options"`
	Logs            []string              `json:"logs"`
	ErrorMessage    string                `json:"errorMessage,omitempty"`
	CreatedAt       time.Time             `json:"createdAt"`
	StartedAt       *time.Time            `json:"startedAt,omitempty"`
	CompletedAt     *time.Time            `json:"completedAt,omitempty"`
	IsPlaylist      bool                  `json:"isPlaylist"`
	PlaylistIndex   int                   `json:"playlistIndex,omitempty"`
	PlaylistTotal   int                   `json:"playlistTotal,omitempty"`
	RetryCount      int                   `json:"retryCount"`

	mu         sync.RWMutex       `json:"-"`
	cancelFunc context.CancelFunc `json:"-"`
	cmd        *exec.Cmd          `json:"-"`
	lastUpdate time.Time          `json:"-"`
}

func (j *Job) AppendLog(line string) {
	j.mu.Lock()
	defer j.mu.Unlock()

	// Keep up to 500 lines
	if len(j.Logs) > 500 {
		j.Logs = j.Logs[len(j.Logs)-450:]
	}
	j.Logs = append(j.Logs, line)
}

func (j *Job) GetSnapshot() Job {
	j.mu.RLock()
	defer j.mu.RUnlock()

	logsCopy := make([]string, len(j.Logs))
	copy(logsCopy, j.Logs)

	filesCopy := make([]string, len(j.Files))
	copy(filesCopy, j.Files)

	return Job{
		ID:              j.ID,
		URL:             j.URL,
		Title:           j.Title,
		Thumbnail:       j.Thumbnail,
		Duration:        j.Duration,
		DurationString:  j.DurationString,
		Uploader:        j.Uploader,
		Status:          j.Status,
		Stage:           j.Stage,
		Percent:         j.Percent,
		Speed:           j.Speed,
		SpeedStr:        j.SpeedStr,
		ETA:             j.ETA,
		ETAStr:          j.ETAStr,
		DownloadedBytes: j.DownloadedBytes,
		TotalBytes:      j.TotalBytes,
		OutputFile:      j.OutputFile,
		Files:           filesCopy,
		Options:         j.Options,
		Logs:            logsCopy,
		ErrorMessage:    j.ErrorMessage,
		CreatedAt:       j.CreatedAt,
		StartedAt:       j.StartedAt,
		CompletedAt:     j.CompletedAt,
		IsPlaylist:      j.IsPlaylist,
		PlaylistIndex:   j.PlaylistIndex,
		PlaylistTotal:   j.PlaylistTotal,
		RetryCount:      j.RetryCount,
	}
}
