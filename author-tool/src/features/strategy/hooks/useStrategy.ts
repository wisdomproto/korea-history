import { useMutation } from '@tanstack/react-query';
import {
  draftIcp, draftJtbds, draftFunnel, draftChannelMix, draftOkrs, draftSeasonCalendar,
} from '../api/strategy.api';

export function useDraftIcp() {
  return useMutation({ mutationFn: (projectId: string) => draftIcp(projectId) });
}
export function useDraftJtbds() {
  return useMutation({ mutationFn: (projectId: string) => draftJtbds(projectId) });
}
export function useDraftFunnel() {
  return useMutation({ mutationFn: (projectId: string) => draftFunnel(projectId) });
}
export function useDraftChannelMix() {
  return useMutation({ mutationFn: (projectId: string) => draftChannelMix(projectId) });
}
export function useDraftOkrs() {
  return useMutation({
    mutationFn: ({ projectId, quarter }: { projectId: string; quarter?: string }) =>
      draftOkrs(projectId, quarter),
  });
}
export function useDraftSeasonCalendar() {
  return useMutation({ mutationFn: (projectId: string) => draftSeasonCalendar(projectId) });
}
