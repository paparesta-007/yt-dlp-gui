package ytdlp

type FormatItem struct {
	FormatID       string  `json:"format_id"`
	FormatNote     string  `json:"format_note,omitempty"`
	Ext            string  `json:"ext"`
	Resolution     string  `json:"resolution,omitempty"`
	Width          int     `json:"width,omitempty"`
	Height         int     `json:"height,omitempty"`
	FPS            float64 `json:"fps,omitempty"`
	VCodec         string  `json:"vcodec,omitempty"`
	ACodec         string  `json:"acodec,omitempty"`
	TBR            float64 `json:"tbr,omitempty"`
	VBR            float64 `json:"vbr,omitempty"`
	ABR            float64 `json:"abr,omitempty"`
	Filesize       int64   `json:"filesize,omitempty"`
	FilesizeApprox int64   `json:"filesize_approx,omitempty"`
	Protocol       string  `json:"protocol,omitempty"`
	IsVideo        bool    `json:"is_video"`
	IsAudio        bool    `json:"is_audio"`
	IsVideoOnly    bool    `json:"is_video_only"`
	IsAudioOnly    bool    `json:"is_audio_only"`
	QualityLabel   string  `json:"quality_label,omitempty"`
}

type ChapterItem struct {
	StartTime float64 `json:"start_time"`
	EndTime   float64 `json:"end_time"`
	Title     string  `json:"title"`
}

type SubtitleItem struct {
	Language string `json:"language"`
	Name     string `json:"name,omitempty"`
	Ext      string `json:"ext,omitempty"`
	IsAuto   bool   `json:"is_auto"`
}

type SearchResultItem struct {
	ID             string `json:"id"`
	Title          string `json:"title"`
	URL            string `json:"url"`
	Thumbnail      string `json:"thumbnail,omitempty"`
	Duration       int64  `json:"duration,omitempty"`
	DurationString string `json:"duration_string,omitempty"`
	Uploader       string `json:"uploader,omitempty"`
	Channel        string `json:"channel,omitempty"`
	ViewCount      int64  `json:"view_count,omitempty"`
	UploadDate     string `json:"upload_date,omitempty"`
}

type PlaylistEntry struct {
	ID             string `json:"id"`
	Title          string `json:"title"`
	URL            string `json:"url"`
	Duration       int64  `json:"duration,omitempty"`
	DurationString string `json:"duration_string,omitempty"`
	Thumbnail      string `json:"thumbnail,omitempty"`
	Uploader       string `json:"uploader,omitempty"`
	Index          int    `json:"index,omitempty"`
}

type Metadata struct {
	ID             string          `json:"id"`
	Title          string          `json:"title"`
	Description    string          `json:"description,omitempty"`
	Thumbnail      string          `json:"thumbnail,omitempty"`
	Duration       int64           `json:"duration,omitempty"`
	DurationString string          `json:"duration_string,omitempty"`
	Uploader       string          `json:"uploader,omitempty"`
	UploaderURL    string          `json:"uploader_url,omitempty"`
	Channel        string          `json:"channel,omitempty"`
	ChannelURL     string          `json:"channel_url,omitempty"`
	UploadDate     string          `json:"upload_date,omitempty"`
	ViewCount      int64           `json:"view_count,omitempty"`
	LikeCount      int64           `json:"like_count,omitempty"`
	WebpageURL     string          `json:"webpage_url"`
	Extractor      string          `json:"extractor,omitempty"`
	IsPlaylist     bool            `json:"is_playlist"`
	PlaylistCount  int             `json:"playlist_count,omitempty"`
	PlaylistTitle  string          `json:"playlist_title,omitempty"`
	Formats        []FormatItem    `json:"formats,omitempty"`
	Subtitles      []SubtitleItem  `json:"subtitles,omitempty"`
	Chapters       []ChapterItem   `json:"chapters,omitempty"`
	Entries        []PlaylistEntry `json:"entries,omitempty"`
}

type RawFormat struct {
	FormatID       string      `json:"format_id"`
	FormatNote     string      `json:"format_note"`
	Ext            string      `json:"ext"`
	Resolution     string      `json:"resolution"`
	Width          int         `json:"width"`
	Height         int         `json:"height"`
	FPS            interface{} `json:"fps"`
	VCodec         string      `json:"vcodec"`
	ACodec         string      `json:"acodec"`
	TBR            interface{} `json:"tbr"`
	VBR            interface{} `json:"vbr"`
	ABR            interface{} `json:"abr"`
	Filesize       int64       `json:"filesize"`
	FilesizeApprox int64       `json:"filesize_approx"`
	Protocol       string      `json:"protocol"`
}

type RawChapter struct {
	StartTime float64 `json:"start_time"`
	EndTime   float64 `json:"end_time"`
	Title     string  `json:"title"`
}

type RawSubtitleTrack struct {
	Ext  string `json:"ext"`
	URL  string `json:"url"`
	Name string `json:"name"`
}

type RawMetadata struct {
	ID                string                        `json:"id"`
	Title             string                        `json:"title"`
	Description       string                        `json:"description"`
	Thumbnail         string                        `json:"thumbnail"`
	Duration          int64                         `json:"duration"`
	DurationString    string                        `json:"duration_string"`
	Uploader          string                        `json:"uploader"`
	UploaderURL       string                        `json:"uploader_url"`
	Channel           string                        `json:"channel"`
	ChannelURL        string                        `json:"channel_url"`
	UploadDate        string                        `json:"upload_date"`
	ViewCount         int64                         `json:"view_count"`
	LikeCount         int64                         `json:"like_count"`
	WebpageURL        string                        `json:"webpage_url"`
	Extractor         string                        `json:"extractor"`
	ExtractorKey      string                        `json:"extractor_key"`
	Type              string                        `json:"_type"`
	Entries           []RawMetadata                 `json:"entries"`
	Formats           []RawFormat                   `json:"formats"`
	Subtitles         map[string][]RawSubtitleTrack `json:"subtitles"`
	AutomaticCaptions map[string][]RawSubtitleTrack `json:"automatic_captions"`
	Chapters          []RawChapter                  `json:"chapters"`
}
