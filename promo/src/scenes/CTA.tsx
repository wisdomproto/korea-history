import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONT_MONO } from "../theme";
import { NOTO_SERIF_KR } from "../fonts";

/**
 * CTA (8s, 240 frames):
 *   0~3s: 3 differentiator chips (기출↔노트 / 신규 자동 보강 / 평생 무료)
 *   3~6s: 큰 도메인 + 로고 등장
 *   6~8s: 부드러운 fade out
 */
export const CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isVertical = height > width;

  const chips = [
    { icon: "🔗", label: "기출 ↔ 요약노트 자동 매칭" },
    { icon: "🔄", label: "신규 회차 출제 시 자동 보강" },
    { icon: "💝", label: "평생 무료 · 회원가입 없음" },
  ];

  // chips fly-in
  const chipsContainerOpacity = interpolate(
    frame,
    [0, 0.4 * fps],
    [0, 1],
    { extrapolateRight: "clamp" },
  );

  // big domain
  const domainSpring = spring({
    frame: frame - 3 * fps,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const domainOpacity = interpolate(domainSpring, [0, 1], [0, 1]);
  const domainScale = interpolate(domainSpring, [0, 1], [0.85, 1]);

  // overall fade-out at very end
  const finalOpacity = interpolate(
    frame,
    [7 * fps, 8 * fps],
    [1, 0.85],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        background: COLORS.ink,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: isVertical ? 80 : 120,
        opacity: finalOpacity,
      }}
    >
      {/* 차별화 chips (5초 정도 보임) */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: isVertical ? 22 : 18,
          opacity: chipsContainerOpacity,
          marginBottom: isVertical ? 80 : 60,
        }}
      >
        {chips.map((c, i) => {
          const cs = spring({
            frame: frame - (0.3 + i * 0.3) * fps,
            fps,
            config: { damping: 14, stiffness: 110 },
          });
          const tx = interpolate(cs, [0, 1], [-200, 0]);
          const op = interpolate(cs, [0, 1], [0, 1]);
          // chips fade out near domain entrance
          const fadeOut = interpolate(frame, [3.2 * fps, 3.6 * fps], [1, 0.4], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                background: "rgba(245, 239, 228, 0.08)",
                border: `1px solid rgba(245, 239, 228, 0.15)`,
                borderRadius: 999,
                padding: isVertical ? "20px 40px" : "18px 36px",
                fontFamily: NOTO_SERIF_KR,
                fontSize: isVertical ? 38 : 32,
                fontWeight: 700,
                color: COLORS.cream,
                transform: `translateX(${tx}px)`,
                opacity: op * fadeOut,
                minWidth: isVertical ? 740 : 700,
              }}
            >
              <span style={{ fontSize: isVertical ? 44 : 38 }}>{c.icon}</span>
              <span>{c.label}</span>
            </div>
          );
        })}
      </div>

      {/* 큰 도메인 + 로고 */}
      <div
        style={{
          opacity: domainOpacity,
          transform: `scale(${domainScale})`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: isVertical ? 28 : 24,
            color: COLORS.amberLight,
            fontWeight: 800,
            letterSpacing: "0.2em",
            marginBottom: 16,
          }}
        >
          ● 지금 무료로 시작
        </div>
        <div
          style={{
            fontFamily: NOTO_SERIF_KR,
            fontSize: isVertical ? 160 : 140,
            fontWeight: 700,
            color: COLORS.cream,
            letterSpacing: "-0.05em",
            lineHeight: 1,
            marginBottom: 24,
          }}
        >
          기출노트
        </div>
        <div
          style={{
            display: "inline-block",
            background: COLORS.amber,
            padding: isVertical ? "20px 50px" : "18px 44px",
            borderRadius: 999,
            fontFamily: FONT_MONO,
            fontSize: isVertical ? 42 : 36,
            fontWeight: 800,
            color: COLORS.cream,
            letterSpacing: "-0.01em",
          }}
        >
          gcnote.co.kr
        </div>
      </div>
    </AbsoluteFill>
  );
};
