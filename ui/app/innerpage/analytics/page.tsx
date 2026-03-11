"use client"
import { useEffect, useState } from 'react';
import axios from 'axios';

const Analytics = () => {
  const [message, setMessage] = useState<string>('');
  const [channelAnalytics, setChannelAnalytics] = useState<any[]>([]);
  const [videoId, setVideoId] = useState<string>('');
  const [videoAnalytics, setVideoAnalytics] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Function to authenticate and fetch channel analytics
  const authenticateAndFetchChannelData = async () => {
    try {
      const authResponse = await axios.get('/api/authenticate');
      setMessage(authResponse.data.message);

      const channelResponse = await axios.get('/api/channel/analytics');
      setChannelAnalytics(channelResponse.data);
    } catch (error) {
      setError('Error authenticating or fetching channel analytics');
    }
  };

  // Fetch video analytics when videoId changes
  const fetchVideoAnalytics = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.get(`/api/video/analytics?video_id=${videoId}`);
      setVideoAnalytics(response.data.performance);
      setError(null); // Clear previous errors
    } catch (error) {
      setError('Error fetching video analytics');
      setVideoAnalytics(null);
    }
  };

  useEffect(() => {
    // Authenticate and fetch data on component mount
    authenticateAndFetchChannelData();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-6">YouTube Analytics</h1>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Authentication Status</h2>
        <p>{message}</p>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Channel Analytics</h2>
        {channelAnalytics.length > 0 ? (
          <div className="space-y-4">
            {channelAnalytics.map((item: any, index: number) => (
              <div key={index} className="bg-gray-100 p-4 rounded-lg">
                <p><strong>Total Views:</strong> {item.total_views}</p>
                <p><strong>Total Subscribers:</strong> {item.total_subscribers}</p>
                <p><strong>Watch Time (minutes):</strong> {item.watch_time_minutes}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>No channel data available.</p>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Video Analytics</h2>
        <form onSubmit={fetchVideoAnalytics} className="flex items-center space-x-4">
          <input
            type="text"
            id="videoId"
            placeholder="Enter Video ID"
            value={videoId}
            onChange={(e) => setVideoId(e.target.value)}
            className="border p-2 rounded-md"
          />
          <button type="submit" className="bg-blue-500 text-white p-2 rounded-md">Get Analytics</button>
        </form>

        {error && <p className="text-red-500 mt-2">{error}</p>}

        {videoAnalytics && (
          <div className="bg-gray-100 p-4 rounded-lg mt-6">
            <h3 className="font-semibold">Video Performance</h3>
            <p><strong>Views:</strong> {videoAnalytics.views}</p>
            <p><strong>Likes:</strong> {videoAnalytics.likes}</p>
            <p><strong>Dislikes:</strong> {videoAnalytics.dislikes}</p>
            <p><strong>Comments:</strong> {videoAnalytics.comments}</p>
            <p><strong>Watch Time (minutes):</strong> {videoAnalytics.watch_time}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
