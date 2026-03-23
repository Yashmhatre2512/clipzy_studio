import numpy as np
import librosa
import logging

logger = logging.getLogger(__name__)


def detect_exciting_moments(audio_path: str, min_gap_sec: float = 15.0,
                            chunk_offset: float = 0.0) -> list:
    """
    Detect exciting moments in a chunk of sports audio.

    Uses two signals:
      1. RMS energy  — overall loudness (crowd roar, big hits)
      2. High-frequency band energy (1–8 kHz) — crowd cheering signature

    chunk_offset is added to all timestamps so moments are in global video time.

    Returns a list of moments sorted by energy score (highest first).
    Each moment has: time, energy, start, end (in global video time).
    """
    logger.info(f"Loading audio for analysis: {audio_path} (offset={chunk_offset:.1f}s)")
    y, sr = librosa.load(audio_path, sr=22050, mono=True)
    total_duration = len(y) / sr

    hop_length   = int(sr * 0.05)    # 50ms hop
    frame_length = int(sr * 0.1)     # 100ms frame

    # ── RMS energy ────────────────────────────────────────────────────────────
    rms = librosa.feature.rms(y=y, frame_length=frame_length, hop_length=hop_length)[0]

    # ── High-frequency crowd energy (1kHz–8kHz) ───────────────────────────────
    stft  = np.abs(librosa.stft(y, n_fft=frame_length, hop_length=hop_length))
    freqs = librosa.fft_frequencies(sr=sr, n_fft=frame_length)
    hf_mask      = (freqs >= 1000) & (freqs <= 8000)
    hf_energy    = stft[hf_mask].mean(axis=0)
    min_len      = min(len(rms), len(hf_energy))
    rms          = rms[:min_len]
    hf_energy    = hf_energy[:min_len]

    def norm(arr):
        lo, hi = arr.min(), arr.max()
        return np.zeros_like(arr) if hi - lo < 1e-9 else (arr - lo) / (hi - lo)

    combined = 0.55 * norm(rms) + 0.45 * norm(hf_energy)

    # Smooth over ~1.5s to merge closely-spaced spikes into sustained moments
    smooth_frames = max(1, int(1.5 / 0.05))
    kernel        = np.ones(smooth_frames) / smooth_frames
    smoothed      = np.convolve(combined, kernel, mode='same')

    # ── Peak detection ────────────────────────────────────────────────────────
    from scipy.signal import find_peaks
    min_gap_frames = max(1, int(min_gap_sec / 0.05))
    peaks, _       = find_peaks(
        smoothed,
        height=np.percentile(smoothed, 80),   # top 20% energy moments
        distance=min_gap_frames,
        prominence=0.08,
    )

    frame_times = librosa.frames_to_time(np.arange(len(smoothed)), sr=sr, hop_length=hop_length)

    moments = []
    for peak_idx in peaks:
        peak_time   = float(frame_times[peak_idx])
        peak_energy = float(smoothed[peak_idx])

        # Boundary: energy must drop below 35% of peak to mark start/end
        threshold = peak_energy * 0.35

        # Search backward for the moment start
        start_frame = peak_idx
        for i in range(peak_idx - 1, max(0, peak_idx - int(45 / 0.05)), -1):
            if smoothed[i] < threshold:
                start_frame = i
                break

        # Search forward for the moment end
        end_frame = peak_idx
        for i in range(peak_idx + 1, min(len(smoothed) - 1, peak_idx + int(45 / 0.05))):
            if smoothed[i] < threshold:
                end_frame = i
                break

        # Add buffer: -1.5s before, +2.5s after
        start_time = max(0.0,            frame_times[start_frame] - 1.5)
        end_time   = min(total_duration, frame_times[end_frame]   + 2.5)

        # Apply chunk offset to convert to global video time
        moments.append({
            'time':   peak_time + chunk_offset,
            'energy': peak_energy,
            'start':  start_time + chunk_offset,
            'end':    end_time + chunk_offset,
        })

    moments.sort(key=lambda x: x['energy'], reverse=True)
    logger.info(f"Detected {len(moments)} exciting moments in chunk (offset={chunk_offset:.1f}s)")
    return moments


def deduplicate_moments(all_moments: list, min_gap_sec: float = 10.0) -> list:
    """
    Merge overlapping/nearby moments from different chunks.

    When two moments from adjacent chunks overlap (due to overlap region),
    keep the one with higher energy and discard the other.
    """
    if not all_moments:
        return []

    # Sort by peak time
    sorted_moments = sorted(all_moments, key=lambda m: m['time'])
    merged = [sorted_moments[0]]

    for m in sorted_moments[1:]:
        prev = merged[-1]
        # If this moment's start is within min_gap of previous moment's end,
        # they likely detected the same event — keep the higher energy one
        if m['start'] < prev['end'] + min_gap_sec:
            if m['energy'] > prev['energy']:
                merged[-1] = m
        else:
            merged.append(m)

    # Re-sort by energy (highest first) for ranking
    merged.sort(key=lambda x: x['energy'], reverse=True)
    logger.info(f"Deduplicated: {len(all_moments)} → {len(merged)} moments")
    return merged
