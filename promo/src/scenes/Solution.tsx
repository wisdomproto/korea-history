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
 * Solution (12s, 360 frames):
 *   사이트 시연 — 모바일 frame 안에 문제 풀이 → drawer slide-in → 노트 펼침
 *   0~3s: 문제 풀이 화면 (카드 보임 + 선지)
 *   3~6s: 정답 클릭 → amber CTA 버튼 등장
 *   6~9s: drawer 우측 slide-in
 *   9~12s: 노트 본문 (timeline + table) 펼침
 */
export const Solution: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isVertical = height > width;

  // 단계별 타임라인 (frame 기준)
  const t1 = 0; // 문제 카드 등장
  const t2 = 3 * fps; // 정답 정답
  const t3 = 4.5 * fps; // CTA 등장
  const t4 = 6 * fps; // drawer slide in
  const t5 = 7 * fps; // 노트 본문 펼침 (drawer slide 직후, 5초 보여줌)

  // 헤드라인
  const titleOpacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  // 모바일 phone frame 등장
  const phoneSpring = spring({
    frame: frame - 0.3 * fps,
    fps,
    config: { damping: 14, stiffness: 100 },
  });
  const phoneOpacity = interpolate(phoneSpring, [0, 1], [0, 1]);
  const phoneScale = interpolate(phoneSpring, [0, 1], [0.85, 1]);

  // 정답 click highlight
  const correctOpacity = interpolate(frame, [t2, t2 + 0.3 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  // CTA 버튼 등장
  const ctaSpring = spring({
    frame: frame - t3,
    fps,
    config: { damping: 12, stiffness: 110 },
  });
  const ctaOpacity = interpolate(ctaSpring, [0, 1], [0, 1]);
  const ctaY = interpolate(ctaSpring, [0, 1], [30, 0]);

  // drawer slide in
  const drawerProgress = interpolate(
    frame,
    [t4, t4 + 0.6 * fps],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const drawerX = interpolate(drawerProgress, [0, 1], [100, 0]);
  const dimOpacity = interpolate(drawerProgress, [0, 1], [0, 0.4]);

  // 노트 콘텐츠 페이드 (drawer 안)
  const noteOpacity = interpolate(frame, [t5, t5 + 0.5 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  // 모바일 폰 사이즈 — 9:16 vertical 캔버스에서 더 크게
  const phoneWidth = isVertical ? 580 : 520;
  const phoneHeight = isVertical ? 1100 : 1000;

  return (
    <AbsoluteFill
      style={{
        background: COLORS.cream,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: isVertical ? 60 : 80,
      }}
    >
      {/* 상단 카피 */}
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: isVertical ? 26 : 22,
          color: COLORS.amber,
          fontWeight: 800,
          letterSpacing: "0.18em",
          opacity: titleOpacity,
          marginBottom: 16,
        }}
      >
        ● 기출노트는 다릅니다
      </div>
      <div
        style={{
          fontFamily: NOTO_SERIF_KR,
          fontSize: isVertical ? 78 : 68,
          fontWeight: 700,
          color: COLORS.ink,
          letterSpacing: "-0.03em",
          lineHeight: 1.15,
          textAlign: "center",
          opacity: titleOpacity,
          marginBottom: isVertical ? 50 : 40,
          maxWidth: isVertical ? 900 : 1500,
        }}
      >
        기출 → 요약노트, <span style={{ color: COLORS.amber }}>한 번에</span>
      </div>

      {/* 모바일 phone mock */}
      <div
        style={{
          position: "relative",
          width: phoneWidth,
          height: phoneHeight,
          opacity: phoneOpacity,
          transform: `scale(${phoneScale})`,
        }}
      >
        {/* phone outer frame */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: COLORS.ink,
            borderRadius: 56,
            padding: 12,
            boxShadow: "0 30px 80px rgba(31, 26, 20, 0.25)",
          }}
        >
          {/* screen */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              background: COLORS.cream,
              borderRadius: 44,
              overflow: "hidden",
              padding: "32px 22px",
            }}
          >
            {/* fake header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  fontFamily: NOTO_SERIF_KR,
                  fontSize: 28,
                  fontWeight: 700,
                  color: COLORS.ink,
                  letterSpacing: "-0.04em",
                }}
              >
                기출노트
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: 14, background: COLORS.amber }} />
                <div style={{ width: 28, height: 28, borderRadius: 6, background: COLORS.hairline }} />
              </div>
            </div>

            {/* question card */}
            <div
              style={{
                background: COLORS.paper,
                borderRadius: 20,
                padding: 24,
                border: `1px solid ${COLORS.hairline}`,
                boxShadow: "0 4px 12px rgba(31, 26, 20, 0.05)",
              }}
            >
              <div
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 18,
                  color: COLORS.amber,
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  marginBottom: 8,
                }}
              >
                Q23 · 조선 전기
              </div>
              <div
                style={{
                  fontSize: 22,
                  color: COLORS.ink,
                  lineHeight: 1.5,
                  marginBottom: 16,
                  fontWeight: 600,
                }}
              >
                (가) 왕에 대한 설명으로 옳은 것은?
              </div>
              <div
                style={{
                  background: "#FEF3C7",
                  padding: "12px 14px",
                  borderRadius: 12,
                  fontSize: 18,
                  color: COLORS.ink,
                  marginBottom: 20,
                }}
              >
                …새로 <span style={{ background: "#FDE68A", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>스물여덟 자</span>를 만드니 하였다.
              </div>

              {/* 선지 */}
              {[1, 2, 3, 4, 5].map((n) => {
                const isCorrect = n === 1;
                const showCorrect = isCorrect && frame >= t2;
                return (
                  <div
                    key={n}
                    style={{
                      padding: "12px 16px",
                      marginBottom: 8,
                      borderRadius: 12,
                      border: `2px solid ${
                        showCorrect ? COLORS.teal : COLORS.hairline
                      }`,
                      background: showCorrect ? "#CCFBF1" : COLORS.paper,
                      fontSize: 18,
                      fontWeight: showCorrect ? 800 : 600,
                      color: showCorrect ? "#115E59" : COLORS.ink,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      opacity: showCorrect
                        ? Math.max(correctOpacity, 0.3)
                        : 1,
                    }}
                  >
                    <span style={{ fontFamily: FONT_MONO, fontSize: 16 }}>
                      {n}.
                    </span>
                    <span>
                      {n === 1 && "훈민정음을 창제하였다"}
                      {n === 2 && "경국대전을 반포하였다"}
                      {n === 3 && "탕평비를 세웠다"}
                      {n === 4 && "균역법을 시행하였다"}
                      {n === 5 && "장용영을 설치하였다"}
                    </span>
                    {showCorrect && (
                      <span
                        style={{
                          marginLeft: "auto",
                          fontSize: 24,
                          opacity: correctOpacity,
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </div>
                );
              })}

              {/* CTA "관련 요약노트 펼치기" */}
              {frame >= t3 && (
                <div
                  style={{
                    marginTop: 16,
                    background:
                      "linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #B45309 100%)",
                    borderRadius: 16,
                    padding: "16px 20px",
                    color: COLORS.paper,
                    fontWeight: 800,
                    fontSize: 20,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    opacity: ctaOpacity,
                    transform: `translateY(${ctaY}px)`,
                    boxShadow:
                      "0 4px 12px rgba(180, 83, 9, 0.4), inset 0 1px 0 rgba(255,255,255,0.25)",
                  }}
                >
                  <span style={{ fontSize: 22 }}>📝</span>
                  <span>관련 요약노트 펼치기 (3편)</span>
                  <span style={{ marginLeft: "auto" }}>→</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* dim 오버레이 — drawer 시점 */}
        {frame >= t4 && (
          <div
            style={{
              position: "absolute",
              inset: 12,
              borderRadius: 44,
              background: "rgba(20, 15, 10, 0.55)",
              opacity: dimOpacity,
            }}
          />
        )}

        {/* drawer (slide in from right) */}
        {frame >= t4 && (
          <div
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              bottom: 12,
              width: "85%",
              background: COLORS.paper,
              borderTopRightRadius: 44,
              borderBottomRightRadius: 44,
              padding: "32px 24px",
              transform: `translateX(${drawerX}%)`,
              boxShadow: "-30px 0 80px rgba(31, 26, 20, 0.3)",
              overflow: "hidden",
            }}
          >
            {/* drawer header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 20,
                paddingBottom: 14,
                borderBottom: `1px solid ${COLORS.hairline}`,
              }}
            >
              <span style={{ fontSize: 26 }}>📝</span>
              <div>
                <div
                  style={{
                    fontFamily: NOTO_SERIF_KR,
                    fontSize: 22,
                    fontWeight: 700,
                    color: COLORS.ink,
                  }}
                >
                  관련 요약노트
                </div>
                <div
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 12,
                    color: COLORS.amber,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                  }}
                >
                  3편
                </div>
              </div>
            </div>

            {/* drawer body — 노트 본문 (풍성한 정리) */}
            <div style={{ opacity: noteOpacity }}>
              <div
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 12,
                  color: COLORS.amber,
                  fontWeight: 800,
                  letterSpacing: "0.15em",
                  marginBottom: 6,
                  textTransform: "uppercase",
                }}
              >
                조선 전기 · 5-03
              </div>
              <div
                style={{
                  fontFamily: NOTO_SERIF_KR,
                  fontSize: 30,
                  fontWeight: 700,
                  color: COLORS.ink,
                  marginBottom: 6,
                  lineHeight: 1.2,
                }}
              >
                세종의 업적
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: COLORS.inkSoft,
                  marginBottom: 14,
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                }}
              >
                1418~1450 · 조선 4대 왕 · 정치·문화·과학·국방
              </div>

              {/* 분야 keyword chips */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  marginBottom: 14,
                }}
              >
                {[
                  { i: "🏛️", t: "집현전" },
                  { i: "✍️", t: "훈민정음" },
                  { i: "🔬", t: "측우기·자격루" },
                  { i: "🛡️", t: "4군 6진" },
                  { i: "🌾", t: "농사직설" },
                ].map((chip, idx) => {
                  const op = interpolate(
                    frame,
                    [t5 + idx * 0.08 * fps, t5 + 0.3 * fps + idx * 0.08 * fps],
                    [0, 1],
                    { extrapolateRight: "clamp" },
                  );
                  return (
                    <div
                      key={idx}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "4px 9px",
                        background: "#FED7AA",
                        color: COLORS.amber,
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "-0.01em",
                        opacity: op,
                      }}
                    >
                      <span>{chip.i}</span>
                      <span>{chip.t}</span>
                    </div>
                  );
                })}
              </div>

              {/* timeline (6 row, 훈민정음 highlight) */}
              <div
                style={{
                  marginBottom: 12,
                  borderLeft: `2px solid ${COLORS.cream}`,
                  paddingLeft: 12,
                }}
              >
                {[
                  { y: "1418", t: "즉위", hi: false },
                  { y: "1419", t: "대마도 정벌", hi: false },
                  { y: "1429", t: "농사직설 편찬", hi: false },
                  { y: "1434", t: "4군 6진 개척 시작", hi: false },
                  { y: "1443", t: "훈민정음 창제 (28자)", hi: true },
                  { y: "1446", t: "훈민정음 반포", hi: true },
                ].map((row, i) => {
                  const rowOpacity = interpolate(
                    frame,
                    [
                      t5 + 0.5 * fps + i * 0.12 * fps,
                      t5 + 0.75 * fps + i * 0.12 * fps,
                    ],
                    [0, 1],
                    { extrapolateRight: "clamp" },
                  );
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 5,
                        opacity: rowOpacity,
                      }}
                    >
                      <div
                        style={{
                          width: 50,
                          fontFamily: FONT_MONO,
                          fontSize: 12,
                          color: row.hi ? COLORS.amber : COLORS.subtle,
                          fontWeight: 800,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {row.y}
                      </div>
                      <div
                        style={{
                          fontSize: row.hi ? 14 : 13,
                          color: COLORS.ink,
                          fontWeight: row.hi ? 800 : 600,
                          flex: 1,
                          background: row.hi ? "#FEF3C7" : "transparent",
                          padding: row.hi ? "3px 8px" : 0,
                          borderRadius: 6,
                        }}
                      >
                        {row.t}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 핵심 인물 box (3 row) */}
              <div
                style={{
                  background: COLORS.cream,
                  borderRadius: 10,
                  padding: 11,
                  fontSize: 12,
                  color: COLORS.ink,
                  lineHeight: 1.55,
                }}
              >
                <div
                  style={{
                    fontWeight: 800,
                    marginBottom: 5,
                    color: COLORS.amber,
                    fontSize: 12,
                    letterSpacing: "0.05em",
                  }}
                >
                  핵심 인물
                </div>
                {[
                  "최윤덕 · 김종서 (4군 6진)",
                  "장영실 (측우기 · 자격루)",
                  "정인지 · 신숙주 (훈민정음)",
                ].map((line, i) => {
                  const op = interpolate(
                    frame,
                    [
                      t5 + 1.5 * fps + i * 0.1 * fps,
                      t5 + 1.7 * fps + i * 0.1 * fps,
                    ],
                    [0, 1],
                    { extrapolateRight: "clamp" },
                  );
                  return (
                    <div key={i} style={{ opacity: op }}>
                      {line}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
