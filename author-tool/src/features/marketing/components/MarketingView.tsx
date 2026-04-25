import { useEditorStore } from '@/store/editor.store';
import AnalyticsView from '@/features/analytics/components/AnalyticsView';
import { ProjectSettingsView } from '@/features/settings/components/ProjectSettingsView';
import { IdeasView } from '@/features/ideas/components/IdeasView';
import { PublishView } from '@/features/publish/components/PublishView';
import { MonitoringView } from '@/features/monitoring/components/MonitoringView';
import { AdsView } from '@/features/ads/components/AdsView';
import { ChannelAnalyticsView } from '@/features/channel-analytics/components/ChannelAnalyticsView';
import { CompetitorsView } from '@/features/competitors/components/CompetitorsView';
import { StrategyView } from '@/features/strategy/components/StrategyView';
import { ContentWorkspace } from './ContentWorkspace';
import { StubPanel } from './StubPanel';

export function MarketingView() {
  const submenu = useEditorStore((s) => s.marketingSubmenu);

  if (submenu === 'content') return <ContentWorkspace />;
  if (submenu === 'site-analytics') return <AnalyticsView />;
  if (submenu === 'settings') return <ProjectSettingsView />;
  if (submenu === 'ideas') return <IdeasView />;
  if (submenu === 'publish') return <PublishView />;
  if (submenu === 'monitoring') return <MonitoringView />;
  if (submenu === 'ads') return <AdsView />;
  if (submenu === 'channel-analytics') return <ChannelAnalyticsView />;
  if (submenu === 'competitor') return <CompetitorsView />;
  if (submenu === 'strategy') return <StrategyView />;








  // default
  return <ContentWorkspace />;
}
