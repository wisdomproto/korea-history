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
 * Differentiator (5s):
 *   3 strong claims with ✓
 *   ✓ 쓸데없는 내용 0
 *   ✓ 모든 문제 내용 100% 포함
 *   ✓ 신규 시험 자동 보강
 */
export const ProcessDifferentiator: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isVertical = height > width;

  const titleOpacity = interpolate(frame, [0, 0.4 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  const claims = [
    {
      icon: "🚫",
      text: "쓸데없는 내용 0",
      sub: "기출 안 나온 건 안 만듦",
    },
    {
      icon: "✓",
      text: "출제 내용 100% 포함",
      sub: "1,900+ 문항 전부 커버",
    },
    {
      icon: "🔄",
      text: "신규 시험 자동 보강",
      sub: "새 회차 풀리면 즉시 업데이트",
    },
  ];

  return (
    <AbsoluteFill
      style={{
        background: COLORS.cream,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: isVertical ? "100px 60px" : "80px 120px",
        gap: isVertical ? 28 : 24,
      }}
    >
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: isVertical ? 26 : 22,
          color: COLORS.amber,
          fontWeight: 800,
          letterSpacing: "0.18em",
          opacity: titleOpacity,
          marginBottom: 8,
        }}
      >
        ● 그래서 이렇게 됩니다
      </div>

      {claims.map((c, i) => {
        const cs = spring({
          frame: frame - (0.3 + i * 0.4) * fps,
          fps,
          config: { damping: 14, stiffness: 110 },
        });
        const tx = interpolate(cs, [0, 1], [-200, 0]);
        const op = interpolate(cs, [0, 1], [0, 1]);

        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              background: COLORS.paper,
              border: `2px solid ${COLORS.amber}`,
              borderRadius: 24,
              padding: isVertical ? "24px 36px" : "20px 32px",
              transform: `translateX(${tx}px)`,
              opacity: op,
              boxShadow: "0 8px 24px rgba(180, 83, 9, 0.15)",
              minWidth: isVertical ? 800 : 900,
            }}
          >
            <div
              style={{
                width: isVertical ? 80 : 72,
                height: isVertical ? 80 : 72,
                borderRadius: "50%",
                background: COLORS.amber,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: COLORS.paper,
                fontSize: isVertical ? 44 : 38,
                flexShrink: 0,
                fontWeight: 700,
              }}
            >
              {c.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: NOTO_SERIF_KR,
                  fontSize: isVertical ? 44 : 38,
                  fontWeight: 700,
                  color: COLORS.ink,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                }}
              >
                {c.text}
              </div>
              <div
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: isVertical ? 18 : 16,
                  color: COLORS.subtle,
                  fontWeight: 700,
                  marginTop: 6,
                  letterSpacing: "-0.01em",
                }}
              >
                {c.sub}
              </div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
