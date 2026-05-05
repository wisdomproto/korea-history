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
 * Hook (5s, 150 frames):
 *   "기출 풀고...요약노트 어딨지?"
 *   놓친 자료 시각화 — 흩어진 종이/물음표
 */
export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isVertical = height > width;

  // Eyebrow eyebrow text fade-in
  const eyebrowOpacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Main title spring up
  const titleSpring = spring({
    frame: frame - 0.4 * fps,
    fps,
    config: { damping: 14, stiffness: 110 },
  });
  const titleY = interpolate(titleSpring, [0, 1], [40, 0]);
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);

  // 흩어지는 종이 카드 (3개) — 점점 떨어짐
  const cards = [
    { rotate: -12, x: -180, y: -200, delay: 0.6 },
    { rotate: 8, x: 200, y: 60, delay: 0.8 },
    { rotate: -5, x: -80, y: 220, delay: 1.0 },
  ];

  // 끝부분 question mark scale up
  const questionMarkSpring = spring({
    frame: frame - 3 * fps,
    fps,
    config: { damping: 8, stiffness: 100 },
  });
  const questionScale = interpolate(questionMarkSpring, [0, 1], [0, 1.1]);

  return (
    <AbsoluteFill
      style={{
        background: COLORS.cream,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: isVertical ? 80 : 120,
      }}
    >
      {/* 흩어지는 종이 카드 — 시각 noise */}
      {cards.map((c, i) => {
        const cardSpring = spring({
          frame: frame - c.delay * fps,
          fps,
          config: { damping: 12, stiffness: 80 },
        });
        const opacity = interpolate(cardSpring, [0, 1], [0, 0.5]);
        const offsetY = interpolate(cardSpring, [0, 1], [-100, 0]);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              width: isVertical ? 180 : 220,
              height: isVertical ? 240 : 280,
              background: COLORS.paper,
              borderRadius: 16,
              border: `1px solid ${COLORS.hairline}`,
              boxShadow: "0 12px 40px rgba(31, 26, 20, 0.1)",
              transform: `translate(${c.x}px, ${c.y + offsetY}px) rotate(${c.rotate}deg)`,
              opacity,
            }}
          />
        );
      })}

      {/* Eyebrow */}
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: isVertical ? 32 : 28,
          color: COLORS.amber,
          fontWeight: 800,
          letterSpacing: "0.18em",
          marginBottom: 28,
          opacity: eyebrowOpacity,
          textAlign: "center",
        }}
      >
        ● 공시생 누구나 겪는
      </div>

      {/* Main title */}
      <div
        style={{
          fontFamily: NOTO_SERIF_KR,
          fontSize: isVertical ? 130 : 120,
          fontWeight: 700,
          color: COLORS.ink,
          letterSpacing: "-0.04em",
          lineHeight: 1.1,
          textAlign: "center",
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          maxWidth: isVertical ? 900 : 1500,
          position: "relative",
          zIndex: 10,
        }}
      >
        기출 풀고…
        <br />
        <span style={{ color: COLORS.amber, position: "relative" }}>
          요약노트 어딨지
          <span
            style={{
              display: "inline-block",
              transform: `scale(${questionScale})`,
              transformOrigin: "left center",
            }}
          >
            ?
          </span>
        </span>
      </div>
    </AbsoluteFill>
  );
};
