"use client";

import { useState, useRef } from "react";
import { Upload, Scissors, AlertCircle, CheckCircle, X, ArrowLeft, Play, Download } from "lucide-react";
import { useRouter } from "next/navigation";

export default function TrimPage() {
  const router = useRouter();
  const [videoURL, setVideoURL] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [isTrimming, setIsTrimming] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [trimmedVideoURL, setTrimmedVideoURL] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trimmedVideoRef = useRef<HTMLVideoElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setError("Please upload a valid video file");
      return;
    }

    setVideoFile(file);
    setVideoURL(URL.createObjectURL(file));
    setError("");
    setSuccess("");
    setUploadSuccess(true);
    setTimeout(() => setIsDialogOpen(false), 1500);
  }

  function handleTimeUpdate() {
    if (!videoRef.current) return;
    if (end && videoRef.current.currentTime >= Number(end)) {
      videoRef.current.pause();
    }
  }

  function handlePlay() {
    if (!videoRef.current) return;
    if (start) {
      videoRef.current.currentTime = Number(start);
    }
  }

  async function handleTrim() {
    if (!videoFile || !start || !end) {
      setError("Please upload video and enter start/end time");
      return;
    }

    if (Number(start) >= Number(end)) {
      setError("Start time must be less than end time");
      return;
    }

    const formData = new FormData();
    formData.append("video", videoFile);
    formData.append("start", start);
    formData.append("end", end);

    setIsTrimming(true);
    setError("");

    try {
      const response = await fetch("http://localhost:5000/trim", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        setError("Trimming failed: " + (data.error || "Unknown error"));
        return;
      }

      const data = await response.json();

      if (data.video_url) {
        setSuccess("Video trimmed successfully!");
        setTrimmedVideoURL(`http://localhost:5000${data.video_url}`);
      } else {
        setError("Failed to get video URL");
      }
    } catch (err) {
      setError("Error trimming video: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setIsTrimming(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #111827 0%, #1a202c 100%)", padding: "40px 20px" }}>
      {/* Back Button */}
      <div style={{ maxWidth: "1000px", margin: "0 auto", marginBottom: "30px" }}>
        <button
          onClick={() => router.back()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            color: "#EB4697",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "600",
            transition: "all 0.3s ease",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = "#d63580";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = "#EB4697";
          }}
        >
          <ArrowLeft size={20} />
          Back
        </button>
      </div>

      {/* Header */}
      <div style={{ maxWidth: "1000px", margin: "0 auto", marginBottom: "50px", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "20px" }}>
          <Scissors style={{ width: "32px", height: "32px", color: "#EB4697" }} />
          <h1 style={{ fontSize: "36px", fontWeight: "bold", color: "#ffffff", margin: 0 }}>Trim Video</h1>
        </div>
        <p style={{ fontSize: "16px", color: "#9ca3af", margin: 0 }}>Cut and trim your videos with precision</p>
      </div>

      {/* Main Container */}
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        {/* Upload Section */}
        <div style={{ 
          background: "linear-gradient(135deg, rgba(235, 70, 151, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)",
          border: "2px solid #EB4697",
          borderRadius: "16px",
          padding: "40px",
          marginBottom: "40px",
          textAlign: "center",
        }}>
          <button
            onClick={() => setIsDialogOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "12px",
              padding: "16px 32px",
              background: "linear-gradient(135deg, #EB4697 0%, #d63580 100%)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 4px 15px rgba(235, 70, 151, 0.3)",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(235, 70, 151, 0.4)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 15px rgba(235, 70, 151, 0.3)";
            }}
          >
            <Upload style={{ width: "20px", height: "20px" }} />
            Upload Video
          </button>
          {videoFile && <p style={{ marginTop: "16px", color: "#10b981", fontSize: "14px" }}>✓ {videoFile.name} uploaded</p>}
        </div>

        {/* Dialog Box */}
        {isDialogOpen && (
          <div style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}>
            <div style={{
              background: "#111827",
              borderRadius: "12px",
              padding: "40px",
              maxWidth: "500px",
              width: "90%",
              border: "1px solid #EB4697",
              boxShadow: "0 20px 50px rgba(235, 70, 151, 0.3)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#ffffff", margin: 0 }}>Upload Video</h2>
                <button
                  onClick={() => setIsDialogOpen(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  <X style={{ width: "24px", height: "24px", color: "#9ca3af" }} />
                </button>
              </div>

              {uploadSuccess ? (
                <div style={{ textAlign: "center", padding: "20px" }}>
                  <CheckCircle style={{ width: "48px", height: "48px", color: "#10b981", margin: "0 auto 16px" }} />
                  <p style={{ color: "#ffffff", fontSize: "16px", fontWeight: "600" }}>Video uploaded successfully!</p>
                </div>
              ) : (
                <>
                  <label style={{
                    display: "block",
                    border: "2px dashed #EB4697",
                    borderRadius: "8px",
                    padding: "32px",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    background: "rgba(235, 70, 151, 0.05)",
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.background = "rgba(235, 70, 151, 0.1)";
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.style.background = "rgba(235, 70, 151, 0.05)";
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
                    <Upload style={{ width: "40px", height: "40px", color: "#EB4697", margin: "0 auto 12px" }} />
                    <p style={{ color: "#ffffff", fontSize: "16px", fontWeight: "600", margin: "0 0 8px 0" }}>Drag and drop your video here</p>
                    <p style={{ color: "#9ca3af", fontSize: "14px", margin: 0 }}>or click to browse</p>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      style={{ display: "none" }}
                    />
                  </label>
                  <p style={{ color: "#6b7280", fontSize: "12px", marginTop: "16px", marginBottom: 0 }}>Supported formats: MP4, WebM, MOV, AVI</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid #ef4444",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "30px",
          }}>
            <AlertCircle style={{ width: "20px", height: "20px", color: "#ef4444" }} />
            <p style={{ color: "#fca5a5", margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            background: "rgba(16, 185, 129, 0.1)",
            border: "1px solid #10b981",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "30px",
          }}>
            <CheckCircle style={{ width: "20px", height: "20px", color: "#10b981" }} />
            <p style={{ color: "#a7f3d0", margin: 0 }}>{success}</p>
          </div>
        )}

        {/* Video Player Section */}
        {videoURL && (
          <div style={{
            background: "#1f2937",
            border: "1px solid #EB4697",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "30px",
          }}>
            <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#ffffff", marginBottom: "16px", marginTop: 0 }}>Video Preview</h2>
            <video
              ref={videoRef}
              src={videoURL}
              controls
              onTimeUpdate={handleTimeUpdate}
              onPlay={handlePlay}
              style={{
                width: "100%",
                borderRadius: "8px",
                backgroundColor: "#000",
                maxHeight: "400px",
              }}
            />
          </div>
        )}

        {/* Trim Controls Section */}
        {videoURL && (
          <div style={{
            background: "#1f2937",
            border: "1px solid #EB4697",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "30px",
          }}>
            <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#ffffff", marginBottom: "20px", marginTop: 0 }}>Trim Settings</h2>

            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "24px",
            }}>
              <div>
                <label style={{ display: "block", color: "#d1d5db", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>
                  Start Time (seconds)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "#111827",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#ffffff",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", color: "#d1d5db", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>
                  End Time (seconds)
                </label>
                <input
                  type="number"
                  placeholder="60"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "#111827",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#ffffff",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <button
              onClick={handleTrim}
              disabled={isTrimming || !start || !end}
              style={{
                width: "100%",
                padding: "16px 24px",
                background: isTrimming || !start || !end
                  ? "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)"
                  : "linear-gradient(135deg, #EB4697 0%, #d63580 100%)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: isTrimming || !start || !end ? "not-allowed" : "pointer",
                transition: "all 0.3s ease",
                boxShadow: "0 4px 15px rgba(235, 70, 151, 0.3)",
              }}
              onMouseOver={(e) => {
                if (!isTrimming && start && end) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(235, 70, 151, 0.4)";
                }
              }}
              onMouseOut={(e) => {
                if (!isTrimming && start && end) {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 15px rgba(235, 70, 151, 0.3)";
                }
              }}
            >
              {isTrimming ? "Trimming Video..." : "Trim Video"}
            </button>
          </div>
        )}

        {/* Trimmed Video Player Section */}
        {trimmedVideoURL && (
          <div style={{
            background: "#1f2937",
            border: "2px solid #10b981",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "30px",
          }}>
            <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#10b981", marginBottom: "16px", marginTop: 0 }}>✓ Trimmed Video</h2>
            <video
              ref={trimmedVideoRef}
              src={trimmedVideoURL}
              controls
              style={{
                width: "100%",
                borderRadius: "8px",
                backgroundColor: "#000",
                maxHeight: "400px",
                marginBottom: "16px",
              }}
            />
            <div style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
            }}>
              <button
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = trimmedVideoURL;
                  a.download = "trimmed_video.mp4";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
                style={{
                  flex: 1,
                  minWidth: "150px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "12px 24px",
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: "0 4px 15px rgba(16, 185, 129, 0.3)",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(16, 185, 129, 0.4)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 15px rgba(16, 185, 129, 0.3)";
                }}
              >
                <Download size={16} />
                Download Video
              </button>
              <button
                onClick={() => {
                  if (trimmedVideoRef.current) {
                    trimmedVideoRef.current.play();
                  }
                }}
                style={{
                  flex: 1,
                  minWidth: "150px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "12px 24px",
                  background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: "0 4px 15px rgba(139, 92, 246, 0.3)",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(139, 92, 246, 0.4)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 15px rgba(139, 92, 246, 0.3)";
                }}
              >
                <Play size={16} />
                Play Video
              </button>
              <button
                onClick={() => {
                  setTrimmedVideoURL(null);
                  setStart("");
                  setEnd("");
                  setVideoFile(null);
                  setVideoURL(null);
                }}
                style={{
                  flex: 1,
                  minWidth: "150px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "12px 24px",
                  background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: "0 4px 15px rgba(239, 68, 68, 0.3)",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(239, 68, 68, 0.4)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 15px rgba(239, 68, 68, 0.3)";
                }}
              >
                <X size={16} />
                Reset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
