package storage

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/google/uuid"
	"ytdlpgui/backend/pkg/config"
	"ytdlpgui/backend/pkg/ytdlp"
)

type Preset struct {
	ID          string                `json:"id"`
	Name        string                `json:"name"`
	Description string                `json:"description"`
	Icon        string                `json:"icon"`
	IsBuiltin   bool                  `json:"isBuiltin"`
	Options     ytdlp.DownloadOptions `json:"options"`
	CreatedAt   time.Time             `json:"createdAt"`
}

type StoredJob struct {
	ID              string                `json:"id"`
	URL             string                `json:"url"`
	Title           string                `json:"title"`
	Thumbnail       string                `json:"thumbnail"`
	Duration        int64                 `json:"duration"`
	DurationString  string                `json:"durationString"`
	Uploader        string                `json:"uploader"`
	Status          string                `json:"status"`
	OutputFile      string                `json:"outputFile"`
	Files           []string              `json:"files"`
	DownloadedBytes int64                 `json:"downloadedBytes"`
	TotalBytes      int64                 `json:"totalBytes"`
	Options         ytdlp.DownloadOptions `json:"options"`
	CreatedAt       time.Time             `json:"createdAt"`
	CompletedAt     *time.Time            `json:"completedAt,omitempty"`
	ErrorMessage    string                `json:"errorMessage,omitempty"`
}

type Store struct {
	mu           sync.RWMutex
	historyPath  string
	presetsPath  string
	jobs         map[string]StoredJob
	presets      map[string]Preset
}

var (
	storeInstance *Store
	storeOnce     sync.Once
)

func GetStore() *Store {
	storeOnce.Do(func() {
		cfgMgr := config.GetManager()
		dataDir := cfgMgr.GetDataDir()

		storeInstance = &Store{
			historyPath: filepath.Join(dataDir, "history.json"),
			presetsPath: filepath.Join(dataDir, "presets.json"),
			jobs:        make(map[string]StoredJob),
			presets:     make(map[string]Preset),
		}
		storeInstance.load()
	})
	return storeInstance
}

func (s *Store) load() {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Load History
	if data, err := os.ReadFile(s.historyPath); err == nil {
		var list []StoredJob
		if err := json.Unmarshal(data, &list); err == nil {
			for _, item := range list {
				s.jobs[item.ID] = item
			}
		}
	}

	// Load Presets
	if data, err := os.ReadFile(s.presetsPath); err == nil {
		var list []Preset
		if err := json.Unmarshal(data, &list); err == nil {
			for _, item := range list {
				s.presets[item.ID] = item
			}
		}
	}

	// Seed built-in presets if empty
	if len(s.presets) == 0 {
		s.seedDefaultPresets()
	}
}

func (s *Store) seedDefaultPresets() {
	defaults := []Preset{
		{
			ID:          "preset-best-video",
			Name:        "Best Quality Video (4K/HD)",
			Description: "Downloads the highest available video & audio, remuxed to MP4 with embedded metadata and thumbnail",
			Icon:        "film",
			IsBuiltin:   true,
			Options: ytdlp.DownloadOptions{
				Mode:               "video",
				VideoQuality:       "best",
				VideoContainer:     "mp4",
				EmbedMetadata:      true,
				EmbedThumbnail:     true,
				EmbedChapters:      true,
				SponsorBlockAction: "remove",
			},
			CreatedAt: time.Now(),
		},
		{
			ID:          "preset-1080p-mp4",
			Name:        "Standard 1080p MP4",
			Description: "Maximum 1080p Full HD MP4 for broad compatibility and fast download speeds",
			Icon:        "monitor",
			IsBuiltin:   true,
			Options: ytdlp.DownloadOptions{
				Mode:           "video",
				VideoQuality:   "1080",
				VideoContainer: "mp4",
				EmbedMetadata:  true,
				EmbedThumbnail: true,
			},
			CreatedAt: time.Now(),
		},
		{
			ID:          "preset-mp3-hq",
			Name:        "High Quality MP3 (320 kbps)",
			Description: "Extracts audio converted to 320 kbps MP3 with album art and ID3 metadata tags",
			Icon:        "music",
			IsBuiltin:   true,
			Options: ytdlp.DownloadOptions{
				Mode:           "audio",
				AudioFormat:    "mp3",
				AudioQuality:   "320k",
				EmbedMetadata:  true,
				EmbedThumbnail: true,
			},
			CreatedAt: time.Now(),
		},
		{
			ID:          "preset-flac-lossless",
			Name:        "Lossless Audio (FLAC)",
			Description: "Extracts pristine lossless FLAC audio with high resolution embedded metadata",
			Icon:        "disc",
			IsBuiltin:   true,
			Options: ytdlp.DownloadOptions{
				Mode:           "audio",
				AudioFormat:    "flac",
				AudioQuality:   "0",
				EmbedMetadata:  true,
				EmbedThumbnail: true,
			},
			CreatedAt: time.Now(),
		},
		{
			ID:          "preset-archival-mkv",
			Name:        "Full Archival MKV",
			Description: "Preserves all subtitles, auto-subs, original streams, chapters, and metadata in an MKV container",
			Icon:        "archive",
			IsBuiltin:   true,
			Options: ytdlp.DownloadOptions{
				Mode:               "video",
				VideoQuality:       "best",
				VideoContainer:     "mkv",
				EmbedMetadata:      true,
				EmbedThumbnail:     true,
				EmbedChapters:      true,
				EmbedSubtitles:     true,
				AutoSubtitles:      true,
				SubtitleLanguages:  "all",
				SponsorBlockAction: "mark",
			},
			CreatedAt: time.Now(),
		},
	}

	for _, p := range defaults {
		s.presets[p.ID] = p
	}
	_ = s.savePresetsUnsafe()
}

func (s *Store) SaveJob(job StoredJob) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.jobs[job.ID] = job
	_ = s.saveHistoryUnsafe()
}

func (s *Store) DeleteJob(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	delete(s.jobs, id)
	_ = s.saveHistoryUnsafe()
}

func (s *Store) ClearCompleted() {
	s.mu.Lock()
	defer s.mu.Unlock()

	for id, job := range s.jobs {
		if job.Status == "completed" || job.Status == "failed" || job.Status == "cancelled" {
			delete(s.jobs, id)
		}
	}
	_ = s.saveHistoryUnsafe()
}

func (s *Store) GetAllJobs() []StoredJob {
	s.mu.RLock()
	defer s.mu.RUnlock()

	list := make([]StoredJob, 0, len(s.jobs))
	for _, j := range s.jobs {
		list = append(list, j)
	}
	return list
}

func (s *Store) GetPresets() []Preset {
	s.mu.RLock()
	defer s.mu.RUnlock()

	list := make([]Preset, 0, len(s.presets))
	for _, p := range s.presets {
		list = append(list, p)
	}
	return list
}

func (s *Store) SavePreset(preset Preset) Preset {
	s.mu.Lock()
	defer s.mu.Unlock()

	if preset.ID == "" {
		preset.ID = "preset-" + uuid.New().String()[:8]
		preset.CreatedAt = time.Now()
	}
	s.presets[preset.ID] = preset
	_ = s.savePresetsUnsafe()
	return preset
}

func (s *Store) DeletePreset(id string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	if p, ok := s.presets[id]; ok {
		if p.IsBuiltin {
			return false // Do not delete builtin presets
		}
		delete(s.presets, id)
		_ = s.savePresetsUnsafe()
		return true
	}
	return false
}

func (s *Store) saveHistoryUnsafe() error {
	list := make([]StoredJob, 0, len(s.jobs))
	for _, j := range s.jobs {
		list = append(list, j)
	}
	data, err := json.MarshalIndent(list, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.historyPath, data, 0644)
}

func (s *Store) savePresetsUnsafe() error {
	list := make([]Preset, 0, len(s.presets))
	for _, p := range s.presets {
		list = append(list, p)
	}
	data, err := json.MarshalIndent(list, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.presetsPath, data, 0644)
}
