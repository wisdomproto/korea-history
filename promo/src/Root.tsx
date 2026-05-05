import { Composition } from "remotion";
import { GcnotePromo } from "./GcnotePromo";
import { GcnoteHowItsMade } from "./GcnoteHowItsMade";

const FPS = 30;
const TOTAL_SECONDS = 30;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 9:16 vertical — Reels / Shorts / TikTok */}
      <Composition
        id="GcnoteReels"
        component={GcnotePromo}
        durationInFrames={TOTAL_SECONDS * FPS}
        fps={FPS}
        width={1080}
        height={1920}
      />
      {/* 16:9 horizontal — YouTube / web ads */}
      <Composition
        id="GcnotePromo"
        component={GcnotePromo}
        durationInFrames={TOTAL_SECONDS * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />
      {/* "How it's made" — process video, 9:16 */}
      <Composition
        id="GcnoteHowItsMadeReels"
        component={GcnoteHowItsMade}
        durationInFrames={TOTAL_SECONDS * FPS}
        fps={FPS}
        width={1080}
        height={1920}
      />
      {/* "How it's made" — 16:9 */}
      <Composition
        id="GcnoteHowItsMade"
        component={GcnoteHowItsMade}
        durationInFrames={TOTAL_SECONDS * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};
