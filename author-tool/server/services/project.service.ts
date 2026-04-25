import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';

const PROJECTS_DIR = path.resolve(config.dataDir, '../projects');
const INDEX_PATH = path.join(PROJECTS_DIR, 'index.json');

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
  // Naver metrics
  volume?: number;
  pcVolume?: number;
  mobileVolume?: number;
  competition?: string;
  // GSC metrics
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
  channel: string;        // 'blog' | 'instagram' | 'youtube' | 'threads' | 'email' | 'ads' | 'community' ...
  weightPct: number;
  purpose?: string;
}

export interface SeasonEvent {
  id: string;
  date: string;            // YYYY-MM-DD
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

export interface Project {
  id: string;
  name: string;
  icon: string;
  createdAt: string;
  updatedAt?: string;
  // NEW
  type: 'korean-history' | 'cbt';
  categoryCode?: string;
  examCount?: number;
  questionCount?: number;
  // Settings
  brand?: ProjectBrand;
  writingGuide?: ProjectWritingGuide;
  referenceFiles?: ReferenceFile[];
  referenceSummary?: string;
  channelCredentials?: ChannelCredentials;
  // Ideas
  savedKeywords?: SavedKeyword[];
  savedIdeas?: SavedIdea[];
  // Strategy
  strategy?: ProjectStrategy;
}

interface CreateProjectParams {
  name: string;
  icon?: string;
  type?: 'korean-history' | 'cbt';
  categoryCode?: string;
  examCount?: number;
  questionCount?: number;
}

async function ensureDir() {
  await fs.mkdir(PROJECTS_DIR, { recursive: true });
}

export async function readProjects(): Promise<Project[]> {
  await ensureDir();
  try {
    const raw = await fs.readFile(INDEX_PATH, 'utf-8');
    const projects: Project[] = JSON.parse(raw);

    // Migration: add type field if missing
    let migrated = false;
    for (const proj of projects) {
      if (!proj.type) {
        proj.type = proj.id === 'proj-default' ? 'korean-history' : 'cbt';
        migrated = true;
      }
    }
    if (migrated) {
      await writeProjects(projects);
    }

    return projects;
  } catch {
    // Create default project
    const defaultProject: Project = {
      id: 'proj-default',
      name: '한국사능력검정시험',
      icon: '📚',
      createdAt: new Date().toISOString(),
      type: 'korean-history',
    };
    await writeProjects([defaultProject]);
    return [defaultProject];
  }
}

async function writeProjects(projects: Project[]): Promise<void> {
  await ensureDir();
  await fs.writeFile(INDEX_PATH, JSON.stringify(projects, null, 2), 'utf-8');
}

export async function createProject(params: CreateProjectParams): Promise<Project> {
  const projects = await readProjects();
  const project: Project = {
    id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: params.name,
    icon: params.icon ?? '📁',
    createdAt: new Date().toISOString(),
    type: params.type ?? 'korean-history',
    categoryCode: params.categoryCode,
    examCount: params.examCount,
    questionCount: params.questionCount,
  };
  projects.push(project);
  await writeProjects(projects);
  return project;
}

export async function deleteProject(id: string): Promise<boolean> {
  if (id === 'proj-default') return false; // Can't delete default
  const projects = await readProjects();
  const filtered = projects.filter((p) => p.id !== id);
  if (filtered.length === projects.length) return false;
  await writeProjects(filtered);
  return true;
}

const UPDATABLE_FIELDS: Array<keyof Project> = [
  'name',
  'icon',
  'brand',
  'writingGuide',
  'referenceFiles',
  'referenceSummary',
  'channelCredentials',
  'savedKeywords',
  'savedIdeas',
  'strategy',
];

export async function updateProject(
  id: string,
  updates: Partial<Project>
): Promise<Project | null> {
  const projects = await readProjects();
  const idx = projects.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  const proj = projects[idx];
  for (const key of UPDATABLE_FIELDS) {
    if (updates[key] !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (proj as any)[key] = updates[key];
    }
  }
  proj.updatedAt = new Date().toISOString();
  await writeProjects(projects);
  return proj;
}

export async function getProject(id: string): Promise<Project | null> {
  const projects = await readProjects();
  return projects.find((p) => p.id === id) ?? null;
}
