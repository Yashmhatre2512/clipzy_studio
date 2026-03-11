"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Plus } from "lucide-react";

interface SplitPoint {
  id: string;
  time: number;
}

export default function SplitVideoToolPage() {
  const router = useRouter();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [splitPoints, setSplitPoints] = useState<SplitPoint[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [resultUrls, setResultUrls] = useState<
    { id: string; url: string; startTime: number; endTime: number }[]
  >([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [supportedFormats, setSupportedFormats] = useState<{
    mp4: boolean;
    webm: boolean;
    ogg: boolean;
    mkv: boolean;
  }>({ mp4: false, webm: false, ogg: false, mkv: false });

  // Check codec support on mount
  useEffect(() => {
    const video = document.createElement("video");
    setSupportedFormats({
      mp4: video.canPlayType('video/mp4; codecs="avc1.42E01E"') !== "",
      webm: video.canPlayType('video/webm; codecs="vp9"') !== "" || video.canPlayType('video/webm; codecs="vp8"') !== "",
      ogg: video.canPlayType('video/ogg; codecs="theora"') !== "",
      mkv: false, // MKV not natively supported in browsers
    });
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f) {
      setVideoFile(f);
      setResultUrls([]);
      setProgress(0);
      setSplitPoints([]);
      setVideoDuration(0);
      setVideoReady(false);
      
      // Create preview
      if (videoRef.current) {
        const url = URL.createObjectURL(f);
        videoRef.current.src = url;
        videoRef.current.load();
      }
    }
  };

  const onVideoLoadedMetadata = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      if (!isNaN(duration)) {
        setVideoDuration(duration);
        setVideoReady(true);
        console.log("Video loaded successfully, duration:", duration);
      }
    }
  };

  const addSplitPoint = () => {
    if (!videoRef.current) {
      alert("Video not loaded");
      return;
    }

    if (videoDuration === 0) {
      alert("Please wait for video to load completely");
      return;
    }

    const currentTime = videoRef.current.currentTime;
    if (isNaN(currentTime) || currentTime <= 0 || currentTime >= videoDuration) {
      alert("Invalid split point time");
      return;
    }

    const newPoint: SplitPoint = {
      id: `split-${Date.now()}-${Math.random()}`,
      time: currentTime,
    };

    setSplitPoints(prev => [...prev, newPoint].sort((a, b) => a.time - b.time));
    console.log("Split point added at:", currentTime);
  };

  const removeSplitPoint = (id: string) => {
    setSplitPoints(prev => prev.filter((p) => p.id !== id));
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || videoDuration === 0 || !videoReady) {
      console.log("Timeline click blocked - duration:", videoDuration, "ready:", videoReady);
      return;
    }

    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(clickX / rect.width, 1));
    const time = percentage * videoDuration;

    if (isNaN(time) || time <= 0 || time >= videoDuration) {
      return;
    }

    const newPoint: SplitPoint = {
      id: `split-${Date.now()}-${Math.random()}`,
      time,
    };

    setSplitPoints(prev => [...prev, newPoint].sort((a, b) => a.time - b.time));
    console.log("Split point added via timeline at:", time);
  };

  const handleMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    pointId: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingId(pointId);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingId || !timelineRef.current || videoDuration === 0) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const moveX = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(moveX / rect.width, 1));
      const newTime = percentage * videoDuration;

      if (!isNaN(newTime) && newTime > 0 && newTime < videoDuration) {
        setSplitPoints(prev =>
          prev.map((p) =>
            p.id === draggingId ? { ...p, time: newTime } : p
          )
        );
      }
    };

    const handleMouseUp = () => {
      setDraggingId(null);
    };

    if (draggingId) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [draggingId, videoDuration]);

  const splitVideo = async () => {
    if (!videoFile) {
      alert("No video selected");
      return;
    }

    if (splitPoints.length === 0) {
      alert("Please add at least one split point");
      return;
    }

    if (videoDuration === 0) {
      alert("Video duration not loaded");
      return;
    }

    setProcessing(true);
    setProgress(0);
    setResultUrls([]);

    try {
      const url = URL.createObjectURL(videoFile);
      const video = document.createElement("video");
      video.src = url;
      video.crossOrigin = "anonymous";
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;

      // Wait for metadata
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Video load timeout")), 10000);
        const onLoaded = () => {
          clearTimeout(timer);
          video.removeEventListener("loadedmetadata", onLoaded);
          resolve();
        };
        video.addEventListener("loadedmetadata", onLoaded);
        video.addEventListener("error", () => {
          clearTimeout(timer);
          reject(new Error("Video load error"));
        });
      });

      const vw = 1280;
      const vh = 720;
      const canvas = document.createElement("canvas");
      canvas.width = vw;
      canvas.height = vh;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      if (!ctx) throw new Error("Canvas context failed");

      // Build segments from split points
      const segments: { start: number; end: number }[] = [];
      segments.push({ start: 0, end: splitPoints[0].time });
      for (let i = 0; i < splitPoints.length - 1; i++) {
        segments.push({ start: splitPoints[i].time, end: splitPoints[i + 1].time });
      }
      segments.push({ start: splitPoints[splitPoints.length - 1].time, end: videoDuration });

      const results: { id: string; url: string; startTime: number; endTime: number }[] = [];

      const seekTo = (v: HTMLVideoElement, time: number) =>
        new Promise<void>((resolve, reject) => {
          let settled = false;
          const onSeeked = () => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve();
          };
          const onError = () => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(new Error("Seek error"));
          };
          const onTimeout = () => {
            if (settled) return;
            settled = true;
            cleanup();
            // resolve anyway to avoid blocking; frame may be stale
            resolve();
          };
          const cleanup = () => {
            v.removeEventListener("seeked", onSeeked);
            v.removeEventListener("error", onError);
          };
          v.addEventListener("seeked", onSeeked);
          v.addEventListener("error", onError);
          v.currentTime = Math.min(Math.max(0, time), v.duration || time);
          // fallback timeout if seeked never fires
          setTimeout(onTimeout, 1000);
        });

      for (let segIdx = 0; segIdx < segments.length; segIdx++) {
        const segment = segments[segIdx];
        if (segment.end <= segment.start) continue;

        console.log(`Processing segment ${segIdx + 1}/${segments.length}:`, segment);

        const recordedChunks: Blob[] = [];
        const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm";

        const stream = (canvas as HTMLCanvasElement).captureStream(24);
        const recorder = new MediaRecorder(stream, { mimeType });

        recorder.ondataavailable = (ev) => {
          if (ev.data?.size) recordedChunks.push(ev.data);
        };

        recorder.start();

        const frameDuration = 1 / 24;
        let currentTime = segment.start;

        while (currentTime < segment.end) {
          try {
            await seekTo(video, currentTime);

            // draw the frame after seek
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, vw, vh);

            const vWidth = video.videoWidth || 1280;
            const vHeight = video.videoHeight || 720;
            const scale = Math.min(vw / vWidth, vh / vHeight);
            const sWidth = vWidth * scale;
            const sHeight = vHeight * scale;
            const sX = (vw - sWidth) / 2;
            const sY = (vh - sHeight) / 2;

            try {
              ctx.drawImage(video, sX, sY, sWidth, sHeight);
            } catch (err) {
              // ignore draw errors and continue
            }
          } catch (err) {
            console.warn("Seek/draw error, advancing frame:", err);
          }

          currentTime += frameDuration;
        }

        recorder.stop();

        await new Promise<void>((resolve) => {
          recorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: mimeType });
            const resultUrl = URL.createObjectURL(blob);
            results.push({ id: `segment-${segIdx}`, url: resultUrl, startTime: segment.start, endTime: segment.end });
            setProgress(Math.round(((segIdx + 1) / segments.length) * 100));
            resolve();
          };
        });
      }

      setResultUrls(results);
      console.log("Split completed:", results.length, "segments");
    } catch (error) {
      console.error("Error splitting video:", error);
      alert("Error: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = (idx: number) => {
    if (idx >= resultUrls.length) return;

    const result = resultUrls[idx];
    const a = document.createElement("a");
    a.href = result.url;
    a.download = `video-split-${idx + 1}-${new Date().getTime()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${m}:${String(s).padStart(2, "0")}`;
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
          <h1 className="text-4xl font-bold text-white mb-2">Split Video</h1>
          <p className="text-slate-400">
            Divide your video into multiple parts with draggable split points
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upload Section */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">
                📹 Upload Video
              </h2>
              <label className="flex items-center justify-center w-full p-8 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-slate-500 transition-colors">
                <div className="text-center">
                  <p className="text-slate-400">Click to upload video</p>
                  <p className="text-sm text-slate-500 mt-1">
                    MP4, WebM or MOV format supported
                  </p>
                </div>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFile}
                  className="hidden"
                />
              </label>
              {videoFile && (
                <div className="mt-3 p-3 bg-slate-700 rounded-lg text-sm text-slate-300">
                  📁 {videoFile.name}
                </div>
              )}
              {/* Codec Support Info */}
              <div className="mt-4 p-4 bg-slate-900 rounded-lg border border-slate-600 text-xs">
                <p className="text-slate-300 font-semibold mb-2">✓ Supported on Your Browser:</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className={supportedFormats.mp4 ? "text-emerald-400" : "text-red-400"}>
                    {supportedFormats.mp4 ? "✓" : "✗"} MP4
                  </div>
                  <div className={supportedFormats.webm ? "text-emerald-400" : "text-red-400"}>
                    {supportedFormats.webm ? "✓" : "✗"} WebM
                  </div>
                  <div className={supportedFormats.ogg ? "text-emerald-400" : "text-red-400"}>
                    {supportedFormats.ogg ? "✓" : "✗"} OGG
                  </div>
                  <div className="text-red-400">
                    ✗ MKV (not native)
                  </div>
                </div>
                <p className="text-slate-400 mt-3 text-xs">
                  For best compatibility, use <span className="text-emerald-400 font-semibold">MP4</span> or <span className="text-emerald-400 font-semibold">WebM</span>.
                </p>
              </div>
            </div>

            {/* Video Preview and Timeline */}
            {videoFile && (
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 space-y-4">
                <h2 className="text-xl font-semibold text-white">Preview & Timeline</h2>
                <video
                  ref={videoRef}
                  controls
                  onLoadedMetadata={onVideoLoadedMetadata}
                  className="w-full h-auto rounded-lg bg-black"
                />

                {/* Timeline with Split Points */}
                {videoReady && videoDuration > 0 && (
                  <div className="space-y-4">
                    <div className="text-sm text-slate-300">
                      Duration: <span className="font-bold text-white">{formatTime(videoDuration)}</span>
                    </div>

                    {/* Interactive Timeline */}
                    <div
                      ref={timelineRef}
                      onClick={handleTimelineClick}
                      className="relative w-full h-20 bg-slate-900 rounded-lg border border-slate-600 cursor-pointer group overflow-visible"
                    >
                    {/* Timeline background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-700 opacity-50 rounded-lg" />

                    {/* Progress bar */}
                    {videoRef.current && (
                      <div
                        className="absolute top-0 bottom-0 bg-blue-500/30 pointer-events-none"
                        style={{
                          width: `${(videoRef.current.currentTime / videoDuration) * 100}%`,
                        }}
                      />
                    )}

                    {/* Split points */}
                    {splitPoints.map((point) => (
                      <div
                        key={point.id}
                        onMouseDown={(e) => handleMouseDown(e, point.id)}
                        className={`absolute top-0 bottom-0 w-1 bg-red-500 cursor-col-resize transition-all hover:w-2 hover:bg-red-400 ${
                          draggingId === point.id
                            ? "w-2 bg-red-400 shadow-lg shadow-red-500/50 z-50"
                            : "z-40"
                        }`}
                        style={{
                          left: `${(point.time / videoDuration) * 100}%`,
                        }}
                        title={formatTime(point.time)}
                      />
                    ))}

                    {/* Hover hint */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 text-white text-sm rounded-lg pointer-events-none">
                      Click to add split point
                    </div>
                    </div>

                    {/* Split Points List */}
                    {splitPoints.length > 0 && (
                      <div className="bg-slate-900 rounded-lg p-4 border border-slate-600 max-h-40 overflow-y-auto">
                        <h3 className="text-sm font-semibold text-slate-300 mb-3">
                          Split Points: {splitPoints.length}
                        </h3>
                        <div className="space-y-2">
                          {splitPoints.map((point, idx) => (
                            <div
                              key={point.id}
                              className="flex items-center justify-between bg-slate-800 p-2 rounded text-sm hover:bg-slate-700 transition-colors"
                            >
                              <span className="text-slate-300">
                                Split {idx + 1}: <span className="font-mono font-bold text-white">{formatTime(point.time)}</span>
                              </span>
                              <button
                                onClick={() => removeSplitPoint(point.id)}
                                className="text-red-400 hover:text-red-300 transition-colors"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={addSplitPoint}
                        disabled={!videoRef.current || videoDuration === 0}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                      >
                        <Plus size={18} />
                        Add at Current Time
                      </button>
                      <button
                        onClick={() => setSplitPoints([])}
                        disabled={splitPoints.length === 0}
                        className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-all"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Process Button */}
            {videoFile && splitPoints.length > 0 && (
              <button
                onClick={splitVideo}
                disabled={processing}
                className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-all ${
                  processing
                    ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:shadow-purple-500/50"
                }`}
              >
                {processing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                    Splitting... {progress}%
                  </span>
                ) : (
                  "✂️ Split Video"
                )}
              </button>
            )}
          </div>

          {/* Right Column - Info & Results */}
          <div className="space-y-6">
            {/* Info Section */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-3">
                📊 How to Split
              </h3>
              <ol className="space-y-3 text-sm text-slate-300">
                <li className="flex gap-3">
                  <span className="text-purple-400 font-bold">1.</span>
                  <span>Upload your video</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-400 font-bold">2.</span>
                  <span>Click timeline or use "Add at Current Time"</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-400 font-bold">3.</span>
                  <span>Drag red lines to fine-tune positions</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-400 font-bold">4.</span>
                  <span>Click "Split Video" to process</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-400 font-bold">5.</span>
                  <span>Download each segment</span>
                </li>
              </ol>
            </div>

            {/* Results Section */}
            {resultUrls.length > 0 && (
              <div className="bg-slate-800 rounded-lg p-6 border border-emerald-700 bg-gradient-to-br from-slate-800 to-emerald-900/20 space-y-4">
                <h2 className="text-xl font-semibold text-white">
                  ✅ Split Complete!
                </h2>
                <p className="text-slate-300 text-sm">
                  {resultUrls.length} video segments created
                </p>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {resultUrls.map((result, idx) => (
                    <div
                      key={result.id}
                      className="bg-slate-900 rounded-lg p-4 border border-slate-700"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-white font-medium">Segment {idx + 1}</p>
                          <p className="text-slate-400 text-xs">
                            {formatTime(result.startTime)} - {formatTime(result.endTime)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDownload(idx)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-sm font-medium transition-all"
                        >
                          Download
                        </button>
                      </div>
                      <video
                        controls
                        src={result.url}
                        className="w-full h-32 rounded bg-black"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tips Section */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-3">💡 Tips</h3>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex gap-2">
                  <span className="text-amber-400">•</span>
                  <span>Add multiple split points for many segments</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400">•</span>
                  <span>Drag red lines to adjust split positions</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400">•</span>
                  <span>Watch preview before downloading</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400">•</span>
                  <span>Each segment is a separate file</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
