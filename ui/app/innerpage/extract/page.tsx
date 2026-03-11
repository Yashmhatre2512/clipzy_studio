'use client';

import { useState, useRef } from 'react';
import { Upload, Play, Download, X, Music, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ExtractPage() {
  const router = useRouter();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        setError('Please upload a valid video file');
        return;
      }
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setError('');
      setAudioUrl('');
      setUploadSuccess(true);
      setTimeout(() => setIsDialogOpen(false), 1500);
    }
  };

  const extractAudio = async () => {
    if (!videoFile) {
      setError('Please upload a video first');
      return;
    }

    setIsExtracting(true);
    setError('');

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await videoFile.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
      );

      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineContext.destination);
      source.start(0);

      const renderedBuffer = await offlineContext.startRendering();

      const wavBlob = audioBufferToWav(renderedBuffer);
      const url = URL.createObjectURL(wavBlob);
      setAudioUrl(url);
    } catch (err) {
      setError('Failed to extract audio. Ensure the file contains audio data.');
      console.error(err);
    } finally {
      setIsExtracting(false);
    }
  };

  const audioBufferToWav = (audioBuffer: AudioBuffer): Blob => {
    const channelCount = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const channels = [];
    for (let i = 0; i < channelCount; i++) {
      channels.push(audioBuffer.getChannelData(i));
    }

    const length = audioBuffer.length * channelCount * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, length - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channelCount, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2 * channelCount, true);
    view.setUint16(32, channelCount * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length - 44, true);

    let offset = 44;
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let channel = 0; channel < channelCount; channel++) {
        const sample = Math.max(-1, Math.min(1, channels[channel][i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #111827 0%, #1a202c 100%)', padding: '40px 20px' }}>
      {/* Back Button */}
      <div style={{ maxWidth: '1000px', margin: '0 auto', marginBottom: '30px' }}>
        <button
          onClick={() => router.back()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: '#EB4697',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            transition: 'all 0.3s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = '#d63580';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = '#EB4697';
          }}
        >
          <ArrowLeft size={20} />
          Back
        </button>
      </div>

      {/* Header */}
      <div style={{ maxWidth: '1000px', margin: '0 auto', marginBottom: '50px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '20px' }}>
          <Music style={{ width: '32px', height: '32px', color: '#EB4697' }} />
          <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>Audio Extractor</h1>
        </div>
        <p style={{ fontSize: '16px', color: '#9ca3af', margin: 0 }}>Extract professional audio from your videos with one click</p>
      </div>

      {/* Main Container */}
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Upload Section */}
        <div style={{ 
          background: 'linear-gradient(135deg, rgba(235, 70, 151, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
          border: '2px solid #EB4697',
          borderRadius: '16px',
          padding: '40px',
          marginBottom: '40px',
          textAlign: 'center',
        }}>
          <button
            onClick={() => setIsDialogOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px 32px',
              background: 'linear-gradient(135deg, #EB4697 0%, #d63580 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(235, 70, 151, 0.3)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(235, 70, 151, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(235, 70, 151, 0.3)';
            }}
          >
            <Upload style={{ width: '20px', height: '20px' }} />
            Upload Video
          </button>
          {videoFile && <p style={{ marginTop: '16px', color: '#10b981', fontSize: '14px' }}>✓ {videoFile.name} uploaded</p>}
        </div>

        {/* Dialog Box */}
        {isDialogOpen && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}>
            <div style={{
              background: '#111827',
              borderRadius: '12px',
              padding: '40px',
              maxWidth: '500px',
              width: '90%',
              border: '1px solid #EB4697',
              boxShadow: '0 20px 50px rgba(235, 70, 151, 0.3)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>Upload Video</h2>
                <button
                  onClick={() => setIsDialogOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <X style={{ width: '24px', height: '24px', color: '#9ca3af' }} />
                </button>
              </div>

              {uploadSuccess ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <CheckCircle style={{ width: '48px', height: '48px', color: '#10b981', margin: '0 auto 16px' }} />
                  <p style={{ color: '#ffffff', fontSize: '16px', fontWeight: '600' }}>Video uploaded successfully!</p>
                </div>
              ) : (
                <>
                  <label style={{
                    display: 'block',
                    border: '2px dashed #EB4697',
                    borderRadius: '8px',
                    padding: '32px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    background: 'rgba(235, 70, 151, 0.05)',
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.background = 'rgba(235, 70, 151, 0.1)';
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(235, 70, 151, 0.05)';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const files = e.dataTransfer.files;
                    if (files[0]) {
                      videoInputRef.current!.files = files;
                      handleVideoUpload({ target: { files } } as any);
                    }
                  }}
                  >
                    <Upload style={{ width: '40px', height: '40px', color: '#EB4697', margin: '0 auto 12px' }} />
                    <p style={{ color: '#ffffff', fontSize: '16px', fontWeight: '600', margin: '0 0 8px 0' }}>Drag and drop your video here</p>
                    <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>or click to browse</p>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '16px', marginBottom: 0 }}>Supported formats: MP4, WebM, MOV, AVI</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '30px',
          }}>
            <AlertCircle style={{ width: '20px', height: '20px', color: '#ef4444' }} />
            <p style={{ color: '#fca5a5', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Video Player Section */}
        {videoUrl && (
          <div style={{
            background: '#1f2937',
            border: '1px solid #EB4697',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '30px',
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#ffffff', marginBottom: '16px', marginTop: 0 }}>Video Preview</h2>
            <video
              src={videoUrl}
              controls
              style={{
                width: '100%',
                borderRadius: '8px',
                backgroundColor: '#000',
                maxHeight: '400px',
              }}
            />
          </div>
        )}

        {/* Extract Button */}
        {videoUrl && (
          <div style={{ marginBottom: '30px' }}>
            <button
              onClick={extractAudio}
              disabled={isExtracting}
              style={{
                width: '100%',
                padding: '16px 24px',
                background: isExtracting 
                  ? 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'
                  : 'linear-gradient(135deg, #EB4697 0%, #d63580 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isExtracting ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(235, 70, 151, 0.3)',
              }}
              onMouseOver={(e) => {
                if (!isExtracting) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(235, 70, 151, 0.4)';
                }
              }}
              onMouseOut={(e) => {
                if (!isExtracting) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(235, 70, 151, 0.3)';
                }
              }}
            >
              {isExtracting ? 'Extracting Audio...' : 'Extract Audio'}
            </button>
          </div>
        )}

        {/* Audio Player Section */}
        {audioUrl && (
          <div style={{
            background: '#1f2937',
            border: '2px solid #EB4697',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#ffffff', marginBottom: '16px', marginTop: 0 }}>Extracted Audio</h2>
            <div style={{
              background: '#111827',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <audio
                src={audioUrl}
                controls
                style={{
                  width: '100%',
                  borderRadius: '4px',
                }}
              />
            </div>
            <a
              href={audioUrl}
              download="extracted-audio.wav"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.3)';
              }}
            >
              <Download style={{ width: '16px', height: '16px' }} />
              Download Audio
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
