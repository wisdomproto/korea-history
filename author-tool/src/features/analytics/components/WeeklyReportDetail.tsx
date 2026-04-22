import { useWeeklyReport } from '../hooks/useWeeklyReports';
import type { WeeklyReport, WeeklyHighlight } from '../types/weekly-report.types';
import { useMemo } from 'react';

interface Props {
  weekStart: string | null;
}

function toneClass(tone?: string) {
  if (tone === 'up') return 'text-emerald-600';
  if (tone === 'down') return 'text-red-500';
  return 'text-gray-500';
}

function HighlightCard({ h }: { h: WeeklyHighlight }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3">
      <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400">{h.label}</div>
      <div className="text-xl font-black text-gray-900 mt-1 font-serif">{h.value}</div>
      {h.delta && <div className={`text-xs mt-1 ${toneClass(h.tone)}`}>전주 대비 {h.delta}</div>}
    </div>
  );
}

function AiSummary({ text }: { text: string }) {
  // Render markdown-ish content: ## headers + paragraphs
  const blocks = useMemo(() => {
    const parts: Array<{ kind: 'h' | 'p'; text: string }> = [];
    const lines = text.split('\n');
    let buffer: string[] = [];
    const flush = () => {
      if (buffer.length) {
        parts.push({ kind: 'p', text: buffer.join('\n').trim() });
        buffer = [];
      }
    };
    for (const raw of lines) {
      const line = raw.trim();
      if (line.startsWith('## ')) {
        flush();
        parts.push({ kind: 'h', text: line.replace(/^##\s*/, '') });
      } else if (!line) {
        flush();
      } else {
        buffer.push(line);
      }
    }
    flush();
    return parts.filter((b) => b.text);
  }, [text]);

  return (
    <div className="space-y-4">
      {blocks.map((b, i) =>
        b.kind === 'h' ? (
          <h3 key={i} className="text-sm font-black text-gray-900 pt-2">
            {b.text}
          </h3>
        ) : (
          <p key={i} className="text-[13px] leading-[1.8] text-gray-700 whitespace-pre-wrap">
            {b.text}
          </p>
        )
      )}
    </div>
  );
}

function DailySparkline({ daily }: { daily: WeeklyReport['data']['daily'] }) {
  const max = Math.max(1, ...daily.map((d) => d.pageViews));
  return (
    <div className="flex items-end gap-1.5 h-20">
      {daily.map((d) => {
        const h = Math.max(4, (d.pageViews / max) * 80);
        const dow = new Date(d.date).getDay();
        const isWeekend = dow === 0 || dow === 6;
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
            <div
              style={{ height: `${h}px` }}
              className={`w-full rounded-t ${isWeekend ? 'bg-red-300' : 'bg-emerald-500'}`}
              title={`${d.date}: ${d.pageViews.toLocaleString()} PV`}
            />
            <div className="text-[9px] text-gray-400">{d.date.slice(5).replace('-', '/')}</div>
          </div>
        );
      })}
    </div>
  );
}

function PageGroupTable({ groups }: { groups: WeeklyReport['data']['pageGroups'] }) {
  const rows = Object.entries(groups)
    .filter(([, v]) => v.pv > 0)
    .sort((a, b) => b[1].pv - a[1].pv);
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-3 py-2 font-mono text-[10px] uppercase text-gray-400">그룹</th>
            <th className="text-right px-3 py-2 font-mono text-[10px] uppercase text-gray-400">PV</th>
            <th className="text-right px-3 py-2 font-mono text-[10px] uppercase text-gray-400">세션</th>
            <th className="text-right px-3 py-2 font-mono text-[10px] uppercase text-gray-400">PV당 체류</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, v]) => (
            <tr key={name} className="border-t border-gray-100">
              <td className="px-3 py-2 font-bold text-gray-800">{name}</td>
              <td className="px-3 py-2 text-right font-mono">{Math.round(v.pv).toLocaleString()}</td>
              <td className="px-3 py-2 text-right font-mono">{Math.round(v.sessions).toLocaleString()}</td>
              <td className="px-3 py-2 text-right font-mono">{v.engPerPV.toFixed(1)}s</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChannelBars({ channels }: { channels: WeeklyReport['data']['channels'] }) {
  const max = Math.max(1, ...channels.map((c) => c.sessions));
  return (
    <div className="space-y-2">
      {channels.slice(0, 6).map((c) => (
        <div key={c.channel} className="flex items-center gap-3 text-xs">
          <div className="w-32 text-gray-700 truncate">{c.channel}</div>
          <div className="flex-1 h-4 bg-gray-100 rounded-full relative overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-emerald-500"
              style={{ width: `${(c.sessions / max) * 100}%` }}
            />
          </div>
          <div className="w-20 text-right font-mono text-gray-600">
            {c.sessions.toLocaleString()}
            <span className="text-gray-400 ml-1">{c.percentage}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function VideoEventsCard({ events }: { events: WeeklyReport['data']['videoEvents'] }) {
  const byName: Record<string, number> = {};
  for (const e of events) byName[e.name] = e.count;
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-2">
        YouTube 영상 재생
      </div>
      {events.length === 0 ? (
        <div className="text-xs text-gray-500">
          이벤트 없음 <span className="text-gray-400">(수집 시작 직후이거나 재생 0회)</span>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-black font-serif">{byName.video_play ?? 0}</div>
            <div className="text-[10px] text-gray-500">play</div>
          </div>
          <div>
            <div className="text-lg font-black font-serif">{byName.video_complete ?? 0}</div>
            <div className="text-[10px] text-gray-500">complete</div>
          </div>
          <div>
            <div className="text-lg font-black font-serif">
              {(byName.video_play ?? 0) > 0
                ? Math.round(((byName.video_complete ?? 0) / byName.video_play) * 100)
                : 0}
              %
            </div>
            <div className="text-[10px] text-gray-500">완주율</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WeeklyReportDetail({ weekStart }: Props) {
  const { data: report, isLoading } = useWeeklyReport(weekStart);

  if (!weekStart) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-gray-500">
        왼쪽에서 주간 리포트를 선택해주세요.
      </div>
    );
  }

  if (isLoading || !report) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50 p-4 space-y-3">
        <div className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-60 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  const snap = report.data;
  const highlights = report.highlights ?? [];

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-600">
          Weekly Report
        </div>
        <div className="text-lg font-black font-serif text-gray-900">
          {snap.weekStart} ~ {snap.weekEnd}
        </div>
        <div className="text-[11px] text-gray-400 mt-0.5">
          생성: {new Date(report.created_at).toLocaleString('ko-KR')}
          {report.updated_at !== report.created_at && (
            <> · 갱신: {new Date(report.updated_at).toLocaleString('ko-KR')}</>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Highlights */}
        {highlights.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {highlights.map((h, i) => (
              <HighlightCard key={i} h={h} />
            ))}
          </div>
        )}

        {/* AI summary */}
        {report.ai_summary && (
          <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-xl p-5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 mb-2">
              AI 인사이트 · Gemini
            </div>
            <AiSummary text={report.ai_summary} />
          </div>
        )}

        {/* Daily trend */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-3">
            일별 PV (주말 빨강)
          </div>
          <DailySparkline daily={snap.daily} />
        </div>

        {/* Channels + Videos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-3">
              채널별 세션
            </div>
            <ChannelBars channels={snap.channels} />
          </div>
          <VideoEventsCard events={snap.videoEvents} />
        </div>

        {/* Page groups */}
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-2 px-1">
            페이지 그룹별 사용 패턴
          </div>
          <PageGroupTable groups={snap.pageGroups} />
        </div>

        {/* Landing pages */}
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-2 px-1">
            랜딩 TOP
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 font-mono text-[10px] uppercase text-gray-400">페이지</th>
                  <th className="text-right px-3 py-2 font-mono text-[10px] uppercase text-gray-400">세션</th>
                  <th className="text-right px-3 py-2 font-mono text-[10px] uppercase text-gray-400">이탈%</th>
                  <th className="text-right px-3 py-2 font-mono text-[10px] uppercase text-gray-400">참여%</th>
                </tr>
              </thead>
              <tbody>
                {snap.landingPages.map((l) => (
                  <tr key={l.path} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-gray-700 truncate max-w-[240px]">{l.path}</td>
                    <td className="px-3 py-2 text-right font-mono">{l.sessions.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-mono">{(l.bounceRate * 100).toFixed(1)}</td>
                    <td className="px-3 py-2 text-right font-mono text-emerald-600">
                      {(l.engagementRate * 100).toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Exam funnel */}
        {snap.examFunnel.length > 0 && (
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-2 px-1">
              인기 회차 완주 깔때기
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-end gap-1 h-32 overflow-x-auto">
                {snap.examFunnel.slice(0, 30).map((f) => {
                  const max = Math.max(1, snap.examFunnel[0]?.users ?? 1);
                  const h = Math.max(4, (f.users / max) * 100);
                  const qnum = f.page.split('/').pop();
                  return (
                    <div key={f.page} className="flex-1 min-w-[16px] flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-amber-400 rounded-t"
                        style={{ height: `${h}%` }}
                        title={`${qnum}번: ${f.users}명`}
                      />
                      <div className="text-[8px] text-gray-400">{qnum}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
