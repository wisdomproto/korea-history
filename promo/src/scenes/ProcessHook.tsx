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
 * Hook (4s):
 *   "1,900+ 문제 → 요약노트, 어떻게 만들까?"
 *   카드 stack visual
 */
export const ProcessHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isVertical = height > width;

  const eyebrowOpacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  const titleSpring = spring({
    frame: frame - 0.4 * fps,
    fps,
    config: { damping: 14, stiffness: 110 },
  });
  const titleY = interpolate(titleSpring, [0, 1], [40, 0]);
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);

  // Question mark scale up
  const qSpring = spring({
    frame: frame - 2.5 * fps,
    fps,
    config: { damping: 8, stiffness: 100 },
  });
  const qScale = interpolate(qSpring, [0, 1], [0, 1.1]);

  // 카드 stack 등장
  const cards = [
    { rotate: -10, x: -200, y: -180, delay: 0.5 },
    { rotate: 6, x: 220, y: -100, delay: 0.7 },
    { rotate: -5, x: -120, y: 220, delay: 0.9 },
    { rotate: 12, x: 180, y: 240, delay: 1.1 },
  ];

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
      {/* 흩어진 문제 카드 stack */}
      {cards.map((c, i) => {
        const cs = spring({
          frame: frame - c.delay * fps,
          fps,
          config: { damping: 12, stiffness: 80 },
        });
        const opacity = interpolate(cs, [0, 1], [0, 0.5]);
        const offsetY = interpolate(cs, [0, 1], [-100, 0]);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              width: isVertical ? 160 : 200,
              height: isVertical ? 220 : 260,
              background: COLORS.paper,
              borderRadius: 14,
              border: `1px solid ${COLORS.hairline}`,
              boxShadow: "0 10px 32px rgba(31, 26, 20, 0.1)",
              transform: `translate(${c.x}px, ${c.y + offsetY}px) rotate(${c.rotate}deg)`,
              opacity,
              padding: 16,
            }}
          >
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: 12,
                color: COLORS.amber,
                fontWeight: 800,
                marginBottom: 8,
              }}
            >
              Q{i * 47 + 23}
            </div>
            <div
              style={{
                fontSize: 11,
                color: COLORS.subtle,
                lineHeight: 1.5,
                fontWeight: 600,
              }}
            >
              (가) 왕에 대한 설명으로 옳은 것은?
            </div>
          </div>
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
          position: "relative",
          zIndex: 10,
        }}
      >
        ● 기출노트는 어떻게 만들까
      </div>

      {/* Title */}
      <div
        style={{
          fontFamily: NOTO_SERIF_KR,
          fontSize: isVertical ? 100 : 110,
          fontWeight: 700,
          color: COLORS.ink,
          letterSpacing: "-0.04em",
          lineHeight: 1.1,
          textAlign: "center",
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          maxWidth: isVertical ? 950 : 1500,
          position: "relative",
          zIndex: 10,
        }}
      >
        <span style={{ color: COLORS.amber }}>1,900+ 문제</span>
        <br />→ 요약노트
        <span
          style={{
            display: "inline-block",
            transform: `scale(${qScale})`,
            transformOrigin: "left center",
            color: COLORS.amber,
            marginLeft: 4,
          }}
        >
          ?
        </span>
      </div>
    </AbsoluteFill>
  );
};
