package api

import (
	"net/url"
	"os"
	"runtime"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	"ytdlpgui/backend/pkg/config"
	"ytdlpgui/backend/pkg/ffmpeg"
	"ytdlpgui/backend/pkg/manager"
	"ytdlpgui/backend/pkg/storage"
	"ytdlpgui/backend/pkg/system"
	"ytdlpgui/backend/pkg/ytdlp"
)

type BatchDownloadRequest struct {
	Items   []ytdlp.DownloadOptions `json:"items"`
	Options *ytdlp.DownloadOptions  `json:"options,omitempty"`
	URLs    []string                `json:"urls,omitempty"`
}

type OpenPathRequest struct {
	Path string `json:"path"`
}

func RegisterRoutes(app *fiber.App) {
	api := app.Group("/api")

	// System & Status
	api.Get("/system/status", handleGetSystemStatus)
	api.Post("/system/yt-dlp/update", handleUpdateYtDlp)
	api.Post("/system/yt-dlp/install", handleInstallYtDlp)

	// Info / Metadata Extraction & Search
	api.Post("/info", handleExtractInfo)
	api.Get("/search", handleSearch)

	// Downloads Queue
	api.Get("/downloads", handleGetDownloads)
	api.Post("/downloads", handleCreateDownload)
	api.Post("/downloads/batch", handleCreateBatchDownloads)
	api.Get("/downloads/:id", handleGetDownload)
	api.Post("/downloads/:id/cancel", handleCancelDownload)
	api.Post("/downloads/:id/retry", handleRetryDownload)
	api.Delete("/downloads/:id", handleDeleteDownload)
	api.Post("/downloads/clear", handleClearCompletedDownloads)

	// Library & Streaming
	api.Get("/library", handleGetLibrary)
	api.Post("/library/open", handleOpenInExplorer)
	api.Get("/library/stream", handleStreamMedia)

	// Presets
	api.Get("/presets", handleGetPresets)
	api.Post("/presets", handleSavePreset)
	api.Delete("/presets/:id", handleDeletePreset)

	// Settings
	api.Get("/settings", handleGetSettings)
	api.Put("/settings", handleUpdateSettings)

	// WebSocket Route
	app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	app.Get("/ws", websocket.New(func(c *websocket.Conn) {
		hub := manager.GetHub()
		hub.Register(c)
		defer hub.Unregister(c)

		for {
			_, _, err := c.ReadMessage()
			if err != nil {
				break
			}
		}
	}))
}

func handleGetSystemStatus(c *fiber.Ctx) error {
	cfg := config.GetManager().Get()
	ytdlpInfo := ytdlp.Detect(cfg.YtDlpPath)
	ffmpegInfo := ffmpeg.Detect(cfg.FFmpegPath)

	return c.JSON(fiber.Map{
		"os":          runtime.GOOS,
		"ytDlpPath":   ytdlpInfo.Path,
		"ytDlpVer":    ytdlpInfo.Version,
		"ytDlpValid":  ytdlpInfo.Available,
		"ffmpegPath":  ffmpegInfo.Path,
		"ffmpegVer":   ffmpegInfo.Version,
		"ffmpegValid": ffmpegInfo.Available,
		"downloadDir": cfg.DownloadDir,
	})
}

func handleUpdateYtDlp(c *fiber.Ctx) error {
	cfg := config.GetManager().Get()
	out, err := ytdlp.Update(cfg.YtDlpPath)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":  err.Error(),
			"output": out,
		})
	}
	return c.JSON(fiber.Map{
		"message": "yt-dlp updated successfully",
		"output":  out,
	})
}

func handleInstallYtDlp(c *fiber.Ctx) error {
	installedPath, err := ytdlp.InstallLatest()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return c.JSON(fiber.Map{
		"message": "yt-dlp installed successfully",
		"path":    installedPath,
	})
}

func handleExtractInfo(c *fiber.Ctx) error {
	var opts ytdlp.ExtractOptions
	if err := c.BodyParser(&opts); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	opts.URL = strings.TrimSpace(opts.URL)
	if opts.URL == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "url is required"})
	}

	meta, err := ytdlp.ExtractMetadata(opts)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(meta)
}

func handleSearch(c *fiber.Ctx) error {
	query := strings.TrimSpace(c.Query("q"))
	if query == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "query parameter 'q' is required"})
	}

	limit := 15
	if l := c.Query("limit"); l != "" {
		if val, err := strconv.Atoi(l); err == nil && val > 0 {
			limit = val
		}
	}

	results, err := ytdlp.SearchYouTube(query, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(results)
}

func handleGetDownloads(c *fiber.Ctx) error {
	mgr := manager.GetManager()
	jobs := mgr.GetAllJobs()
	return c.JSON(jobs)
}

func handleCreateDownload(c *fiber.Ctx) error {
	var opts ytdlp.DownloadOptions
	if err := c.BodyParser(&opts); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	opts.URL = strings.TrimSpace(opts.URL)
	if opts.URL == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "url is required"})
	}

	mgr := manager.GetManager()
	job, err := mgr.AddJob(opts, nil)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(job.GetSnapshot())
}

func handleCreateBatchDownloads(c *fiber.Ctx) error {
	var req BatchDownloadRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	mgr := manager.GetManager()
	createdJobs := make([]manager.Job, 0)

	// If explicit items provided
	for _, item := range req.Items {
		item.URL = strings.TrimSpace(item.URL)
		if item.URL != "" {
			job, err := mgr.AddJob(item, nil)
			if err == nil {
				createdJobs = append(createdJobs, job.GetSnapshot())
			}
		}
	}

	// If list of URLs provided with shared base options
	if len(req.URLs) > 0 && req.Options != nil {
		for _, u := range req.URLs {
			u = strings.TrimSpace(u)
			if u != "" {
				opt := *req.Options
				opt.URL = u
				job, err := mgr.AddJob(opt, nil)
				if err == nil {
					createdJobs = append(createdJobs, job.GetSnapshot())
				}
			}
		}
	}

	return c.JSON(fiber.Map{
		"count": len(createdJobs),
		"jobs":  createdJobs,
	})
}

func handleGetDownload(c *fiber.Ctx) error {
	id := c.Params("id")
	mgr := manager.GetManager()
	job, exists := mgr.GetJob(id)
	if !exists {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "job not found"})
	}
	return c.JSON(job.GetSnapshot())
}

func handleCancelDownload(c *fiber.Ctx) error {
	id := c.Params("id")
	mgr := manager.GetManager()
	if ok := mgr.CancelJob(id); !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "unable to cancel job"})
	}
	return c.JSON(fiber.Map{"message": "job cancelled"})
}

func handleRetryDownload(c *fiber.Ctx) error {
	id := c.Params("id")
	mgr := manager.GetManager()
	job, err := mgr.RetryJob(id)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(job.GetSnapshot())
}

func handleDeleteDownload(c *fiber.Ctx) error {
	id := c.Params("id")
	deleteFile := c.Query("deleteFile") == "true"
	mgr := manager.GetManager()
	if ok := mgr.DeleteJob(id, deleteFile); !ok {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "job not found"})
	}
	return c.JSON(fiber.Map{"message": "job deleted"})
}

func handleClearCompletedDownloads(c *fiber.Ctx) error {
	mgr := manager.GetManager()
	mgr.ClearCompleted()
	return c.JSON(fiber.Map{"message": "completed jobs cleared"})
}

func handleGetLibrary(c *fiber.Ctx) error {
	cfg := config.GetManager().Get()
	files, err := system.ScanLibrary(cfg.DownloadDir)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(files)
}

func handleOpenInExplorer(c *fiber.Ctx) error {
	var req OpenPathRequest
	if err := c.BodyParser(&req); err != nil || req.Path == "" {
		cfg := config.GetManager().Get()
		req.Path = cfg.DownloadDir
	}

	if err := system.OpenInFileManager(req.Path); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "opened in file manager"})
}

func handleStreamMedia(c *fiber.Ctx) error {
	filePath := c.Query("path")
	if filePath == "" {
		return c.Status(fiber.StatusBadRequest).SendString("path query parameter required")
	}

	unescaped, err := url.QueryUnescape(filePath)
	if err == nil {
		filePath = unescaped
	}

	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return c.Status(fiber.StatusNotFound).SendString("file not found")
	}

	// Range request support for seamless video/audio scrubbing
	return c.SendFile(filePath)
}

func handleGetPresets(c *fiber.Ctx) error {
	store := storage.GetStore()
	return c.JSON(store.GetPresets())
}

func handleSavePreset(c *fiber.Ctx) error {
	var p storage.Preset
	if err := c.BodyParser(&p); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid preset payload"})
	}

	if strings.TrimSpace(p.Name) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "preset name is required"})
	}

	saved := storage.GetStore().SavePreset(p)
	return c.JSON(saved)
}

func handleDeletePreset(c *fiber.Ctx) error {
	id := c.Params("id")
	if ok := storage.GetStore().DeletePreset(id); !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "cannot delete preset or preset not found"})
	}
	return c.JSON(fiber.Map{"message": "preset deleted"})
}

func handleGetSettings(c *fiber.Ctx) error {
	cfg := config.GetManager().Get()
	return c.JSON(cfg)
}

func handleUpdateSettings(c *fiber.Ctx) error {
	var newCfg config.Config
	if err := c.BodyParser(&newCfg); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid settings payload"})
	}

	if newCfg.DownloadDir != "" {
		_ = os.MkdirAll(newCfg.DownloadDir, 0755)
	}

	if err := config.GetManager().Update(newCfg); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(config.GetManager().Get())
}
