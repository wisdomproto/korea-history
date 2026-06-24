import Link from "next/link";
import FrictionDemo from "./_components/FrictionDemo";

export default function PreviewHome() {
  const cardStyle: React.CSSProperties = {
    display: "block",
    background: "var(--gc-paper)",
    border: "1.5px solid var(--gc-hairline)",
    borderRadius: 16,
    padding: 20,
    textDecoration: "none",
    color: "var(--gc-ink)",
    transition: "border-color .15s, transform .1s",
  };
  const pill: React.CSSProperties = {
    display: "inline-block",
    background: "var(--gc-teal-soft)",
    color: "var(--gc-teal)",
    fontWeight: 700,
    fontSize: 12,
    padding: "3px 10px",
    borderRadius: 999,
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <h1
        className="font-serif-kr"
        style={{ fontSize: 30, fontWeight: 900, margin: "4px 0 8px" }}
      >
        멤버십 모델 미리보기
      </h1>
      <p style={{ color: "var(--gc-subtle)", fontSize: 14.5, lineHeight: 1.7, margin: "0 0 22px" }}>
        유료화 모델을 실서비스에 반영하기 전, 팀이 함께 보고 결정하기 위한 데모 페이지입니다.
        기존 <code>/notes</code>·<code>/exam</code> 등 실페이지는 전혀 건드리지 않았습니다.
      </p>

      {/* 모델 요약 */}
      <div
        style={{
          background: "var(--gc-amber-soft)",
          border: "1px solid var(--gc-hairline)",
          borderRadius: 16,
          padding: "18px 20px",
          marginBottom: 26,
        }}
      >
        <div style={{ fontWeight: 800, marginBottom: 10 }} className="font-serif-kr">
          한눈에 보는 모델
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.9, color: "var(--gc-ink2)" }}>
          <li><b>듀오링고형 F2P</b> — 기존 기능 그대로, 무료는 <b>광고+한도</b> / 프리미엄은 <b>광고 없이 무제한</b></li>
          <li><b>새 기능 0개</b> — 기출 풀이·오답노트·요약노트(현재 자산)로 충분</li>
          <li><b>요약노트 = 로그인 유도</b> — 미리보기 노출(색인 유지) → 전체는 로그인/프리미엄</li>
          <li><b>가입 즉시 7일 무료 체험</b>(카드 X) + <b>친구 초대 시 둘 다 +7일</b>(양면)</li>
          <li>로그인 = 카카오 + 구글 · 기록 클라우드 동기화는 <b>무료</b></li>
        </ul>
      </div>

      {/* 데모 네비게이션 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 26 }}>
        <Link href="/preview/membership" style={cardStyle}>
          <span style={pill}>요금제</span>
          <div className="font-serif-kr" style={{ fontWeight: 800, fontSize: 18, margin: "10px 0 4px" }}>
            💳 멤버십 비교
          </div>
          <div style={{ fontSize: 13, color: "var(--gc-subtle)", lineHeight: 1.55 }}>
            무료 vs 프리미엄 — "광고 없이 무제한" 요금제 페이지
          </div>
        </Link>

        <Link href="/preview/note" style={cardStyle}>
          <span style={{ ...pill, background: "var(--gc-amber-soft)", color: "var(--gc-amber)" }}>노트 게이팅</span>
          <div className="font-serif-kr" style={{ fontWeight: 800, fontSize: 18, margin: "10px 0 4px" }}>
            📝 요약노트 미리보기
          </div>
          <div style={{ fontSize: 13, color: "var(--gc-subtle)", lineHeight: 1.55 }}>
            실제 노트에 미리보기 게이팅 — 게스트 ⇄ 프리미엄 전환
          </div>
        </Link>
      </div>

      {/* 마찰 데모 */}
      <div
        style={{
          background: "var(--gc-paper)",
          border: "1.5px solid var(--gc-hairline)",
          borderRadius: 16,
          padding: 20,
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 220 }}>
          <div className="font-serif-kr" style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>
            ⚡ F2P 마찰 프롬프트
          </div>
          <div style={{ fontSize: 13, color: "var(--gc-subtle)", lineHeight: 1.55 }}>
            하루 무료 한도 도달 시 뜨는 모달 — "광고 보고 계속" / "프리미엄". 버튼을 눌러보세요.
          </div>
        </div>
        <FrictionDemo />
      </div>
    </div>
  );
}
