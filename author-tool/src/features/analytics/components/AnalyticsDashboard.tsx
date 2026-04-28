import { useState, useCallback } from 'react';
import { useDashboard, useRefreshDashboard } from '../hooks/useAnalytics';
import type { DateRange } from '../types/analytics.types';
import DatePresetBar from './DatePresetBar';
import NsmHeroCard from './NsmHeroCard';
import ChannelGroupCard from './ChannelGroupCard';
import FunnelCard from './FunnelCard';
import CounterMetricsCard from './CounterMetricsCard';
import ChannelChart from './ChannelChart';
import TopPagesTable from './TopPagesTable';
import CampaignTable from './CampaignTable';
import DeviceChart from './DeviceChart';
import HourlyChart from './HourlyChart';
import DayOfWeekChart from './DayOfWeekChart';
import DailyTrendChart from './DailyTrendChart';
import VideoEventsCard from './VideoEventsCard';
import SearchKeywordsTable from './SearchKeywordsTable';
import SearchConsoleCard from './SearchConsoleCard';

function getDefault7d(): DateRange {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 6);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: today.toISOString().split('T')[0],
  };
}

function Skeleton() {
  return <div className="bg-gray-100 rounded-xl h-40 animate-pulse" />;
}

function NotConfigured() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <div className="text-4xl mb-4">📊</div>
        <h2 className="text-lg font-bold mb-2">GA4 연동 필요</h2>
        <p className="text-sm text-gray-500 mb-4">
          사이트 분석을 보려면 Google Analytics 4를 연동해주세요.
        </p>
        <div className="text-left bg-gray-50 rounded-lg p-4 text-xs text-gray-600 space-y-1">
          <p>1. Google Cloud Console에서 서비스 계정 생성</p>
          <p>2. GA4 속성에 서비스 계정 뷰어 권한 추가</p>
          <p>3. <code className="bg-gray-200 px-1 rounded">.env</code>에 설정:</p>
          <pre className="bg-gray-200 p-2 rounded mt-1">{`GA4_PROPERTY_ID=속성ID\nGA4_SERVICE_ACCOUNT_KEY=./ga4-key.json`}</pre>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [range, setRange] = useState<DateRange>(getDefault7d);
  const { data, isLoading, error } = useDashboard(range.startDate, range.endDate);
  const refreshDashboard = useRefreshDashboard();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshDashboard();
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  }, [refreshDashboard]);

  // GA4 not configured
  if (!isLoading && data === null) return <NotConfigured />;

  const isToday = range.startDate === range.endDate &&
    range.startDate === new Date().toISOString().split('T')[0];

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <DatePresetBar
        selected={range}
        onSelect={setRange}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <div className="p-4 space-y-3">
        {isToday && (
          <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            ⚠️ "오늘" 데이터는 GA4 처리 지연으로 불완전할 수 있습니다 (최대 24~48시간)
          </div>
        )}

        {data?.cachedAt && (
          <div className="text-[10px] text-gray-400 text-right">
            캐시: {new Date(data.cachedAt).toLocaleTimeString('ko-KR')}
          </div>
        )}

        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            데이터 로딩 실패: {(error as Error).message}
          </div>
        )}

        {isLoading ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1,2,3,4].map(i => <Skeleton key={i} />)}
            </div>
            <div className="grid grid-cols-2 gap-3"><Skeleton /><Skeleton /></div>
            <div className="grid grid-cols-3 gap-3"><Skeleton /><Skeleton /><Skeleton /></div>
            <Skeleton />
          </>
        ) : data ? (
          <>
            {/* ⭐ v3 마케팅 전략 인사이트 — NSM + Counter + Funnel + PESO */}
            <NsmHeroCard data={data.overview} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ChannelGroupCard channels={data.channels} campaigns={data.campaigns} />
              <FunnelCard topPages={data.topPages} />
            </div>

            <CounterMetricsCard overview={data.overview} channels={data.channels} />

            {/* 기존 차트 ─ 일별 트렌드 + 상세 */}
            <DailyTrendChart />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ChannelChart data={data.channels} />
              <TopPagesTable data={data.topPages} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <CampaignTable data={data.campaigns} />
              <DeviceChart data={data.devices} />
              <HourlyChart data={data.hourly} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
              <DayOfWeekChart data={data.dayOfWeek} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <VideoEventsCard data={data.videoEvents} />
              <SearchKeywordsTable data={data.searchKeywords} />
            </div>
            <SearchConsoleCard range={range} />
          </>
        ) : null}
      </div>
    </div>
  );
}
