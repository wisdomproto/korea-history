import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';

const PROJECTS_DIR = path.resolve(config.dataDir, '../projects');
const INDEX_PATH = path.join(PROJECTS_DIR, 'index.json');

export interface Project {
  id: string;
  name: string;
  icon: string;
  createdAt: string;
  // NEW
  type: 'korean-history' | 'cbt';
  categoryCode?: string;
  examCount?: number;
  questionCount?: number;
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

export async function updateProject(id: string, updates: Partial<Pick<Project, 'name' | 'icon'>>): Promise<Project | null> {
  const projects = await readProjects();
  const idx = projects.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  if (updates.name !== undefined) projects[idx].name = updates.name;
  if (updates.icon !== undefined) projects[idx].icon = updates.icon;
  await writeProjects(projects);
  return projects[idx];
}
