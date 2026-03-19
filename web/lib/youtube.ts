import youtubeData from "@/data/youtube-videos.json";

interface VideoData {
  videoId: string;
  channelName: string;
  questions: Record<string, number>;
}

const videos = youtubeData as Record<string, VideoData>;

export function getYouTubeTimestamp(
  examNumber: number,
  questionNumber: number
): { videoId: string; startSeconds: number; channelName: string } | null {
  const exam = videos[String(examNumber)];
  if (!exam) return null;

  const timestamp = exam.questions[String(questionNumber)];
  if (timestamp === undefined) return null;

  return {
    videoId: exam.videoId,
    startSeconds: timestamp,
    channelName: exam.channelName,
  };
}

export function hasYouTubeVideo(examNumber: number): boolean {
  return String(examNumber) in videos;
}
