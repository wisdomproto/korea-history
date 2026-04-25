import { apiGet } from '@/lib/axios';
import axios from 'axios';
import type { ProjectSettings, EnvStatus } from '../types';

export async function fetchProjectSettings(id: string): Promise<ProjectSettings> {
  return apiGet<ProjectSettings>(`/projects/${id}`);
}

export async function patchProjectSettings(
  id: string,
  patch: Partial<ProjectSettings>
): Promise<ProjectSettings> {
  const res = await axios.patch(`/api/projects/${id}`, patch);
  return res.data.data as ProjectSettings;
}

export async function fetchEnvStatus(): Promise<EnvStatus> {
  return apiGet<EnvStatus>('/env-status');
}
