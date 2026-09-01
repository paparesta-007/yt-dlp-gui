package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"ytdlpgui/backend/pkg/api"
	"ytdlpgui/backend/pkg/config"
	"ytdlpgui/backend/pkg/ffmpeg"
	"ytdlpgui/backend/pkg/manager"
	"ytdlpgui/backend/pkg/ytdlp"
)

func main() {
	cfgMgr := config.GetManager()
	cfg := cfgMgr.Get()

	// Initial system check
	ytdlpInfo := ytdlp.Detect(cfg.YtDlpPath)
	ffmpegInfo := ffmpeg.Detect(cfg.FFmpegPath)

	log.Printf("==================================================")
	log.Printf("           yt-dlp GUI Server Starting            ")
	log.Printf("==================================================")
	log.Printf("OS: %s", os.Getenv("OS"))
	if ytdlpInfo.Available {
		log.Printf("yt-dlp: Found (%s) at %s", ytdlpInfo.Version, ytdlpInfo.Path)
	} else {
		log.Printf("yt-dlp: NOT FOUND (Auto-install available via GUI or API)")
	}

	if ffmpegInfo.Available {
		log.Printf("FFmpeg: Found (%s) at %s", ffmpegInfo.Version, ffmpegInfo.Path)
	} else {
		log.Printf("FFmpeg: NOT FOUND (Audio extraction & merging will require FFmpeg)")
	}
	log.Printf("Downloads Directory: %s", cfg.DownloadDir)
	log.Printf("==================================================")

	// Initialize Download Manager singleton
	_ = manager.GetManager()

	app := fiber.New(fiber.Config{
		AppName:      "yt-dlp GUI API",
		ServerHeader: "Fiber",
		BodyLimit:    64 * 1024 * 1024, // 64MB
	})

	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${latency} ${method} ${path}\n",
	}))

	// CORS configuration for frontend dev server
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "*",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET, POST, HEAD, PUT, DELETE, PATCH, OPTIONS",
	}))

	// Register API & WebSocket routes
	api.RegisterRoutes(app)

	// Serve Frontend Static Files if available (for production standalone executable)
	distDirs := []string{
		"../frontend/dist",
		"./frontend/dist",
		"./dist",
		"dist",
	}

	for _, distDir := range distDirs {
		if stat, err := os.Stat(distDir); err == nil && stat.IsDir() {
			log.Printf("Serving static frontend files from: %s", distDir)
			app.Static("/", distDir)
			// SPA fallback: redirect 404s to index.html for React Router
			app.Get("/*", func(c *fiber.Ctx) error {
				indexPath := filepath.Join(distDir, "index.html")
				return c.SendFile(indexPath)
			})
			break
		}
	}

	port := cfg.Port
	if port <= 0 {
		port = 8080
	}

	addr := fmt.Sprintf("0.0.0.0:%d", port)
	log.Printf("Server listening on http://localhost:%d", port)
	if err := app.Listen(addr); err != nil {
		log.Fatalf("Fiber server error: %v", err)
	}
}
