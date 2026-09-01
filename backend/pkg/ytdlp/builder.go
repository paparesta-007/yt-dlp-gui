package ytdlp

import (
	"fmt"
	"path/filepath"
	"strings"

	"ytdlpgui/backend/pkg/config"
)

type DownloadOptions struct {
	URL                    string   `json:"url"`
	Mode                   string   `json:"mode"` // "video", "audio", "custom"
	OutputFolder           string   `json:"outputFolder,omitempty"`
	OutputTemplate         string   `json:"outputTemplate,omitempty"`
	FormatID               string   `json:"formatId,omitempty"`
	VideoQuality           string   `json:"videoQuality,omitempty"` // "best", "2160", "1440", "1080", "720", "480", "360"
	VideoContainer         string   `json:"videoContainer,omitempty"` // "mp4", "mkv", "webm", "mov"
	RecodeVideo            string   `json:"recodeVideo,omitempty"`
	AudioFormat            string   `json:"audioFormat,omitempty"` // "mp3", "m4a", "flac", "opus", "wav"
	AudioQuality           string   `json:"audioQuality,omitempty"` // "0", "320k", "256k", "192k", "128k"
	KeepVideo              bool     `json:"keepVideo,omitempty"`
	EmbedMetadata          bool     `json:"embedMetadata"`
	EmbedThumbnail         bool     `json:"embedThumbnail"`
	EmbedChapters          bool     `json:"embedChapters"`
	WriteThumbnail         bool     `json:"writeThumbnail,omitempty"`
	WriteDescription       bool     `json:"writeDescription,omitempty"`
	WriteInfoJson          bool     `json:"writeInfoJson,omitempty"`
	WriteComments          bool     `json:"writeComments,omitempty"`
	DownloadSubtitles      bool     `json:"downloadSubtitles,omitempty"`
	EmbedSubtitles         bool     `json:"embedSubtitles,omitempty"`
	AutoSubtitles          bool     `json:"autoSubtitles,omitempty"`
	SubtitleLanguages      string   `json:"subtitleLanguages,omitempty"`
	ConvertSubtitles       string   `json:"convertSubtitles,omitempty"`
	SponsorBlockAction     string   `json:"sponsorBlockAction,omitempty"` // "remove", "mark", "none"
	SponsorBlockCategories []string `json:"sponsorBlockCategories,omitempty"`
	SplitChapters          bool     `json:"splitChapters,omitempty"`
	SectionStart           string   `json:"sectionStart,omitempty"`
	SectionEnd             string   `json:"sectionEnd,omitempty"`
	PlaylistItems          string   `json:"playlistItems,omitempty"`
	PlaylistStart          int      `json:"playlistStart,omitempty"`
	PlaylistEnd            int      `json:"playlistEnd,omitempty"`
	PlaylistReverse        bool     `json:"playlistReverse,omitempty"`
	MaxDownloads           int      `json:"maxDownloads,omitempty"`
	RateLimit              string   `json:"rateLimit,omitempty"`
	ConcurrentFragments    int      `json:"concurrentFragments,omitempty"`
	CookiesBrowser         string   `json:"cookiesBrowser,omitempty"`
	CookiesFile            string   `json:"cookiesFile,omitempty"`
	Proxy                  string   `json:"proxy,omitempty"`
	GeoBypass              bool     `json:"geoBypass,omitempty"`
	CustomArgs             []string `json:"customArgs,omitempty"`
}

func BuildArguments(opts DownloadOptions, cfg config.Config) []string {
	var args []string

	// General Flags & Streaming Progress Format
	args = append(args,
		"--newline",
		"--progress",
		"--progress-template", "download:{\"status\":\"downloading\",\"downloaded_bytes\":%(progress.downloaded_bytes)s,\"total_bytes\":%(progress.total_bytes)s,\"total_bytes_estimate\":%(progress.total_bytes_estimate)s,\"speed\":%(progress.speed)s,\"eta\":%(progress.eta)s,\"percent\":\"%(progress._percent_str)s\",\"speed_str\":\"%(progress._speed_str)s\",\"eta_str\":\"%(progress._eta_str)s\"}",
		"--progress-template", "postprocess:{\"status\":\"postprocessing\",\"postprocessor\":\"%(progress.postprocessor)s\"}",
	)

	// Output Path & Template
	outputFolder := opts.OutputFolder
	if outputFolder == "" {
		outputFolder = cfg.DownloadDir
	}
	outputTemplate := opts.OutputTemplate
	if outputTemplate == "" {
		outputTemplate = cfg.DefaultOutputTemplate
	}
	fullOutputPattern := filepath.Join(outputFolder, outputTemplate)
	args = append(args, "-o", fullOutputPattern)

	// Mode specific formats
	if opts.Mode == "audio" {
		args = append(args, "-x")
		audioFmt := opts.AudioFormat
		if audioFmt == "" {
			audioFmt = cfg.DefaultAudioFormat
		}
		if audioFmt != "" {
			args = append(args, "--audio-format", audioFmt)
		}
		audioQual := opts.AudioQuality
		if audioQual == "" {
			audioQual = cfg.DefaultAudioQuality
		}
		if audioQual != "" {
			args = append(args, "--audio-quality", audioQual)
		}
		if opts.KeepVideo {
			args = append(args, "-k")
		}
	} else if opts.FormatID != "" {
		args = append(args, "-f", opts.FormatID)
	} else if opts.VideoQuality != "" && opts.VideoQuality != "best" {
		// Specific max height
		args = append(args, "-f", fmt.Sprintf("bestvideo[height<=%s]+bestaudio/best[height<=%s]/best", opts.VideoQuality, opts.VideoQuality))
	} else {
		// Video mode default
		format := cfg.DefaultFormat
		if format == "" {
			format = "bestvideo+bestaudio/best"
		}
		args = append(args, "-f", format)
	}

	// Remux / Container Format
	if opts.Mode != "audio" {
		container := opts.VideoContainer
		if container == "" {
			container = cfg.DefaultVideoContainer
		}
		if container != "" && container != "none" {
			args = append(args, "--remux-video", container)
		}
		if opts.RecodeVideo != "" && opts.RecodeVideo != "none" {
			args = append(args, "--recode-video", opts.RecodeVideo)
		}
	}

	// Subtitles
	if opts.DownloadSubtitles || opts.EmbedSubtitles {
		args = append(args, "--write-sub")
		if opts.AutoSubtitles || cfg.AutoSubtitles {
			args = append(args, "--write-auto-sub")
		}
		subLangs := opts.SubtitleLanguages
		if subLangs == "" {
			subLangs = cfg.SubtitlesLanguages
		}
		if subLangs != "" {
			args = append(args, "--sub-langs", subLangs)
		}
		if opts.EmbedSubtitles || cfg.EmbedSubtitles {
			args = append(args, "--embed-subs")
		}
		if opts.ConvertSubtitles != "" && opts.ConvertSubtitles != "none" {
			args = append(args, "--convert-subs", opts.ConvertSubtitles)
		}
	}

	// Metadata & Thumbnails
	if opts.EmbedMetadata || cfg.EmbedMetadata {
		args = append(args, "--embed-metadata")
	}
	if opts.EmbedThumbnail || cfg.EmbedThumbnail {
		args = append(args, "--embed-thumbnail")
	}
	if opts.EmbedChapters {
		args = append(args, "--embed-chapters")
	}
	if opts.WriteThumbnail {
		args = append(args, "--write-thumbnail")
	}
	if opts.WriteDescription {
		args = append(args, "--write-description")
	}
	if opts.WriteInfoJson {
		args = append(args, "--write-info-json")
	}
	if opts.WriteComments {
		args = append(args, "--write-comments")
	}

	// SponsorBlock
	sponsorAction := opts.SponsorBlockAction
	if sponsorAction == "" {
		sponsorAction = string(cfg.DefaultSponsorBlockAction)
	}
	if sponsorAction != "" && sponsorAction != "none" {
		cats := opts.SponsorBlockCategories
		if len(cats) == 0 {
			cats = cfg.DefaultSponsorBlockCategories
		}
		catList := strings.Join(cats, ",")
		if catList == "" {
			catList = "all"
		}
		if sponsorAction == "remove" {
			args = append(args, "--sponsorblock-remove", catList)
		} else if sponsorAction == "mark" {
			args = append(args, "--sponsorblock-mark", catList)
		}
	}

	// Chapters & Sections
	if opts.SplitChapters || cfg.SplitChapters {
		args = append(args, "--split-chapters")
	}
	if opts.SectionStart != "" || opts.SectionEnd != "" {
		start := opts.SectionStart
		if start == "" {
			start = "0"
		}
		end := opts.SectionEnd
		if end == "" {
			end = "inf"
		}
		args = append(args, "--download-sections", fmt.Sprintf("*%s-%s", start, end))
	}

	// Playlists
	if opts.PlaylistItems != "" {
		args = append(args, "--playlist-items", opts.PlaylistItems)
	}
	if opts.PlaylistStart > 0 {
		args = append(args, "--playlist-start", fmt.Sprintf("%d", opts.PlaylistStart))
	}
	if opts.PlaylistEnd > 0 {
		args = append(args, "--playlist-end", fmt.Sprintf("%d", opts.PlaylistEnd))
	}
	if opts.PlaylistReverse {
		args = append(args, "--playlist-reverse")
	}
	if opts.MaxDownloads > 0 {
		args = append(args, "--max-downloads", fmt.Sprintf("%d", opts.MaxDownloads))
	}

	// Network & Rate Limits
	rateLimit := opts.RateLimit
	if rateLimit == "" {
		rateLimit = cfg.RateLimit
	}
	if rateLimit != "" {
		args = append(args, "--limit-rate", rateLimit)
	}

	fragments := opts.ConcurrentFragments
	if fragments <= 0 {
		fragments = cfg.ConcurrentFragments
	}
	if fragments > 0 {
		args = append(args, "-N", fmt.Sprintf("%d", fragments))
	}

	// Cookies
	cookiesBrowser := opts.CookiesBrowser
	if cookiesBrowser == "" {
		cookiesBrowser = cfg.CookiesBrowser
	}
	if cookiesBrowser != "" && cookiesBrowser != "none" {
		args = append(args, "--cookies-from-browser", cookiesBrowser)
	} else {
		cookiesFile := opts.CookiesFile
		if cookiesFile == "" {
			cookiesFile = cfg.CookiesFilePath
		}
		if cookiesFile != "" {
			args = append(args, "--cookies", cookiesFile)
		}
	}

	// Proxy
	proxy := opts.Proxy
	if proxy == "" {
		proxy = cfg.Proxy
	}
	if proxy != "" {
		args = append(args, "--proxy", proxy)
	}

	// Geo Bypass
	if opts.GeoBypass {
		args = append(args, "--geo-bypass")
	}

	// Custom Arguments
	for _, arg := range cfg.CustomArgs {
		if strings.TrimSpace(arg) != "" {
			args = append(args, strings.TrimSpace(arg))
		}
	}
	for _, arg := range opts.CustomArgs {
		if strings.TrimSpace(arg) != "" {
			args = append(args, strings.TrimSpace(arg))
		}
	}

	// Add URL at the end
	args = append(args, opts.URL)

	return args
}
