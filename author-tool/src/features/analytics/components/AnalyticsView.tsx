import { useState } from 'react';
import AnalyticsDashboard from './AnalyticsDashboard';
import WeeklyReportList from './WeeklyReportList';
import WeeklyReportDetail from './WeeklyReportDetail';

type Tab = 'dashboard' | 'weekly';

export default function AnalyticsView() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="flex items-center gap-1 px-3 py-2 bg-white border-b border-gray-200">
        <button
          onClick={() => setTab('dashboard')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            tab === 'dashboard'
              ? 'bg-emerald-100 text-emerald-700'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          📊 실시간 대시보드
        </button>
        <button
          onClick={() => setTab('weekly')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            tab === 'weekly'
              ? 'bg-emerald-100 text-emerald-700'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          📅 주간 리포트
        </button>
      </div>

      <div className="flex-1 min-h-0">
        {tab === 'dashboard' ? (
          <AnalyticsDashboard />
        ) : (
          <div className="h-full grid grid-cols-1 md:grid-cols-[320px_1fr]">
            <div className="border-r border-gray-200 bg-gray-50 min-h-0 flex flex-col">
              <WeeklyReportList
                selectedWeekStart={selectedWeek}
                onSelect={setSelectedWeek}
              />
            </div>
            <div className="min-h-0">
              <WeeklyReportDetail weekStart={selectedWeek} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
