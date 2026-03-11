'use client';

import { useState, useRef } from 'react';
import { Upload, Download, X, Video, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function RemoveAudioPage() {
  const router = useRouter();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
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
      setProcessedVideoUrl('');
      setUploadSuccess(true);
      setTimeout(() => setIsDialogOpen(false), 1500);
    }
  };

  const removeAudio = async () => {
    if (!videoFile) {
      setError('Please upload a video first');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const videoElement = document.createElement('video');
      videoElement.src = URL.createObjectURL(videoFile);
      videoElement.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        videoElement.onloadedmetadata = resolve;
        videoElement.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;

      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setProcessedVideoUrl(url);
        setIsProcessing(false);
      };

      recorder.start();
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      const duration = videoElement.duration;
      const fps = 30;
      let currentTime = 0;

      const drawFrame = () => {
        videoElement.currentTime = currentTime;
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        currentTime += 1 / fps;

        if (currentTime < duration) {
          setTimeout(drawFrame, 1000 / fps);
        } else {
          setTimeout(() => recorder.stop(), 100);
        }
      };

      drawFrame();
    } catch (err) {
      setError('Failed to remove audio. Please try another video.');
      console.error(err);
      setIsProcessing(false);
    }
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
          <Video style={{ width: '32px', height: '32px', color: '#EB4697' }} />
          <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>Audio Remover</h1>
        </div>
        <p style={{ fontSize: '16px', color: '#9ca3af', margin: 0 }}>Remove audio from your videos instantly</p>
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

        {/* Remove Audio Button */}
        {videoUrl && (
          <div style={{ marginBottom: '30px' }}>
            <button
              onClick={removeAudio}
              disabled={isProcessing}
              style={{
                width: '100%',
                padding: '16px 24px',
                background: isProcessing 
                  ? 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'
                  : 'linear-gradient(135deg, #EB4697 0%, #d63580 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(235, 70, 151, 0.3)',
              }}
              onMouseOver={(e) => {
                if (!isProcessing) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(235, 70, 151, 0.4)';
                }
              }}
              onMouseOut={(e) => {
                if (!isProcessing) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(235, 70, 151, 0.3)';
                }
              }}
            >
              {isProcessing ? 'Removing Audio...' : 'Remove Audio'}
            </button>
          </div>
        )}

        {/* Processed Video Section */}
        {processedVideoUrl && (
          <div style={{
            background: '#1f2937',
            border: '2px solid #EB4697',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#ffffff', marginBottom: '16px', marginTop: 0 }}>Audio Removed Video</h2>
            <div style={{
              background: '#111827',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <video
                src={processedVideoUrl}
                controls
                style={{
                  width: '100%',
                  borderRadius: '4px',
                  backgroundColor: '#000',
                  maxHeight: '400px',
                }}
              />
            </div>
            <a
              href={processedVideoUrl}
              download="video-no-audio.webm"
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
              Download Video
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
