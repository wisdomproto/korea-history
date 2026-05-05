import { AbsoluteFill, Series, useVideoConfig } from "remotion";
import { COLORS } from "./theme";
import { ProcessHook } from "./scenes/ProcessHook";
import { ProcessSteps } from "./scenes/ProcessSteps";
import { ProcessDifferentiator } from "./scenes/ProcessDifferentiator";
import { ProcessCTA } from "./scenes/ProcessCTA";

/**
 * 30s "How it's made" video:
 *   Hook(4) → Process pipeline 4 steps(18) → Differentiator(5) → CTA(3)
 */
export const GcnoteHowItsMade: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: COLORS.cream }}>
      <Series>
        <Series.Sequence durationInFrames={4 * fps}>
          <ProcessHook />
        </Series.Sequence>
        <Series.Sequence durationInFrames={18 * fps}>
          <ProcessSteps />
        </Series.Sequence>
        <Series.Sequence durationInFrames={5 * fps}>
          <ProcessDifferentiator />
        </Series.Sequence>
        <Series.Sequence durationInFrames={3 * fps}>
          <ProcessCTA />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
