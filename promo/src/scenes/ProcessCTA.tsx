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
 * CTA (3s) — short outro since differentiator already covered the punchline.
 *   "AI로 만든 진짜 요약 · gcnote.co.kr · 기출노트"
 */
export const ProcessCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isVertical = height > width;

  const sp = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const opacity = interpolate(sp, [0, 1], [0, 1]);
  const scale = interpolate(sp, [0, 1], [0.85, 1]);

  return (
    <AbsoluteFill
      style={{
        background: COLORS.ink,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: isVertical ? 80 : 120,
      }}
    >
      <div
        style={{
          opacity,
          transform: `scale(${scale})`,
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
          ● AI로 만든 진짜 요약
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
