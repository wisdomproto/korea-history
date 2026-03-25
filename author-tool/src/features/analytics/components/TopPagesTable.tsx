import type { PageData } from '../types/analytics.types';

export default function TopPagesTable({ data }: { data: PageData[] }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <h3 className="text-sm font-extrabold mb-3">📄 인기 페이지</h3>
      <div className="space-y-1.5">
        {data.map((page, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="flex-1 text-gray-500 truncate">{page.path}</span>
            <span className="font-bold">{page.pageViews.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
