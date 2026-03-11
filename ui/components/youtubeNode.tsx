import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';

const YouTubeUploadNode = ({ data, isConnectable }:any ) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  // Handle YouTube upload
  const handleUpload = async () => {
    setIsUploading(true);
    setUploadStatus('Uploading to YouTube...');

    const parts = data.highlight.url.split("/");

    // The ID is located at index 3 in the split array
    const id = parts[3];
    
    console.log(id);
    const payload = {
      video_id: id,
      title,
      description,
      tags: tags.split(',').map(tag => tag.trim())
    };

    console.log(data)

    try {
      const response = await fetch('http://localhost:5000/api/uploadToYoutube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (response.ok) {
        setUploadStatus(`Uploaded successfully! `);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      setUploadStatus(`Error: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white border-2 border-red-500 rounded-lg p-4 w-64 shadow-md">
      <Handle type="target" position={Position.Top} id="input" isConnectable={isConnectable} />
      
      <div className="font-semibold text-red-600 mb-2">Upload to YouTube</div>
      
      <div className="mb-2">
        <label className="block text-gray-700 text-sm font-medium">Video Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-2 py-1 text-sm border rounded-lg"
        />
      </div>

      <div className="mb-2">
        <label className="block text-gray-700 text-sm font-medium">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-2 py-1 text-sm border rounded-lg"
        />
      </div>

      <div className="mb-3">
        <label className="block text-gray-700 text-sm font-medium">Tags (comma-separated)</label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="w-full px-2 py-1 text-sm border rounded-lg"
        />
      </div>

      <button
        onClick={handleUpload}
        disabled={isUploading}
        className={`w-full py-1.5 rounded-lg text-sm font-medium text-white ${
          isUploading ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'
        }`}
      >
        {isUploading ? 'Uploading...' : 'Upload to YouTube'}
      </button>

      {uploadStatus && (
        <p className="mt-2 text-sm text-gray-700">{uploadStatus}</p>
      )}

      <Handle type="source" position={Position.Bottom} id="output" isConnectable={isConnectable} />
    </div>
  );
};

export default YouTubeUploadNode;
