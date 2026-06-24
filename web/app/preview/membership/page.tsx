type Row = { label: string; free: string; pro: string; star?: boolean };

const GROUPS: { title: string; rows: Row[] }[] = [
  {
    title: "📚 학습 (핵심 — 무료도 다 됨)",
    rows: [
      { label: "전 회차 기출문제 풀이", free: "하루 한도 + 광고", pro: "무제한 · 광고 없음", star: true },
      { label: "AI 정답 해설", free: "✓", pro: "✓" },
      { label: "영상 해설 · 강의", free: "✓", pro: "✓" },
      { label: "맞춤 · 키워드 학습 / 학습 세션", free: "✓", pro: "✓" },
    ],
  },
  {
    title: "📝 요약노트 (로그인 유도)",
    rows: [
      { label: "요약노트 열람", free: "미리보기", pro: "전체", star: true },
      { label: "문제 ↔ 요약노트 자동 연결", free: "미리보기", pro: "✓", star: true },
    ],
  },
  {
    title: "🔁 내 기록",
    rows: [
      { label: "오답노트 복습", free: "한도 + 광고", pro: "무제한 · 광고 없음" },
      { label: "기록 클라우드 저장 · 기기 동기화", free: "✓", pro: "✓" },
      { label: "보상형 광고로 한도 충전", free: "✓", pro: "불필요" },
    ],
  },
  {
    title: "✨ 기타",
    rows: [
      { label: "광고", free: "있음", pro: "없음", star: true },
      { label: "끊김 없는 학습 흐름", free: "—", pro: "✓" },
    ],
  },
];

function mark(v: string) {
  if (v === "✓") return { color: "var(--gc-teal)", weight: 800 as const };
  if (v === "—") return { color: "#C0B6A4", weight: 800 as const };
  if (v === "없음" || v.includes("무제한") || v === "전체") return { color: "var(--gc-teal)", weight: 700 as const };
  if (v === "미리보기") return { color: "var(--gc-amber)", weight: 700 as const };
  return { color: "var(--gc-subtle)", weight: 600 as const };
}

export default function MembershipPreview() {
  return (
    <div style={{ maxWidth: 880, margin: "0 auto" }}>
      <h1 className="font-serif-kr" style={{ fontSize: 30, fontWeight: 900, textAlign: "center", margin: "4px 0 6px" }}>
        광고 없이, 무제한으로.
      </h1>
      <p style={{ textAlign: "center", color: "var(--gc-subtle)", fontSize: 14.5, lineHeight: 1.6, margin: "0 auto 22px", maxWidth: 520 }}>
        지금 쓰는 기능 그대로, 더 매끄럽게. 기출 풀이·요약노트·오답노트는 누구나 — 프리미엄은 광고·한도를 없앱니다.
      </p>

      {/* 트라이얼 배너 */}
      <div
        style={{
          display: "flex", gap: 10, alignItems: "center", justifyContent: "center", flexWrap: "wrap",
          background: "linear-gradient(135deg, var(--gc-amber), #93420a)", color: "#fff",
          borderRadius: 16, padding: "15px 20px", marginBottom: 26,
        }}
      >
        <b className="font-serif-kr" style={{ fontSize: 16 }}>🎁 가입 즉시 프리미엄 7일 무료</b>
        <span style={chip}>카드 등록 없이</span>
        <span style={chip}>👥 친구 초대하면 둘 다 +7일</span>
      </div>

      {/* 카드 2장 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }} className="gc-cards">
        {/* 무료 */}
        <div style={card}>
          <h3 className="font-serif-kr" style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>무료</h3>
          <div style={{ fontSize: 30, fontWeight: 900 }} className="font-serif-kr">₩0</div>
          <div style={{ fontSize: 11, color: "var(--gc-subtle)", margin: "2px 0 14px" }}>로그인만 하면 평생 무료</div>
          <p style={desc}>핵심은 다 됩니다. 광고를 보거나 하루 한도 안에서.</p>
          <ul style={keylist}>
            <li>✓ 기출 풀이 · AI 해설 (한도 + 광고)</li>
            <li>✓ 요약노트 미리보기</li>
            <li>✓ 오답노트 · 기록 동기화</li>
            <li>✓ 광고 보고 한도 충전</li>
          </ul>
          <div style={{ ...cta, background: "var(--gc-paper)", color: "var(--gc-ink)", border: "2px solid var(--gc-ink)" }}>
            무료로 시작
          </div>
        </div>

        {/* 프리미엄 */}
        <div style={{ ...card, border: "2.5px solid var(--gc-amber)", boxShadow: "0 14px 32px -14px rgba(180,83,9,.4)", position: "relative" }}>
          <span style={badge}>7일 무료 체험</span>
          <h3 className="font-serif-kr" style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px", color: "var(--gc-amber)" }}>프리미엄</h3>
          <div className="font-serif-kr">
            <span style={{ fontSize: 30, fontWeight: 900 }}>₩4,900</span>
            <span style={{ fontSize: 15, color: "var(--gc-subtle)" }}> / 월</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--gc-subtle)", margin: "2px 0 14px" }}>* 가격 미확정 — 예시</div>
          <p style={desc}><b>광고 없이, 전부 무제한.</b> 지금 그대로 더 매끄럽게.</p>
          <ul style={keylist}>
            <li>★ 기출 <b>무제한 · 광고 없음</b></li>
            <li>★ 요약노트 <b>전체</b> + 문제↔노트 연결</li>
            <li>✓ 오답노트 무제한</li>
            <li>✓ 모든 한도 해제</li>
          </ul>
          <div style={{ ...cta, background: "var(--gc-amber)", color: "#fff", border: "2px solid var(--gc-amber)" }}>
            7일 무료로 시작
          </div>
          <p style={{ textAlign: "center", fontSize: 11, color: "var(--gc-subtle)", marginTop: 8 }}>
            카드 등록 없이 · 7일 후 자동 종료
          </p>
        </div>
      </div>

      {/* 비교표 */}
      <h2 className="font-serif-kr" style={{ fontSize: 20, textAlign: "center", margin: "8px 0 16px" }}>전체 비교</h2>
      <div style={{ border: "1px solid var(--gc-hairline)", borderRadius: 16, overflow: "hidden", background: "var(--gc-paper)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--gc-amber-soft)" }}>
              <th style={{ ...th, textAlign: "left" }}>기능</th>
              <th style={{ ...th, width: 130 }}>무료</th>
              <th style={{ ...th, width: 150, color: "var(--gc-amber)" }}>프리미엄</th>
            </tr>
          </thead>
          <tbody>
            {GROUPS.map((g) => (
              <GroupRows key={g.title} title={g.title} rows={g.rows} />
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ textAlign: "center", color: "var(--gc-subtle)", fontSize: 12, marginTop: 18, lineHeight: 1.7 }}>
        비로그인(게스트)도 기출 풀이·해설·요약노트 미리보기는 가능 (검색 유입·SEO 유지).<br />
        기록 저장·전체 노트·무제한은 로그인/프리미엄.
      </p>
    </div>
  );
}

function GroupRows({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <>
      <tr>
        <td colSpan={3} style={{ background: "#F1E9DA", fontWeight: 800, fontSize: 13, padding: "10px 14px" }} className="font-serif-kr">
          {title}
        </td>
      </tr>
      {rows.map((r) => {
        const f = mark(r.free);
        const p = mark(r.pro);
        return (
          <tr key={r.label} style={{ borderTop: "1px solid var(--gc-hairline)" }}>
            <td style={td}>
              {r.star && <span style={{ color: "var(--gc-amber)", marginRight: 5 }}>★</span>}
              {r.label}
            </td>
            <td style={{ ...td, textAlign: "center", color: f.color, fontWeight: f.weight, fontSize: 12.5 }}>{r.free}</td>
            <td style={{ ...td, textAlign: "center", color: p.color, fontWeight: p.weight, fontSize: 12.5 }}>{r.pro}</td>
          </tr>
        );
      })}
    </>
  );
}

const chip: React.CSSProperties = { background: "rgba(255,255,255,.18)", border: "1px solid rgba(255,255,255,.35)", borderRadius: 999, padding: "4px 11px", fontSize: 12.5, fontWeight: 700 };
const card: React.CSSProperties = { background: "var(--gc-paper)", border: "1.5px solid var(--gc-hairline)", borderRadius: 20, padding: "22px 20px", display: "flex", flexDirection: "column" };
const desc: React.CSSProperties = { fontSize: 13, color: "var(--gc-subtle)", lineHeight: 1.6, margin: "0 0 14px", minHeight: 38 };
const keylist: React.CSSProperties = { listStyle: "none", padding: 0, margin: "0 0 18px", display: "flex", flexDirection: "column", gap: 7, fontSize: 13.3, lineHeight: 1.45 };
const cta: React.CSSProperties = { marginTop: "auto", textAlign: "center", fontWeight: 800, fontSize: 14, borderRadius: 12, padding: 12 };
const badge: React.CSSProperties = { position: "absolute", top: -12, right: 18, background: "var(--gc-amber)", color: "#fff", fontSize: 12, fontWeight: 800, padding: "4px 12px", borderRadius: 999 };
const th: React.CSSProperties = { padding: "12px 14px", textAlign: "center", fontWeight: 700, fontSize: 14, fontFamily: "var(--gc-font-serif)" };
const td: React.CSSProperties = { padding: "11px 14px", fontSize: 13.5 };
