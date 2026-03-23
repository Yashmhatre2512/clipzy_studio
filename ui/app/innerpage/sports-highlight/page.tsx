'use client';

import { useState, useRef } from 'react';
import { Upload, Zap, Trophy, Clock, Download, ChevronDown, ChevronUp, Loader2, Film } from 'lucide-react';

const API_URL = 'http://localhost:5003/api';

interface Highlight {
  rank: number;
  filename: string;
  url: string;
  start_time: number;
  end_time: number;
  duration: number;
  peak_time: number;
  energy_score: number;
}

function formatTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function EnergyBar({ score }: { score: number }) {
  const pct = Math.min(100, score);
  const color = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-orange-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-300 w-10 text-right">{score.toFixed(1)}%</span>
    </div>
  );
}

function ClipCard({ highlight, index }: { highlight: Highlight; index: number }) {
  const [expanded, setExpanded] = useState(index === 0);
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center gap-3 p-4 hover:bg-gray-750 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="text-2xl">{medals[index] || `#${highlight.rank}`}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-bold text-sm">Highlight #{highlight.rank}</span>
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full border border-emerald-500/30 font-medium">
              Peak Moment
            </span>
          </div>
          <EnergyBar score={highlight.energy_score} />
        </div>
        <div className="text-right text-xs text-gray-400 shrink-0 mr-2">
          <div>{formatTime(highlight.start_time)} → {formatTime(highlight.end_time)}</div>
          <div className="text-gray-500">{highlight.duration.toFixed(1)}s</div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
      </button>

      {/* Expanded: video + download */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-700 pt-3">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={12} className="text-emerald-400" />
            <span className="text-xs text-gray-400">
              Peak energy at {formatTime(highlight.peak_time)} — intensity: <span className="text-emerald-400 font-semibold">{highlight.energy_score.toFixed(1)}%</span>
            </span>
          </div>
          <video
            className="w-full rounded-lg bg-black mb-3"
            controls
            preload="metadata"
            src={`${API_URL}/clip/${highlight.url.split('/api/clip/')[1]}`}
          />
          <a
            href={`${API_URL}/clip/${highlight.url.split('/api/clip/')[1]}`}
            download={highlight.filename}
            className="flex items-center justify-center gap-2 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Download size={14} />
            Download Clip
          </a>
        </div>
      )}
    </div>
  );
}

export default function SportsHighlightPage() {
  const [file, setFile]               = useState<File | null>(null);
  const [numClips, setNumClips]       = useState(5);
  const [clipDuration, setClipDuration] = useState(30);
  const [jobId, setJobId]             = useState<string | null>(null);
  const [progress, setProgress]       = useState(0);
  const [status, setStatus]           = useState('Waiting');
  const [isProcessing, setIsProcessing] = useState(false);
  const [highlights, setHighlights]   = useState<Highlight[]>([]);
  const [error, setError]             = useState('');
  const [numChunks, setNumChunks]     = useState<number | null>(null);
  const [totalDuration, setTotalDuration] = useState<number | null>(null);
  const intervalRef                   = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  const STEPS = [
    { label: 'Analysing video duration',  pct: 8 },
    { label: 'Chunking & extracting audio', pct: 30 },
    { label: 'Detecting highlights (RMS + frequency)', pct: 58 },
    { label: 'Deduplicating moments', pct: 60 },
    { label: 'Generating clips', pct: 100 },
  ];

  const currentStep = STEPS.findIndex(s => progress < s.pct);

  const checkStatus = async (id: string) => {
    try {
      const res  = await fetch(`${API_URL}/status/${id}`);
      const data = await res.json();
      setProgress(data.progress || 0);
      setStatus(data.status.charAt(0).toUpperCase() + data.status.slice(1));
      if (data.num_chunks) setNumChunks(data.num_chunks);
      if (data.total_duration) setTotalDuration(data.total_duration);

      if (data.status === 'complete') {
        if (intervalRef.current) clearInterval(intervalRef.current);
        const r2   = await fetch(`${API_URL}/results/${id}`);
        const r2d  = await r2.json();
        setHighlights(r2d.highlights || []);
        setIsProcessing(false);
        setStatus('Complete');
      } else if (data.status === 'failed') {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setError(data.error || 'Processing failed');
        setIsProcessing(false);
      } else if (!intervalRef.current) {
        intervalRef.current = setInterval(() => checkStatus(id), 2000);
      }
    } catch {
      // network blip — keep polling
    }
  };

  const handleProcess = async () => {
    if (!file) { setError('Please select a video file'); return; }
    setError(''); setProgress(0); setStatus('Uploading');
    setIsProcessing(true); setHighlights([]);
    setNumChunks(null); setTotalDuration(null);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;

    const form = new FormData();
    form.append('video', file);
    form.append('num_clips', String(numClips));
    form.append('clip_duration', String(clipDuration));

    try {
      const res  = await fetch(`${API_URL}/upload`, { method: 'POST', body: form });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Upload failed'); }
      const data = await res.json();
      setJobId(data.job_id);
      setStatus('Processing');
      checkStatus(data.job_id);
    } catch (err: any) {
      setError(err.message || 'Upload error');
      setStatus('Failed');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-16 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <Film className="text-emerald-400" size={24} />
          <div>
            <h1 className="text-xl font-bold text-white">Large Video Sports Highlights</h1>
            <p className="text-gray-400 text-xs">Chunks large videos with overlap, detects highlights via RMS &amp; frequency analysis</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 grid lg:grid-cols-[380px_1fr] gap-8 items-start">

        {/* ── Left Panel ── */}
        <div className="space-y-4">

          {/* Upload */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
            <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Upload size={16} className="text-emerald-400" /> Upload Large Video
            </h2>
            <div
              className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-emerald-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? (
                <div>
                  <p className="text-white font-medium text-sm truncate">{file.name}</p>
                  <p className="text-gray-400 text-xs mt-1">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                  <button
                    className="mt-2 text-red-400 text-xs hover:text-red-300"
                    onClick={e => { e.stopPropagation(); setFile(null); }}
                  >Remove</button>
                </div>
              ) : (
                <div>
                  <Upload className="mx-auto text-gray-500 mb-2" size={32} />
                  <p className="text-gray-400 text-sm">Click to upload large sports video</p>
                  <p className="text-gray-600 text-xs mt-1">MP4, MOV, AVI, MKV, WEBM — up to 4GB</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={e => e.target.files?.[0] && setFile(e.target.files[0])}
            />
          </div>

          {/* Config */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Zap size={16} className="text-emerald-400" /> Configuration
            </h2>

            <div>
              <div className="flex justify-between mb-1">
                <label className="text-gray-300 text-sm">Number of Highlights</label>
                <span className="text-emerald-400 font-bold text-sm">{numClips}</span>
              </div>
              <input
                type="range" min={1} max={20} value={numClips}
                onChange={e => setNumClips(+e.target.value)}
                className="w-full accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-0.5">
                <span>1</span><span>20</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="text-gray-300 text-sm">Min Clip Duration</label>
                <span className="text-emerald-400 font-bold text-sm">{clipDuration}s</span>
              </div>
              <input
                type="range" min={10} max={120} step={5} value={clipDuration}
                onChange={e => setClipDuration(+e.target.value)}
                className="w-full accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-0.5">
                <span>10s</span><span>120s</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Clips will be at least this long. Exciting moments may extend beyond this.
              </p>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">How it works</h3>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>1. Video is split into 5-min overlapping chunks</li>
              <li>2. Each chunk is analysed for RMS energy &amp; high-freq crowd noise</li>
              <li>3. Overlapping detections are deduplicated</li>
              <li>4. Top moments are extracted as highlight clips</li>
            </ul>
          </div>

          {/* Process Button */}
          <button
            onClick={handleProcess}
            disabled={!file || isProcessing}
            className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              !file || isProcessing
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/20'
            }`}
          >
            {isProcessing ? (
              <><Loader2 size={16} className="animate-spin" /> Processing...</>
            ) : (
              <><Trophy size={16} /> Generate Highlights</>
            )}
          </button>

          {/* Error */}
          {error && (
            <div className="bg-red-900/40 border border-red-700 text-red-300 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Progress */}
          {isProcessing && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-300 text-sm font-medium">{status}</span>
                <span className="text-emerald-400 text-sm font-bold">{progress}%</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Chunk info */}
              {(numChunks || totalDuration) && (
                <div className="flex gap-3 mb-3 text-xs text-gray-500">
                  {totalDuration && <span>Duration: {formatTime(totalDuration)}</span>}
                  {numChunks && <span>Chunks: {numChunks}</span>}
                </div>
              )}

              <div className="space-y-1">
                {STEPS.map((step, i) => {
                  const done    = progress >= step.pct;
                  const active  = i === (currentStep === -1 ? STEPS.length - 1 : currentStep);
                  return (
                    <div key={i} className={`text-xs flex items-center gap-2 ${done ? 'text-green-400' : active ? 'text-emerald-400' : 'text-gray-600'}`}>
                      <span>{done ? '✓' : active ? '›' : '○'}</span>
                      <span>{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Right Panel: Results ── */}
        <div>
          {highlights.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Trophy className="text-emerald-400" size={20} />
                  {highlights.length} Highlights — sorted by excitement
                </h2>
                <span className="text-xs text-gray-500">
                  <Clock size={12} className="inline mr-1" />
                  Total: {highlights.reduce((a, h) => a + h.duration, 0).toFixed(0)}s
                </span>
              </div>
              {highlights.map((h, i) => (
                <ClipCard key={h.rank} highlight={h} index={i} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Film size={48} className="text-gray-700 mb-4" />
              <p className="text-gray-500 font-medium">No highlights yet</p>
              <p className="text-gray-600 text-sm mt-1">Upload a large sports video and click Generate</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
