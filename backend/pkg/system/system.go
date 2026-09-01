package system

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"time"
)

type MediaFile struct {
	Name         string    `json:"name"`
	Path         string    `json:"path"`
	Size         int64     `json:"size"`
	SizeFormatted string   `json:"sizeFormatted"`
	ModifiedAt   time.Time `json:"modifiedAt"`
	Extension    string    `json:"extension"`
	MediaType    string    `json:"mediaType"` // "video", "audio", "other"
}

type SystemStatus struct {
	OS          string `json:"os"`
	YtDlpPath   string `json:"ytDlpPath"`
	YtDlpVer    string `json:"ytDlpVer"`
	YtDlpValid  bool   `json:"ytDlpValid"`
	FFmpegPath  string `json:"ffmpegPath"`
	FFmpegVer   string `json:"ffmpegVer"`
	FFmpegValid bool   `json:"ffmpegValid"`
	DownloadDir string `json:"downloadDir"`
}

var (
	videoExtensions = map[string]bool{
		".mp4": true, ".mkv": true, ".webm": true, ".mov": true,
		".avi": true, ".flv": true, ".wmv": true, ".m4v": true, ".ts": true,
	}
	audioExtensions = map[string]bool{
		".mp3": true, ".m4a": true, ".flac": true, ".opus": true,
		".wav": true, ".aac": true, ".ogg": true, ".alac": true, ".wma": true,
	}
)

func ScanLibrary(dirPath string) ([]MediaFile, error) {
	if dirPath == "" {
		return nil, fmt.Errorf("directory path is empty")
	}

	if _, err := os.Stat(dirPath); os.IsNotExist(err) {
		return []MediaFile{}, nil
	}

	var results []MediaFile

	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info == nil || info.IsDir() {
			return nil
		}

		ext := strings.ToLower(filepath.Ext(path))
		mediaType := "other"
		if videoExtensions[ext] {
			mediaType = "video"
		} else if audioExtensions[ext] {
			mediaType = "audio"
		} else {
			return nil // Skip non-media files
		}

		results = append(results, MediaFile{
			Name:          info.Name(),
			Path:          path,
			Size:          info.Size(),
			SizeFormatted: formatBytes(info.Size()),
			ModifiedAt:    info.ModTime(),
			Extension:     ext,
			MediaType:     mediaType,
		})

		return nil
	})

	if err != nil {
		return nil, err
	}

	// Sort newest first
	sort.Slice(results, func(i, j int) bool {
		return results[i].ModifiedAt.After(results[j].ModifiedAt)
	})

	return results, nil
}

func OpenInFileManager(targetPath string) error {
	if targetPath == "" {
		return fmt.Errorf("path is empty")
	}

	info, err := os.Stat(targetPath)
	if err != nil {
		// If file doesn't exist, try parent folder
		parent := filepath.Dir(targetPath)
		if _, err2 := os.Stat(parent); err2 == nil {
			targetPath = parent
			info, _ = os.Stat(targetPath)
		} else {
			return fmt.Errorf("path not found: %s", targetPath)
		}
	}

	switch runtime.GOOS {
	case "windows":
		if info != nil && !info.IsDir() {
			// Highlight file in explorer
			return exec.Command("explorer.exe", "/select,", targetPath).Start()
		}
		return exec.Command("explorer.exe", targetPath).Start()
	case "darwin":
		if info != nil && !info.IsDir() {
			return exec.Command("open", "-R", targetPath).Start()
		}
		return exec.Command("open", targetPath).Start()
	default:
		// Linux
		dir := targetPath
		if info != nil && !info.IsDir() {
			dir = filepath.Dir(targetPath)
		}
		return exec.Command("xdg-open", dir).Start()
	}
}

func formatBytes(bytes int64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.2f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}
