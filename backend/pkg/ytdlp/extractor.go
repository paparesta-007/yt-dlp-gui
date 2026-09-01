package ytdlp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"sort"
	"strconv"
	"strings"
	"time"

	"ytdlpgui/backend/pkg/config"
)

type ExtractOptions struct {
	URL            string `json:"url"`
	CookiesBrowser string `json:"cookiesBrowser,omitempty"`
	CookiesFile    string `json:"cookiesFile,omitempty"`
	Proxy          string `json:"proxy,omitempty"`
	IncludeFormats bool   `json:"includeFormats"`
	FlatPlaylist   bool   `json:"flatPlaylist"`
	TimeoutSeconds int    `json:"timeoutSeconds,omitempty"`
}

func ExtractMetadata(opts ExtractOptions) (*Metadata, error) {
	cfgMgr := config.GetManager()
	cfg := cfgMgr.Get()

	binaryPath, err := ResolveBinaryPath(cfg.YtDlpPath)
	if err != nil {
		return nil, fmt.Errorf("yt-dlp executable not found: %w", err)
	}

	timeout := 45 * time.Second
	if opts.TimeoutSeconds > 0 {
		timeout = time.Duration(opts.TimeoutSeconds) * time.Second
	}

	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	args := []string{
		"--dump-single-json",
		"--no-warnings",
		"--skip-download",
	}

	if opts.FlatPlaylist {
		args = append(args, "--flat-playlist")
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

	args = append(args, opts.URL)

	cmd := exec.CommandContext(ctx, binaryPath, args...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		errMsg := strings.TrimSpace(stderr.String())
		if errMsg == "" {
			errMsg = err.Error()
		}
		return nil, fmt.Errorf("metadata extraction failed: %s", errMsg)
	}

	var raw RawMetadata
	if err := json.Unmarshal(stdout.Bytes(), &raw); err != nil {
		return nil, fmt.Errorf("failed to parse yt-dlp json output: %w", err)
	}

	result := transformRawMetadata(&raw)
	return result, nil
}

func transformRawMetadata(raw *RawMetadata) *Metadata {
	isPlaylist := raw.Type == "playlist" || len(raw.Entries) > 0

	meta := &Metadata{
		ID:             raw.ID,
		Title:          raw.Title,
		Description:    raw.Description,
		Thumbnail:      raw.Thumbnail,
		Duration:       raw.Duration,
		DurationString: raw.DurationString,
		Uploader:       raw.Uploader,
		UploaderURL:    raw.UploaderURL,
		Channel:        raw.Channel,
		ChannelURL:     raw.ChannelURL,
		UploadDate:     raw.UploadDate,
		ViewCount:      raw.ViewCount,
		LikeCount:      raw.LikeCount,
		WebpageURL:     raw.WebpageURL,
		Extractor:      raw.Extractor,
		IsPlaylist:     isPlaylist,
		PlaylistCount:  len(raw.Entries),
		PlaylistTitle:  raw.Title,
	}

	if meta.DurationString == "" && meta.Duration > 0 {
		meta.DurationString = formatDuration(meta.Duration)
	}

	// Format list
	if len(raw.Formats) > 0 {
		formats := make([]FormatItem, 0, len(raw.Formats))
		for _, rf := range raw.Formats {
			fps := parseInterfaceFloat(rf.FPS)
			tbr := parseInterfaceFloat(rf.TBR)
			vbr := parseInterfaceFloat(rf.VBR)
			abr := parseInterfaceFloat(rf.ABR)

			isVideo := rf.VCodec != "" && rf.VCodec != "none"
			isAudio := rf.ACodec != "" && rf.ACodec != "none"
			isVideoOnly := isVideo && !isAudio
			isAudioOnly := isAudio && !isVideo

			var qualityLabel string
			if rf.Resolution != "" {
				qualityLabel = rf.Resolution
			} else if rf.Height > 0 {
				qualityLabel = fmt.Sprintf("%dp", rf.Height)
			} else if isAudioOnly && abr > 0 {
				qualityLabel = fmt.Sprintf("%.0f kbps audio", abr)
			} else {
				qualityLabel = rf.Ext
			}

			formats = append(formats, FormatItem{
				FormatID:       rf.FormatID,
				FormatNote:     rf.FormatNote,
				Ext:            rf.Ext,
				Resolution:     rf.Resolution,
				Width:          rf.Width,
				Height:         rf.Height,
				FPS:            fps,
				VCodec:         rf.VCodec,
				ACodec:         rf.ACodec,
				TBR:            tbr,
				VBR:            vbr,
				ABR:            abr,
				Filesize:       rf.Filesize,
				FilesizeApprox: rf.FilesizeApprox,
				Protocol:       rf.Protocol,
				IsVideo:        isVideo,
				IsAudio:        isAudio,
				IsVideoOnly:    isVideoOnly,
				IsAudioOnly:    isAudioOnly,
				QualityLabel:   qualityLabel,
			})
		}
		// Sort formats: video by height desc, audio by abr desc
		sort.SliceStable(formats, func(i, j int) bool {
			if formats[i].IsVideo && formats[j].IsVideo {
				if formats[i].Height != formats[j].Height {
					return formats[i].Height > formats[j].Height
				}
				return formats[i].TBR > formats[j].TBR
			}
			if formats[i].IsAudioOnly && formats[j].IsAudioOnly {
				return formats[i].ABR > formats[j].ABR
			}
			return formats[i].IsVideo
		})
		meta.Formats = formats
	}

	// Subtitles
	subs := make([]SubtitleItem, 0)
	for lang, tracks := range raw.Subtitles {
		name := lang
		ext := "vtt"
		if len(tracks) > 0 {
			if tracks[0].Name != "" {
				name = tracks[0].Name
			}
			if tracks[0].Ext != "" {
				ext = tracks[0].Ext
			}
		}
		subs = append(subs, SubtitleItem{
			Language: lang,
			Name:     name,
			Ext:      ext,
			IsAuto:   false,
		})
	}
	for lang, tracks := range raw.AutomaticCaptions {
		name := lang + " (auto)"
		ext := "vtt"
		if len(tracks) > 0 {
			if tracks[0].Name != "" {
				name = tracks[0].Name + " (auto)"
			}
			if tracks[0].Ext != "" {
				ext = tracks[0].Ext
			}
		}
		subs = append(subs, SubtitleItem{
			Language: lang,
			Name:     name,
			Ext:      ext,
			IsAuto:   true,
		})
	}
	sort.Slice(subs, func(i, j int) bool {
		if subs[i].IsAuto != subs[j].IsAuto {
			return !subs[i].IsAuto
		}
		return subs[i].Language < subs[j].Language
	})
	meta.Subtitles = subs

	// Chapters
	if len(raw.Chapters) > 0 {
		chapters := make([]ChapterItem, 0, len(raw.Chapters))
		for _, rc := range raw.Chapters {
			chapters = append(chapters, ChapterItem{
				StartTime: rc.StartTime,
				EndTime:   rc.EndTime,
				Title:     rc.Title,
			})
		}
		meta.Chapters = chapters
	}

	// Playlist entries
	if len(raw.Entries) > 0 {
		entries := make([]PlaylistEntry, 0, len(raw.Entries))
		for idx, entry := range raw.Entries {
			durStr := entry.DurationString
			if durStr == "" && entry.Duration > 0 {
				durStr = formatDuration(entry.Duration)
			}
			url := entry.WebpageURL
			if url == "" && entry.ID != "" {
				url = entry.ID
			}
			entries = append(entries, PlaylistEntry{
				ID:             entry.ID,
				Title:          entry.Title,
				URL:            url,
				Duration:       entry.Duration,
				DurationString: durStr,
				Thumbnail:      entry.Thumbnail,
				Uploader:       entry.Uploader,
				Index:          idx + 1,
			})
		}
		meta.Entries = entries
	}

	return meta
}

func parseInterfaceFloat(val interface{}) float64 {
	if val == nil {
		return 0
	}
	switch v := val.(type) {
	case float64:
		return v
	case float32:
		return float64(v)
	case int:
		return float64(v)
	case int64:
		return float64(v)
	case string:
		f, err := strconv.ParseFloat(v, 64)
		if err == nil {
			return f
		}
	}
	return 0
}

func formatDuration(seconds int64) string {
	h := seconds / 3600
	m := (seconds % 3600) / 60
	s := seconds % 60
	if h > 0 {
		return fmt.Sprintf("%02d:%02d:%02d", h, m, s)
	}
	return fmt.Sprintf("%02d:%02d", m, s)
}

func SearchYouTube(query string, limit int) ([]SearchResultItem, error) {
	if limit <= 0 {
		limit = 20
	}
	cfgMgr := config.GetManager()
	cfg := cfgMgr.Get()

	binaryPath, err := ResolveBinaryPath(cfg.YtDlpPath)
	if err != nil {
		return nil, fmt.Errorf("yt-dlp executable not found: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	args := []string{
		fmt.Sprintf("ytsearch%d:%s", limit, query),
		"--dump-json",
		"--flat-playlist",
		"--skip-download",
		"--no-warnings",
		"--ignore-errors",
	}

	cmd := exec.CommandContext(ctx, binaryPath, args...)
	HideWindow(cmd)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil && stdout.Len() == 0 {
		return nil, fmt.Errorf("yt-dlp search error: %v, stderr: %s", err, stderr.String())
	}

	lines := strings.Split(stdout.String(), "\n")
	results := make([]SearchResultItem, 0, len(lines))

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		var raw map[string]interface{}
		if err := json.Unmarshal([]byte(line), &raw); err != nil {
			continue
		}

		id, _ := raw["id"].(string)
		if id == "" {
			if u, ok := raw["url"].(string); ok {
				id = u
			}
		}
		if id == "" {
			continue
		}

		title, _ := raw["title"].(string)
		if title == "" {
			title = "Video senza titolo"
		}

		webpageURL, _ := raw["webpage_url"].(string)
		if webpageURL == "" {
			if strings.HasPrefix(id, "http") {
				webpageURL = id
			} else {
				webpageURL = fmt.Sprintf("https://www.youtube.com/watch?v=%s", id)
			}
		}

		duration := int64(parseInterfaceFloat(raw["duration"]))
		durationStr, _ := raw["duration_string"].(string)
		if durationStr == "" && duration > 0 {
			durationStr = formatDuration(duration)
		}

		thumbnail, _ := raw["thumbnail"].(string)
		if thumbnail == "" && !strings.HasPrefix(id, "http") {
			thumbnail = fmt.Sprintf("https://i.ytimg.com/vi/%s/hqdefault.jpg", id)
		}

		uploader, _ := raw["uploader"].(string)
		channel, _ := raw["channel"].(string)
		if channel == "" {
			channel = uploader
		}
		if uploader == "" {
			uploader = channel
		}

		viewCount := int64(parseInterfaceFloat(raw["view_count"]))
		uploadDate, _ := raw["upload_date"].(string)

		results = append(results, SearchResultItem{
			ID:             id,
			Title:          title,
			URL:            webpageURL,
			Thumbnail:      thumbnail,
			Duration:       duration,
			DurationString: durationStr,
			Uploader:       uploader,
			Channel:        channel,
			ViewCount:      viewCount,
			UploadDate:     uploadDate,
		})
	}

	return results, nil
}
