import data from "@/data/note-lectures.json";

interface LectureVideo {
  videoId: string;
  title: string;
  duration: number;
}

const noteData = data as {
  playlist: string;
  channelName: string;
  notes: Record<string, LectureVideo[]>;
};

export function getNoteLectures(noteId: string): LectureVideo[] {
  return noteData.notes[noteId] || [];
}

export function getChannelName(): string {
  return noteData.channelName;
}
