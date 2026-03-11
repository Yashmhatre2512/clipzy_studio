"use client";

import React, { useRef, useState } from "react";
import { Upload, Download, Loader, AlertCircle, CheckCircle } from "lucide-react";

const ChangeFormatTool = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [outputFormat, setOutputFormat] = useState("mp4");
  const [processedUrl, setProcessedUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setError("Please upload a valid video file.");
      return;
    }

    setError("");
    setSuccess(false);
    setProcessedUrl("");
    setUploadedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (processedUrl) URL.revokeObjectURL(processedUrl);

    setUploadedFile(null);
    setPreviewUrl("");
    setProcessedUrl("");
    setError("");
    setSuccess(false);
  };

  const handleProcess = async () => {
    if (!uploadedFile) return;

    setProcessing(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);
      formData.append("output_format", outputFormat);

      const response = await fetch("http://localhost:5000/api/change-format", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Processing failed" }));
        throw new Error(errorData.error || `Failed: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setProcessedUrl(url);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process video");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedUrl || !uploadedFile) return;

    const link = document.createElement("a");
    link.href = processedUrl;
    link.download = `${uploadedFile.name.replace(/\.[^/.]+$/, "")}.${outputFormat}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="font-inter bg-gray-900 min-h-screen overflow-hidden">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        <div className="absolute top-0 -right-40 w-80 h-80 bg-pink-600/15 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-600/15 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse" />
        <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-purple-600/15 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse" />
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="text-center mb-10 space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-100">Convert Video Format</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Upload a video and convert it to another format instantly.
          </p>
        </div>
        <div className="w-full max-w-4xl mx-auto space-y-6">
            <div className="group relative rounded-2xl overflow-hidden transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-purple-600 opacity-0 group-hover:opacity-30 transition-opacity duration-500 rounded-2xl" />
              <div className="absolute inset-0 bg-gray-700/40 backdrop-blur-xl rounded-2xl border border-gray-600/50" />
              <div className="relative p-12">
                {!uploadedFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer text-center"
                  >
                    <div className="flex justify-center mb-4">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                        <Upload size={32} className="text-white" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-100 mb-2">Upload Your Video</h3>
                    <p className="text-gray-400">MP4, WebM, AVI, MOV</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <video src={previewUrl} controls className="w-full rounded-xl" />
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-300">{uploadedFile.name}</div>
                      <button
                        onClick={handleRemoveFile}
                        className="text-sm text-red-300 hover:text-red-200"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="group p-6 rounded-2xl bg-gray-700/40 backdrop-blur-sm border border-gray-600/50 hover:bg-gray-700/60 transition-all duration-300">
                <h3 className="text-lg font-bold text-gray-100 mb-4 text-center">Output Format</h3>
                <select
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value)}
                  className="w-full bg-gray-800/70 border border-gray-600/50 rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                >
                  <option value="mp4">MP4</option>
                  <option value="webm">WebM</option>
                  <option value="mov">MOV</option>
                  <option value="avi">AVI</option>
                  <option value="mkv">MKV</option>
                </select>
                <p className="text-xs text-gray-400 mt-3 text-center">
                  Conversion is handled by the backend using FFmpeg.
                </p>
              </div>

              <div className="group p-6 rounded-2xl bg-gray-700/40 backdrop-blur-sm border border-gray-600/50 hover:bg-gray-700/60 transition-all duration-300">
                <h3 className="text-lg font-bold text-gray-100 mb-4 text-center">Tips</h3>
                <ul className="space-y-3 text-sm text-gray-300 text-center">
                  <li>Best quality: MP4 or MOV</li>
                  <li>Small size: WebM</li>
                  <li>Compatibility: MP4</li>
                </ul>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/20 border border-red-500/50">
                <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-300 font-medium">Error</p>
                  <p className="text-red-200 text-sm mt-1">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-green-500/20 border border-green-500/50">
                <CheckCircle size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-green-300 font-medium">Success!</p>
                  <p className="text-green-200 text-sm mt-1">Video converted successfully.</p>
                </div>
              </div>
            )}

            {uploadedFile && !success && (
              <button
                onClick={handleProcess}
                disabled={processing}
                className="w-full px-6 py-4 rounded-xl font-semibold text-lg bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-pink-500/50"
              >
                {processing && <Loader size={20} className="animate-spin" />}
                {processing ? "Processing..." : "Convert Video"}
              </button>
            )}

            {success && (
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleDownload}
                  className="px-6 py-4 rounded-xl font-semibold text-lg bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-pink-500/50"
                >
                  <Download size={20} />
                  Download
                </button>
                <button
                  onClick={handleRemoveFile}
                  className="px-6 py-4 rounded-xl font-semibold text-lg bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-green-500/50"
                >
                  Convert Another
                </button>
              </div>
            )}
        </div>
      </main>
    </div>
  );
};

export default ChangeFormatTool;
