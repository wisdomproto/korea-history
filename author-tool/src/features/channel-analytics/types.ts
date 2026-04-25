export interface InstagramAccount {
  id: string;
  username?: string;
  name?: string;
  profilePictureUrl?: string;
  followersCount: number;
  followsCount: number;
  mediaCount: number;
}

export interface InstagramAccountInsight {
  metric: string;
  values: Array<{ value: number; endTime?: string }>;
  total: number;
}

export interface InstagramMediaWithInsights {
  id: string;
  caption?: string;
  permalink?: string;
  timestamp?: string;
  mediaType?: string;
  mediaProductType?: string;
  thumbnailUrl?: string;
  insights: {
    reach?: number;
    impressions?: number;
    likes?: number;
    comments?: number;
    saves?: number;
    shares?: number;
    plays?: number;
  };
}

export interface InstagramSnapshot {
  account: InstagramAccount | null;
  insights: InstagramAccountInsight[];
  media: InstagramMediaWithInsights[];
}

export interface YouTubeChannel {
  channelId: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
}

export interface YouTubeVideo {
  videoId: string;
  title: string;
  thumbnailUrl?: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration?: string;
}

export interface YouTubeSnapshot {
  channel: YouTubeChannel | null;
  videos: YouTubeVideo[];
}
