"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SlowMotionToolPage() {
  const router = useRouter();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [speedMode, setSpeedMode] = useState<"slowmotion" | "fastforward">(
    "slowmotion"
  );
  const [processing, setProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);

  const speedPresets = {
    slowmotion: [0.25, 0.5, 0.75],
    fastforward: [1.25, 1.5, 2],
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f) {
      setVideoFile(f);
      setResultUrl(null);
      setProgress(0);
      const preview = URL.createObjectURL(f);
      setVideoPreviewUrl(preview);
      if (videoRef.current) {
        videoRef.current.src = preview;
      }
    }
  };

  const processSpeedChange = async () => {
    if (!videoFile) {
      alert("Please select a video first");
      return;
    }

    setProcessing(true);
    setProgress(0);
    setResultUrl(null);

    try {
      await processVideoCanvas();
    } catch (error) {
      console.error("Error processing video:", error);
      alert("Error processing video. Please try again with smaller files.");
    } finally {
      setProcessing(false);
    }
  };

  const processVideoCanvas = async () => {
    const url = URL.createObjectURL(videoFile!);
    const video = document.createElement("video");
    video.src = url;
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;

    await new Promise<void>((resolve) => {
      const onLoaded = () => {
        video.removeEventListener("loadedmetadata", onLoaded);
        resolve();
      };
      video.addEventListener("loadedmetadata", onLoaded);
    });

    const originalDuration = video.duration || 0;
    const vw = video.videoWidth;
    const vh = video.videoHeight;

    const canvas = document.createElement("canvas");
    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const framerate = 24;
    const frameInterval = 1 / framerate;
    const recordedChunks: Blob[] = [];

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
      ? "video/webm;codecs=vp8"
      : "video/webm";

    const stream = (canvas as HTMLCanvasElement).captureStream(framerate);
    const recorder = new MediaRecorder(stream, { 
      mimeType,
      videoBitsPerSecond: 2500000 
    });

    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size) recordedChunks.push(ev.data);
    };

    recorder.start();

    let currentTime = 0;
    const processFrame = () => {
      if (currentTime > originalDuration) {
        recorder.stop();
      } else {
        video.currentTime = currentTime;
        ctx.drawImage(video, 0, 0);
        
        const progress = Math.round((currentTime / originalDuration) * 90);
        setProgress(progress);
        
        const actualSpeed = speedMode === "slowmotion" ? playbackSpeed : playbackSpeed;
        currentTime += frameInterval * actualSpeed;
        
        requestAnimationFrame(processFrame);
      }
    };

    processFrame();

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    const blob = new Blob(recordedChunks, { type: mimeType });
    const resultUrl = URL.createObjectURL(blob);
    setResultUrl(resultUrl);
    setProgress(100);
  };

  const handleDownload = () => {
    if (!resultUrl) return;

    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `${speedMode}-${playbackSpeed}x-${new Date().getTime()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleModeChange = (mode: "slowmotion" | "fastforward") => {
    setSpeedMode(mode);
    setPlaybackSpeed(mode === "slowmotion" ? 0.5 : 1.5);
    setResultUrl(null);
    setProgress(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
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
          <h1 className="text-4xl font-bold text-white mb-2">
            Speed Control Tool
          </h1>
          <p className="text-slate-400">
            Adjust video speed - slow motion or fast forward
          </p>
        </div>

        {/* Main Container */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Controls */}
          <div className="space-y-6">
            {/* Mode Selection */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">
                Select Mode
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleModeChange("slowmotion")}
                  className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                    speedMode === "slowmotion"
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  🐢 Slow Motion
                </button>
                <button
                  onClick={() => handleModeChange("fastforward")}
                  className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                    speedMode === "fastforward"
                      ? "bg-red-600 text-white shadow-lg shadow-red-500/50"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  🐇 Fast Forward
                </button>
              </div>
            </div>

            {/* File Upload */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">
                Upload Video
              </h2>
              <label className="flex items-center justify-center w-full p-6 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-slate-500 transition-colors">
                <div className="text-center">
                  <p className="text-slate-400">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    MP4, WebM or MOV (max 500MB)
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
            </div>

            {/* Speed Presets */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">
                Speed Presets
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {speedPresets[speedMode].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setPlaybackSpeed(speed)}
                    className={`py-2 px-3 rounded-lg font-semibold text-sm transition-all ${
                      playbackSpeed === speed
                        ? "bg-amber-500 text-white shadow-lg shadow-amber-500/50"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Speed Slider */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">
                Custom Speed
              </h2>
              <div className="space-y-4">
                <input
                  type="range"
                  min={speedMode === "slowmotion" ? "0.1" : "0.5"}
                  max={speedMode === "slowmotion" ? "0.99" : "3"}
                  step="0.05"
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <div className="text-center">
                  <p className="text-4xl font-bold text-amber-400">
                    {playbackSpeed.toFixed(2)}x
                  </p>
                  <p className="text-sm text-slate-400 mt-2">
                    {speedMode === "slowmotion"
                      ? `${((1 / playbackSpeed - 1) * 100).toFixed(0)}% slower`
                      : `${((playbackSpeed - 1) * 100).toFixed(0)}% faster`}
                  </p>
                </div>
              </div>
            </div>

            {/* Process Button */}
            <button
              onClick={processSpeedChange}
              disabled={!videoFile || processing}
              className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-all ${
                !videoFile || processing
                  ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg hover:shadow-green-500/50"
              }`}
            >
              {processing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  Processing... {progress}%
                </span>
              ) : (
                "Process Video"
              )}
            </button>
          </div>

          {/* Right Column - Preview */}
          <div className="space-y-6">
            {/* Video Preview */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">Preview</h2>
              {videoPreviewUrl ? (
                <video
                  ref={videoRef}
                  controls
                  className="w-full h-auto rounded-lg bg-black"
                />
              ) : (
                <div className="w-full aspect-video bg-slate-900 rounded-lg flex items-center justify-center text-slate-500">
                  <p>Video preview will appear here</p>
                </div>
              )}
            </div>

            {/* Result Section */}
            {resultUrl && (
              <div className="bg-slate-800 rounded-lg p-6 border border-emerald-700 bg-gradient-to-br from-slate-800 to-emerald-900/20">
                <h2 className="text-xl font-semibold text-white mb-4">
                  ✅ Processing Complete
                </h2>
                <p className="text-slate-300 mb-4 text-sm">
                  Your video has been processed at {playbackSpeed.toFixed(2)}x
                  speed
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
                  ⬇️ Download Video
                </button>
              </div>
            )}

            {/* Info Section */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-3">
                💡 How it works
              </h3>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex gap-2">
                  <span className="text-amber-400">1.</span>
                  <span>Upload your video file</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400">2.</span>
                  <span>Choose slow motion or fast forward mode</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400">3.</span>
                  <span>Select or customize the speed</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400">4.</span>
                  <span>Click Process and download your result</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
