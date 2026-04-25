import axios from 'axios';
import type {
  IcpSpec, JtbdSpec, FunnelStage, ChannelMixItem, Okr, SeasonEvent,
} from '@/features/settings/types';

export async function draftIcp(projectId: string): Promise<IcpSpec> {
  const r = await axios.post('/api/strategy/draft/icp', { projectId });
  return r.data.data as IcpSpec;
}

export async function draftJtbds(projectId: string): Promise<JtbdSpec[]> {
  const r = await axios.post('/api/strategy/draft/jtbds', { projectId });
  return r.data.data as JtbdSpec[];
}

export async function draftFunnel(projectId: string): Promise<FunnelStage[]> {
  const r = await axios.post('/api/strategy/draft/funnel', { projectId });
  return r.data.data as FunnelStage[];
}

export async function draftChannelMix(projectId: string): Promise<ChannelMixItem[]> {
  const r = await axios.post('/api/strategy/draft/channel-mix', { projectId });
  return r.data.data as ChannelMixItem[];
}

export async function draftOkrs(projectId: string, quarter?: string): Promise<Okr[]> {
  const r = await axios.post('/api/strategy/draft/okrs', { projectId, quarter });
  return r.data.data as Okr[];
}

export async function draftSeasonCalendar(projectId: string): Promise<SeasonEvent[]> {
  const r = await axios.post('/api/strategy/draft/season-calendar', { projectId });
  return r.data.data as SeasonEvent[];
}
