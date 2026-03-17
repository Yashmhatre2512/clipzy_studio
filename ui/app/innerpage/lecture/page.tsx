'use client';

import { useState, useRef } from 'react';
import {
  Upload, BookOpen, Clock, Download, ChevronDown, ChevronUp,
  Loader2, FileText, Play, Hash, AlignLeft,
} from 'lucide-react';

const API_URL = 'http://localhost:5001/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Highlight {
  id: number;
  filename: string;
  url: string;
  start_time: number;
  end_time: number;
  duration: number;
  topic: string;
  summary: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Clip Card ─────────────────────────────────────────────────────────────────

function ClipCard({ highlight, index }: { highlight: Highlight; index: number }) {
  const [expanded, setExpanded] = useState(index === 0);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      {/* Header row */}
      <button
        className="w-full flex items-start gap-3 p-4 hover:bg-gray-750 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Clip number badge */}
        <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-blue-400 text-xs font-bold">{highlight.id}</span>
        </div>

        {/* Topic + summary */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">
            {highlight.topic || `Highlight ${highlight.id}`}
          </p>
          {highlight.summary && (
            <p className="text-gray-400 text-xs mt-0.5 line-clamp-2 italic">{highlight.summary}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs text-blue-400 font-medium">
              {formatTime(highlight.start_time)} → {formatTime(highlight.end_time)}
            </span>
            <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs rounded-full">
              {highlight.duration.toFixed(1)}s
            </span>
          </div>
        </div>

        {/* Expand chevron */}
        <div className="shrink-0 mt-1">
          {expanded
            ? <ChevronUp size={16} className="text-gray-400" />
            : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      {/* Expanded: video + download */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-700 pt-3 space-y-3">
          <video
            className="w-full rounded-lg bg-black max-h-64"
            controls
            preload="metadata"
            src={`http://localhost:5001${highlight.url}`}
          />
          <a
            href={`http://localhost:5001${highlight.url}`}
            download={highlight.filename}
            className="flex items-center justify-center gap-2 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Download size={14} />
            Download Clip
          </a>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LectureHighlightsPage() {
  const [file, setFile]                     = useState<File | null>(null);
  const [numHighlights, setNumHighlights]   = useState(3);
  const [minDuration, setMinDuration]       = useState(20);
  const [maxDuration, setMaxDuration]       = useState(60);
  const [isProcessing, setIsProcessing]     = useState(false);
  const [progress, setProgress]             = useState(0);
  const [status, setStatus]                 = useState('Waiting');
  const [highlights, setHighlights]         = useState<Highlight[]>([]);
  const [transcript, setTranscript]         = useState('');
  const [showTranscript, setShowTranscript] = useState(false);
  const [error, setError]                   = useState('');

  const intervalRef  = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const STEPS = [
    { label: 'Transcribing audio',    pct: 40  },
    { label: 'Chunking transcript',   pct: 50  },
    { label: 'Selecting highlights',  pct: 70  },
    { label: 'Generating clips',      pct: 100 },
  ];

  const currentStep = STEPS.findIndex(s => progress < s.pct);

  // ── Status polling ──────────────────────────────────────────────────────────

  const checkStatus = async (id: string) => {
    try {
      const res  = await fetch(`${API_URL}/status/${id}`);
      const data = await res.json();
      setProgress(data.progress || 0);
      setStatus(data.status.charAt(0).toUpperCase() + data.status.slice(1));

      if (data.status === 'complete') {
        if (intervalRef.current) clearInterval(intervalRef.current);
        await fetchResults(id);
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

  const fetchResults = async (id: string) => {
    const res  = await fetch(`${API_URL}/results/${id}`);
    const data = await res.json();
    setHighlights(data.highlights || []);
    if (data.transcript_url) {
      const tr = await fetch(`http://localhost:5001${data.transcript_url}`);
      if (tr.ok) setTranscript(await tr.text());
    }
  };

  // ── Upload & process ────────────────────────────────────────────────────────

  const handleProcess = async () => {
    if (!file) { setError('Please select a video or audio file'); return; }
    setError(''); setProgress(0); setStatus('Uploading');
    setIsProcessing(true); setHighlights([]); setTranscript('');
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }

    const form = new FormData();
    form.append('video', file);
    form.append('num_highlights', String(numHighlights));
    form.append('min_duration',   String(minDuration));
    form.append('max_duration',   String(maxDuration));

    try {
      const res  = await fetch(`${API_URL}/upload`, { method: 'POST', body: form });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Upload failed'); }
      const data = await res.json();
      setStatus('Transcribing');
      checkStatus(data.job_id);
    } catch (err: any) {
      setError(err.message || 'Upload error');
      setStatus('Failed');
      setIsProcessing(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-900 text-white">

      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-16 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <BookOpen size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Lecture Highlight Extractor</h1>
            <p className="text-gray-400 text-xs">
              AI-powered highlight extraction — Whisper transcription + LLM selection
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 grid lg:grid-cols-[360px_1fr] gap-8 items-start">

        {/* ── Left panel ── */}
        <div className="space-y-4">

          {/* Upload */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
            <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Upload size={15} className="text-blue-400" /> Upload File
            </h2>
            <div
              className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? (
                <div>
                  <Play className="mx-auto text-blue-400 mb-2" size={24} />
                  <p className="text-white font-medium text-sm truncate">{file.name}</p>
                  <p className="text-gray-400 text-xs mt-1">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                  <button
                    className="mt-2 text-red-400 text-xs hover:text-red-300 transition-colors"
                    onClick={e => { e.stopPropagation(); setFile(null); }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <Upload className="mx-auto text-gray-500 mb-2" size={28} />
                  <p className="text-gray-400 text-sm">Click to upload</p>
                  <p className="text-gray-600 text-xs mt-1">MP4, MOV, AVI, MKV, WEBM<br />MP3, WAV, M4A — up to 500 MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,audio/*,.mp3,.wav,.m4a"
              className="hidden"
              onChange={e => e.target.files?.[0] && setFile(e.target.files[0])}
            />
          </div>

          {/* Config */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Hash size={15} className="text-blue-400" /> Configuration
            </h2>

            {/* Num highlights */}
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-gray-300 text-sm">Number of Highlights</label>
                <span className="text-blue-400 font-bold text-sm">{numHighlights}</span>
              </div>
              <input
                type="range" min={1} max={10} value={numHighlights}
                onChange={e => setNumHighlights(+e.target.value)}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-0.5">
                <span>1</span><span>10</span>
              </div>
            </div>

            {/* Min / Max duration */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-300 text-xs font-medium mb-1">
                  Min Duration (s)
                </label>
                <input
                  type="number" min={5} max={120} value={minDuration}
                  onChange={e => setMinDuration(+e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-xs font-medium mb-1">
                  Max Duration (s)
                </label>
                <input
                  type="number" min={10} max={300} value={maxDuration}
                  onChange={e => setMaxDuration(+e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Segments are selected based on definitions, conclusions, key concepts, and importance signals.
            </p>
          </div>

          {/* Process button */}
          <button
            onClick={handleProcess}
            disabled={!file || isProcessing}
            className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              !file || isProcessing
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20'
            }`}
          >
            {isProcessing
              ? <><Loader2 size={16} className="animate-spin" /> Processing...</>
              : <><BookOpen size={16} /> Extract Highlights</>}
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
                <span className="text-blue-400 text-sm font-bold">{progress}%</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="space-y-1">
                {STEPS.map((step, i) => {
                  const done   = progress >= step.pct;
                  const active = i === (currentStep === -1 ? STEPS.length - 1 : currentStep);
                  return (
                    <div
                      key={i}
                      className={`text-xs flex items-center gap-2 ${
                        done ? 'text-green-400' : active ? 'text-blue-400' : 'text-gray-600'
                      }`}
                    >
                      <span>{done ? '✓' : active ? '›' : '○'}</span>
                      <span>{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Right panel ── */}
        <div>
          {highlights.length > 0 ? (
            <div className="space-y-4">
              {/* Results header */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="text-blue-400" size={20} />
                  {highlights.length} Highlight{highlights.length !== 1 ? 's' : ''} Generated
                </h2>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock size={12} />
                  Total: {highlights.reduce((a, h) => a + h.duration, 0).toFixed(0)}s
                </span>
              </div>

              {/* Clip cards */}
              {highlights.map((h, i) => (
                <ClipCard key={h.id} highlight={h} index={i} />
              ))}

              {/* Transcript toggle */}
              {transcript && (
                <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-750 transition-colors"
                    onClick={() => setShowTranscript(t => !t)}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-gray-300">
                      <AlignLeft size={15} className="text-blue-400" />
                      Full Transcript
                    </span>
                    {showTranscript
                      ? <ChevronUp size={15} className="text-gray-400" />
                      : <ChevronDown size={15} className="text-gray-400" />}
                  </button>
                  {showTranscript && (
                    <div className="px-4 pb-4 border-t border-gray-700 pt-3">
                      <pre className="whitespace-pre-wrap text-gray-300 text-xs font-sans leading-relaxed max-h-96 overflow-y-auto">
                        {transcript}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-72 text-center">
              <BookOpen size={48} className="text-gray-700 mb-4" />
              <p className="text-gray-500 font-medium">No highlights yet</p>
              <p className="text-gray-600 text-sm mt-1">
                Upload a lecture or podcast and click Extract Highlights
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
