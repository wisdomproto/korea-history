export interface ProjectBrand {
  name?: string;
  description?: string;
  usp?: string;
  tone?: string;
  industry?: string;
  targetAudience?: string;
  marketerName?: string;
  marketerExpertise?: string;
  marketerStyle?: string;
  marketerPhrases?: string[];
  bannedKeywords?: string[];
  snsGoal?: string;
}

export interface ProjectWritingGuide {
  global?: string;
  blog?: string;
  instagram?: string;
  threads?: string;
  youtube?: string;
}

export interface ReferenceFile {
  id: string;
  name: string;
  url?: string;
  extractedText?: string;
  addedAt: string;
}

export interface ChannelCredentials {
  wordpress?: {
    siteUrl?: string;
    username?: string;
    appPassword?: string;
  };
  youtube?: {
    channelId?: string;
    handle?: string;
  };
  naverBlog?: {
    blogId?: string;
  };
  threads?: {
    handle?: string;
  };
}

export type KeywordSource = 'naver' | 'gsc' | 'manual' | 'ai';
export type KeywordStatus = 'backlog' | 'exploring' | 'in_content' | 'archived';

export interface SavedKeyword {
  id: string;
  term: string;
  source: KeywordSource;
  savedAt: string;
  status: KeywordStatus;
  memo?: string;
  volume?: number;
  pcVolume?: number;
  mobileVolume?: number;
  competition?: string;
  gscClicks?: number;
  gscImpressions?: number;
  gscCtr?: number;
  gscPosition?: number;
}

export type IdeaChannel = 'blog' | 'instagram' | 'threads' | 'longform' | 'shortform';
export type IdeaStatus = 'backlog' | 'in_progress' | 'published' | 'archived';

export interface SavedIdea {
  id: string;
  title: string;
  hook?: string;
  description?: string;
  keywords: string[];
  targetChannel?: IdeaChannel;
  savedAt: string;
  status: IdeaStatus;
  source?: 'manual' | 'ai';
  priority?: number;
}

export interface IcpSpec {
  summary?: string;
  ageRange?: string;
  occupation?: string;
  pains?: string[];
  motivations?: string[];
  buyingTriggers?: string[];
}

export interface JtbdSpec {
  id: string;
  situation: string;
  motivation: string;
  outcome: string;
}

export type FunnelStageName = 'awareness' | 'interest' | 'evaluation' | 'conversion' | 'retention' | 'advocacy';

export interface FunnelStage {
  id: string;
  name: FunnelStageName;
  label: string;
  description?: string;
  kpiName?: string;
  kpiTarget?: number;
  kpiCurrent?: number;
  channels?: string[];
}

export interface ChannelMixItem {
  id: string;
  channel: string;
  weightPct: number;
  purpose?: string;
}

export interface SeasonEvent {
  id: string;
  date: string;
  name: string;
  type: 'exam' | 'campaign' | 'launch' | 'holiday' | 'other';
  notes?: string;
}

export interface KeyResult {
  id: string;
  text: string;
  target?: number;
  current?: number;
  unit?: string;
}

export interface Okr {
  id: string;
  quarter: string;
  objective: string;
  keyResults: KeyResult[];
}

export interface ProjectStrategy {
  icp?: IcpSpec;
  jtbds?: JtbdSpec[];
  funnel?: { stages: FunnelStage[] };
  channelMix?: ChannelMixItem[];
  seasonCalendar?: SeasonEvent[];
  okrs?: Okr[];
}

export interface ProjectSettings {
  id: string;
  name: string;
  icon: string;
  type: 'korean-history' | 'cbt';
  createdAt: string;
  updatedAt?: string;
  brand?: ProjectBrand;
  writingGuide?: ProjectWritingGuide;
  referenceFiles?: ReferenceFile[];
  referenceSummary?: string;
  channelCredentials?: ChannelCredentials;
  savedKeywords?: SavedKeyword[];
  savedIdeas?: SavedIdea[];
  strategy?: ProjectStrategy;
}

export interface EnvField {
  key: string;
  set: boolean;
  preview?: string;
}

export interface EnvServiceStatus {
  id: string;
  label: string;
  icon: string;
  connected: boolean;
  fields?: EnvField[];
  note?: string;
}

export interface EnvStatus {
  services: EnvServiceStatus[];
}
