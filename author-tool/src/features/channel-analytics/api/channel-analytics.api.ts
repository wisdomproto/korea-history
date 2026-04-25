import axios from 'axios';
import type { InstagramSnapshot, YouTubeSnapshot } from '../types';

export async function fetchInstagramSnapshot(): Promise<InstagramSnapshot | null> {
  const res = await axios.get('/api/channel-analytics/instagram');
  return (res.data.data ?? null) as InstagramSnapshot | null;
}

export async function fetchYoutubeSnapshot(projectId: string): Promise<{ data: YouTubeSnapshot | null; message?: string }> {
  const res = await axios.get(`/api/channel-analytics/youtube?projectId=${projectId}`);
  return { data: (res.data.data ?? null) as YouTubeSnapshot | null, message: res.data.message };
}
