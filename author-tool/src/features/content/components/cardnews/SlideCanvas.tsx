import { useState, useRef, useEffect } from 'react';
import type { InstagramSlide } from '../../../../lib/content-types';

// fontSize is stored relative to BASE_W. All rendering scales by containerWidth / BASE_W.
export const BASE_W = 1080;

export function SlideCanvas({ slide, className, commonTitleSize }: { slide: InstagramSlide; className?: string; commonTitleSize?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const canvas = slide.canvas;
  const imgUrl = canvas?.imageUrl || slide.imageUrl;

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / BASE_W));
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // 페이퍼 톤일 때 한지 텍스처 + 액센트 (검정 배경엔 적용 안 함)
  const isPaper = (canvas?.bgColor || '#F2EDE3').toLowerCase() !== '#18181b' && (canvas?.bgColor || '#F2EDE3').toLowerCase() !== '#15110d';
  // cover 슬라이드는 4:3 박스 layout이라 배경 흐림 X
  const designType = (slide as any)._designType;
  const useBlurredBg = !!imgUrl && designType !== 'cover';
  return (
    <div ref={containerRef} className={`aspect-[4/5] relative overflow-hidden ${className || ''}`} style={{
      backgroundColor: canvas?.bgColor || '#F2EDE3',
      // 한지 노이즈 텍스처 (SVG inline) — 흐림 배경 안 쓸 때만
      backgroundImage: isPaper && !useBlurredBg
        ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0.65 0 0 0 0 0.55 0 0 0 0 0.42 0 0 0 0.08 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
        : undefined,
    }}>
      {/* 배경 이미지 (cover 외 슬라이드에 imgUrl 있으면 흐리게 깔기) */}
      {useBlurredBg && (
        <>
          <img src={imgUrl} className="absolute inset-0 w-full h-full" style={{
            objectFit: 'cover',
            filter: 'blur(20px) saturate(0.85)',
            opacity: 0.22,
            transform: 'scale(1.1)',
          }} />
          <div className="absolute inset-0" style={{
            background: isPaper
              ? 'linear-gradient(180deg, rgba(242,237,227,0.78) 0%, rgba(242,237,227,0.9) 100%)'
              : 'linear-gradient(180deg, rgba(21,17,13,0.78) 0%, rgba(21,17,13,0.9) 100%)',
          }} />
        </>
      )}
      {/* 상단 앰버 액센트 바 (페이퍼 톤만) */}
      {isPaper && (
        <div className="absolute top-0 left-0" style={{
          height: `${4 * scale}px`, width: `${80 * scale}px`,
          background: '#C77B3D',
          marginLeft: `${48 * scale}px`, marginTop: `${48 * scale}px`,
        }} />
      )}
      {/* 좌측 얇은 hairline */}
      {isPaper && !imgUrl && (
        <div className="absolute" style={{
          left: `${48 * scale}px`, top: `${64 * scale}px`, bottom: `${64 * scale}px`,
          width: '1px', background: '#E2D8C6',
        }} />
      )}
      {canvas?.textBlocks ? (
        canvas.textBlocks.filter((b) => !b.hidden).map((block) => {
          // 디자인 가이드 A — block.id 기반 fontFamily 자동 매핑
          const fontFamily =
            block.id === 'title' || block.id === 'headline' || block.id === 'cover'
              ? '"Noto Serif KR", "Nanum Myeongjo", serif'
              : block.id === 'brand' || block.id === 'meta' || block.id === 'index'
                ? '"JetBrains Mono", monospace'
                : 'Pretendard, system-ui, sans-serif';
          const letterSpacing =
            block.id === 'brand' || block.id === 'meta' || block.id === 'index'
              ? '0.2em'
              : block.id === 'title' || block.id === 'headline'
                ? '-0.03em'
                : 'normal';
          // 이미지 있어도 페이퍼 오버레이로 가려져 있어 검정만으로 충분
          const textShadow = block.shadow ? `0 ${2 * scale}px ${8 * scale}px rgba(0,0,0,0.7)` : 'none';
          const color = imgUrl ? '#1A1612' : block.color;
          return (
            <div key={block.id} className="absolute overflow-hidden" style={{
              left: `${block.x}%`, top: `${block.y}%`, width: `${block.width}%`,
              fontSize: `${block.fontSize * scale}px`, color,
              fontWeight: block.fontWeight, textAlign: block.textAlign,
              lineHeight: block.id === 'title' || block.id === 'headline' ? 1.1 : 1.55,
              textShadow,
              whiteSpace: 'pre-wrap',
              fontFamily,
              letterSpacing,
            }}>
              {block.text || `(${block.id})`}
            </div>
          );
        })
      ) : slide.title || slide.body ? (
        // ─── Fallback: title/body 있으면 디자인 가이드 A 톤으로 렌더 ───
        <div className="absolute inset-0 flex flex-col" style={{
          padding: `${72 * scale}px ${64 * scale}px`,
          paddingLeft: `${88 * scale}px`,
          color: '#1A1612',
        }}>
          {/* 슬라이드 타입 라벨 (상단 우측, mono) */}
          <div style={{
            position: 'absolute', top: `${56 * scale}px`, right: `${64 * scale}px`,
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: `${24 * scale}px`,
            color: '#7A6B5A',
            letterSpacing: '0.25em',
            fontWeight: 700,
          }}>
            {(slide as any)._designType?.toUpperCase() || slide.type?.toUpperCase()}
          </div>

          {slide.title && (() => {
            const fit = fitTitle(slide.title, commonTitleSize);
            return (
              <div style={{
                fontFamily: '"Noto Serif KR", "Nanum Myeongjo", serif',
                fontSize: `${fit.size * scale}px`,
                fontWeight: 900,
                lineHeight: 1.12,
                letterSpacing: '-0.03em',
                color: '#1A1612',
                marginTop: `${48 * scale}px`,
                marginBottom: `${20 * scale}px`,
              }}>
                {fit.lines.map((l, i) => <div key={i}>{l}</div>)}
              </div>
            );
          })()}
          {/* 앰버 accent bar (짧음) + 검정 hairline (전체 폭) — 제목/본문 명확한 분리 */}
          {slide.title && slide.body && (
            <>
              <div style={{
                height: `${4 * scale}px`,
                width: `${80 * scale}px`,
                background: '#C77B3D',
                marginBottom: `${20 * scale}px`,
              }} />
              <div style={{
                height: `${2 * scale}px`,
                width: '100%',
                background: '#1A1612',
                marginBottom: `${36 * scale}px`,
              }} />
            </>
          )}
          {slide.body && renderStructuredBody(slide, scale)}
          {/* 하단 20% breathing room — body와 footer 분리 */}
          <div style={{ height: `${200 * scale}px`, flexShrink: 0 }} />
          {/* footer brand */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: `${24 * scale}px`,
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: `${14 * scale}px` }}>
              <span style={{ width: `${12 * scale}px`, height: `${12 * scale}px`, borderRadius: '50%', background: '#C77B3D', display: 'inline-block' }} />
              <span style={{ fontFamily: '"Noto Serif KR", serif', fontWeight: 800, fontSize: `${32 * scale}px`, color: '#1A1612', letterSpacing: '-0.02em' }}>
                기출노트 한능검
              </span>
            </span>
            <span style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: `${30 * scale}px`,
              color: '#1A1612',
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}>gcnote.co.kr</span>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white p-2 text-center">
          <div style={{ fontSize: `${14 * scale}px` }}>{slide.textOverlay}</div>
        </div>
      )}
    </div>
  );
}

// ─── 디자인 가이드 A — _designType별 body 시각화 ───
const T = {
  ink: '#1A1612', ink2: '#3A3128', subtle: '#7A6B5A',
  hairline: '#E2D8C6', accent: '#C77B3D', paper: '#FAF6EC',
};
const FF_SERIF = '"Noto Serif KR", "Nanum Myeongjo", serif';
const FF_SANS = 'Pretendard, system-ui, sans-serif';
const FF_MONO = '"JetBrains Mono", monospace';

// ─── 제목 1~2줄 자동 배치 (BASE_W 기준 컨텐츠 폭 ≈ 928px) ───
// fixedSize 주어지면 그 사이즈로 줄바꿈만 결정 (세트 전체 통일용)
// 안 주어지면 길이에 맞춰 자동 사이즈 + 줄바꿈
function fitTitle(raw: string, fixedSize?: number): { size: number; lines: string[] } {
  const text = raw.trim();
  if (fixedSize) {
    return { size: fixedSize, lines: splitTitleLines(text, fixedSize) };
  }
  const len = [...text].length;
  if (len <= 8)  return { size: 108, lines: [text] };
  if (len <= 10) return { size: 96, lines: [text] };
  if (len <= 12) return { size: 84, lines: [text] };
  const split = splitAtMiddleBreak(text);
  if (split) {
    const longest = Math.max([...split[0]].length, [...split[1]].length);
    if (longest <= 8)  return { size: 100, lines: split };
    if (longest <= 10) return { size: 88, lines: split };
    if (longest <= 12) return { size: 74, lines: split };
    return { size: 64, lines: split };
  }
  if (len <= 16) return { size: 64, lines: [text] };
  if (len <= 20) return { size: 54, lines: [text] };
  return { size: 46, lines: [text] };
}

function splitAtMiddleBreak(text: string): [string, string] | null {
  const chars = [...text];
  const mid = Math.floor(chars.length / 2);
  const breaks = [' ', ',', '.', '·', '/'];
  let bestSplit = -1, bestDist = Infinity;
  for (let i = 1; i < chars.length - 1; i++) {
    if (breaks.includes(chars[i])) {
      const d = Math.abs(i - mid);
      if (d < bestDist) { bestDist = d; bestSplit = i; }
    }
  }
  if (bestSplit < 0) return null;
  return [chars.slice(0, bestSplit).join('').trim(), chars.slice(bestSplit + 1).join('').trim()];
}

function splitTitleLines(text: string, size: number): string[] {
  const len = [...text].length;
  // 한 글자당 폭 ≈ size × 0.92 (한국어 + letterSpacing -0.03em)
  const charsPerLine = Math.floor(928 / (size * 0.92));
  if (len <= charsPerLine) return [text];
  const split = splitAtMiddleBreak(text);
  return split || [text];
}

// 6장 슬라이드 제목 중 가장 긴 것 기준으로 통일 사이즈 계산
export function computeCommonTitleSize(titles: string[]): number {
  const valid = titles.filter((t) => t && t.trim().length > 0);
  if (valid.length === 0) return 72;
  const maxLen = Math.max(...valid.map((t) => [...t.trim()].length));
  // dummy 제목으로 fitTitle 돌려 사이즈 추출
  const dummy = '가'.repeat(maxLen);
  return fitTitle(dummy).size;
}

function renderStructuredBody(slide: InstagramSlide, scale: number) {
  const designType = (slide as any)._designType;
  const lines = (slide.body || '').split('\n').map((l) => l.trim()).filter(Boolean);

  // ─── KEYWORDS — 4행 테이블 (좌측 KW NN 앵커 + 우측 단어/설명) ───
  if (designType === 'keywords') {
    const items = lines.map((l) => {
      const m = l.match(/^[•·]?\s*(.+?)\s*[—–-]\s*(.+)$/);
      return m ? { word: m[1], sub: m[2] } : { word: l.replace(/^[•·]?\s*/, ''), sub: '' };
    });
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {items.slice(0, 4).map((it, i) => (
          <div key={i} style={{
            flex: 1,
            display: 'flex', gap: `${24 * scale}px`,
            padding: `${16 * scale}px 0`,
            borderTop: i === 0 ? 'none' : `1px solid ${T.hairline}`,
            alignItems: 'center',
          }}>
            <div style={{ width: `${150 * scale}px`, flexShrink: 0 }}>
              <div style={{
                fontFamily: FF_MONO, fontSize: `${28 * scale}px`,
                color: T.accent, letterSpacing: '0.2em', fontWeight: 700,
              }}>KW {String(i + 1).padStart(2, '0')}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: FF_SERIF, fontSize: `${42 * scale}px`,
                fontWeight: 800, color: T.ink, lineHeight: 1.15, letterSpacing: '-0.02em',
                wordBreak: 'keep-all',
              }}>{it.word}</div>
              <div style={{
                fontFamily: FF_SANS, fontSize: `${30 * scale}px`,
                color: T.subtle, marginTop: `${12 * scale}px`, lineHeight: 1.4,
                fontWeight: 500,
              }}>{it.sub}</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ─── FACTS — 타임라인 (좌측 연도 + 우측 텍스트) ───
  if (designType === 'facts') {
    const items = lines.map((l) => {
      const m = l.match(/^(\S+)\s*\((.+?)\)\s*[—–-]\s*(.+)$/) || l.match(/^(\S+)\s*[—–-]\s*(.+)$/);
      if (!m) return { year: '', month: '', text: l };
      return m.length === 4
        ? { year: m[1], month: m[2], text: m[3] }
        : { year: m[1], month: '', text: m[2] };
    });
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {items.map((it, i) => (
          <div key={i} style={{
            flex: 1,
            display: 'flex', gap: `${24 * scale}px`,
            padding: `${16 * scale}px 0`,
            borderTop: i === 0 ? 'none' : `1px solid ${T.hairline}`,
            alignItems: 'center',
          }}>
            <div style={{ width: `${160 * scale}px`, flexShrink: 0 }}>
              <div style={{
                fontFamily: FF_SERIF, fontSize: `${48 * scale}px`,
                fontWeight: 800, color: T.ink, lineHeight: 1,
              }}>{it.year}</div>
              {it.month && (
                <div style={{
                  fontFamily: FF_MONO, fontSize: `${24 * scale}px`,
                  color: T.subtle, marginTop: `${10 * scale}px`,
                  letterSpacing: '0.05em', fontWeight: 600,
                }}>{it.month}</div>
              )}
            </div>
            <div style={{
              flex: 1, fontFamily: FF_SANS, fontSize: `${38 * scale}px`,
              color: T.ink2, lineHeight: 1.35, fontWeight: 500,
              letterSpacing: '-0.005em',
            }}>{it.text}</div>
          </div>
        ))}
      </div>
    );
  }

  // ─── PEOPLE — 3행 테이블 (좌측 P NN 앵커 + 우측 이름/역할/설명) ───
  if (designType === 'people') {
    const items = lines.map((l) => {
      const m = l.match(/^[•·]?\s*(.+?)\s*\((.+?)\)\s*[—–-]\s*(.+)$/);
      return m ? { name: m[1], role: m[2], desc: m[3] } : { name: l.replace(/^[•·]?\s*/, ''), role: '', desc: '' };
    });
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {items.map((it, i) => (
          <div key={i} style={{
            flex: 1,
            display: 'flex', gap: `${24 * scale}px`,
            padding: `${16 * scale}px 0`,
            borderTop: i === 0 ? 'none' : `1px solid ${T.hairline}`,
            alignItems: 'center',
          }}>
            <div style={{ width: `${150 * scale}px`, flexShrink: 0 }}>
              <div style={{
                fontFamily: FF_MONO, fontSize: `${28 * scale}px`,
                color: T.accent, letterSpacing: '0.2em', fontWeight: 700,
              }}>P {String(i + 1).padStart(2, '0')}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: `${16 * scale}px` }}>
                <span style={{
                  fontFamily: FF_SERIF, fontSize: `${42 * scale}px`,
                  fontWeight: 800, color: T.ink, letterSpacing: '-0.02em',
                  whiteSpace: 'nowrap',
                }}>{it.name}</span>
                {it.role && (
                  <span style={{
                    fontFamily: FF_MONO, fontSize: `${26 * scale}px`,
                    color: T.subtle, letterSpacing: '0.15em', fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}>{it.role}</span>
                )}
              </div>
              <div style={{
                fontFamily: FF_SANS, fontSize: `${30 * scale}px`,
                color: T.subtle, marginTop: `${12 * scale}px`, lineHeight: 1.4,
                fontWeight: 500,
              }}>{it.desc}</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ─── IMPACT — 4행 테이블 (좌측 I NN 앵커 + 우측 제목/설명) ───
  if (designType === 'impact') {
    const items = lines.map((l) => {
      const m = l.match(/^(.+?)\s*[—–-]\s*(.+)$/);
      return m ? { title: m[1], desc: m[2] } : { title: l, desc: '' };
    });
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {items.map((it, i) => (
          <div key={i} style={{
            flex: 1,
            display: 'flex', gap: `${24 * scale}px`,
            padding: `${16 * scale}px 0`,
            borderTop: i === 0 ? 'none' : `1px solid ${T.hairline}`,
            alignItems: 'center',
          }}>
            <div style={{ width: `${150 * scale}px`, flexShrink: 0 }}>
              <div style={{
                fontFamily: FF_MONO, fontSize: `${28 * scale}px`,
                color: T.accent, letterSpacing: '0.2em', fontWeight: 700,
              }}>I {String(i + 1).padStart(2, '0')}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: FF_SERIF, fontSize: `${42 * scale}px`,
                fontWeight: 800, color: T.ink, lineHeight: 1.2, letterSpacing: '-0.02em',
              }}>{it.title}</div>
              <div style={{
                fontFamily: FF_SANS, fontSize: `${30 * scale}px`,
                color: T.subtle, marginTop: `${12 * scale}px`, lineHeight: 1.4,
                fontWeight: 500,
              }}>{it.desc}</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ─── COVER — 메타 + 4:3 이미지 박스 + 큰 부제 ───
  if (designType === 'cover') {
    // body 형식: "{era_chip}\n\n{subtitle}"
    const parts = (slide.body || '').split('\n\n');
    const eraChip = parts[0] || '';
    const subtitle = parts.slice(1).join('\n') || '';
    const coverImg = slide.canvas?.imageUrl || slide.imageUrl;
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {eraChip && (
          <div style={{
            fontFamily: FF_MONO, fontSize: `${26 * scale}px`,
            color: T.accent, letterSpacing: '0.3em', fontWeight: 700,
          }}>{eraChip}</div>
        )}
        {/* 4:3 이미지 박스 — 풀블리드 (좌우 패딩 캔슬, 슬라이드 전체 폭) */}
        {coverImg && (
          <div style={{
            width: `${BASE_W * scale}px`,
            marginLeft: `${-88 * scale}px`,
            marginRight: `${-64 * scale}px`,
            marginTop: `${28 * scale}px`,
            aspectRatio: '4 / 3',
            overflow: 'hidden',
            background: T.paper,
            flexShrink: 0,
          }}>
            <img src={coverImg} style={{
              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
            }} />
          </div>
        )}
        {/* accent bar */}
        <div style={{
          height: `${4 * scale}px`, width: `${80 * scale}px`,
          background: T.accent, marginTop: `${28 * scale}px`,
        }} />
        {subtitle && (
          <div style={{
            fontFamily: FF_SERIF, fontSize: `${38 * scale}px`,
            fontWeight: 700, color: T.ink2, lineHeight: 1.35,
            letterSpacing: '-0.02em',
            whiteSpace: 'pre-wrap',
            marginTop: `${24 * scale}px`,
          }}>{subtitle}</div>
        )}
      </div>
    );
  }

  // ─── OUTRO — TIP 본문 + 공통 안내 + CTA 박스 ───
  if (designType === 'outro') {
    // body 형식: "{tip_body}\n\n{공통 안내}\n\n{CTA}"
    const parts = (slide.body || '').split('\n\n');
    const tipBody = parts[0] || '';
    const description = parts.length >= 3 ? parts[1] : '';
    const cta = parts.length >= 3 ? parts[2] : parts[1] || '';
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* TIP body — 노트별 시험 포인트 */}
        {tipBody && (
          <div style={{
            fontFamily: FF_SANS, fontSize: `${30 * scale}px`,
            fontWeight: 500, color: T.ink2, lineHeight: 1.55,
            letterSpacing: '-0.005em',
          }}>{tipBody}</div>
        )}
        {/* 공통 안내 — 사이트 전체 가치 제안 */}
        {description && (
          <div style={{
            fontFamily: FF_SERIF, fontSize: `${36 * scale}px`,
            fontWeight: 700, color: T.ink, lineHeight: 1.4,
            letterSpacing: '-0.02em',
            marginTop: `${56 * scale}px`,
            whiteSpace: 'pre-wrap',
          }}>{description}</div>
        )}
        {/* CTA 박스 — 사이트 URL */}
        {cta && (
          <div style={{
            background: T.paper, border: `2px solid ${T.accent}`,
            padding: `${28 * scale}px ${32 * scale}px`,
            marginTop: `${32 * scale}px`,
          }}>
            <div style={{
              fontFamily: FF_MONO, fontSize: `${24 * scale}px`,
              color: T.accent, letterSpacing: '0.25em', fontWeight: 700,
              marginBottom: `${16 * scale}px`,
            }}>NEXT STEP</div>
            <div style={{
              fontFamily: FF_SERIF, fontSize: `${36 * scale}px`,
              fontWeight: 800, color: T.ink, lineHeight: 1.3,
              whiteSpace: 'pre-wrap',
            }}>{cta}</div>
          </div>
        )}
      </div>
    );
  }

  // ─── default — 일반 텍스트 ───
  return (
    <div style={{
      fontFamily: FF_SANS,
      fontSize: `${36 * scale}px`,
      fontWeight: 500,
      lineHeight: 1.5,
      color: T.ink2,
      letterSpacing: '-0.01em',
      whiteSpace: 'pre-wrap',
      flex: 1,
      overflow: 'hidden',
    }}>{slide.body}</div>
  );
}
