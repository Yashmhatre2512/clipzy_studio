"use client";

import { useRef, useState } from "react";

// interactive-only cropping UI; removed preset aspect selector

const Button = ({ children, className = "", ...props }: any) => (
  <button
    className={`px-4 py-2 rounded-md font-medium bg-pink-600 text-white hover:bg-pink-700 transition ${className}`}
    {...props}
  >
    {children}
  </button>
);

export default function Frame() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  // crop selection is fully interactive
  // interactive crop rectangle in normalized coordinates [0..1]
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const rectStart = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const resizeHandle = useRef<string | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [quality, setQuality] = useState<"low" | "medium" | "high">("medium");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      setVideoFile(file);
      setResultUrl(null);
      setStartTime(0);
      setEndTime(null);
    }
  };

  // target resolution for recording is computed from the selected crop box or video size

  // Draw current frame of video to canvas with crop selection and scaling
  const drawFrame = (
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    userCrop: { x: number; y: number; w: number; h: number } | null
  ) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const cw = canvas.width;
    const ch = canvas.height;

    // If user provided a cropRect (normalized), use it directly.
    let sx = 0,
      sy = 0,
      sw = vw,
      sh = vh;

    if (userCrop) {
      sx = Math.round(userCrop.x * vw);
      sy = Math.round(userCrop.y * vh);
      sw = Math.round(userCrop.w * vw);
      sh = Math.round(userCrop.h * vh);
    } else {
      // fallback: center-crop video to canvas aspect
      const videoRatio = vw / vh;
      const canvasRatio = cw / ch;
      if (videoRatio > canvasRatio) {
        const desiredW = Math.round(vh * canvasRatio);
        sw = desiredW;
        sx = Math.round((vw - desiredW) / 2);
        sy = 0;
      } else if (videoRatio < canvasRatio) {
        const desiredH = Math.round(vw / canvasRatio);
        sh = desiredH;
        sx = 0;
        sy = Math.round((vh - desiredH) / 2);
      } else {
        sx = 0;
        sy = 0;
      }
    }

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, cw, ch);

    try {
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch);
    } catch (e) {
      // draw might fail if video not ready
    }
  };

  // Process video on client: play in hidden video, draw to canvas and record with MediaRecorder
  const processOnClient = async () => {
    if (!videoFile) return;
    setProcessing(true);
    setResultUrl(null);

    const url = URL.createObjectURL(videoFile);

    // create hidden video element if not already
    let video = videoRef.current;
    if (!video) {
      video = document.createElement("video");
      videoRef.current = video;
    }
    video.src = url;
    video.crossOrigin = "anonymous";
    video.muted = true; // allow autoplay with muted
    video.playsInline = true;

    // wait for metadata
    await new Promise<void>((resolve) => {
      const onLoaded = () => {
        video!.removeEventListener("loadedmetadata", onLoaded);
        resolve();
      };
      video.addEventListener("loadedmetadata", onLoaded);
    });

    const duration = video.duration || 0;
    const sTime = Math.max(0, Math.min(startTime, duration));
    const eTime = endTime && endTime > sTime ? Math.min(endTime, duration) : duration;

      // compute target size from cropRect (if present) else use video's natural aspect
      const computeTargetSize = (rect: { x: number; y: number; w: number; h: number } | null, maxSideOverride?: number) => {
        const maxSide = maxSideOverride || 1280;
        if (rect && videoRef.current && videoRef.current.videoWidth && videoRef.current.videoHeight) {
          const vw = videoRef.current.videoWidth;
          const vh = videoRef.current.videoHeight;
          const boxW = rect.w * vw;
          const boxH = rect.h * vh;
          const ratio = boxW / boxH;
          if (ratio >= 1) {
            const width = Math.round(maxSide);
            const height = Math.max(1, Math.round(maxSide / ratio));
            return { width, height };
          } else {
            const height = Math.round(maxSide);
            const width = Math.max(1, Math.round(maxSide * ratio));
            return { width, height };
          }
        }
        // fallback: use full video aspect when no rect selected
        if (videoRef.current && videoRef.current.videoWidth && videoRef.current.videoHeight) {
          const vw = videoRef.current.videoWidth;
          const vh = videoRef.current.videoHeight;
          const ratio = vw / vh;
          if (ratio >= 1) {
            return { width: Math.round(maxSide), height: Math.max(1, Math.round(maxSide / ratio)) };
          }
          return { width: Math.max(1, Math.round(maxSide * ratio)), height: Math.round(maxSide) };
        }
        return { width: 1280, height: 720 };
      };
  const qualityMax = quality === "low" ? 640 : quality === "medium" ? 960 : 1280;
  const { width: tw, height: th } = computeTargetSize(cropRect, qualityMax);

      let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvasRef.current = canvas;
    }
    canvas.width = tw;
    canvas.height = th;

    // capture stream from canvas
  const targetFps = quality === "low" ? 12 : quality === "medium" ? 20 : 30;
  const stream = (canvas as HTMLCanvasElement).captureStream(targetFps);
    const recordedChunks: BlobPart[] = [];

    let mimeType = "video/webm; codecs=vp8,opus";
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = "video/webm";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "";
      }
    }

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size) recordedChunks.push(ev.data);
    };

    // Use interval-driven drawing at the chosen fps to reduce CPU overhead vs RAF at 60fps
    let drawInterval: number | null = null;
    const startDrawing = () => {
      drawFrame(video, canvas!, cropRect);
      drawInterval = window.setInterval(() => {
        if (!video || video.paused || video.ended) return;
        drawFrame(video, canvas!, cropRect);
      }, Math.round(1000 / targetFps));
    };

    // start recording
    recorder.start();

    // set time and play
    video.currentTime = sTime;

    await video.play().catch(() => {
      // play may be blocked if not in user gesture; Process button is user gesture so should be okay.
    });

  startDrawing();

    // stop at eTime
    await new Promise<void>((resolve) => {
      const onTimeUpdate = () => {
        if (video!.currentTime >= eTime - 0.05 || video!.ended) {
          video!.removeEventListener("timeupdate", onTimeUpdate);
          resolve();
        }
      };
      video!.addEventListener("timeupdate", onTimeUpdate);
    });

  // pause and finalize
    video.pause();
    // allow last frames to be drawn
  drawFrame(video, canvas, cropRect);

    // give a small delay to make sure renderer flushes
    await new Promise((r) => setTimeout(r, 150));

    // stop drawing
    if (drawInterval) {
      clearInterval(drawInterval);
      drawInterval = null;
    }

    recorder.stop();

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    const blob = new Blob(recordedChunks, { type: mimeType || "video/webm" });
    const downloadUrl = URL.createObjectURL(blob);
    setResultUrl(downloadUrl);
    setProcessing(false);
  };

  // Helpers for crop rectangle interaction
  const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

  const clientToNormalized = (clientX: number, clientY: number) => {
    // Map client coordinates to normalized coordinates within the actual displayed video frame
    const el = (videoRef.current as HTMLVideoElement) || containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();

    // if we have the video's natural size, compute letterbox offsets for object-fit:contain
    const vw = (videoRef.current && videoRef.current.videoWidth) || 0;
    const vh = (videoRef.current && videoRef.current.videoHeight) || 0;
    if (vw && vh) {
      const videoAspect = vw / vh;
      const containerAspect = r.width / r.height;
      let dw = r.width;
      let dh = r.height;
      if (videoAspect > containerAspect) {
        // video fills width, letterbox top/bottom
        dw = r.width;
        dh = r.width / videoAspect;
      } else {
        // video fills height, letterbox left/right
        dh = r.height;
        dw = r.height * videoAspect;
      }
      const offsetX = r.left + (r.width - dw) / 2;
      const offsetY = r.top + (r.height - dh) / 2;
      const x = (clientX - offsetX) / dw;
      const y = (clientY - offsetY) / dh;
      return { x: clamp(x, 0, 1), y: clamp(y, 0, 1) };
    }

    // fallback: map to full element rect
    const x = (clientX - r.left) / r.width;
    const y = (clientY - r.top) / r.height;
    return { x: clamp(x, 0, 1), y: clamp(y, 0, 1) };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const pos = clientToNormalized(e.clientX, e.clientY);
    if (!cropRect) {
      // start drawing a new rect
      setCropRect({ x: pos.x, y: pos.y, w: 0.001, h: 0.001 });
      setIsDrawing(true);
      dragStart.current = { x: pos.x, y: pos.y };
      rectStart.current = null;
      (e.target as Element).setPointerCapture(e.pointerId);
      return;
    }

    // check if inside existing rect (for dragging) or near edges (for resizing)
    const px = pos.x,
      py = pos.y;
    const r = cropRect;
    const edge = 0.03; // 3% tolerance
    const left = Math.abs(px - r.x) < edge;
    const right = Math.abs(px - (r.x + r.w)) < edge;
    const top = Math.abs(py - r.y) < edge;
    const bottom = Math.abs(py - (r.y + r.h)) < edge;

    if (left || right || top || bottom) {
      setIsResizing(true);
      resizeHandle.current = `${left ? "l" : ""}${right ? "r" : ""}${top ? "t" : ""}${bottom ? "b" : ""}`;
      rectStart.current = { ...r };
      dragStart.current = { x: pos.x, y: pos.y };
      (e.target as Element).setPointerCapture(e.pointerId);
      return;
    }

    // if inside rect, start dragging
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) {
      setIsDragging(true);
      dragStart.current = { x: pos.x, y: pos.y };
      rectStart.current = { ...r };
      (e.target as Element).setPointerCapture(e.pointerId);
      return;
    }

    // otherwise start drawing new rect
    setCropRect({ x: pos.x, y: pos.y, w: 0.001, h: 0.001 });
    setIsDrawing(true);
    dragStart.current = { x: pos.x, y: pos.y };
    rectStart.current = null;
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const pos = clientToNormalized(e.clientX, e.clientY);

    if (isDrawing && dragStart.current) {
      const sx = dragStart.current.x;
      const sy = dragStart.current.y;
      const nx = Math.min(sx, pos.x);
      const ny = Math.min(sy, pos.y);
      const nw = Math.abs(pos.x - sx);
      const nh = Math.abs(pos.y - sy);
      setCropRect({ x: clamp(nx), y: clamp(ny), w: clamp(nw), h: clamp(nh) });
      return;
    }

    if (isDragging && rectStart.current && dragStart.current) {
      const dx = pos.x - dragStart.current.x;
      const dy = pos.y - dragStart.current.y;
      const nr = {
        x: clamp(rectStart.current.x + dx, 0, 1 - rectStart.current.w),
        y: clamp(rectStart.current.y + dy, 0, 1 - rectStart.current.h),
        w: rectStart.current.w,
        h: rectStart.current.h,
      };
      setCropRect(nr);
      return;
    }

    if (isResizing && rectStart.current && dragStart.current && resizeHandle.current) {
      let r = { ...rectStart.current };
      const dx = pos.x - dragStart.current.x;
      const dy = pos.y - dragStart.current.y;
      // handle left/right/top/bottom
      if (resizeHandle.current.includes("l")) {
        const newX = clamp(r.x + dx, 0, r.x + r.w - 0.05);
        const newW = clamp(r.w - (newX - r.x), 0.01, 1);
        r.w = newW;
        r.x = newX;
      }
      if (resizeHandle.current.includes("r")) {
        const newW = clamp(r.w + dx, 0.01, 1 - r.x);
        r.w = newW;
      }
      if (resizeHandle.current.includes("t")) {
        const newY = clamp(r.y + dy, 0, r.y + r.h - 0.05);
        const newH = clamp(r.h - (newY - r.y), 0.01, 1);
        r.h = newH;
        r.y = newY;
      }
      if (resizeHandle.current.includes("b")) {
        const newH = clamp(r.h + dy, 0.01, 1 - r.y);
        r.h = newH;
      }
      setCropRect(r);
      return;
    }
  };

  const onPointerUp = (e?: PointerEvent | React.PointerEvent) => {
    setIsDrawing(false);
    setIsDragging(false);
    setIsResizing(false);
    dragStart.current = null;
    rectStart.current = null;
    resizeHandle.current = null;
  };

  const resetCrop = () => setCropRect(null);

  return (
    <div className="font-inter bg-white min-h-screen p-6 text-gray-800">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-pink-600">Upload & Resize Video</h1>

        {/* Upload Video */}
        <input
          accept="video/*"
          className="border border-pink-300 rounded-md px-4 py-2 w-full text-black"
          type="file"
          onChange={handleFileChange}
        />

        <div className="text-sm text-gray-600">Draw a crop box on the video to select the area to export.</div>
        <div className="flex items-center gap-3">
          <label className="text-sm">Quality</label>
          <select value={quality} onChange={(e) => setQuality(e.target.value as any)} className="border rounded px-2 py-1 text-sm">
            <option value="low">Low (fast)</option>
            <option value="medium">Medium</option>
            <option value="high">High (slower)</option>
          </select>
        </div>

        {/* Video Preview and time inputs */}
        {videoFile && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600">Preview</p>
            <div
              ref={containerRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              className={`relative w-full max-w-sm border border-gray-300 overflow-hidden bg-black`}
            >
              <video
                controls
                ref={(el) => {
                  if (el) videoRef.current = el;
                }}
                className="w-full h-full object-contain"
                src={URL.createObjectURL(videoFile)}
              />

              {/* interactive overlay */}
              <div className="absolute inset-0 pointer-events-auto">
                {cropRect && (
                  <div
                    className="absolute border-2 border-pink-500 bg-pink-500/10"
                    style={{
                      left: `${cropRect.x * 100}%`,
                      top: `${cropRect.y * 100}%`,
                      width: `${cropRect.w * 100}%`,
                      height: `${cropRect.h * 100}%`,
                    }}
                  >
                    {/* corner handles */}
                    <div className="absolute w-3 h-3 bg-white border rounded -left-1 -top-1"></div>
                    <div className="absolute w-3 h-3 bg-white border rounded -right-1 -top-1" style={{ right: 0, top: 0 }}></div>
                    <div className="absolute w-3 h-3 bg-white border rounded -left-1 -bottom-1" style={{ left: 0, bottom: 0 }}></div>
                    <div className="absolute w-3 h-3 bg-white border rounded -right-1 -bottom-1" style={{ right: 0, bottom: 0 }}></div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 items-center">
              <label className="text-sm">Start (s)</label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={startTime}
                onChange={(e) => setStartTime(parseFloat(e.target.value) || 0)}
                className="border rounded px-2 py-1 w-24"
              />
              <label className="text-sm">End (s)</label>
              <input
                type="number"
                min={0}
                step={0.1}
                placeholder="Leave empty = end"
                onChange={(e) => setEndTime(e.target.value ? parseFloat(e.target.value) : null)}
                className="border rounded px-2 py-1 w-32"
              />
            </div>
          </div>
        )}

        {/* Process Video Button */}
        <div className="flex gap-3">
          <Button onClick={processOnClient} disabled={!videoFile || processing}>
            {processing ? "Processing..." : "Process & Download"}
          </Button>
          <button onClick={resetCrop} className="px-3 py-1 rounded border text-sm self-center" disabled={!cropRect}>
            Reset Crop
          </button>
          {resultUrl && (
            <a href={resultUrl} download={`cropped_${videoFile?.name || "video"}.webm`} className="text-sm text-pink-600 underline self-center">
              Download
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
