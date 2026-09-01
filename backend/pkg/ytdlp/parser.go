package ytdlp

import (
	"encoding/json"
	"regexp"
	"strconv"
	"strings"
)

type ProgressUpdate struct {
	Status             string  `json:"status"` // "downloading", "postprocessing", "merging", "embedding", "finished"
	Percent            float64 `json:"percent"`
	PercentStr         string  `json:"percent_str"`
	DownloadedBytes    int64   `json:"downloaded_bytes"`
	TotalBytes         int64   `json:"total_bytes"`
	TotalBytesEstimate int64   `json:"total_bytes_estimate"`
	Speed              float64 `json:"speed"`
	SpeedStr           string  `json:"speed_str"`
	ETA                int64   `json:"eta"`
	ETAStr             string  `json:"eta_str"`
	Stage              string  `json:"stage"`
	OutputFile         string  `json:"output_file,omitempty"`
}

type RawProgressJSON struct {
	Status             string      `json:"status"`
	DownloadedBytes    interface{} `json:"downloaded_bytes"`
	TotalBytes         interface{} `json:"total_bytes"`
	TotalBytesEstimate interface{} `json:"total_bytes_estimate"`
	Speed              interface{} `json:"speed"`
	ETA                interface{} `json:"eta"`
	Percent            string      `json:"percent"`
	SpeedStr           string      `json:"speed_str"`
	ETAStr             string      `json:"eta_str"`
	Postprocessor      string      `json:"postprocessor"`
}

var (
	destRegex      = regexp.MustCompile(`\[(?:download|ExtractAudio)\]\s+Destination:\s+(.+)`)
	mergerRegex    = regexp.MustCompile(`\[Merger\]\s+Merging formats into\s+"?([^"]+)"?`)
	alreadyRegex   = regexp.MustCompile(`\[download\]\s+(.+)\s+has already been downloaded`)
	ffmpegFixRegex = regexp.MustCompile(`\[Fixup[A-Za-z0-9]+\]\s+.*into\s+"?([^"]+)"?`)
	percentRegex   = regexp.MustCompile(`([0-9]+(?:\.[0-9]+)?)\s*%`)
)

func ParseLine(line string) *ProgressUpdate {
	line = strings.TrimSpace(line)
	if line == "" {
		return nil
	}

	// 1. Check custom progress json template
	if strings.HasPrefix(line, "download:{") {
		jsonStr := strings.TrimPrefix(line, "download:")
		var raw RawProgressJSON
		if err := json.Unmarshal([]byte(jsonStr), &raw); err == nil {
			percentVal := parsePercent(raw.Percent)
			speedVal := parseInterfaceFloat(raw.Speed)
			etaVal := int64(parseInterfaceFloat(raw.ETA))
			downloadedVal := int64(parseInterfaceFloat(raw.DownloadedBytes))
			totalVal := int64(parseInterfaceFloat(raw.TotalBytes))
			if totalVal <= 0 {
				totalVal = int64(parseInterfaceFloat(raw.TotalBytesEstimate))
			}

			return &ProgressUpdate{
				Status:             "downloading",
				Percent:            percentVal,
				PercentStr:         strings.TrimSpace(raw.Percent),
				DownloadedBytes:    downloadedVal,
				TotalBytes:         totalVal,
				TotalBytesEstimate: int64(parseInterfaceFloat(raw.TotalBytesEstimate)),
				Speed:              speedVal,
				SpeedStr:           strings.TrimSpace(raw.SpeedStr),
				ETA:                etaVal,
				ETAStr:             strings.TrimSpace(raw.ETAStr),
				Stage:              "Downloading",
			}
		}
	}

	// 2. Check postprocess json template
	if strings.HasPrefix(line, "postprocess:{") {
		jsonStr := strings.TrimPrefix(line, "postprocess:")
		var raw RawProgressJSON
		if err := json.Unmarshal([]byte(jsonStr), &raw); err == nil {
			stage := "Postprocessing"
			if raw.Postprocessor != "" {
				stage = raw.Postprocessor
			}
			return &ProgressUpdate{
				Status: "postprocessing",
				Stage:  stage,
			}
		}
	}

	// 3. Check for output file names
	if m := mergerRegex.FindStringSubmatch(line); len(m) > 1 {
		return &ProgressUpdate{
			Status:     "merging",
			Stage:      "Merging video & audio",
			OutputFile: strings.TrimSpace(m[1]),
		}
	}
	if m := destRegex.FindStringSubmatch(line); len(m) > 1 {
		return &ProgressUpdate{
			Status:     "downloading",
			OutputFile: strings.TrimSpace(m[1]),
		}
	}
	if m := alreadyRegex.FindStringSubmatch(line); len(m) > 1 {
		return &ProgressUpdate{
			Status:     "finished",
			Percent:    100.0,
			PercentStr: "100%",
			Stage:      "Already downloaded",
			OutputFile: strings.TrimSpace(m[1]),
		}
	}
	if m := ffmpegFixRegex.FindStringSubmatch(line); len(m) > 1 {
		return &ProgressUpdate{
			Status:     "postprocessing",
			Stage:      "Fixing container",
			OutputFile: strings.TrimSpace(m[1]),
		}
	}

	// 4. Check stages in standard text
	if strings.Contains(line, "[EmbedSubtitle]") {
		return &ProgressUpdate{
			Status: "postprocessing",
			Stage:  "Embedding subtitles",
		}
	}
	if strings.Contains(line, "[EmbedThumbnail]") {
		return &ProgressUpdate{
			Status: "postprocessing",
			Stage:  "Embedding thumbnail",
		}
	}
	if strings.Contains(line, "[SponsorBlock]") {
		return &ProgressUpdate{
			Status: "postprocessing",
			Stage:  "Processing SponsorBlock",
		}
	}
	if strings.Contains(line, "[ExtractAudio]") {
		return &ProgressUpdate{
			Status: "postprocessing",
			Stage:  "Extracting audio",
		}
	}
	if strings.Contains(line, "[SplitChapters]") {
		return &ProgressUpdate{
			Status: "postprocessing",
			Stage:  "Splitting chapters",
		}
	}

	return nil
}

func parsePercent(str string) float64 {
	str = strings.TrimSpace(str)
	str = strings.TrimSuffix(str, "%")
	if val, err := strconv.ParseFloat(str, 64); err == nil {
		return val
	}
	if m := percentRegex.FindStringSubmatch(str); len(m) > 1 {
		if val, err := strconv.ParseFloat(m[1], 64); err == nil {
			return val
		}
	}
	return 0
}
