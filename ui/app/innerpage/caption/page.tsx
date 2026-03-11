"use client";

import { useState } from "react";
import { Input } from "@nextui-org/input";
import { Divider } from "@nextui-org/divider";
import { Progress } from "@nextui-org/progress";
import { Code } from "@nextui-org/code";
import { Chip } from "@nextui-org/chip";

const Button = ({ children, className = "", ...props }) => (
  <button
    className={`px-4 py-2 rounded-md font-medium bg-pink-600 text-white hover:bg-pink-700 transition ${className}`}
    {...props}
  >
    {children}
  </button>
);

export default function CaptionGenerator() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [captions, setCaptions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setCaptions([]); // Reset captions on new upload
      setError(null);
    }
  };

  async function generateCaptions() {
    if (!videoFile) return;
    
    setIsGenerating(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("video", videoFile);

      const response = await fetch("/api/generate-captions", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate captions.");
      }

      setCaptions(data.captions);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="font-inter bg-white min-h-screen p-6 text-gray-800">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-pink-600">Caption Generator</h1>

        {/* Upload Video */}
        <input
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          className="border border-pink-300 rounded-md px-4 py-2 w-full text-black"
        />

        {/* Video Preview */}
        {videoFile && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600">Preview</p>
            <video
              src={URL.createObjectURL(videoFile)}
              controls
              className="w-full max-w-lg border border-gray-300 bg-black rounded-md"
            />
          </div>
        )}

        {/* Generate Captions Button */}
        <Button onClick={generateCaptions} disabled={!videoFile || isGenerating}>
          {isGenerating ? "Generating..." : "Generate Captions"}
        </Button>

        {isGenerating && (
          <Progress isIndeterminate aria-label="Generating captions..." className="max-w-md" />
        )}

        {error && <p className="text-red-500">{error}</p>}

        {/* Display Captions */}
        {captions.length > 0 && (
          <div className="mt-4 p-4 border border-pink-300 rounded-md bg-pink-50">
            <h2 className="text-lg font-semibold text-pink-600">Generated Captions:</h2>
            <Divider className="bg-pink-300 my-2" />
            {captions.map((caption, index) => (
              <Chip key={index} className="text-black bg-white border border-pink-300">
                {caption}
              </Chip>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
