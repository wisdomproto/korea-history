import type { ContentFile } from '@/lib/content-types';

interface Props {
  contentFile: ContentFile;
}

export function WordPressPanel({ contentFile }: Props) {
  void contentFile;
  return (
    <div className="flex flex-1 items-center justify-center bg-gray-50 p-8">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-4">🌐</div>
        <h2 className="text-xl font-bold mb-1">WordPress</h2>
        <p className="text-sm text-gray-500 mb-5">워드프레스용 블로그 포스트 생성</p>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-left text-xs text-gray-700">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
            예정된 기능
          </div>
          <ul className="space-y-1.5">
            <li className="flex gap-2"><span className="text-emerald-500">•</span> Gutenberg 블록 HTML 자동 변환</li>
            <li className="flex gap-2"><span className="text-emerald-500">•</span> 글로벌 SEO 최적화 (Yoast/RankMath)</li>
            <li className="flex gap-2"><span className="text-emerald-500">•</span> 자동 대표 이미지 생성 + WebP</li>
            <li className="flex gap-2"><span className="text-emerald-500">•</span> 예약 발행 + WP REST API 연동</li>
            <li className="flex gap-2"><span className="text-emerald-500">•</span> 카테고리/태그 자동 매핑</li>
          </ul>
        </div>
        <div className="mt-4 inline-block bg-amber-50 border border-amber-200 rounded-full px-3 py-1 text-[10px] font-semibold text-amber-700">
          🚧 개발 중
        </div>
      </div>
    </div>
  );
}
