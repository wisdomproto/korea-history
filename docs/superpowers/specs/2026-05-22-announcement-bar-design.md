# 사이트 전역 공지 announcement bar — 설계 문서

- **상태**: 설계 확정, 구현 대기
- **목적**: 게시판이 잘 안 읽히는 문제 해결. 시의성 있는 공지(시험 결과 업데이트, 시험 응시 격려, 신규 시험 확장 등)를 모든 페이지 헤더 직후 텍스트 띠로 노출
- **트리거**: 5/23(토) 78회 한능검 시험 종료 + 78회 시험 데이터 업로드 완료 → 응시생 격려 + 업데이트 알림 + 9급 확장 cross-sell 메시지를 메인 진입 즉시 노출하고 싶음

## 배경

- 기존 `BannerCarousel.tsx` 컴포넌트가 있으나 **어디에도 mount 안 됨** (dead code). 16:9 이미지 기반이라 시의성 텍스트 메시지에는 부담.
- 게시판은 사람들이 잘 안 봄 → 모든 페이지 공통 진입 동선에 공지를 띄워야 도달률 ↑
- 5/23(토) 한능검 78회 시험 직후 + 5/25(월) 작업 시점 = 응시생이 "정답 확인하러" 메인 방문할 시기 = 띠 노출 최적기

## 보호해야 할 한능검 SEO 자산 (수정 금지)

[multi-exam-strip-design 스펙](2026-05-22-multi-exam-strip-design.md#보호해야-할-한능검-seo-자산-수정-금지)과 동일. layout.tsx 메타·JSON-LD, KoreanHistoryLanding 본문 무손상.

## 디자인 결정

### 1. 위치

`web/app/layout.tsx` line 175 직후 — `<Header />` 와 `<main>` 사이에 **`<AnnouncementBar />` 한 줄 추가**. 모든 페이지 공통 mount.

```tsx
<Header examTypes={...} subjects={...} />
<AnnouncementBar />   {/* 신규 — Header sticky 영역 밖, main 위 */}
<main>...</main>
```

- Header가 layout.tsx에 직접 mount되어 있어 layout.tsx 수정 1줄로 모든 페이지 공통 노출
- AnnouncementBar 자체는 sticky 적용 안 함 — Header의 sticky/z-index와 충돌 회피

- 메인 페이지뿐 아니라 /exam, /notes, /study 등 모든 페이지에서 노출 — 게시판 대체 목적.
- 한능검 sub-페이지에서 9급 cross-sell 메시지가 떠도 OK (cross-sell intent 일관).
- 78회 업데이트 메시지는 한능검 페이지에서 자연스러움.

### 2. 형태

- **1줄 텍스트** 자동 롤링 (페이드 인/아웃)
- **회전 주기**: 5초 (사용자 hover/focus 시 일시정지)
- **클릭 시**: 메시지에 지정된 링크로 이동 (자기 탭)
- **닫기 버튼**: 우측 끝 ✕ → localStorage에 `announcement_dismissed_until` 저장, 24시간 동안 숨김 (사용자 짜증 방지)
- **인디케이터**: 메시지 3개 이상이면 좌우 도트 (작게)

### 3. 데이터 소스

**코드 상수** — `web/lib/announcements.ts` 신규 파일:

```ts
export type Announcement = {
  id: string;
  text: string;
  href: string;
  emoji?: string;
  /** ISO date — 이 날짜 이후 자동 숨김 (선택) */
  expiresAt?: string;
};

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "exam-78-congrats",
    emoji: "🎉",
    text: "한능검 78회 보느라 수고하셨어요 — 정답·해설 확인하기",
    href: "/exam/78/1",
    expiresAt: "2026-06-15",
  },
  {
    id: "exam-78-released",
    emoji: "🆕",
    text: "78회 기출 + AI 해설 업로드 완료",
    href: "/exam",
    expiresAt: "2026-06-30",
  },
  {
    id: "civil-9-expansion",
    emoji: "📚",
    text: "9급 공무원도 같은 학습 시스템 — 13과목 단원별 정리",
    href: "/9급-국가직-일반행정",
    // 만료 없음 (상시 cross-sell)
  },
];
```

- 갱신 빈도 = 월 1~2회 → 코드 + 배포로 충분. R2/Supabase 인프라 추가 불필요 (YAGNI).
- `expiresAt` 지난 메시지는 자동으로 회전에서 제외 (필터 1줄).

### 4. 비주얼

- **배경**: deep ink `#1F1A14` (한능검 디자인 토큰 — Pricing Band와 동일 톤)
- **텍스트**: cream `#F5EFE4` (높은 가독성)
- **이모지**: 좌측, 별도 색상 처리 없음 (이모지 자체 색)
- **링크 hover**: 텍스트 amber `#C77B3D` 전환 + underline
- **도트 인디케이터**: 우측, 활성 도트 amber / 비활성 cream 30% opacity
- **닫기 버튼**: 우측 끝, cream 50% opacity → hover 시 100%
- **높이**: 모바일 36px / 데스크탑 40px (한 줄, ellipsis 처리)
- **모바일 ellipsis**: 너무 긴 텍스트는 `...`로 자르고 클릭하면 페이지 이동 (전체 텍스트는 페이지에서 확인)
- **애니메이션**: 메시지 전환은 0.4s opacity fade (transform 안 씀 — 헤더 sticky 흔들림 방지)
- **z-index**: Header(z-50) 바로 아래, sticky 적용 안 함 (헤더만 sticky 유지)

### 5. SEO 보호 장치

- **H1·H2 사용 금지**: 텍스트는 `<a>` 또는 `<span>`
- **JSON-LD 추가 금지**: layout.tsx의 EducationalOrganization·WebSite 시그널 보호
- **`<aside role="status" aria-live="polite">`**: 접근성 + heading hierarchy 무손상
- **Header 메타 무변경**: `web/components/Header.tsx`나 `web/app/layout.tsx`는 mount 1줄만 추가, 다른 props/style 변화 X
- **모든 페이지 공통 mount이라 layout 변경**: layout.tsx 직접 수정해도 metadata export·JSON-LD script는 안 건드림

### 6. 구현 범위

- 신규 파일:
  - `web/lib/announcements.ts` — 상수 배열 (~25줄)
  - `web/components/AnnouncementBar.tsx` — 클라이언트 컴포넌트 (~110줄)
- 수정:
  - `web/components/Header.tsx` 또는 `web/app/layout.tsx` — `<AnnouncementBar />` mount 1줄 추가
- **수정 안 함**: layout.tsx의 metadata·JSON-LD·viewport·any meta 관련 코드, Header 컴포넌트의 기존 마크업·스타일

### 7. 검증 계획

- **빌드**: `cd web && npm run build` — 정적 생성 정상
- **시각**:
  - 데스크탑·모바일에서 헤더 바로 아래 띠 표시
  - 5초마다 메시지 회전 (3개 메시지면 15초에 한 번 처음으로)
  - hover 시 회전 일시정지
  - 메시지 클릭 시 해당 페이지 이동
  - ✕ 클릭 시 띠 사라짐 + 새로고침해도 24시간 동안 안 나타남
  - 24시간 지나면 다시 나타남 (또는 브라우저 콘솔에서 `localStorage.removeItem('announcement_dismissed_until')` 후 새로고침)
- **SEO**:
  - View Source로 layout.tsx 메타 무변경 확인
  - H1이 여전히 한능검 Hero인지
  - aria-live="polite" 속성 적용 확인
- **`expiresAt` 동작**: 가짜로 `expiresAt: '2020-01-01'` 메시지 추가 → 회전에서 제외되는지

### 8. 비목표 (이번 작업 범위 외)

- 기존 BannerCarousel(16:9 이미지) 살리기 ❌ — 별도 작업으로 보류
- admin 페이지에서 announcement 관리 UI ❌ — 코드 상수로 충분
- 메시지 다국어화 ❌
- 사용자 세그먼트별 다른 메시지 ❌
- A/B 테스트 ❌ — 메시지 1세트로 시작
- GA4 클릭 이벤트 추적 ❌ — 후속 작업

## 후속 작업 후보 (지금 안 함)

1. GA4 이벤트 (`gtag('event','announcement_click',{announcement_id})`) — 어떤 메시지가 클릭률 높은지 측정
2. admin/announcements 페이지 — 코드 상수 → R2 JSON 이관 + 비개발자 운영
3. 메시지 세그먼테이션 — 한능검 페이지엔 78회 메시지만, 공무원 페이지엔 다른 메시지
4. BannerCarousel(이미지 배너) 살리기 — 시각적으로 강한 이벤트성 공지용
