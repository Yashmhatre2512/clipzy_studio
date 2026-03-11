"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Download, Upload, Info } from "lucide-react";

export default function CompressVideoPage() {
  const router = useRouter();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [quality, setQuality] = useState<"low" | "medium" | "high">("medium");
  const [processing, setProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);
  const [targetResolution, setTargetResolution] = useState<"original" | "720" | "480">("480");

  const qualitySettings = {
    low: { bitrate: 150000, label: "Low Quality", compression: "~85%" },
    medium: { bitrate: 300000, label: "Medium Quality", compression: "~70%" },
    high: { bitrate: 600000, label: "High Quality", compression: "~55%" },
  };

  const getScaledSize = (width: number, height: number) => {
    if (targetResolution === "original") {
      return { width, height };
    }

    const targetHeight = targetResolution === "720" ? 720 : 480;
    if (height <= targetHeight) {
      return { width, height };
    }

    const scale = targetHeight / height;
    return {
      width: Math.round(width * scale),
      height: Math.round(height * scale),
    };
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f) {
      setVideoFile(f);
      setOriginalSize(f.size);
      setResultUrl(null);
      setProgress(0);
      setCompressedSize(0);
    }
  };

  const compressVideo = async () => {
    if (!videoFile) {
      alert("Please select a video first");
      return;
    }

    setProcessing(true);
    setProgress(0);
    setResultUrl(null);

    try {
      const url = URL.createObjectURL(videoFile);
      const video = document.createElement("video");
      video.src = url;
      video.playsInline = true;
      video.muted = true;
      video.volume = 0;

      await new Promise<void>((resolve, reject) => {
        const onLoaded = () => {
          video.removeEventListener("loadedmetadata", onLoaded);
          resolve();
        };
        const onError = () => reject(new Error("Video metadata failed to load"));
        video.addEventListener("loadedmetadata", onLoaded);
        video.addEventListener("error", onError, { once: true });
      });

      const recordedChunks: Blob[] = [];
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";

      const scaled = getScaledSize(video.videoWidth, video.videoHeight);
      const framerate = 24;
      let stream: MediaStream;
      let canvas: HTMLCanvasElement | null = null;
      let ctx: CanvasRenderingContext2D | null = null;

      if (scaled.width !== video.videoWidth || scaled.height !== video.videoHeight) {
        canvas = document.createElement("canvas");
        canvas.width = scaled.width;
        canvas.height = scaled.height;
        ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Could not get canvas context");
        }
        stream = canvas.captureStream(framerate);
      } else {
        stream = video.captureStream(framerate);
      }
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: qualitySettings[quality].bitrate,
        audioBitsPerSecond: 48000,
      });

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size) {
          recordedChunks.push(ev.data);
        }
      };

      const duration = video.duration || 0;
      const onTimeUpdate = () => {
        if (!duration) return;
        const progressPercent = Math.round((video.currentTime / duration) * 100);
        setProgress(progressPercent);
      };
      video.addEventListener("timeupdate", onTimeUpdate);

      recorder.start(250);
      await video.play();

      let rafId = 0;
      const drawFrame = () => {
        if (!ctx || !canvas) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        rafId = requestAnimationFrame(drawFrame);
      };
      if (ctx && canvas) {
        rafId = requestAnimationFrame(drawFrame);
      }

      await new Promise<void>((resolve) => {
        video.onended = () => resolve();
      });

      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      recorder.stop();

      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });

      video.removeEventListener("timeupdate", onTimeUpdate);

      const blob = new Blob(recordedChunks, { type: mimeType });
      const compressedUrl = URL.createObjectURL(blob);
      setResultUrl(compressedUrl);
      setCompressedSize(blob.size);
      setProgress(100);
    } catch (error) {
      console.error("Error compressing video:", error);
      alert("Error compressing video. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;

    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `compressed-${quality}-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const compressionRatio = originalSize && compressedSize
    ? Math.round(((originalSize - compressedSize) / originalSize) * 100)
    : 0;
  const sizeIncreased = compressionRatio < 0;
  const sizeChangePercent = Math.abs(compressionRatio);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors mb-4"
          >
            ← Back
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
              <Package size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Compress Video</h1>
              <p className="text-slate-400">Reduce video file size while maintaining quality</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Controls */}
          <div className="space-y-6">
            {/* File Upload */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Upload size={20} />
                Upload Video
              </h2>
              <label className="flex flex-col items-center justify-center w-full p-8 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-slate-500 transition-colors bg-slate-700/30">
                <Upload size={40} className="text-slate-400 mb-3" />
                <p className="text-slate-300 text-center mb-1">
                  Click to upload or drag and drop
                </p>
                <p className="text-sm text-slate-500">MP4, WebM, MOV (max 500MB)</p>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFile}
                  className="hidden"
                />
              </label>
              {videoFile && (
                <div className="mt-4 p-4 bg-slate-700 rounded-lg">
                  <p className="text-slate-300 text-sm font-medium">📁 {videoFile.name}</p>
                  <p className="text-slate-400 text-xs mt-1">
                    Size: {formatFileSize(originalSize)}
                  </p>
                </div>
              )}
            </div>

            {/* Quality Settings */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">
                Compression Quality
              </h2>
              <div className="space-y-3">
                {(Object.keys(qualitySettings) as Array<keyof typeof qualitySettings>).map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuality(q)}
                    className={`w-full p-4 rounded-lg text-left transition-all ${
                      quality === q
                        ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{qualitySettings[q].label}</p>
                        <p className="text-sm opacity-80">
                          Est. compression: {qualitySettings[q].compression}
                        </p>
                      </div>
                      {quality === q && (
                        <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex gap-2">
                <Info size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-blue-300 text-sm">
                  Lower quality = smaller file size. Choose based on your needs.
                </p>
              </div>
            </div>

            {/* Resolution Settings */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">
                Output Resolution (Max Height)
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "original", label: "Original" },
                  { value: "720", label: "720p" },
                  { value: "480", label: "480p" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTargetResolution(option.value as "original" | "720" | "480")}
                    className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                      targetResolution === option.value
                        ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="text-slate-400 text-sm mt-3">
                Default is 480p to keep files small. Original keeps source size.
              </p>
            </div>

            {/* Compress Button */}
            <button
              onClick={compressVideo}
              disabled={!videoFile || processing}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                !videoFile || processing
                  ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 shadow-lg hover:shadow-orange-500/50"
              }`}
            >
              {processing ? "Compressing..." : "🗜️ Compress Video"}
            </button>
          </div>

          {/* Right Column - Preview & Results */}
          <div className="space-y-6">
            {/* Progress */}
            {processing && (
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">Processing...</h3>
                <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-slate-400 text-sm text-center mt-2">{progress}%</p>
              </div>
            )}

            {/* Results */}
            {resultUrl && (
              <>
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-4">Compression Results</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-slate-700 rounded-lg">
                      <span className="text-slate-400">Original Size:</span>
                      <span className="text-white font-semibold">{formatFileSize(originalSize)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-700 rounded-lg">
                      <span className="text-slate-400">Compressed Size:</span>
                      <span className="text-green-400 font-semibold">{formatFileSize(compressedSize)}</span>
                    </div>
                    <div
                      className={`flex justify-between items-center p-3 rounded-lg border ${
                        sizeIncreased
                          ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30"
                          : "bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30"
                      }`}
                    >
                      <span className={sizeIncreased ? "text-amber-300" : "text-green-300"}>
                        {sizeIncreased ? "Size Increased:" : "Space Saved:"}
                      </span>
                      <span className={sizeIncreased ? "text-amber-300 font-bold text-lg" : "text-green-300 font-bold text-lg"}>
                        {sizeChangePercent}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-4">Preview</h3>
                  <video
                    src={resultUrl}
                    controls
                    className="w-full rounded-lg bg-black"
                  />
                </div>

                <button
                  onClick={handleDownload}
                  className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-lg hover:shadow-green-500/50 transition-all flex items-center justify-center gap-2"
                >
                  <Download size={20} />
                  Download Compressed Video
                </button>
              </>
            )}

            {!processing && !resultUrl && (
              <div className="bg-slate-800 rounded-xl p-12 border border-slate-700 text-center">
                <Package size={64} className="text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">
                  Upload a video and click compress to get started
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
