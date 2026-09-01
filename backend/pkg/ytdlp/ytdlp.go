package ytdlp

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	"ytdlpgui/backend/pkg/config"
)

type Info struct {
	Available  bool   `json:"available"`
	Path       string `json:"path"`
	Version    string `json:"version"`
	Executable string `json:"executable"`
}

var (
	infoMu     sync.RWMutex
	cachedInfo *Info
)

func GetExecutableName() string {
	if runtime.GOOS == "windows" {
		return "yt-dlp.exe"
	}
	return "yt-dlp"
}

func ResolveBinaryPath(customPath string) (string, error) {
	if customPath != "" {
		if _, err := os.Stat(customPath); err == nil {
			return customPath, nil
		}
		if path, err := exec.LookPath(customPath); err == nil {
			return path, nil
		}
	}

	execName := GetExecutableName()

	// 1. Check relative paths (current dir, parent dir, bin subdirectories)
	candidates := []string{
		execName,
		filepath.Join("bin", execName),
		filepath.Join("backend", "bin", execName),
		filepath.Join("..", execName),
		filepath.Join("..", "bin", execName),
		filepath.Join("..", "backend", "bin", execName),
	}

	for _, cand := range candidates {
		if _, err := os.Stat(cand); err == nil {
			abs, _ := filepath.Abs(cand)
			return abs, nil
		}
	}

	// 2. Check in application data dir
	cfgMgr := config.GetManager()
	appDataDir := cfgMgr.GetDataDir()
	appDataBinary := filepath.Join(appDataDir, "bin", execName)
	if _, err := os.Stat(appDataBinary); err == nil {
		return appDataBinary, nil
	}

	// 3. Check system PATH
	if path, err := exec.LookPath(execName); err == nil {
		return path, nil
	}
	if path, err := exec.LookPath("yt-dlp"); err == nil {
		return path, nil
	}

	return "", fmt.Errorf("yt-dlp binary not found")
}

func Detect(customPath string) Info {
	infoMu.Lock()
	defer infoMu.Unlock()

	path, err := ResolveBinaryPath(customPath)
	if err != nil {
		cachedInfo = &Info{
			Available:  false,
			Path:       "",
			Version:    "",
			Executable: GetExecutableName(),
		}
		return *cachedInfo
	}

	version := GetVersion(path)
	cachedInfo = &Info{
		Available:  true,
		Path:       path,
		Version:    version,
		Executable: GetExecutableName(),
	}
	return *cachedInfo
}

func GetVersion(binaryPath string) string {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, binaryPath, "--version")
	var out bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &out

	if err := cmd.Run(); err != nil {
		return "unknown"
	}

	return strings.TrimSpace(out.String())
}

func Update(binaryPath string) (string, error) {
	if binaryPath == "" {
		detected := Detect("")
		if !detected.Available {
			return "", fmt.Errorf("yt-dlp binary not installed")
		}
		binaryPath = detected.Path
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	cmd := exec.CommandContext(ctx, binaryPath, "-U")
	var out bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &out

	err := cmd.Run()
	output := strings.TrimSpace(out.String())
	if err != nil {
		return output, fmt.Errorf("update failed: %v (output: %s)", err, output)
	}

	// Invalidate cached info
	infoMu.Lock()
	cachedInfo = nil
	infoMu.Unlock()

	return output, nil
}

func InstallLatest() (string, error) {
	var downloadURL string
	execName := GetExecutableName()

	switch runtime.GOOS {
	case "windows":
		downloadURL = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
	case "darwin":
		downloadURL = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos"
	default:
		downloadURL = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp"
	}

	cfgMgr := config.GetManager()
	targetDir := filepath.Join(cfgMgr.GetDataDir(), "bin")
	if err := os.MkdirAll(targetDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create directory %s: %w", targetDir, err)
	}

	targetPath := filepath.Join(targetDir, execName)
	tempPath := targetPath + ".tmp"

	client := &http.Client{
		Timeout: 5 * time.Minute,
	}

	resp, err := client.Get(downloadURL)
	if err != nil {
		return "", fmt.Errorf("failed to download yt-dlp: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("download returned status %s", resp.Status)
	}

	out, err := os.OpenFile(tempPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0755)
	if err != nil {
		return "", fmt.Errorf("failed to create temp file: %w", err)
	}

	if _, err := io.Copy(out, resp.Body); err != nil {
		out.Close()
		_ = os.Remove(tempPath)
		return "", fmt.Errorf("failed writing downloaded binary: %w", err)
	}
	out.Close()

	// Replace existing binary
	_ = os.Remove(targetPath)
	if err := os.Rename(tempPath, targetPath); err != nil {
		return "", fmt.Errorf("failed replacing binary: %w", err)
	}

	if runtime.GOOS != "windows" {
		_ = os.Chmod(targetPath, 0755)
	}

	// Update configuration if not set
	cfg := cfgMgr.Get()
	if cfg.YtDlpPath == "" {
		cfg.YtDlpPath = targetPath
		_ = cfgMgr.Update(cfg)
	}

	infoMu.Lock()
	cachedInfo = nil
	infoMu.Unlock()

	return targetPath, nil
}
