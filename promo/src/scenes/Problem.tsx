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
 * Problem (5s, 150 frames):
 *   3 stacked pill chips fly in — pain points
 *   "기본서 1,200쪽" / "인강 월 30만원" / "기출 PDF 따로"
 *   끝부분 ❌ 큰 마크
 */
export const Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isVertical = height > width;

  const pains = [
    { icon: "📚", label: "기본서", value: "1,200쪽" },
    { icon: "💸", label: "인강", value: "월 30만원" },
    { icon: "📄", label: "기출 PDF", value: "따로따로" },
  ];

  // 큰 X 표시 — 끝부분 등장
  const xSpring = spring({
    frame: frame - 4 * fps,
    fps,
    config: { damping: 10, stiffness: 90 },
  });
  const xScale = interpolate(xSpring, [0, 1], [0, 1]);
  const xOpacity = interpolate(xSpring, [0, 1], [0, 0.95]);

  return (
    <AbsoluteFill
      style={{
        background: COLORS.cream,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: isVertical ? 80 : 120,
        gap: isVertical ? 32 : 28,
      }}
    >
      {/* Eyebrow */}
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: isVertical ? 28 : 24,
          color: COLORS.subtle,
          fontWeight: 800,
          letterSpacing: "0.18em",
          marginBottom: 12,
          textAlign: "center",
        }}
      >
        준비하려니 너무 많고…
      </div>

      {/* Pain pills (stacked vertically) */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: isVertical ? 24 : 20,
          alignItems: "center",
        }}
      >
        {pains.map((p, i) => {
          const pSpring = spring({
            frame: frame - (0.4 + i * 0.35) * fps,
            fps,
            config: { damping: 12, stiffness: 100 },
          });
          const tx = interpolate(pSpring, [0, 1], [-300, 0]);
          const opacity = interpolate(pSpring, [0, 1], [0, 1]);
          return (
            <div
              key={i}
              style={{
                background: COLORS.paper,
                border: `1px solid ${COLORS.hairline}`,
                borderRadius: 999,
                padding: isVertical ? "28px 56px" : "24px 48px",
                display: "flex",
                alignItems: "center",
                gap: 24,
                fontFamily: NOTO_SERIF_KR,
                fontSize: isVertical ? 60 : 52,
                fontWeight: 800,
                color: COLORS.ink,
                boxShadow: "0 8px 24px rgba(31, 26, 20, 0.08)",
                transform: `translateX(${tx}px)`,
                opacity,
                minWidth: isVertical ? 720 : 680,
              }}
            >
              <span style={{ fontSize: isVertical ? 64 : 56 }}>{p.icon}</span>
              <span style={{ color: COLORS.inkSoft }}>{p.label}</span>
              <span
                style={{
                  marginLeft: "auto",
                  color: COLORS.amber,
                  fontWeight: 700,
                }}
              >
                {p.value}
              </span>
            </div>
          );
        })}
      </div>

      {/* Big X */}
      <div
        style={{
          marginTop: isVertical ? 40 : 28,
          fontSize: isVertical ? 200 : 180,
          opacity: xOpacity,
          transform: `scale(${xScale})`,
          color: COLORS.red,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        ✗
      </div>
    </AbsoluteFill>
  );
};
