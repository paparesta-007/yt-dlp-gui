package ffmpeg

import (
	"bytes"
	"os/exec"
	"regexp"
	"strings"
	"sync"
)

type Info struct {
	Available bool   `json:"available"`
	Path      string `json:"path"`
	Version   string `json:"version"`
}

var (
	cachedInfo *Info
	mu         sync.Mutex
)

func Detect(customPath string) Info {
	mu.Lock()
	defer mu.Unlock()

	executable := "ffmpeg"
	if customPath != "" {
		executable = customPath
	}

	path, err := exec.LookPath(executable)
	if err != nil {
		cachedInfo = &Info{
			Available: false,
			Path:      "",
			Version:   "",
		}
		return *cachedInfo
	}

	cmd := exec.Command(path, "-version")
	var out bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &out

	info := Info{
		Available: true,
		Path:      path,
		Version:   "unknown",
	}

	if err := cmd.Run(); err == nil {
		re := regexp.MustCompile(`ffmpeg version ([^\s]+)`)
		matches := re.FindStringSubmatch(out.String())
		if len(matches) > 1 {
			info.Version = matches[1]
		} else {
			lines := strings.Split(out.String(), "\n")
			if len(lines) > 0 {
				info.Version = strings.TrimSpace(lines[0])
			}
		}
	}

	cachedInfo = &info
	return info
}
