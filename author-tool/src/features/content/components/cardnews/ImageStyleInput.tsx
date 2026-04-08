import { useState } from 'react';

export const IMAGE_STYLE_PRESETS = [
  { value: 'Contemporary Korean educational illustration style with flat design aesthetics. Warm color palette dominated by terracotta, bronze, gold accents, and deep forest green. Clean vector-style lines with subtle textures. Approachable and friendly character designs. Professional composition optimized for social media card news format with good text contrast. Bright, engaging, and culturally appropriate for Korean historical content. no text.', label: '한국식 일러스트' },
  { value: 'flat illustration', label: '플랫 일러스트' },
  { value: 'photorealistic', label: '사실적' },
  { value: 'watercolor', label: '수채화' },
  { value: 'minimal line art', label: '미니멀 라인아트' },
  { value: 'cartoon anime', label: '만화/애니메' },
  { value: '3d render', label: '3D 렌더' },
  { value: 'oil painting', label: '유화' },
  { value: 'pencil sketch', label: '연필 스케치' },
  { value: 'pixel art', label: '픽셀 아트' },
];

export function ImageStyleInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [custom, setCustom] = useState(false);
  const isPreset = IMAGE_STYLE_PRESETS.some((p) => p.value === value);

  if (custom || !isPreset) {
    return (
      <div className="flex gap-0.5">
        <input className="px-2 py-1.5 border border-gray-200 rounded text-[10px] w-32"
          value={value} onChange={(e) => onChange(e.target.value)}
          placeholder="스타일 직접 입력" title="이미지 스타일 직접 입력" />
        <button className="text-[9px] text-gray-400 hover:text-gray-600 px-1" onClick={() => { setCustom(false); onChange(IMAGE_STYLE_PRESETS[0].value); }}
          title="프리셋으로 돌아가기">▼</button>
      </div>
    );
  }

  return (
    <div className="flex gap-0.5">
      <select className="px-2 py-1.5 border border-gray-200 rounded text-[10px]"
        value={value} onChange={(e) => onChange(e.target.value)} title="이미지 스타일 선택">
        {IMAGE_STYLE_PRESETS.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>
      <button className="text-[9px] text-gray-400 hover:text-gray-600 px-1" onClick={() => setCustom(true)}
        title="직접 입력">✏</button>
    </div>
  );
}
