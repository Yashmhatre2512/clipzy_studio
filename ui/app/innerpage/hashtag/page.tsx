'use client';

import { useState } from 'react';
import { Sparkles, Copy, Check, TrendingUp, Zap, Target, Leaf, Loader2, RefreshCw } from 'lucide-react';

const API_URL = 'http://localhost:5003/api';

interface HashtagItem {
  tag: string;
  tier: string;
  score: number;
  trending: boolean;
  reason: string;
}

interface Result {
  all_tags: string[];
  total: number;
  trending_count: number;
  detected_categories: string[];
  groups: {
    trending: HashtagItem[];
    broad: HashtagItem[];
    medium: HashtagItem[];
    niche: HashtagItem[];
  };
}

function TagPill({ item, onCopy }: { item: HashtagItem; onCopy: (t: string) => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(item.tag);
    setCopied(true);
    onCopy(item.tag);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      title={item.reason || item.tag}
      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
        item.trending
          ? 'bg-orange-500/10 border-orange-500/40 text-orange-300 hover:bg-orange-500/20'
          : item.tier === 'broad'
          ? 'bg-purple-500/10 border-purple-500/40 text-purple-300 hover:bg-purple-500/20'
          : item.tier === 'niche'
          ? 'bg-green-500/10 border-green-500/40 text-green-300 hover:bg-green-500/20'
          : 'bg-gray-700/60 border-gray-600 text-gray-300 hover:bg-gray-700'
      }`}
    >
      {item.tag}
      {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} className="opacity-50" />}
    </button>
  );
}

function GroupSection({
  icon: Icon,
  label,
  color,
  items,
  onCopy,
}: {
  icon: any;
  label: string;
  color: string;
  items: HashtagItem[];
  onCopy: (t: string) => void;
}) {
  if (!items.length) return null;
  return (
    <div className="mb-6">
      <div className={`flex items-center gap-2 mb-3 text-sm font-semibold ${color}`}>
        <Icon size={14} />
        {label}
        <span className="ml-1 text-xs font-normal opacity-60">({items.length})</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map(item => <TagPill key={item.tag} item={item} onCopy={onCopy} />)}
      </div>
    </div>
  );
}

export default function HashtagRecommenderPage() {
  const [description, setDescription] = useState('');
  const [numTags, setNumTags]         = useState(30);
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState<Result | null>(null);
  const [error, setError]             = useState('');
  const [copiedAll, setCopiedAll]     = useState(false);

  const generate = async () => {
    if (!description.trim()) { setError('Please describe your video content'); return; }
    setError(''); setLoading(true); setResult(null);

    try {
      const res  = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, num_tags: numTags }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data);
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const copyAll = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.all_tags.join(' '));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/90 backdrop-blur sticky top-16 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Hashtag Recommender</h1>
            <p className="text-gray-400 text-xs">AI + trending data — Instagram focused</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Input Section */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 mb-6">
          <label className="block text-gray-300 text-sm font-medium mb-2">
            Describe your video content
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && e.ctrlKey && generate()}
            placeholder="e.g. A cricket match highlight reel showing the final over with boundaries and wickets. IPL 2025 match between Mumbai Indians and Chennai Super Kings."
            rows={4}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500 resize-none"
          />
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-4">
              <div>
                <label className="text-gray-400 text-xs font-medium block mb-1">
                  Hashtags to generate: <span className="text-purple-400 font-bold">{numTags}</span>
                </label>
                <input
                  type="range" min={10} max={50} step={5} value={numTags}
                  onChange={e => setNumTags(+e.target.value)}
                  className="w-32 accent-purple-500"
                />
              </div>
              <p className="text-gray-600 text-xs">Ctrl+Enter to generate</p>
            </div>
            <button
              onClick={generate}
              disabled={loading || !description.trim()}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                loading || !description.trim()
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/20'
              }`}
            >
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> Generating...</>
                : <><Sparkles size={15} /> Generate</>}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-xl text-sm mb-6">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div>
            {/* Stats bar */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-300 font-medium">{result.total} hashtags ready</span>
                {result.trending_count > 0 && (
                  <span className="flex items-center gap-1 text-orange-400 text-xs">
                    <TrendingUp size={12} /> {result.trending_count} trending
                  </span>
                )}
                {result.detected_categories?.length > 0 && (
                  <span className="text-gray-500 text-xs">
                    Categories: {result.detected_categories.join(', ')}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={generate}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 border border-gray-700 rounded-lg hover:border-gray-500 transition"
                >
                  <RefreshCw size={12} /> Regenerate
                </button>
                <button
                  onClick={copyAll}
                  className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg border transition ${
                    copiedAll
                      ? 'bg-green-500/20 border-green-500 text-green-400'
                      : 'bg-purple-500/20 border-purple-500/50 text-purple-300 hover:bg-purple-500/30'
                  }`}
                >
                  {copiedAll ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy All</>}
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mb-5 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> Trending now</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block" /> Broad reach (1M+ posts)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400 inline-block" /> Medium (100K–1M posts)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Niche (10K–100K posts)</span>
            </div>

            {/* Tag groups */}
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
              <GroupSection icon={TrendingUp} label="Trending Now"   color="text-orange-400" items={result.groups.trending} onCopy={() => {}} />
              <GroupSection icon={Zap}        label="Broad Reach"    color="text-purple-400" items={result.groups.broad}    onCopy={() => {}} />
              <GroupSection icon={Target}     label="Medium Reach"   color="text-gray-300"   items={result.groups.medium}   onCopy={() => {}} />
              <GroupSection icon={Leaf}       label="Niche / Targeted" color="text-green-400" items={result.groups.niche}  onCopy={() => {}} />
            </div>

            {/* Raw text box */}
            <div className="mt-4">
              <p className="text-gray-500 text-xs mb-2">Paste-ready — all hashtags in one block:</p>
              <div
                className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-sm text-gray-300 leading-relaxed cursor-pointer select-all"
                onClick={copyAll}
              >
                {result.all_tags.join(' ')}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
