// pages/index.js or app/page.js (depending on your Next.js version)
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap, 
  Handle, 
  Position,
  useNodesState,
  useEdgesState,
  addEdge
} from 'reactflow';
import 'reactflow/dist/style.css';

import YouTubeUploadNode from '../../../components/youtubeNode';


// Define custom node components
const VideoInputNode = ({ data, isConnectable }) => {
  return (
    <div className="bg-white border-2 border-indigo-500 rounded-lg p-4 w-64 shadow-md">
      <div className="font-semibold text-indigo-600 mb-2">Video Input</div>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-indigo-500 transition duration-200 cursor-pointer">
        {data.file ? (
          <div className="text-gray-700">
            <p className="font-medium">{data.file.name}</p>
            <p className="text-sm text-gray-500 mt-1">
              {(data.file.size / (1024 * 1024)).toFixed(2)} MB
            </p>
            <button 
              className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium"
              onClick={data.onRemoveFile}
            >
              Remove File
            </button>
          </div>
        ) : (
          <div>
            <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <p className="mt-1 text-sm text-gray-600">Click to upload video</p>
            <input 
              type="file" 
              className="hidden" 
              id="videoUpload"
              accept="video/*"
              onChange={data.onFileChange}
            />
            <label 
              htmlFor="videoUpload" 
              className="mt-2 inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium cursor-pointer hover:bg-indigo-200 transition duration-200"
            >
              Browse Files
            </label>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} id="output" isConnectable={isConnectable} />
    </div>
  );
};

const ConfigurationNode = ({ data, isConnectable }) => {
  return (
    <div className="bg-white border-2 border-blue-500 rounded-lg p-4 w-72 shadow-md">
      <Handle type="target" position={Position.Top} id="input" isConnectable={isConnectable} />
      <div className="font-semibold text-blue-600 mb-2">Configuration</div>
      
      <div className="mb-3">
        <label className="block text-gray-700 text-sm font-medium mb-1">
          Number of Highlights
        </label>
        <div className="flex items-center">
          <input
            type="range"
            min="1"
            max="10"
            value={data.numHighlights}
            onChange={data.onChangeNumHighlights}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <span className="ml-2 text-gray-700 font-medium w-6 text-center">
            {data.numHighlights}
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-2">
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-1">
            Min Duration (s)
          </label>
          <input
            type="number"
            min="5"
            max="60"
            value={data.minDuration}
            onChange={data.onChangeMinDuration}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-1">
            Max Duration (s)
          </label>
          <input
            type="number"
            min="10"
            max="120"
            value={data.maxDuration}
            onChange={data.onChangeMaxDuration}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg"
          />
        </div>
      </div>
      
      <Handle type="source" position={Position.Bottom} id="output" isConnectable={isConnectable} />
    </div>
  );
};

const ProcessingNode = ({ data, isConnectable }) => {
  return (
    <div className="bg-white border-2 border-green-500 rounded-lg p-4 w-64 shadow-md">
      <Handle type="target" position={Position.Top} id="input" isConnectable={isConnectable} />
      <div className="font-semibold text-green-600 mb-2">Processing</div>
      
      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <span className="text-gray-700 text-sm font-medium">Progress</span>
          <span className="text-green-600 text-sm font-medium">{data.progress}%</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-500 transition-all duration-500 ease-out"
            style={{ width: `${data.progress}%` }}
          ></div>
        </div>
      </div>
      
      <div className="text-sm text-gray-700">
        Status: <span className="font-medium">{data.status}</span>
      </div>
      
      <button
        onClick={data.onProcess}
        disabled={!data.canProcess}
        className={`w-full mt-3 py-1.5 rounded-lg text-sm font-medium text-white ${
          !data.canProcess 
          ? 'bg-gray-400 cursor-not-allowed' 
          : 'bg-green-600 hover:bg-green-700'
        } transition duration-200`}
      >
        Start Processing
      </button>
      
      <Handle type="source" position={Position.Bottom} id="output" isConnectable={isConnectable} />
    </div>
  );
};

// Individual Result Node (One for each highlight)
const HighlightResultNode = ({ data, isConnectable }) => {
  const [frameOption, setFrameOption] = useState(data.frameOption || '16:9');
  
  const handleFrameChange = (e) => {
    const newFrameOption = e.target.value;
    setFrameOption(newFrameOption);
    if (data.onFrameChange) {
      data.onFrameChange(data.highlight.id, newFrameOption);
    }
  };
  
  // Calculate aspect ratio styling based on frame option
  const getVideoStyle = () => {
    switch (frameOption) {
      case '16:9':
        return { aspectRatio: '16/9' };
      case '9:16':
        return { aspectRatio: '9/16' };
      case '4:5':
        return { aspectRatio: '4/5' };
      case '1:1':
        return { aspectRatio: '1/1' };
      default:
        return { aspectRatio: '16/9' };
    }
  };

  return (
    <div className="bg-white border-2 border-purple-500 rounded-lg p-4 w-64 shadow-md">
      <Handle type="target" position={Position.Top} id="input" isConnectable={isConnectable} />
      
      <div className="font-semibold text-purple-600 mb-2">
        Highlight {data.highlight.id}
      </div>
      
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
            {data.highlight.duration.toFixed(1)}s
          </span>
        </div>
        
        <p className="text-gray-600 text-xs mb-2">
          Time: {data.highlight.start_time.toFixed(1)}s - {data.highlight.end_time.toFixed(1)}s
        </p>
        
        <div className="mb-2">
          <label className="block text-gray-700 text-xs font-medium mb-1">
            Frame Option
          </label>
          <select
            value={frameOption}
            onChange={handleFrameChange}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg"
          >
            <option value="16:9">16:9 (Landscape)</option>
            <option value="9:16">9:16 (Portrait)</option>
            <option value="4:5">4:5 (Instagram)</option>
            <option value="1:1">1:1 (Square)</option>
          </select>
        </div>

        <div className="flex justify-center items-center">
          <video 
            className="w-full rounded mb-2" 
            controls 
            height="100"
            style={getVideoStyle()}
          >
            <source src={`http://localhost:5000/${data.highlight.url}`} type="video/mp4" />
            Your browser doesn't support video playback.
          </video>
        </div>

        <a
          href={data.highlight.url}
          download
          className="text-center block py-1 bg-purple-100 text-purple-700 rounded text-sm font-medium hover:bg-purple-200 transition duration-200"
        >
          Download
        </a>
      </div>
      
      <Handle type="source" position={Position.Bottom} id="output" isConnectable={isConnectable} />
    </div>
  );
};

// Collector Node for all highlights (acts as parent)
const ResultsNode = ({ data, isConnectable }) => {
  return (
    <div className="bg-white border-2 border-purple-500 rounded-lg p-4 w-64 shadow-md">
      <Handle type="target" position={Position.Top} id="input" isConnectable={isConnectable} />
      <div className="font-semibold text-purple-600 mb-2">Results Hub</div>
      
      {data.highlights.length > 0 ? (
        <div className="text-center text-gray-700 py-2">
          <p className="font-medium">{data.highlights.length} highlights generated</p>
          <p className="text-sm">See individual result nodes</p>
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            ></path>
          </svg>
          <p className="mt-2 font-medium">No highlights available yet</p>
          <p className="text-sm">Process a video to generate highlights</p>
        </div>
      )}
      
      <Handle type="source" position={Position.Bottom} id="output" isConnectable={isConnectable} />
    </div>
  );
};

const TranscriptNode = ({ data, isConnectable }) => {
  return (
    <div className="bg-white border-2 border-amber-500 rounded-lg p-4 w-72 shadow-md">
      <Handle type="target" position={Position.Top} id="input" isConnectable={isConnectable} />
      <div className="font-semibold text-amber-600 mb-2">Transcript</div>
      
      <div className="bg-gray-50 rounded-lg p-3 max-h-60 overflow-y-auto border border-gray-200">
        {data.transcript ? (
          <pre className="whitespace-pre-wrap text-gray-700 font-sans text-sm">{data.transcript}</pre>
        ) : (
          <div className="text-center text-gray-500 py-4">
            No transcript available
          </div>
        )}
      </div>
    </div>
  );
};

// Node type definitions
const nodeTypes = {
  videoInput: VideoInputNode,
  configuration: ConfigurationNode,
  processing: ProcessingNode,
  results: ResultsNode,
  highlightResult: HighlightResultNode,
  transcript: TranscriptNode,
  youtubeUpload: YouTubeUploadNode
};

export default function VideoHighlightsFlowApp() {
  // Application state
  const [file, setFile] = useState(null);
  const [numHighlights, setNumHighlights] = useState(3);
  const [minDuration, setMinDuration] = useState(20);
  const [maxDuration, setMaxDuration] = useState(30);
  const [jobId, setJobId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Waiting');
  const [isProcessing, setIsProcessing] = useState(false);
  const [highlights, setHighlights] = useState([]);
  const [highlightFrames, setHighlightFrames] = useState({});
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  
  // Ref for checking status
  const statusIntervalRef = useRef(null);
  
  // Initial nodes
  const initialNodes = [
    {
      id: '1',
      type: 'videoInput',
      position: { x: 250, y: 50 },
      data: { 
        file: null,
        onFileChange: () => {},
        onRemoveFile: () => {}
      }
    },
    {
      id: '2',
      type: 'configuration',
      position: { x: 230, y: 200 },
      data: { 
        numHighlights: 3,
        minDuration: 20,
        maxDuration: 30,
        onChangeNumHighlights: () => {},
        onChangeMinDuration: () => {},
        onChangeMaxDuration: () => {}
      }
    },
    {
      id: '3',
      type: 'processing',
      position: { x: 250, y: 400 },
      data: {
        progress: 0,
        status: 'Waiting',
        canProcess: false,
        onProcess: () => {}
      }
    },
    {
      id: '4',
      type: 'results',
      position: { x: 250, y: 600 },
      data: {
        highlights: []
      }
    },
    {
      id: '5',
      type: 'transcript',
      position: { x: 500, y: 400 },
      data: {
        transcript: ''
      }
    }
  ];
  
  // Initial edges
  const initialEdges = [
    { id: 'e1-2', source: '1', target: '2' },
    { id: 'e2-3', source: '2', target: '3' },
    { id: 'e3-4', source: '3', target: '4' },
    { id: 'e3-5', source: '3', target: '5' }
  ];
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  // API base URL
  const API_URL = 'http://localhost:5000/api';
  
  // Handle frame option change
  const handleFrameChange = (highlightId, frameOption) => {
    setHighlightFrames(prev => ({
      ...prev,
      [highlightId]: frameOption
    }));
  };
  
  // Create individual result nodes for each highlight and link with YouTube upload nodes
  useEffect(() => {
    if (highlights.length > 0) {
      // Filter out any existing highlight result nodes and youtube upload nodes first
      const filteredNodes = nodes.filter(node => 
        !node.type || 
        (node.type !== 'highlightResult' && node.type !== 'youtubeUpload')
      );
      
      // Create new highlight result nodes
      const resultNodes = highlights.map((highlight, index) => {
        // Calculate position with some horizontal spacing
        const xPos = 100 + (index % 3) * 300; 
        const yPos = 750 + Math.floor(index / 3) * 350;
        
        return {
          id: `highlight-${highlight.id}`,
          type: 'highlightResult',
          position: { x: xPos, y: yPos },
          draggable: true,
          data: {
            highlight,
            frameOption: highlightFrames[highlight.id] || '16:9',
            onFrameChange: handleFrameChange
          }
        };
      });
      
      // Create YouTube upload nodes for each highlight
      const youtubeNodes = highlights.map((highlight, index) => {
        // Position YouTube upload nodes directly below their respective highlight nodes
        const xPos = 100 + (index % 3) * 300;
        const yPos = 750 + Math.floor(index / 3) * 350 + 280; // Add vertical offset
        
        return {
          id: `youtube-${highlight.id}`,
          type: 'youtubeUpload',
          position: { x: xPos, y: yPos },
          draggable: true,
          data: {
            highlight: highlight
          }
        };
      });
      
      // Create edges from result nodes to YouTube upload nodes
      const youtubeEdges = highlights.map(highlight => ({
        id: `e-highlight-${highlight.id}-youtube`,
        source: `highlight-${highlight.id}`,
        target: `youtube-${highlight.id}`
      }));
      
      // Create edges from hub to each result node
      const resultEdges = highlights.map(highlight => ({
        id: `e4-highlight-${highlight.id}`,
        source: '4',
        target: `highlight-${highlight.id}`
      }));
      
      // Update nodes and edges
      setNodes([...filteredNodes, ...resultNodes, ...youtubeNodes]);
      
      // Filter out old edges
      const filteredEdges = edges.filter(edge => 
        !edge.id.startsWith('e4-highlight-') && 
        !edge.id.startsWith('e-highlight-')
      );
      
      setEdges([...filteredEdges, ...resultEdges, ...youtubeEdges]);
    }
  }, [highlights, highlightFrames]);
  
  // Update node data
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === '1') {
          node.data = {
            ...node.data,
            file: file,
            onFileChange: (e) => setFile(e.target.files[0]),
            onRemoveFile: () => setFile(null)
          };
        }
        else if (node.id === '2') {
          node.data = {
            ...node.data,
            numHighlights,
            minDuration,
            maxDuration,
            onChangeNumHighlights: (e) => setNumHighlights(parseInt(e.target.value)),
            onChangeMinDuration: (e) => setMinDuration(parseInt(e.target.value)),
            onChangeMaxDuration: (e) => setMaxDuration(parseInt(e.target.value))
          };
        }
        else if (node.id === '3') {
          node.data = {
            ...node.data,
            progress,
            status,
            canProcess: !!file && !isProcessing,
            onProcess: handleProcess
          };
        }
        else if (node.id === '4') {
          node.data = {
            ...node.data,
            highlights
          };
        }
        else if (node.id === '5') {
          node.data = {
            ...node.data,
            transcript
          };
        }
        // Individual highlight result nodes and YouTube nodes are handled in separate useEffect
        return node;
      })
    );
  }, [file, numHighlights, minDuration, maxDuration, progress, status, isProcessing, highlights, transcript]);
  
  // Handle edge connections
  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);
  
  // Handle process submission
  const handleProcess = async () => {
    if (!file) {
      setError('Please select a video file');
      return;
    }
    
    setError('');
    setProgress(0);
    setStatus('Uploading');
    setIsProcessing(true);
    setHighlights([]);
    setHighlightFrames({});
    
    // Create form data
    const formData = new FormData();
    formData.append('video', file);
    formData.append('num_highlights', numHighlights);
    formData.append('min_duration', minDuration);
    formData.append('max_duration', maxDuration);
    
    try {
      // Make API call
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
      
      const data = await response.json();
      setJobId(data.job_id);
      setStatus('Analyzing');
      
      // Start checking status
      checkStatus(data.job_id);
      
    } catch (error) {
      setError(error.message || 'An error occurred during upload');
      setStatus('Failed');
      setIsProcessing(false);
    }
  };
  
  // Check job status
  const checkStatus = async (id) => {
    try {
      const response = await fetch(`${API_URL}/status/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to get job status');
      }
      
      const data = await response.json();
      
      setStatus(capitalizeFirstLetter(data.status));
      setProgress(data.progress);
      
      if (data.status === 'complete') {
        await fetchResults(id);
        clearInterval(statusIntervalRef.current);
        setIsProcessing(false);
      } else if (data.status === 'failed') {
        setError(data.error || 'Job failed');
        clearInterval(statusIntervalRef.current);
        setIsProcessing(false);
      } else {
        // Continue checking status
        if (!statusIntervalRef.current) {
          statusIntervalRef.current = setInterval(() => checkStatus(id), 2000);
        }
      }
    } catch (error) {
      console.error('Error checking status:', error);
      setError('Failed to check job status');
      setStatus('Failed');
      setIsProcessing(false);
      clearInterval(statusIntervalRef.current);
    }
  };
  
  // Fetch results
  const fetchResults = async (id) => {
    try {
      const response = await fetch(`${API_URL}/results/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to get results');
      }
      const data = await response.json();
      
      // Initialize each highlight with default 16:9 frame option
      const initialFrames = {};
      (data.highlights || []).forEach(highlight => {
        initialFrames[highlight.id] = '16:9';
      });
      
      setHighlights(data.highlights || []);
      setHighlightFrames(initialFrames);
      
      if (data.transcript_url) {
        const transcriptResponse = await fetch(data.transcript_url);
        if (transcriptResponse.ok) {
          const text = await transcriptResponse.text();
          setTranscript(text);
        }
      }
      
      setStatus('Complete');
    } catch (error) {
      console.error('Error fetching results:', error);
      setError('Failed to load results');
    }
  };
  
  // Helper function to capitalize first letter
  const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
      }
    };
  }, []);
  
  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-indigo-50 to-blue-100">
      <div className="p-4 bg-white w-full shadow-md border-b border-gray-200 mx-auto">
        <h1 className="text-2xl font-bold text-pink-600">Shorts Highlights</h1>
        <p className="text-gray-600">Drag nodes, connect components, and build your video highlights pipeline</p>
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="m-4 bg-red-50 text-red-700 p-3 rounded-lg shadow-sm border border-red-200">
          <h3 className="font-medium">Error</h3>
          <p>{error}</p>
        </div>
      )}
      
      <div className="flex-grow">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          <Controls />
          <MiniMap />
          <Background variant="dots" gap={12} size={1} />
        </ReactFlow>
      </div>
      
      <div className="p-3 bg-gray-100 border-t border-gray-200 text-center text-gray-600 text-sm">
        Video Highlights Flow UI - Drag nodes to reposition them and configure your processing pipeline
      </div>
    </div>
  );
}