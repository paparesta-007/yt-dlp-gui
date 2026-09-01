package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
)

type SponsorBlockAction string

const (
	SponsorBlockActionRemove SponsorBlockAction = "remove"
	SponsorBlockActionMark   SponsorBlockAction = "mark"
	SponsorBlockActionNone   SponsorBlockAction = "none"
)

type Config struct {
	DownloadDir                   string             `json:"downloadDir"`
	TempDir                       string             `json:"tempDir"`
	YtDlpPath                     string             `json:"ytDlpPath"`
	FFmpegPath                    string             `json:"ffmpegPath"`
	MaxConcurrentDownloads        int                `json:"maxConcurrentDownloads"`
	DefaultFormat                 string             `json:"defaultFormat"`
	DefaultVideoContainer         string             `json:"defaultVideoContainer"`
	DefaultAudioFormat            string             `json:"defaultAudioFormat"`
	DefaultAudioQuality           string             `json:"defaultAudioQuality"`
	DefaultOutputTemplate         string             `json:"defaultOutputTemplate"`
	DefaultSponsorBlockCategories []string           `json:"defaultSponsorBlockCategories"`
	DefaultSponsorBlockAction     SponsorBlockAction `json:"defaultSponsorBlockAction"`
	CookiesBrowser                string             `json:"cookiesBrowser"`
	CookiesFilePath               string             `json:"cookiesFilePath"`
	Proxy                         string             `json:"proxy"`
	RateLimit                     string             `json:"rateLimit"`
	ConcurrentFragments           int                `json:"concurrentFragments"`
	EmbedMetadata                 bool               `json:"embedMetadata"`
	EmbedThumbnail                bool               `json:"embedThumbnail"`
	EmbedSubtitles                bool               `json:"embedSubtitles"`
	SubtitlesLanguages            string             `json:"subtitlesLanguages"`
	AutoSubtitles                 bool               `json:"autoSubtitles"`
	SplitChapters                 bool               `json:"splitChapters"`
	Theme                         string             `json:"theme"`
	CustomArgs                    []string           `json:"customArgs"`
	Port                          int                `json:"port"`
}

type Manager struct {
	mu         sync.RWMutex
	cfg        Config
	configPath string
}

var instance *Manager
var once sync.Once

func GetManager() *Manager {
	once.Do(func() {
		instance = &Manager{}
		instance.init()
	})
	return instance
}

func (m *Manager) init() {
	userHome, err := os.UserHomeDir()
	if err != nil {
		userHome = "."
	}

	appDataDir := filepath.Join(userHome, ".yt-dlp-gui")
	_ = os.MkdirAll(appDataDir, 0755)

	defaultDownloadDir := filepath.Join(userHome, "Downloads", "yt-dlp")
	_ = os.MkdirAll(defaultDownloadDir, 0755)

	m.configPath = filepath.Join(appDataDir, "config.json")

	// Default values
	m.cfg = Config{
		DownloadDir:                   defaultDownloadDir,
		TempDir:                       "",
		YtDlpPath:                     "",
		FFmpegPath:                    "",
		MaxConcurrentDownloads:        3,
		DefaultFormat:                 "bestvideo+bestaudio/best",
		DefaultVideoContainer:         "mp4",
		DefaultAudioFormat:            "mp3",
		DefaultAudioQuality:           "0",
		DefaultOutputTemplate:         "%(title)s [%(id)s].%(ext)s",
		DefaultSponsorBlockCategories: []string{"sponsor", "intro", "outro", "selfpromo"},
		DefaultSponsorBlockAction:     SponsorBlockActionRemove,
		CookiesBrowser:                "none",
		CookiesFilePath:               "",
		Proxy:                         "",
		RateLimit:                     "",
		ConcurrentFragments:           4,
		EmbedMetadata:                 true,
		EmbedThumbnail:                true,
		EmbedSubtitles:                false,
		SubtitlesLanguages:            "en.*,it.*,es.*,all",
		AutoSubtitles:                 false,
		SplitChapters:                 false,
		Theme:                         "dark",
		CustomArgs:                    []string{},
		Port:                          8080,
	}

	m.Load()
}

func (m *Manager) Get() Config {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.cfg
}

func (m *Manager) Update(newCfg Config) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.cfg = newCfg
	return m.saveUnsafe()
}

func (m *Manager) Load() {
	data, err := os.ReadFile(m.configPath)
	if err != nil {
		_ = m.saveUnsafe()
		return
	}

	var loaded Config
	if err := json.Unmarshal(data, &loaded); err == nil {
		if loaded.DownloadDir != "" {
			m.cfg.DownloadDir = loaded.DownloadDir
		}
		if loaded.MaxConcurrentDownloads > 0 {
			m.cfg.MaxConcurrentDownloads = loaded.MaxConcurrentDownloads
		}
		if loaded.DefaultFormat != "" {
			m.cfg.DefaultFormat = loaded.DefaultFormat
		}
		if loaded.DefaultVideoContainer != "" {
			m.cfg.DefaultVideoContainer = loaded.DefaultVideoContainer
		}
		if loaded.DefaultAudioFormat != "" {
			m.cfg.DefaultAudioFormat = loaded.DefaultAudioFormat
		}
		if loaded.DefaultOutputTemplate != "" {
			m.cfg.DefaultOutputTemplate = loaded.DefaultOutputTemplate
		}
		if loaded.Theme != "" {
			m.cfg.Theme = loaded.Theme
		}
		if loaded.Port > 0 {
			m.cfg.Port = loaded.Port
		}
		m.cfg.YtDlpPath = loaded.YtDlpPath
		m.cfg.FFmpegPath = loaded.FFmpegPath
		m.cfg.DefaultAudioQuality = loaded.DefaultAudioQuality
		m.cfg.DefaultSponsorBlockCategories = loaded.DefaultSponsorBlockCategories
		m.cfg.DefaultSponsorBlockAction = loaded.DefaultSponsorBlockAction
		m.cfg.CookiesBrowser = loaded.CookiesBrowser
		m.cfg.CookiesFilePath = loaded.CookiesFilePath
		m.cfg.Proxy = loaded.Proxy
		m.cfg.RateLimit = loaded.RateLimit
		if loaded.ConcurrentFragments > 0 {
			m.cfg.ConcurrentFragments = loaded.ConcurrentFragments
		}
		m.cfg.EmbedMetadata = loaded.EmbedMetadata
		m.cfg.EmbedThumbnail = loaded.EmbedThumbnail
		m.cfg.EmbedSubtitles = loaded.EmbedSubtitles
		m.cfg.SubtitlesLanguages = loaded.SubtitlesLanguages
		m.cfg.AutoSubtitles = loaded.AutoSubtitles
		m.cfg.SplitChapters = loaded.SplitChapters
		m.cfg.CustomArgs = loaded.CustomArgs
	}
}

func (m *Manager) saveUnsafe() error {
	data, err := json.MarshalIndent(m.cfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(m.configPath, data, 0644)
}

func (m *Manager) GetDataDir() string {
	return filepath.Dir(m.configPath)
}
