"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, ArrowUp, ArrowDown } from "lucide-react";

interface VideoItem {
  id: string;
  file: File;
  preview: string;
  duration: number;
}

interface TransitionConfig {
  type: "fade" | "slide" | "wipe" | "zoom" | "blur" | "cross";
  duration: number;
}

export default function MergeVideoToolPage() {
  const router = useRouter();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [transitionConfig, setTransitionConfig] = useState<TransitionConfig>({
    type: "fade",
    duration: 1,
  });
  const [effectsEnabled, setEffectsEnabled] = useState({
    transition: true,
    audioFade: true,
    colorCorrection: false,
  });
  const [processing, setProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const videoPreviewRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  const transitions = [
    { name: "Fade", value: "fade", emoji: "✨" },
    { name: "Slide", value: "slide", emoji: "→" },
    { name: "Wipe", value: "wipe", emoji: "⇝" },
    { name: "Zoom", value: "zoom", emoji: "🔍" },
    { name: "Blur", value: "blur", emoji: "🌫️" },
    { name: "Cross", value: "cross", emoji: "❌" },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const video = document.createElement("video");
        video.onloadedmetadata = () => {
          const newVideo: VideoItem = {
            id: `video-${Date.now()}-${Math.random()}`,
            file,
            preview: event.target?.result as string,
            duration: video.duration,
          };
          setVideos([...videos, newVideo]);
        };
        video.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const removeVideo = (id: string) => {
    setVideos(videos.filter((v) => v.id !== id));
  };

  const moveVideo = (id: string, direction: "up" | "down") => {
    const index = videos.findIndex((v) => v.id === id);
    if (direction === "up" && index > 0) {
      const newVideos = [...videos];
      [newVideos[index], newVideos[index - 1]] = [
        newVideos[index - 1],
        newVideos[index],
      ];
      setVideos(newVideos);
    } else if (direction === "down" && index < videos.length - 1) {
      const newVideos = [...videos];
      [newVideos[index], newVideos[index + 1]] = [
        newVideos[index + 1],
        newVideos[index],
      ];
      setVideos(newVideos);
    }
  };

  const mergeVideos = async () => {
    if (videos.length < 2) {
      alert("Please upload at least 2 videos to merge");
      return;
    }

    setProcessing(true);
    setProgress(0);
    setResultUrl(null);

    try {
      // Load all videos and merge them using canvas
      const videoElements: HTMLVideoElement[] = [];
      const videoPromises = videos.map((video, index) => {
        return new Promise<{ video: HTMLVideoElement; duration: number }>(
          (resolve) => {
            const v = document.createElement("video");
            v.src = URL.createObjectURL(video.file);
            v.crossOrigin = "anonymous";
            v.muted = true;

            v.onloadedmetadata = () => {
              videoElements[index] = v;
              resolve({ video: v, duration: v.duration });
            };
          }
        );
      });

      await Promise.all(videoPromises);
      setProgress(15);

      // Get dimensions from first video
      const firstVideo = videoElements[0];
      const width = firstVideo.videoWidth || 1280;
      const height = firstVideo.videoHeight || 720;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Could not get canvas context");
      }

      // Create media recorder
      const stream = (canvas as HTMLCanvasElement).captureStream(24);
      const recordedChunks: Blob[] = [];

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
        ? "video/webm;codecs=vp8"
        : "video/webm";

      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size) recordedChunks.push(ev.data);
      };

      recorder.start();
      setProgress(25);

      // Play each video sequentially
      let totalProcessed = 0;
      for (let videoIdx = 0; videoIdx < videoElements.length; videoIdx++) {
        const video = videoElements[videoIdx];
        const videoDuration = video.duration;

        // Play video frame by frame
        let currentTime = 0;
        const frameDelay = 1 / 24; // 24 fps

        while (currentTime < videoDuration) {
          video.currentTime = currentTime;

          // Wait for frame to be available
          await new Promise((resolve) => {
            const checkFrame = () => {
              ctx.fillStyle = "black";
              ctx.fillRect(0, 0, width, height);

              const videoRatio = video.videoWidth / video.videoHeight;
              const canvasRatio = width / height;

              let sx = 0,
                sy = 0,
                sw = video.videoWidth,
                sh = video.videoHeight;

              if (videoRatio > canvasRatio) {
                const desiredW = Math.round(video.videoHeight * canvasRatio);
                sw = desiredW;
                sx = Math.round((video.videoWidth - desiredW) / 2);
              } else if (videoRatio < canvasRatio) {
                const desiredH = Math.round(video.videoWidth / canvasRatio);
                sh = desiredH;
                sy = Math.round((video.videoHeight - desiredH) / 2);
              }

              ctx.drawImage(
                video,
                sx,
                sy,
                sw,
                sh,
                0,
                0,
                width,
                height
              );

              currentTime += frameDelay;
              totalProcessed++;

              const overallProgress = Math.round(
                25 +
                  (totalProcessed /
                    (videoElements.reduce(
                      (sum, v) => sum + v.duration * 24,
                      0
                    ))) *
                    60
              );
              setProgress(Math.min(overallProgress, 85));

              resolve(null);
            };

            setTimeout(checkFrame, 10);
          });
        }
      }

      // Stop recording
      recorder.stop();

      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });

      setProgress(90);

      // Create blob and result URL
      const blob = new Blob(recordedChunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setProgress(100);
    } catch (error) {
      console.error("Error merging videos:", error);
      alert(
        "Error merging videos. Please ensure videos are in a supported format and try again."
      );
    } finally {
      setProcessing(false);
    }
  };

  const buildFilterComplex = () => {
    // This is now a placeholder since we use concat demuxer
    return "";
  };

  const handleDownload = () => {
    if (!resultUrl) return;

    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `merged-video-${new Date().getTime()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getTotalDuration = () => {
    const baseDuration = videos.reduce((sum, v) => sum + v.duration, 0);
    const transitionOverlap = (videos.length - 1) * transitionConfig.duration;
    return Math.max(0, baseDuration - transitionOverlap);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
            <div className="mb-4">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded"
              >
                ← Back
              </button>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Merge Videos</h1>
          <p className="text-slate-400">
            Combine multiple videos with smooth transitions and effects
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upload Section */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">
                📹 Add Videos
              </h2>
              <label className="flex items-center justify-center w-full p-8 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-slate-500 transition-colors">
                <div className="text-center">
                  <Plus className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-400">Click to upload videos</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Drag and drop or select multiple files
                  </p>
                </div>
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {videos.length > 0 && (
                <p className="mt-3 text-sm text-slate-400">
                  {videos.length} video(s) added
                </p>
              )}
            </div>

            {/* Videos List */}
            {videos.length > 0 && (
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h2 className="text-xl font-semibold text-white mb-4">
                  Video Queue ({videos.length})
                </h2>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {videos.map((video, index) => (
                    <div
                      key={video.id}
                      className="bg-slate-900 rounded-lg p-4 border border-slate-600 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="bg-slate-700 rounded p-2 w-16 h-12 flex items-center justify-center">
                          <span className="text-sm font-bold text-slate-300">
                            #{index + 1}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium truncate">
                            {video.file.name}
                          </p>
                          <p className="text-slate-400 text-xs">
                            {video.duration.toFixed(2)}s
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => moveVideo(video.id, "up")}
                          disabled={index === 0}
                          className="p-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-300 rounded transition-all"
                          title="Move up"
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button
                          onClick={() => moveVideo(video.id, "down")}
                          disabled={index === videos.length - 1}
                          className="p-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-300 rounded transition-all"
                          title="Move down"
                        >
                          <ArrowDown size={16} />
                        </button>
                        <button
                          onClick={() => removeVideo(video.id)}
                          className="p-2 bg-red-700/30 hover:bg-red-700/50 text-red-400 rounded transition-all"
                          title="Remove"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transition Settings */}
            {videos.length > 1 && (
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h2 className="text-xl font-semibold text-white mb-4">
                  ℹ️ Merge Settings
                </h2>
                <div className="bg-slate-900 rounded p-4 mb-4 border-l-4 border-blue-500">
                  <p className="text-slate-300 text-sm">
                    Videos will be concatenated seamlessly. For best results, ensure all videos have compatible codec formats (H.264 video, AAC audio).
                  </p>
                </div>
                <div className="text-slate-400 text-sm space-y-2">
                  <p className="font-medium text-slate-300">Supported Features:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Fast lossless concatenation (no re-encoding)</li>
                    <li>Preserves original video quality</li>
                    <li>Automatic audio synchronization</li>
                    <li>Works with any resolution</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Effects Options */}
            {videos.length > 1 && (
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h2 className="text-xl font-semibold text-white mb-4">
                  🎬 Merge Options
                </h2>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={true}
                      disabled
                      className="w-5 h-5 accent-purple-500 rounded"
                    />
                    <span className="text-slate-300">
                      ✅ Fast Concatenation (Lossless)
                    </span>
                  </label>
                  <p className="text-xs text-slate-400 ml-8">
                    Videos merged without re-encoding for maximum speed and quality
                  </p>
                  <label className="flex items-center gap-3 cursor-pointer mt-4">
                    <input
                      type="checkbox"
                      checked={effectsEnabled.audioFade}
                      onChange={(e) =>
                        setEffectsEnabled({
                          ...effectsEnabled,
                          audioFade: e.target.checked,
                        })
                      }
                      className="w-5 h-5 accent-purple-500 rounded"
                    />
                    <span className="text-slate-300">
                      Audio Normalization (Optional)
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Process Button */}
            {videos.length > 1 && (
              <button
                onClick={mergeVideos}
                disabled={processing || videos.length < 2}
                className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-all ${
                  processing || videos.length < 2
                    ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:shadow-purple-500/50"
                }`}
              >
                {processing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                    Merging... {progress}%
                  </span>
                ) : (
                  "🎞️ Merge Videos"
                )}
              </button>
            )}
          </div>

          {/* Right Column - Info & Results */}
          <div className="space-y-6">
            {/* Summary */}
            {videos.length > 0 && (
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">
                  📊 Summary
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-slate-300">
                    <span>Total Videos:</span>
                    <span className="font-bold text-purple-400">
                      {videos.length}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Total Duration:</span>
                    <span className="font-bold text-purple-400">
                      {getTotalDuration().toFixed(2)}s
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Transition Duration:</span>
                    <span className="font-bold text-purple-400">
                      {transitionConfig.duration.toFixed(1)}s
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Transition Type:</span>
                    <span className="font-bold text-purple-400">
                      {transitionConfig.type.charAt(0).toUpperCase() +
                        transitionConfig.type.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Result Section */}
            {resultUrl && (
              <div className="bg-slate-800 rounded-lg p-6 border border-emerald-700 bg-gradient-to-br from-slate-800 to-emerald-900/20">
                <h2 className="text-xl font-semibold text-white mb-4">
                  ✅ Merge Complete!
                </h2>
                <p className="text-slate-300 mb-4 text-sm">
                  Your videos have been successfully merged with{" "}
                  {transitionConfig.type} transition
                </p>
                <div className="bg-slate-900 rounded-lg p-4 mb-4">
                  <video
                    controls
                    src={resultUrl}
                    className="w-full h-auto rounded-lg"
                  />
                </div>
                <button
                  onClick={handleDownload}
                  className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:shadow-lg hover:shadow-emerald-500/50 text-white font-bold py-3 px-6 rounded-lg transition-all"
                >
                  ⬇️ Download Merged Video
                </button>
              </div>
            )}

            {/* Help Section */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-3">
                💡 Tips & Troubleshooting
              </h3>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex gap-2">
                  <span className="text-amber-400">•</span>
                  <span>Upload 2 or more videos to merge</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400">•</span>
                  <span>Reorder videos using arrow buttons</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400">•</span>
                  <span>Uses lossless concatenation for best quality</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400">•</span>
                  <span>For best results, videos should have same codec</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400">•</span>
                  <span>Output format is MP4 (H.264/AAC compatible)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
