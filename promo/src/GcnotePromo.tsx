import { AbsoluteFill, Series, useVideoConfig } from "remotion";
import { Hook } from "./scenes/Hook";
import { Problem } from "./scenes/Problem";
import { Solution } from "./scenes/Solution";
import { CTA } from "./scenes/CTA";
import { COLORS } from "./theme";

/**
 * 30s ad: Hook(5) → Problem(5) → Solution(12) → CTA(8)
 * Renders for both 9:16 (Reels/Shorts) and 16:9 (YouTube) compositions.
 */
export const GcnotePromo: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: COLORS.cream }}>
      <Series>
        <Series.Sequence durationInFrames={5 * fps}>
          <Hook />
        </Series.Sequence>
        <Series.Sequence durationInFrames={5 * fps}>
          <Problem />
        </Series.Sequence>
        <Series.Sequence durationInFrames={12 * fps}>
          <Solution />
        </Series.Sequence>
        <Series.Sequence durationInFrames={8 * fps}>
          <CTA />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
