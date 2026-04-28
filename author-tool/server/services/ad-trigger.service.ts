import { readJson, writeJson } from './r2-json.service.js';
import { getOverview, isConfigured as isGa4Configured } from './ga4.service.js';

const KEY = 'ad-triggers/state.json';

export const DAU_THRESHOLD = 500;
export const FOUR_WEEKS_TARGET = '2026-05-26';

export interface TriggerEntry {
  triggered: boolean;
  reachedAt: string | null;
}

export interface AdTriggerState {
  daily500: TriggerEntry & { latestDau: number };
  fourWeeks: TriggerEntry & { targetDate: string };
  adsenseApproved: TriggerEntry;
  lastChecked: string;
}

function initialState(): AdTriggerState {
  return {
    daily500: { triggered: false, reachedAt: null, latestDau: 0 },
    fourWeeks: { triggered: false, reachedAt: null, targetDate: FOUR_WEEKS_TARGET },
    adsenseApproved: { triggered: false, reachedAt: null },
    lastChecked: new Date(0).toISOString(),
  };
}

export async function getAdTriggerState(): Promise<AdTriggerState> {
  return readJson<AdTriggerState>(KEY, initialState());
}

export async function checkAndUpdateAdTriggers(): Promise<AdTriggerState> {
  const state = await getAdTriggerState();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  if (!state.daily500.triggered && isGa4Configured()) {
    try {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const ymd = yesterday.toISOString().slice(0, 10);
      const overview = await getOverview(ymd, ymd);
      const dau = overview.users ?? 0;
      state.daily500.latestDau = dau;
      if (dau >= DAU_THRESHOLD) {
        state.daily500.triggered = true;
        state.daily500.reachedAt = today;
      }
    } catch (err) {
      console.warn('[ad-trigger] DAU check failed:', (err as Error).message);
    }
  }

  if (!state.fourWeeks.triggered && today >= FOUR_WEEKS_TARGET) {
    state.fourWeeks.triggered = true;
    state.fourWeeks.reachedAt = today;
  }

  state.lastChecked = now.toISOString();
  await writeJson(KEY, state);
  return state;
}

export async function markAdsenseApproved(approved: boolean): Promise<AdTriggerState> {
  const state = await getAdTriggerState();
  state.adsenseApproved.triggered = approved;
  state.adsenseApproved.reachedAt = approved ? new Date().toISOString().slice(0, 10) : null;
  state.lastChecked = new Date().toISOString();
  await writeJson(KEY, state);
  return state;
}
