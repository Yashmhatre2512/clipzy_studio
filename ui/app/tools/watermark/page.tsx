"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Pos = { x: number; y: number };

export default function WatermarkToolPage() {
  const router = useRouter();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);

  const [useImage, setUseImage] = useState<boolean>(false);
  const [watermarkFile, setWatermarkFile] = useState<File | null>(null);
  const [watermarkImgUrl, setWatermarkImgUrl] = useState<string | null>(null);
  const [watermarkText, setWatermarkText] = useState<string>("© Clipzy");

  const [scale, setScale] = useState<number>(0.12);
  const [opacity, setOpacity] = useState<number>(0.85);
  const [pos, setPos] = useState<Pos>({ x: 0.9, y: 0.9 });

  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number | null>(null);

  const [processing, setProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [lastBlob, setLastBlob] = useState<Blob | null>(null);

  const previewRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (watermarkImgUrl) URL.revokeObjectURL(watermarkImgUrl);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [videoUrl, watermarkImgUrl, resultUrl]);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    setVideoFile(f);
    const u = URL.createObjectURL(f);
    setVideoUrl(u);
    setResultUrl(null);
  };

  const handleWatermarkFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setWatermarkFile(f);
    if (f) {
      const u = URL.createObjectURL(f);
      setWatermarkImgUrl(u);
      setUseImage(true);
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    try { (e.target as Element).setPointerCapture(e.pointerId); } catch {}
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current || !previewRef.current) return;
    const r = previewRef.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    setPos({ x: Math.min(0.98, Math.max(0.02, x)), y: Math.min(0.98, Math.max(0.02, y)) });
  };
  const onPointerUp = (e: React.PointerEvent) => { draggingRef.current = false; try { (e.target as Element).releasePointerCapture(e.pointerId); } catch {} };

  useEffect(() => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const onLoaded = () => setVideoDuration(v.duration || null);
    v.addEventListener("loadedmetadata", onLoaded);
    return () => v.removeEventListener("loadedmetadata", onLoaded);
  }, [videoUrl]);

  const processWatermark = async () => {
    if (!videoFile) return alert("Please select a video first.");
    setProcessing(true);
    setResultUrl(null);

    const vUrl = URL.createObjectURL(videoFile);
    const video = document.createElement("video");
    video.src = vUrl; video.muted = true; video.playsInline = true; video.crossOrigin = "anonymous";

    await new Promise<void>((res) => { video.addEventListener("loadedmetadata", () => res(), { once: true }); });
    const duration = video.duration || 0;
    const s = Math.max(0, Math.min(startTime || 0, duration));
    const e = endTime && endTime > s ? Math.min(endTime, duration) : duration;

    const vw = video.videoWidth || 640; const vh = video.videoHeight || 360;
    const maxSide = Math.max(640, Math.min(1280, Math.max(vw, vh)));
    const ratio = vw / vh || 1;
    const cw = ratio >= 1 ? maxSide : Math.round(maxSide * ratio);
    const ch = ratio >= 1 ? Math.round(maxSide / ratio) : maxSide;

    const canvas = document.createElement("canvas"); canvas.width = cw; canvas.height = ch;
    const ctx = canvas.getContext("2d"); if (!ctx) { setProcessing(false); return; }

    let wmImg: HTMLImageElement | null = null; let wmUrl: string | null = null;
    if (useImage && watermarkFile) { wmUrl = URL.createObjectURL(watermarkFile); wmImg = new Image(); wmImg.src = wmUrl; await new Promise((r)=> wmImg!.addEventListener('load', r, { once: true })); }

    const draw = () => {
      try {
        ctx.fillStyle = "black"; ctx.fillRect(0,0,cw,ch);
        const videoRatio = vw / vh; const canvasRatio = cw / ch;
        let sx=0, sy=0, sw=vw, sh=vh;
        if (videoRatio > canvasRatio) { const desiredW = Math.round(vh * canvasRatio); sw = desiredW; sx = Math.round((vw - desiredW)/2); }
        else if (videoRatio < canvasRatio) { const desiredH = Math.round(vw / canvasRatio); sh = desiredH; sy = Math.round((vh - desiredH)/2); }
        ctx.drawImage(video, sx,sy,sw,sh, 0,0,cw,ch);

        ctx.globalAlpha = opacity;
        const cx = pos.x * cw; const cy = pos.y * ch;
        if (useImage && wmImg) {
          const wmW = Math.round(cw * scale); const wmH = Math.round((wmImg.height / wmImg.width) * wmW);
          ctx.drawImage(wmImg, Math.round(cx - wmW/2), Math.round(cy - wmH/2), wmW, wmH);
        } else {
          const fontSize = Math.max(12, Math.round(cw * (scale * 0.15)));
          ctx.font = `${fontSize}px sans-serif`; ctx.textBaseline = 'top'; ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.08)); ctx.strokeStyle = 'rgba(0,0,0,0.6)';
          const text = watermarkText || '';
          const tw = ctx.measureText(text).width; const x = Math.round(cx - tw/2); const y = Math.round(cy - fontSize/2);
          ctx.strokeText(text, x, y); ctx.fillStyle = 'white'; ctx.fillText(text, x, y);
        }
        ctx.globalAlpha = 1;
      } catch (err) { }
    };

    const stream = (canvas as HTMLCanvasElement).captureStream(25);
    const chunks: Blob[] = [];
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : (MediaRecorder.isTypeSupported('video/webm;codecs=vp8') ? 'video/webm;codecs=vp8' : 'video/webm');
    const recorder = new MediaRecorder(stream, { mimeType: mime });
    recorder.ondataavailable = (ev: any) => { if (ev.data && ev.data.size) chunks.push(ev.data); };
    recorder.start();

    draw();
    const iv = window.setInterval(draw, Math.round(1000/25));

    await new Promise<void>((res)=>{
      const onTime = () => { if (video.currentTime >= e - 0.05 || video.ended) { video.removeEventListener('timeupdate', onTime); res(); } };
      video.addEventListener('timeupdate', onTime);
      video.currentTime = s; video.play().catch(()=>{});
    });

    video.pause(); clearInterval(iv); recorder.stop();
    await new Promise<void>((res)=> recorder.addEventListener('stop', ()=> res(), { once: true }));

    if (chunks.length === 0) { setProcessing(false); alert('Recording produced no data — try a different browser.'); URL.revokeObjectURL(vUrl); if (wmUrl) URL.revokeObjectURL(wmUrl); return; }

    const out = new Blob(chunks, { type: mime }); setLastBlob(out); const u = URL.createObjectURL(out); setResultUrl(u); setProcessing(false);
    URL.revokeObjectURL(vUrl); if (wmUrl) URL.revokeObjectURL(wmUrl);
  };

  const forceDownload = () => {
    if (!lastBlob) return alert('No rendered file available');
    const a = document.createElement('a'); const href = URL.createObjectURL(lastBlob); a.href = href; a.download = `watermarked_${videoFile?.name ?? 'video'}.webm`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(href), 1500);
  };

  const setPreset = (p: string) => {
    switch(p) {
      case 'top-left': setPos({ x: 0.08, y: 0.08 }); break;
      case 'top-right': setPos({ x: 0.92, y: 0.08 }); break;
      case 'bottom-left': setPos({ x: 0.08, y: 0.92 }); break;
      case 'bottom-right': setPos({ x: 0.92, y: 0.92 }); break;
      case 'center': setPos({ x: 0.5, y: 0.5 }); break;
    }
  };

  return (
    <div className="font-inter bg-gray-900 min-h-screen p-6 text-gray-100">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
          >
            ← Back
          </button>
        </div>
        <h1 className="text-3xl font-bold text-pink-500 mb-2">Add Watermark</h1>
        <p className="text-sm text-gray-400 mb-4">Client-side watermarking — upload a video and watermark (image or text), position it, then render to download (webm).</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <label className="inline-block">
                <div className="px-4 py-2 bg-pink-600 text-white rounded-md cursor-pointer">Choose Video</div>
                <input type="file" accept="video/*" onChange={handleVideoChange} className="hidden" />
              </label>
              <div className="text-sm text-gray-300">{videoFile ? videoFile.name : 'No video selected'}</div>
              <div className="ml-auto text-xs text-gray-400">{videoDuration ? `${videoDuration.toFixed(1)}s` : ''}</div>
            </div>

            <div ref={previewRef} onDragOver={(e)=>e.preventDefault()} onDrop={(e)=>{ e.preventDefault(); const f = e.dataTransfer.files?.[0] ?? null; if (f) { setVideoFile(f); const u = URL.createObjectURL(f); setVideoUrl(u); } }} className="relative bg-black rounded-lg overflow-hidden border border-gray-700" style={{height:360}} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
              {videoUrl ? (
                <video ref={videoRef} src={videoUrl} controls className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">Drop/select a video here</div>
              )}

              <div onPointerDown={onPointerDown} style={{ position: 'absolute', left: `${pos.x*100}%`, top: `${pos.y*100}%`, transform: 'translate(-50%,-50%)', cursor: 'grab', zIndex: 40 }}>
                {useImage && watermarkImgUrl ? (
                  <img src={watermarkImgUrl} draggable={false} alt="wm" style={{ width: Math.max(40, Math.round( (previewRef.current?.clientWidth || 640) * scale )), height: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.6)', borderRadius: 8, border: '2px solid rgba(255,255,255,0.06)', opacity }} />
                ) : (
                  <div style={{ padding: '6px 10px', background: 'rgba(0,0,0,0.6)', color: 'white', fontWeight: 700, borderRadius: 8, fontSize: Math.max(12, Math.round((previewRef.current?.clientWidth || 640) * (scale*0.12))), boxShadow: '0 8px 24px rgba(0,0,0,0.6)', opacity }}>{watermarkText}</div>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button onClick={processWatermark} disabled={processing || !videoFile} className="rounded-full px-6 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-semibold shadow flex items-center gap-2">
                {processing ? 'Processing...' : 'Render & Download'}
              </button>

              {resultUrl && <a href={resultUrl} download={`watermarked_${videoFile?.name ?? 'video'}.webm`} className="px-4 py-2 bg-gray-700 text-gray-100 rounded-lg border border-gray-600">Download</a>}
              {resultUrl && <button onClick={forceDownload} className="px-4 py-2 bg-gray-700 text-gray-100 rounded-lg border border-gray-600">Force Download</button>}
            </div>
          </div>

          <div>
            <div className="p-4 rounded-lg border bg-gray-800/40">
              <div className="mb-3">
                <label className="text-sm font-medium">Watermark Type</label>
                <div className="flex gap-3 mt-2">
                  <label className={`px-3 py-2 rounded ${useImage? 'bg-pink-600 text-white': 'bg-gray-700 text-gray-200'}`}>
                    <input type="radio" className="mr-2" checked={useImage} onChange={()=>setUseImage(true)} /> Image
                  </label>
                  <label className={`px-3 py-2 rounded ${!useImage? 'bg-pink-600 text-white': 'bg-gray-700 text-gray-200'}`}>
                    <input type="radio" className="mr-2" checked={!useImage} onChange={()=>setUseImage(false)} /> Text
                  </label>
                </div>
              </div>

              {useImage ? (
                <div className="mb-3">
                  <label className="text-sm font-medium">Watermark Image</label>
                  <input type="file" accept="image/*" onChange={handleWatermarkFile} className="mt-2 w-full text-gray-100 bg-gray-900 border border-gray-700 rounded" />
                </div>
              ) : (
                <div className="mb-3">
                  <label className="text-sm font-medium">Watermark Text</label>
                  <input value={watermarkText} onChange={(e)=>setWatermarkText(e.target.value)} className="mt-2 border border-gray-700 bg-gray-900 text-gray-100 rounded px-3 py-2 w-full" />
                </div>
              )}

              <div className="mb-3">
                <label className="text-sm font-medium">Size</label>
                <input type="range" min={0.05} max={0.6} step={0.01} value={scale} onChange={(e)=>setScale(parseFloat(e.target.value))} className="w-full mt-2" />
                <div className="text-xs text-gray-400 mt-1">Current size: {(scale*100).toFixed(0)}%</div>
              </div>

              <div className="mb-3">
                <label className="text-sm font-medium">Opacity</label>
                <input type="range" min={0} max={1} step={0.01} value={opacity} onChange={(e)=>setOpacity(parseFloat(e.target.value))} className="w-full mt-2" />
              </div>

              <div className="mb-3">
                <label className="text-sm font-medium">Position Presets</label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <button onClick={()=>setPreset('top-left')} className="px-2 py-1 bg-gray-700 text-gray-200 rounded">Top Left</button>
                  <button onClick={()=>setPreset('top-right')} className="px-2 py-1 bg-gray-700 text-gray-200 rounded">Top Right</button>
                  <button onClick={()=>setPreset('center')} className="px-2 py-1 bg-gray-700 text-gray-200 rounded">Center</button>
                  <button onClick={()=>setPreset('bottom-left')} className="px-2 py-1 bg-gray-700 text-gray-200 rounded">Bottom Left</button>
                  <button onClick={()=>setPreset('bottom-right')} className="px-2 py-1 bg-gray-700 text-gray-200 rounded">Bottom Right</button>
                  <button onClick={()=>{ setPos({x:0.5,y:0.5}); }} className="px-2 py-1 bg-gray-700 text-gray-200 rounded">Reset</button>
                </div>
                <div className="text-xs text-gray-400 mt-2">Or drag the watermark on the preview.</div>
              </div>

              <div className="mb-3">
                <label className="text-sm font-medium">Trim Range (seconds)</label>
                <div className="flex gap-2 mt-2">
                  <input type="number" min={0} step={0.1} value={startTime} onChange={(e)=>setStartTime(parseFloat(e.target.value||'0'))} className="border px-2 py-1 w-24 bg-gray-900" />
                  <input type="number" min={0} step={0.1} value={endTime ?? ''} onChange={(e)=>setEndTime(e.target.value? parseFloat(e.target.value): null)} className="border px-2 py-1 w-24 bg-gray-900" />
                </div>
                <div className="text-xs text-gray-400 mt-2">Leave end empty to render to video end.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

