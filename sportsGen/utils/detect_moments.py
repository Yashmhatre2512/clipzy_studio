import numpy as np
import librosa
import logging

logger = logging.getLogger(__name__)


def detect_exciting_moments(audio_path: str, min_gap_sec: float = 15.0) -> list:
    """
    Detect exciting moments in sports video by analyzing audio energy.

    Uses two signals:
      1. RMS energy  — overall loudness (crowd roar, big hits)
      2. High-frequency band energy (1–8 kHz) — crowd cheering signature

    Returns a list of moments sorted by energy score (highest first).
    Each moment has: time, energy, start, end (complete moment boundaries).
    """
    logger.info(f"Loading audio for analysis: {audio_path}")
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

        # Search backward for the moment start (energy rises above threshold)
        start_frame = peak_idx
        for i in range(peak_idx - 1, max(0, peak_idx - int(45 / 0.05)), -1):
            if smoothed[i] < threshold:
                start_frame = i
                break

        # Search forward for the moment end (energy falls below threshold)
        end_frame = peak_idx
        for i in range(peak_idx + 1, min(len(smoothed) - 1, peak_idx + int(45 / 0.05))):
            if smoothed[i] < threshold:
                end_frame = i
                break

        # Add 1.5s buffer before and 2.5s buffer after to capture full reaction
        start_time = max(0.0,            frame_times[start_frame] - 1.5)
        end_time   = min(total_duration, frame_times[end_frame]   + 2.5)

        moments.append({
            'time':         peak_time,
            'energy':       peak_energy,
            'start':        float(start_time),
            'end':          float(end_time),
        })

    moments.sort(key=lambda x: x['energy'], reverse=True)
    logger.info(f"Detected {len(moments)} exciting moments")
    return moments
