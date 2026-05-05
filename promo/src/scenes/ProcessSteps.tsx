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
 * Process steps (18s, 540 frames):
 *   ① 0~5s   기출 1,900+ 문제 grid 등장
 *   ② 5~10s  ✨ AI가 문제별 해설/키워드 추출
 *   ③ 10~14s 시대별 7 era folder로 누적
 *   ④ 14~18s 요약노트 87편 완성
 */
export const ProcessSteps: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isVertical = height > width;

  // step boundary frames
  const s1 = 0;
  const s2 = 5 * fps;
  const s3 = 10 * fps;
  const s4 = 14 * fps;

  // 현재 step
  const step =
    frame < s2 ? 1 : frame < s3 ? 2 : frame < s4 ? 3 : 4;

  // step indicator (1/4, 2/4, ...) — top
  const stepLabels = [
    "① 기출 입력",
    "② AI 분석",
    "③ 시대별 누적",
    "④ 요약노트 완성",
  ];

  return (
    <AbsoluteFill
      style={{
        background: COLORS.cream,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: isVertical ? "80px 60px" : "60px 120px",
      }}
    >
      {/* Top step indicator */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: isVertical ? 36 : 28,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {stepLabels.map((label, i) => {
          const isActive = step === i + 1;
          const isPast = step > i + 1;
          return (
            <div
              key={i}
              style={{
                padding: isVertical ? "12px 20px" : "10px 18px",
                background: isActive
                  ? COLORS.amber
                  : isPast
                  ? "#FED7AA"
                  : COLORS.paper,
                color: isActive
                  ? COLORS.paper
                  : isPast
                  ? COLORS.amber
                  : COLORS.subtle,
                border: `1px solid ${
                  isActive
                    ? COLORS.amber
                    : isPast
                    ? "#FED7AA"
                    : COLORS.hairline
                }`,
                borderRadius: 999,
                fontFamily: FONT_MONO,
                fontSize: isVertical ? 18 : 16,
                fontWeight: 800,
                letterSpacing: "-0.01em",
                transition: "none",
              }}
            >
              {label}
            </div>
          );
        })}
      </div>

      {/* Stage area */}
      <div
        style={{
          flex: 1,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {step === 1 && <Step1Input frame={frame} fps={fps} isVertical={isVertical} />}
        {step === 2 && (
          <Step2AI frame={frame - s2} fps={fps} isVertical={isVertical} />
        )}
        {step === 3 && (
          <Step3Eras frame={frame - s3} fps={fps} isVertical={isVertical} />
        )}
        {step === 4 && (
          <Step4Notes frame={frame - s4} fps={fps} isVertical={isVertical} />
        )}
      </div>
    </AbsoluteFill>
  );
};

// ─── Step 1: 기출 1,900+ 문제 grid ─────────────────────────

const Step1Input: React.FC<{ frame: number; fps: number; isVertical: boolean }> = ({
  frame,
  fps,
  isVertical,
}) => {
  // Caption
  const captionOpacity = interpolate(frame, [0, 0.4 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Number counter 0 → 1900
  const counterValue = Math.round(
    interpolate(frame, [0.5 * fps, 3 * fps], [0, 1900], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  // grid card count growing
  const gridCount = Math.round(
    interpolate(frame, [0.5 * fps, 4 * fps], [0, 60], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  const cols = isVertical ? 6 : 10;
  const rows = 8;
  const totalCells = cols * rows;

  return (
    <>
      {/* Big number */}
      <div
        style={{
          fontFamily: NOTO_SERIF_KR,
          fontSize: isVertical ? 180 : 200,
          fontWeight: 700,
          color: COLORS.amber,
          letterSpacing: "-0.05em",
          lineHeight: 1,
          textAlign: "center",
          marginBottom: 12,
          opacity: captionOpacity,
        }}
      >
        {counterValue.toLocaleString()}+
      </div>
      <div
        style={{
          fontFamily: NOTO_SERIF_KR,
          fontSize: isVertical ? 44 : 38,
          fontWeight: 700,
          color: COLORS.ink,
          marginBottom: 32,
          opacity: captionOpacity,
        }}
      >
        한능검 기출 문제
      </div>

      {/* mini cards grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 8,
          width: "100%",
          maxWidth: isVertical ? 800 : 1300,
        }}
      >
        {Array.from({ length: totalCells }).map((_, i) => {
          const visible = i < gridCount;
          return (
            <div
              key={i}
              style={{
                aspectRatio: "3/4",
                background: visible ? COLORS.paper : "transparent",
                border: `1px solid ${
                  visible ? COLORS.hairline : "transparent"
                }`,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONT_MONO,
                fontSize: 10,
                color: COLORS.amber,
                fontWeight: 800,
                opacity: visible ? 0.85 : 0,
              }}
            >
              Q
            </div>
          );
        })}
      </div>
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: isVertical ? 18 : 16,
          color: COLORS.subtle,
          fontWeight: 700,
          marginTop: 18,
          letterSpacing: "0.05em",
          opacity: captionOpacity,
        }}
      >
        제40~77회 · 38회차 누적
      </div>
    </>
  );
};

// ─── Step 2: AI 분석 ──────────────────────────────────────

const Step2AI: React.FC<{ frame: number; fps: number; isVertical: boolean }> = ({
  frame,
  fps,
  isVertical,
}) => {
  const captionOpacity = interpolate(frame, [0, 0.4 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  // sparkle rotate
  const rotate = interpolate(frame, [0, 5 * fps], [0, 360]);

  // 추출 키워드 칩 등장
  const keywords = [
    "훈민정음",
    "조선 전기",
    "세종",
    "1443",
    "28자",
    "집현전",
    "정인지",
    "신숙주",
  ];

  return (
    <>
      <div
        style={{
          fontFamily: NOTO_SERIF_KR,
          fontSize: isVertical ? 60 : 56,
          fontWeight: 700,
          color: COLORS.ink,
          marginBottom: 14,
          opacity: captionOpacity,
          textAlign: "center",
        }}
      >
        <span style={{ color: COLORS.amber }}>AI</span>가 문제마다
        <br />
        해설·키워드 자동 추출
      </div>

      {/* AI sparkle hub */}
      <div
        style={{
          width: isVertical ? 260 : 220,
          height: isVertical ? 260 : 220,
          borderRadius: "50%",
          background:
            "linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #B45309 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "24px auto",
          boxShadow:
            "0 20px 60px rgba(180, 83, 9, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)",
          fontSize: isVertical ? 110 : 90,
          transform: `rotate(${rotate}deg)`,
          color: COLORS.cream,
        }}
      >
        ✨
      </div>

      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: isVertical ? 18 : 16,
          color: COLORS.subtle,
          fontWeight: 700,
          letterSpacing: "0.1em",
          marginBottom: 24,
          opacity: captionOpacity,
        }}
      >
        Gemini · Claude · Qwen
      </div>

      {/* 추출 키워드 칩 */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          maxWidth: isVertical ? 800 : 1200,
          justifyContent: "center",
        }}
      >
        {keywords.map((kw, i) => {
          const ks = spring({
            frame: frame - (1 + i * 0.18) * fps,
            fps,
            config: { damping: 12, stiffness: 110 },
          });
          const op = interpolate(ks, [0, 1], [0, 1]);
          const sc = interpolate(ks, [0, 1], [0.5, 1]);
          return (
            <div
              key={i}
              style={{
                background: "#FED7AA",
                color: COLORS.amber,
                padding: isVertical ? "10px 18px" : "8px 16px",
                borderRadius: 999,
                fontSize: isVertical ? 22 : 20,
                fontWeight: 800,
                opacity: op,
                transform: `scale(${sc})`,
                letterSpacing: "-0.01em",
              }}
            >
              {kw}
            </div>
          );
        })}
      </div>
    </>
  );
};

// ─── Step 3: 시대별 누적 ──────────────────────────────────

const Step3Eras: React.FC<{
  frame: number;
  fps: number;
  isVertical: boolean;
}> = ({ frame, fps, isVertical }) => {
  const captionOpacity = interpolate(frame, [0, 0.4 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  const eras = [
    { code: "s1", label: "선사·고조선", count: 8 },
    { code: "s2", label: "삼국·남북국", count: 14 },
    { code: "s3", label: "고려", count: 13 },
    { code: "s4", label: "조선", count: 18 },
    { code: "s5", label: "근대", count: 12 },
    { code: "s6", label: "일제 강점기", count: 11 },
    { code: "s7", label: "현대", count: 11 },
  ];

  return (
    <>
      <div
        style={{
          fontFamily: NOTO_SERIF_KR,
          fontSize: isVertical ? 56 : 50,
          fontWeight: 700,
          color: COLORS.ink,
          marginBottom: 28,
          opacity: captionOpacity,
          textAlign: "center",
          lineHeight: 1.2,
        }}
      >
        시대별 <span style={{ color: COLORS.amber }}>87 단원</span>으로
        <br />
        자동 누적
      </div>

      {/* era folders */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          width: "100%",
          maxWidth: isVertical ? 800 : 1100,
        }}
      >
        {eras.map((era, i) => {
          const es = spring({
            frame: frame - (0.5 + i * 0.25) * fps,
            fps,
            config: { damping: 14, stiffness: 110 },
          });
          const tx = interpolate(es, [0, 1], [-200, 0]);
          const op = interpolate(es, [0, 1], [0, 1]);

          // 카운터 증가 visual: 카드들이 폴더로 fly in
          const countNum = Math.round(
            interpolate(
              frame,
              [(0.7 + i * 0.25) * fps, (1.5 + i * 0.25) * fps],
              [0, era.count],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            ),
          );

          return (
            <div
              key={era.code}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                background: COLORS.paper,
                border: `1px solid ${COLORS.hairline}`,
                borderRadius: 14,
                padding: isVertical ? "14px 20px" : "12px 18px",
                transform: `translateX(${tx}px)`,
                opacity: op,
                boxShadow: "0 4px 12px rgba(31, 26, 20, 0.05)",
              }}
            >
              <div
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: isVertical ? 20 : 18,
                  color: COLORS.amber,
                  fontWeight: 800,
                  width: isVertical ? 56 : 48,
                  letterSpacing: "0.05em",
                }}
              >
                {era.code}
              </div>
              <div
                style={{
                  fontFamily: NOTO_SERIF_KR,
                  fontSize: isVertical ? 26 : 22,
                  fontWeight: 700,
                  color: COLORS.ink,
                  flex: 1,
                  letterSpacing: "-0.02em",
                }}
              >
                {era.label}
              </div>
              <div
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: isVertical ? 22 : 20,
                  color: COLORS.amber,
                  fontWeight: 800,
                  background: "#FED7AA",
                  padding: "4px 12px",
                  borderRadius: 999,
                  minWidth: 56,
                  textAlign: "center",
                }}
              >
                {countNum}편
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

// ─── Step 4: 요약노트 완성 ──────────────────────────────

const Step4Notes: React.FC<{
  frame: number;
  fps: number;
  isVertical: boolean;
}> = ({ frame, fps, isVertical }) => {
  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleY = interpolate(titleSpring, [0, 1], [30, 0]);

  // mock note card scale up
  const cardSpring = spring({
    frame: frame - 0.8 * fps,
    fps,
    config: { damping: 14, stiffness: 100 },
  });
  const cardScale = interpolate(cardSpring, [0, 1], [0.85, 1]);
  const cardOpacity = interpolate(cardSpring, [0, 1], [0, 1]);

  // Big check
  const checkSpring = spring({
    frame: frame - 2.5 * fps,
    fps,
    config: { damping: 8, stiffness: 100 },
  });
  const checkScale = interpolate(checkSpring, [0, 1], [0, 1.1]);

  return (
    <>
      <div
        style={{
          fontFamily: NOTO_SERIF_KR,
          fontSize: isVertical ? 60 : 54,
          fontWeight: 700,
          color: COLORS.ink,
          marginBottom: 28,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          textAlign: "center",
          lineHeight: 1.2,
        }}
      >
        <span style={{ color: COLORS.amber }}>요약노트 87편</span> 완성
      </div>

      {/* mock note card */}
      <div
        style={{
          background: COLORS.paper,
          borderRadius: 18,
          padding: isVertical ? "22px 24px" : "20px 24px",
          width: isVertical ? 560 : 600,
          border: `1px solid ${COLORS.hairline}`,
          boxShadow: "0 12px 36px rgba(31, 26, 20, 0.1)",
          opacity: cardOpacity,
          transform: `scale(${cardScale})`,
        }}
      >
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 14,
            color: COLORS.amber,
            fontWeight: 800,
            letterSpacing: "0.15em",
            marginBottom: 6,
            textTransform: "uppercase",
          }}
        >
          조선 · 5-03
        </div>
        <div
          style={{
            fontFamily: NOTO_SERIF_KR,
            fontSize: 30,
            fontWeight: 700,
            color: COLORS.ink,
            marginBottom: 10,
          }}
        >
          세종의 업적
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 12,
          }}
        >
          {["집현전", "훈민정음", "측우기", "4군 6진"].map((c) => (
            <div
              key={c}
              style={{
                background: "#FED7AA",
                color: COLORS.amber,
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              {c}
            </div>
          ))}
        </div>
        <div
          style={{
            fontSize: 13,
            color: COLORS.ink,
            lineHeight: 1.6,
            fontWeight: 600,
          }}
        >
          1443 · 훈민정음 창제 (28자)
          <br />
          1446 · 훈민정음 반포
        </div>
      </div>

      {/* big check */}
      <div
        style={{
          width: isVertical ? 130 : 120,
          height: isVertical ? 130 : 120,
          borderRadius: "50%",
          background: COLORS.teal,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 28,
          boxShadow: "0 16px 48px rgba(13, 148, 136, 0.4)",
          transform: `scale(${checkScale})`,
          fontSize: isVertical ? 80 : 70,
          color: COLORS.cream,
          fontWeight: 700,
        }}
      >
        ✓
      </div>
    </>
  );
};
