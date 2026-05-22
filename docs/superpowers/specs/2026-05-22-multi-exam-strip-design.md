# 메인 페이지 다중 시험 진입 strip — 설계 문서

- **상태**: 설계 확정, 구현 대기 (2026-05-25 월요일 작업 예정)
- **목적**: 메인 페이지에서 한능검 사용자에게 9급 공무원·자격증으로의 cross-sell 동선을 명시적으로 만들기
- **최우선 제약**: 현재 잘 작동 중인 한능검 SEO 자산을 **하나도 건드리지 않는다**

## 배경

- 30일 사용자 +556% 폭증 (663 → 4,350) — SEO·NoteDrawer·블로그·PWA 누적 콤보
- 547 ExamType + 23 단권화 노트 (9급 13과목 풀세트 + 자격증 9개) 인프라는 완성
- 그러나 메인 페이지는 한능검 hero 1,950줄 + 하단 CivilNotesSection(122줄) + OtherExamsSection(67줄) 구조 — 다중 시험 존재가 스크롤 깊은 곳에 묻혀 cross-sell 시그널 약함
- 5/23(토) 한능검 78회 시험일 → 5/25(월) 시점에 시험 끝낸 사용자에게 "다음 시험" 동선 노출 적기

## 보호해야 할 한능검 SEO 자산 (수정 금지)

| # | 자산 | 위치 |
|---|---|---|
| 1 | default title "기출노트 — 한능검 기출문제와 요약노트 무료" | `web/app/layout.tsx` |
| 2 | metadata description + keywords 23개 (한능검 황금키워드) | `web/app/layout.tsx` |
| 3 | EducationalOrganization + WebSite JSON-LD (brand entity) | `web/app/layout.tsx` |
| 4 | Hero H1 "한능검 기출문제와 요약노트..." | `web/components/KoreanHistoryLanding.tsx` |
| 5 | "한능검 시대별 정리" 등 황금 7키워드 본문 노출 | KoreanHistoryLanding 본문 |
| 6 | 페이지 내부 링크 구조 (한능검 → /exam, /notes, /study) | KoreanHistoryLanding 본문 |

## 디자인 결정

### 1. 위치

`web/components/KoreanHistoryLanding.tsx` 내부, **Hero 끝 ↔ Stats Band 앞**.

이유: 한능검 SEO 본문(H1·정의문)을 본 사용자에게 자연스럽게 노출되면서 흐름 끊김은 1회만. Stats Band 뒤에 넣으면 한능검 본문 흐름이 두 번 끊긴다.

### 2. 카피 (확정)

> **공무원 시험도 같은 학습 시스템으로 — 9급 13과목 단원별 정리 완비**

- 한능검 언급 없음. 페이지 다른 부분에 한능검 키워드 충분히 깔려 있어 SEO 영향 없음.
- "9급 공무원" 직접 시그널이 띠에 들어가 네이버 SE 키워드 인식에 plus.
- "같은 학습 시스템" = 한능검 사용자에게는 친숙함, 공무원 검색 유입자에게는 가치 제안.

### 3. 칩 8개 (확정 — 단권화 노트 완성도 우선)

| # | 칩 라벨 | 노트 완성도 | 링크 (slug 확인 완료) | ExamType id |
|---|---|---|---|---|
| 1 | 9급 일반행정 | 공통 3 + 행정법 + 행정학 (5과목) | `/9급-국가직-일반행정` | civil-9n-haengjeong |
| 2 | 9급 세무 | 공통 3 + 세법 + 회계학 | `/9급-국가직-세무` | civil-9n-tax |
| 3 | 9급 교정 | 공통 3 + 교정학 + 형소법 | `/9급-국가직-교정` | civil-9n-correction |
| 4 | 9급 검찰사무 | 공통 3 + 형법 + 형소법 | `/9급-국가직-검찰사무` | civil-9n-prosecution |
| 5 | 9급 사회복지 | 공통 3 + 사회복지 + 행정법 | `/9급-국가직-사회복지` | civil-9n-welfare |
| 6 | 공인중개사 | 1·2차 노트 보유 | `/공인중개사` | cert-realtor |
| 7 | 정보처리기사 | 노트 보유 | `/정보처리기사` | cert-it-engineer |
| 8 | **전체 547과목 →** | – | `#other-exams` (페이지 내 앵커 점프) | – |

**선정 근거**:
- 9급 직렬 5개 = 단권화 노트 풀세트(공통 3 + 전공 2~3) 보유 직렬만. 진입 시 한능검 수준 학습 가능
- 자격증 2개 = 공인중개사·정보처리기사 (인기 + 노트 보유). 산업안전기사·전기기사·컴활은 띠에서 빼고 "전체→"로 흘려보냄
- 7급 PSAT 제외 (헌법 1과목만 — 진입 시 빈약함 노출)

### 4. 비주얼

- **배경**: cream paper `#F5EFE4` 유지 (한능검 본문과 동일 톤, 시각 단절 최소)
- **구분선**: Hero ↔ strip 사이 + strip ↔ Stats 사이 각각 ink 1px hairline (전체폭)
- **칩 스타일**: `rounded-full` pill, amber outline (1px) + amber 텍스트, hover 시 amber 배경 + cream 텍스트
- **"전체 547과목 →" 칩**: deep ink `#1F1A14` 배경 + cream 텍스트로 시각적 hierarchy 강조 (가장 종합적인 진입)
- **레이아웃**: 카피 상단 1줄 (Pretendard Variable, body weight) → 그 아래 칩 row. 데스크탑/모바일 공통 세로 스택.
- **부제** (선택): 카피 아래 작은 글씨로 `9급 13과목 + 인기 자격증 단원별 정리 노트 완비`
- **반응형**:
  - 데스크탑·태블릿: 칩 row `flex flex-wrap gap-2`
  - 모바일: 칩 row `flex overflow-x-auto` 1줄 가로 스크롤 (8개 펼침)

### 5. SEO 보호 장치

- **H1·H2 사용 금지**: heading 슬롯은 한능검 본문이 차지. 띠는 `<aside>` 또는 `<section role="complementary" aria-label="다른 시험 진입">`
- **JSON-LD 추가 금지**: 한능검 EducationalOrganization·WebSite가 메인의 brand entity 시그널이라 다른 schema는 dilution 위험
- **링크 anchor text**: 칩 라벨이 그대로 anchor text. "9급 일반행정"·"9급 세무" 등 공무원 키워드 자연 노출 (네이버 SE에 plus)
- **`target` 속성 없음**: 자기 탭 이동 (cross-sell 자연 흐름)
- **OtherExamsSection 앵커**: 8번 칩이 점프할 `id="other-exams"` 추가 (`web/components/OtherExamsSection.tsx`의 최상단 `<section>` 또는 wrapper에)

### 6. 구현 범위

- 신규 컴포넌트: `web/components/MultiExamStrip.tsx` (작은 단일 책임 컴포넌트, ~80줄 예상)
- 수정:
  - `web/components/KoreanHistoryLanding.tsx` — Hero 끝 + Stats Band 시작 사이에 `<MultiExamStrip />` 한 줄 추가
  - `web/components/OtherExamsSection.tsx` — 최상단 wrapper에 `id="other-exams"` 추가
- **수정하지 않음**: layout.tsx, page.tsx, 기타 한능검 SEO 본문

### 7. 검증 계획

- **빌드**: `cd web && npm run build` — 정적 생성 정상 + Hero/Stats Band 사이 strip 렌더링 확인
- **반응형**: 모바일(375) / 태블릿(768) / 데스크탑(1280) 각 viewport에서 카피·칩 가독성
- **링크**: 칩 8개 모두 클릭 → 정상 페이지 진입 (해당 ExamType 페이지가 SSG 또는 ISR로 살아있는지 확인)
- **SEO**: View Source로 layout.tsx meta·JSON-LD가 변화 없는지 + H1이 여전히 한능검 Hero인지 확인
- **GA4 이벤트** (선택): 칩 클릭에 `gtag('event','multi_exam_chip_click',{chip_label, chip_position})` 추가하면 어떤 직렬이 cross-sell intent 높은지 측정 가능. 후속 작업으로 분리.

### 8. 비목표 (이번 작업 범위 외)

- 한능검 SEO 본문 톤 변경 ❌
- 헤더 ExamSelector 강조 변경 ❌
- 시험 결과 페이지 / my-record 페이지에 cross-sell 추가 ❌ (별도 작업)
- 광고 셋업 ❌ (별도 트리거 도달 시점에)
- 9급 공무원 SEO 본격 콘텐츠 확장 ❌ (지금은 strip 한 줄만)

## 후속 작업 후보 (지금 안 함)

1. 칩 클릭 GA4 추적 → 1주 후 cross-sell intent 측정
2. 시험 결과 페이지 + `/wrong-answers` 페이지에도 같은 strip 노출 (학습 완료 사용자 cross-sell 적기)
3. v1.10 공무원 SEO 작업 효과를 30일 후 GSC로 재확인
4. cross-sell intent 데이터 보고 가장 클릭률 높은 직렬을 hero 위 announcement bar로 승격 검토
