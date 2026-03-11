"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function ThumbnailToolPage() {
  const router = useRouter();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [time, setTime] = useState<number>(0);
  const [processing, setProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [format, setFormat] = useState<"image/png" | "image/jpeg">("image/png");
  const [scale, setScale] = useState<number>(1);
  const [imageQuality, setImageQuality] = useState<number>(0.92);

  // Text overlay state
  const [headlineText, setHeadlineText] = useState<string>("");
  const [subheadText, setSubheadText] = useState<string>("");
  const [fontSize, setFontSize] = useState<number>(48);
  const [fontFamily, setFontFamily] = useState<string>("Arial");
  const [strokeColor, setStrokeColor] = useState<string>("#000000");
  const [strokeWidth, setStrokeWidth] = useState<number>(2);
  const [shadowBlur, setShadowBlur] = useState<number>(4);
  const [shadowColor, setShadowColor] = useState<string>("#000000");
  const [textPosition, setTextPosition] = useState<"top-left" | "top-center" | "top-right" | "center" | "bottom-left" | "bottom-center" | "bottom-right">("bottom-center");
  const [textOpacity, setTextOpacity] = useState<number>(1);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [videoUrl, resultUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    setVideoFile(f);
    const u = URL.createObjectURL(f);
    setVideoUrl(u);
    setResultUrl(null);
    setTime(0);
  };

  useEffect(() => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const onLoaded = () => {
      setDuration(v.duration || 0);
      setTime(0);
    };
    v.addEventListener("loadedmetadata", onLoaded);
    return () => v.removeEventListener("loadedmetadata", onLoaded);
  }, [videoUrl]);

  const seekVideo = (t: number) =>
    new Promise<void>((resolve, reject) => {
      const v = videoRef.current;
      if (!v) return reject(new Error("No video element"));
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
      const cleanup = () => {
        v.removeEventListener("seeked", onSeeked);
        v.removeEventListener("error", onError);
      };
      v.addEventListener("seeked", onSeeked);
      v.addEventListener("error", onError);
      try {
        v.currentTime = Math.max(0, Math.min(t, v.duration || t));
      } catch (err) {
        // some browsers require a play() before seeking in certain cases
        try { v.play().catch(()=>{}); v.currentTime = Math.max(0, Math.min(t, v.duration || t)); } catch {}
      }
      // fallback timeout
      setTimeout(() => {
        if (!settled) {
          settled = true;
          cleanup();
          resolve();
        }
      }, 1000);
    });

  const captureFrame = async () => {
    if (!videoFile || !videoRef.current) return alert("Please select a video first");
    setProcessing(true);
    setResultUrl(null);

    try {
      // ensure video is seeked to time
      await seekVideo(time);

      const v = videoRef.current;
      const vw = v.videoWidth || 640;
      const vh = v.videoHeight || 360;

      const cw = Math.max(1, Math.round(vw * scale));
      const ch = Math.max(1, Math.round(vh * scale));

      let canvas = canvasRef.current;
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvasRef.current = canvas;
      }
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");

      // draw video frame to canvas scaled
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, cw, ch);

      // maintain aspect ratio and contain
      const videoRatio = vw / vh;
      const canvasRatio = cw / ch;
      let sx = 0, sy = 0, sw = vw, sh = vh;
      if (videoRatio > canvasRatio) {
        const desiredW = Math.round(vh * canvasRatio);
        sw = desiredW;
        sx = Math.round((vw - desiredW) / 2);
      } else if (videoRatio < canvasRatio) {
        const desiredH = Math.round(vw / canvasRatio);
        sh = desiredH;
        sy = Math.round((vh - desiredH) / 2);
      }

      ctx.drawImage(v, sx, sy, sw, sh, 0, 0, cw, ch);

      // Draw text overlays
      if (headlineText || subheadText) {
        drawTextOverlay(ctx, cw, ch);
      }

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas!.toBlob((b) => resolve(b), format, format === "image/jpeg" ? imageQuality : undefined)
      );

      if (!blob) throw new Error("Failed to create image blob");

      const url = URL.createObjectURL(blob);
      setResultUrl(url);

    } catch (err) {
      console.error("Capture error:", err);
      alert("Failed to capture frame: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setProcessing(false);
    }
  };

  const drawTextOverlay = (ctx: CanvasRenderingContext2D, cw: number, ch: number) => {
    ctx.globalAlpha = textOpacity;

    const scaledFontSize = Math.round(fontSize * (cw / 1280)); // scale font to canvas width
    const padding = 20;

    // Calculate positions based on preset
    const getPosition = (text: string, isSubhead: boolean = false): { x: number; y: number } => {
      const metrics = ctx.measureText(text);
      const textWidth = metrics.width;
      const textHeight = isSubhead ? scaledFontSize * 0.6 : scaledFontSize;

      let x = 0, y = 0;

      switch (textPosition) {
        case "top-left":
          x = padding;
          y = padding + textHeight;
          break;
        case "top-center":
          x = cw / 2 - textWidth / 2;
          y = padding + textHeight;
          break;
        case "top-right":
          x = cw - padding - textWidth;
          y = padding + textHeight;
          break;
        case "center":
          x = cw / 2 - textWidth / 2;
          y = ch / 2;
          break;
        case "bottom-left":
          x = padding;
          y = ch - padding;
          break;
        case "bottom-center":
          x = cw / 2 - textWidth / 2;
          y = ch - padding;
          break;
        case "bottom-right":
          x = cw - padding - textWidth;
          y = ch - padding;
          break;
      }

      return { x, y };
    };

    // Draw headline
    if (headlineText) {
      ctx.font = `bold ${scaledFontSize}px ${fontFamily}`;
      ctx.textBaseline = "bottom";
      const pos = getPosition(headlineText);

      // Shadow
      if (shadowBlur > 0) {
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = shadowBlur;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
      }

      // Stroke
      if (strokeWidth > 0) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.strokeText(headlineText, pos.x, pos.y);
      }

      // Fill
      ctx.fillStyle = "white";
      ctx.fillText(headlineText, pos.x, pos.y);

      ctx.shadowBlur = 0;
    }

    // Draw subhead below headline
    if (subheadText) {
      ctx.font = `${Math.round(scaledFontSize * 0.6)}px ${fontFamily}`;
      ctx.textBaseline = "top";

      const headlineMetrics = ctx.measureText(headlineText);
      let subPos = { x: 0, y: 0 };

      if (headlineText) {
        // Position subhead below headline
        subPos = getPosition(subheadText, true);
        subPos.y += Math.round(scaledFontSize * 0.8);
      } else {
        subPos = getPosition(subheadText, true);
      }

      // Shadow
      if (shadowBlur > 0) {
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = shadowBlur;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
      }

      // Stroke
      if (strokeWidth > 0) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth * 0.6;
        ctx.strokeText(subheadText, subPos.x, subPos.y);
      }

      // Fill
      ctx.fillStyle = "white";
      ctx.fillText(subheadText, subPos.x, subPos.y);

      ctx.shadowBlur = 0;
    }

    ctx.globalAlpha = 1;
  };

  const downloadResult = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `thumbnail_${videoFile?.name ?? "video"}_${Math.round(time)}.${format === "image/png" ? "png" : "jpg"}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="mb-3">
            <button onClick={() => router.back()} className="inline-flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded">← Back</button>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Thumbnail Generator</h1>
          <p className="text-slate-400">Pick a frame from your video and save it as an image (PNG or JPEG).</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 mb-4">
              <label className="inline-block">
                <div className="px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer">Choose Video</div>
                <input type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
              </label>
              <div className="text-sm text-slate-300 mt-2">{videoFile ? videoFile.name : "No video selected"}</div>
            </div>

            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 mb-4">
              <h2 className="text-sm text-slate-200 font-semibold mb-2">Frame Time</h2>
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={Math.max(0.0001, duration)} step={0.01} value={time} onChange={(e)=> setTime(parseFloat(e.target.value))} className="w-full" />
                <div className="w-24 text-right text-sm text-slate-300">{time.toFixed(2)}s</div>
              </div>
              <div className="mt-2 text-xs text-slate-400">Duration: {duration.toFixed(2)}s</div>
            </div>

            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 mb-4">
              <h2 className="text-sm text-slate-200 font-semibold mb-3">Output</h2>
              <div className="flex gap-2 mb-3">
                <label className={`px-3 py-1 rounded ${format === 'image/png' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                  <input type="radio" name="fmt" checked={format === 'image/png'} onChange={()=>setFormat('image/png')} className="mr-2" /> PNG
                </label>
                <label className={`px-3 py-1 rounded ${format === 'image/jpeg' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                  <input type="radio" name="fmt" checked={format === 'image/jpeg'} onChange={()=>setFormat('image/jpeg')} className="mr-2" /> JPEG
                </label>
              </div>

              <div className="mb-2">
                <label className="text-xs text-slate-400">Scale ({(scale*100).toFixed(0)}%)</label>
                <input type="range" min={0.25} max={2} step={0.05} value={scale} onChange={(e)=> setScale(parseFloat(e.target.value))} className="w-full" />
              </div>

              {format === 'image/jpeg' && (
                <div>
                  <label className="text-xs text-slate-400">JPEG Quality ({Math.round(imageQuality*100)}%)</label>
                  <input type="range" min={0.2} max={1} step={0.01} value={imageQuality} onChange={(e)=> setImageQuality(parseFloat(e.target.value))} className="w-full" />
                </div>
              )}
            </div>

            {/* Text Overlay Section */}
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 mb-4">
              <h2 className="text-sm text-slate-200 font-semibold mb-3">📝 Text Overlay</h2>
              
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400">Headline</label>
                  <input
                    type="text"
                    placeholder="Enter headline text..."
                    value={headlineText}
                    onChange={(e) => setHeadlineText(e.target.value)}
                    className="w-full mt-1 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-slate-400">Subheading</label>
                  <input
                    type="text"
                    placeholder="Enter subheading text..."
                    value={subheadText}
                    onChange={(e) => setSubheadText(e.target.value)}
                    className="w-full mt-1 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-slate-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400">Font Size ({fontSize}px)</label>
                    <input type="range" min={16} max={120} step={2} value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} className="w-full" />
                  </div>
                  <div>
                    <label className="text-slate-400">Font Family</label>
                    <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="w-full mt-1 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-slate-200 text-xs">
                      <option>Arial</option>
                      <option>Helvetica</option>
                      <option>Georgia</option>
                      <option>Times New Roman</option>
                      <option>Courier New</option>
                      <option>Verdana</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400">Stroke Color</label>
                    <input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} className="w-full mt-1 h-8 rounded cursor-pointer" />
                  </div>
                  <div>
                    <label className="text-slate-400">Stroke Width ({strokeWidth}px)</label>
                    <input type="range" min={0} max={8} step={0.5} value={strokeWidth} onChange={(e) => setStrokeWidth(parseFloat(e.target.value))} className="w-full" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400">Shadow Color</label>
                    <input type="color" value={shadowColor} onChange={(e) => setShadowColor(e.target.value)} className="w-full mt-1 h-8 rounded cursor-pointer" />
                  </div>
                  <div>
                    <label className="text-slate-400">Shadow Blur ({shadowBlur}px)</label>
                    <input type="range" min={0} max={20} step={1} value={shadowBlur} onChange={(e) => setShadowBlur(parseInt(e.target.value))} className="w-full" />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400">Text Position</label>
                  <div className="grid grid-cols-3 gap-1 mt-1">
                    {(['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'] as const).map((pos) => (
                      <button
                        key={pos}
                        onClick={() => setTextPosition(pos)}
                        className={`py-1 px-2 rounded text-xs font-medium transition-all ${
                          textPosition === pos
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {pos.split('-').map(w => w.charAt(0).toUpperCase()).join('')}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-slate-400">Text Opacity ({Math.round(textOpacity * 100)}%)</label>
                  <input type="range" min={0.1} max={1} step={0.05} value={textOpacity} onChange={(e) => setTextOpacity(parseFloat(e.target.value))} className="w-full" />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={captureFrame} disabled={!videoFile || processing} className={`flex-1 py-3 rounded-lg font-semibold ${!videoFile || processing ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'}`}>
                {processing ? 'Capturing...' : 'Capture Frame'}
              </button>
              <button onClick={()=>{ setResultUrl(null); setTime(0); }} className="px-3 py-3 rounded-lg bg-slate-700 text-slate-200">Reset</button>
            </div>

          </div>

          <div>
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 mb-4">
              <h2 className="text-sm text-slate-200 font-semibold mb-2">Preview</h2>
              <div className="bg-slate-900 rounded overflow-hidden">
                {videoUrl ? (
                  <video ref={videoRef} src={videoUrl} controls className="w-full h-auto bg-black" />
                ) : (
                  <div className="w-full aspect-video bg-slate-900 flex items-center justify-center text-slate-500">Video preview</div>
                )}
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <h2 className="text-sm text-slate-200 font-semibold mb-2">Result</h2>
              {resultUrl ? (
                <div className="space-y-3">
                  <img src={resultUrl} alt="thumbnail" className="w-full rounded" />
                  <div className="flex gap-2">
                    <button onClick={downloadResult} className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded">Download</button>
                    <button onClick={()=>{ setResultUrl(null); }} className="px-3 py-2 bg-slate-700 text-slate-200 rounded">Clear</button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400">No thumbnail captured yet.</div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
