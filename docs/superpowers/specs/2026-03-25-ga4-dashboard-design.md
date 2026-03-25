# GA4 대시보드 — 저작도구 통합 설계

**날짜**: 2026-03-25
**상태**: 구현 완료 (Phase B)
**범위**: Phase B (마케팅 의사결정용), Phase C(KPI 연동)는 추후 확장

## 1. 개요

저작도구(author-tool)의 기본 진입 화면(홈)으로 GA4 데이터 대시보드를 추가한다. Google Analytics Data API v1을 통해 gcnote.co.kr의 트래픽/유입/행동 데이터를 서버 사이드에서 조회하고, React 프론트엔드에서 시각화한다.

### 목표
- 저작도구 열면 바로 사이트 현황 파악
- 마케팅 채널별 효과 비교 (UTM 기반)
- 시험 시즌 vs 비시즌 성과 비교
- 데이터 기반 마케팅 의사결정 지원

### 범위 (Phase B)
- KPI 카드: 세션, 사용자, 페이지뷰, 평균 체류시간
- 채널별 유입 (Organic/Direct/Referral/Social/Paid)
- 인기 페이지 TOP 10
- UTM 캠페인별 유입 비교
- 기기별 분석 (모바일/데스크톱/태블릿)
- 시간대별 트래픽 패턴

### 범위 밖 (Phase C — 추후)
- 커스텀 이벤트 추적 (exam_start, exam_complete 등)
- 전환 퍼널 시각화
- 재방문율/코호트 분석
- 실시간 모니터링

### 설계 결정 사항
- **차트 렌더링**: CSS-only (Tailwind div 기반 바 차트). 기존 StatsPanel과 동일한 패턴. 라이브러리 미도입.
- **기존 StatsPanel**: `'dashboard'` 뷰(시험/키워드 통계)는 그대로 유지. `'analytics'`를 새 ActiveView로 추가하여 초기 진입 화면으로 설정. StatsPanel은 프로젝트 선택 후 접근 가능.
- **"오늘" 데이터**: GA4 Data API는 24~48시간 지연 가능. UI에 "(지연될 수 있음)" 라벨 표시. Phase C에서 Realtime API로 전환 고려.
- **"오늘" 비교 기간**: 어제와 비교.
- **API 응답 포맷**: 기존 패턴 따라 `{ success: true, data: ... }` envelope 사용.
- **파일 네이밍**: `analytics.routes.ts` + `/api/analytics` prefix (기존 네이밍 컨벤션 일치).

## 2. 아키텍처

```
gcnote.co.kr (GA4 태그)
    → Google Analytics (G-CJ7V236NQV)
        → GA4 Data API v1 (서비스 계정 인증)
            → author-tool Express 서버 (ga4.service.ts)
                → 인메모리 캐싱
                    → React 프론트엔드 (AnalyticsDashboard)
```

### 인증 방식
- Google Cloud 서비스 계정 (JSON 키 파일)
- GA4 속성에 서비스 계정 이메일을 뷰어로 추가
- 서버 사이드에서만 API 호출 (키가 클라이언트에 노출되지 않음)

### 캐싱 전략 (하이브리드)
| 기간 | 캐시 TTL | 이유 |
|------|---------|------|
| 오늘 | 캐시 없음 (실시간) | 마케팅 실행 직후 즉시 확인 필요 |
| 7일/30일/90일 | 1시간 | 과거 데이터는 변하지 않음 |
| 시험 시즌 프리셋 | 1시간 | 과거 기간 |

수동 새로고침 버튼으로 캐시 무효화 가능.

## 3. 백엔드 설계

### 환경변수 (author-tool/.env)
```
GA4_PROPERTY_ID=123456789
GA4_SERVICE_ACCOUNT_KEY=./ga4-key.json
```

`GA4_SERVICE_ACCOUNT_KEY`는 파일 경로 또는 JSON 문자열 모두 지원.
- **로컬**: `./ga4-key.json` 파일 경로 (`.gitignore`에 추가)
- **Railway 배포**: JSON 문자열을 환경변수로 직접 설정 (Railway는 파일 시스템이 ephemeral)

**config.ts 통합 (필수)**: 기존 `config.ts` 패턴에 따라 `process.env`를 직접 읽지 않고 config 객체에 추가:
```typescript
ga4: {
  propertyId: process.env.GA4_PROPERTY_ID ?? '',
  serviceAccountKey: process.env.GA4_SERVICE_ACCOUNT_KEY ?? '',
},
```

### 새 파일

#### `server/services/ga4.service.ts`
GA4 Data API 래퍼 서비스.

**의존성**: `@google-analytics/data` npm 패키지

**주요 함수**:
```typescript
// GA4 클라이언트 초기화 (서비스 계정)
initClient(): BetaAnalyticsDataClient

// 핵심 KPI 조회
getOverview(startDate: string, endDate: string): Promise<OverviewData>
// → metrics: sessions, totalUsers, screenPageViews, averageSessionDuration
// → 이전 동일 기간 대비 변화율 계산 포함

// 채널별 유입
getChannelBreakdown(startDate: string, endDate: string): Promise<ChannelData[]>
// → dimension: sessionDefaultChannelGroup
// → metric: sessions
// → 상위 10개, 비율 계산

// 인기 페이지 TOP N
getTopPages(startDate: string, endDate: string, limit?: number): Promise<PageData[]>
// → dimension: pagePath
// → metric: screenPageViews
// → 기본 limit: 10

// UTM 캠페인별
getCampaigns(startDate: string, endDate: string): Promise<CampaignData[]>
// → dimensions: sessionSource, sessionMedium, sessionCampaignName
// → metric: sessions

// 기기별
getDeviceBreakdown(startDate: string, endDate: string): Promise<DeviceData[]>
// → dimension: deviceCategory
// → metric: sessions

// 시간대별
getHourlyPattern(startDate: string, endDate: string): Promise<HourlyData[]>
// → dimension: hour
// → metric: sessions

// 통합 대시보드 데이터 (위 6개를 병렬 호출)
getDashboard(startDate: string, endDate: string): Promise<DashboardData>
```

**캐싱**: `Map<string, { data: any, expiry: number }>` 인메모리 캐시. 키는 `${method}:${startDate}:${endDate}`.

**GA4 API 쿼터**: 기본 200 requests/100초. `getDashboard()`가 6개 병렬 호출하므로 1회 요청 = 6 API 콜. 새로고침 버튼에 1초 디바운스 적용하여 과다 호출 방지.

**비교 기간 계산**: 7일 선택 시 이전 7일과 비교하여 변화율(%) 자동 계산.

#### `server/routes/analytics.routes.ts`
REST API 엔드포인트. `server/index.ts`에 `app.use('/api/analytics', analyticsRoutes)` 등록 필요.

```
GET /api/analytics/dashboard?start=2026-03-18&end=2026-03-25
  → 전체 대시보드 데이터 (6개 위젯 통합)

GET /api/analytics/overview?start=...&end=...
  → KPI 카드 데이터만

POST /api/analytics/refresh
  → 캐시 전체 무효화

GET /api/analytics/presets
  → 사용 가능한 기간 프리셋 목록 (시험 시즌 포함)
```

#### `server/services/exam-season.service.ts`
시험 시즌 프리셋 계산.

```typescript
// 시험 일정 데이터 (하드코딩 또는 설정 파일)
const EXAM_SCHEDULE_2026 = [
  { id: 78, date: '2026-05-23', name: '제78회' },
  { id: 79, date: '2026-08-09', name: '제79회' },
  // ...
]

// 시즌 기간 계산 (D-14 ~ D+7)
getSeasonPresets(): SeasonPreset[]
// → { id: 78, name: '78회 시즌', startDate: '2026-05-09', endDate: '2026-05-30' }
```

### 에러 처리
- GA4 키 미설정 시: 대시보드에 "GA4 연동 필요" 안내 표시 (에러가 아닌 온보딩)
- API 호출 실패 시: 캐시된 데이터가 있으면 캐시 반환 + "데이터가 오래됐을 수 있습니다" 표시
- 쿼터 초과 시: 에러 메시지 + 다음 자동 재시도 시간 표시

## 4. 프론트엔드 설계

### 새 파일

#### `src/features/analytics/` 폴더 구조
```
src/features/analytics/
├── api/
│   └── analytics.api.ts        — Axios 래퍼
├── hooks/
│   └── useAnalytics.ts         — React Query 훅
├── components/
│   ├── AnalyticsDashboard.tsx  — 메인 대시보드 컨테이너
│   ├── DatePresetBar.tsx       — 기간 프리셋 + 시험 시즌 + 새로고침
│   ├── KpiCards.tsx            — 4개 KPI 카드 (세션/사용자/PV/체류시간)
│   ├── ChannelChart.tsx        — 채널별 유입 수평 바 차트
│   ├── TopPagesTable.tsx       — 인기 페이지 테이블
│   ├── CampaignTable.tsx       — UTM 캠페인 테이블
│   ├── DeviceChart.tsx         — 기기별 비율 바 차트
│   └── HourlyChart.tsx         — 시간대별 바 차트
└── types/
    └── analytics.types.ts      — 타입 정의
```

#### 라우팅 변경
- `editor.store.ts`의 `ActiveView`에 `'analytics'` 추가
- 저작도구 초기 진입 시 `activeView`를 `'analytics'`로 설정
- 사이드바에서 프로젝트 선택 없이 상단에 📊 버튼 또는 로고 클릭 시 대시보드로 이동

### 레이아웃

```
┌──────────────────────────────────────────────────┐
│ 📊 사이트 분석   [오늘][7일][30일][90일] | [🔥78회] [↻] │
├──────────────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐         │
│ │세션   │ │사용자│ │페이지뷰│ │평균 체류시간│         │
│ │1,247 │ │892   │ │4,821 │ │3:42      │         │
│ │▲23%  │ │▲15%  │ │▼5%   │ │▲8%       │         │
│ └──────┘ └──────┘ └──────┘ └──────────┘         │
├────────────────────┬─────────────────────────────┤
│ 📡 채널별 유입      │ 🔥 인기 페이지 TOP 10        │
│ (수평 바 차트)      │ (테이블)                     │
├──────────┬─────────┴──┬──────────────────────────┤
│ 🎯 UTM   │ 📱 기기별   │ 🕐 시간대별               │
│ 캠페인별  │ (바 차트)   │ (24시간 바 차트)           │
└──────────┴────────────┴──────────────────────────┘
```

### 데이터 흐름
1. 대시보드 마운트 → `useAnalytics('dashboard', { start, end })` 호출
2. React Query가 `/api/analytics/dashboard?start=...&end=...` fetch
3. 서버가 GA4 API 6개 병렬 호출 (또는 캐시 반환)
4. 응답을 각 위젯 컴포넌트에 분배
5. 기간 프리셋 변경 시 start/end 재계산 → 자동 refetch
6. 새로고침 버튼 → `POST /api/analytics/refresh` → queryClient.invalidateQueries

### React Query 설정
```typescript
queryKey: ['analytics', 'dashboard', startDate, endDate]
staleTime: 5 * 60 * 1000  // 5분 (서버 캐시와 별개로 클라이언트 중복 요청 방지)
refetchOnWindowFocus: false // 탭 전환 시 불필요한 재호출 방지
```

### 로딩/에러 상태
- 로딩: 각 위젯에 스켈레톤 UI (회색 펄스)
- 에러: 위젯별 에러 메시지 (전체가 아닌 개별 실패 처리)
- GA4 미연동: 온보딩 카드 ("GA4 연동하기" 가이드 + 환경변수 설정 안내)

## 5. 타입 정의

```typescript
// 기간 프리셋
type DatePreset = 'today' | '7d' | '30d' | '90d' | `season-${number}`

// KPI 카드
interface KpiData {
  sessions: number
  users: number
  pageViews: number
  avgSessionDuration: number // 초 단위
  changes: {
    sessions: number    // % 변화
    users: number
    pageViews: number
    avgSessionDuration: number
  }
}

// 채널별
interface ChannelData {
  channel: string   // 'Organic Search' | 'Direct' | 'Referral' | ...
  sessions: number
  percentage: number
}

// 인기 페이지
interface PageData {
  path: string
  pageViews: number
}

// UTM 캠페인
interface CampaignData {
  source: string
  medium: string
  campaign: string
  sessions: number
}

// 기기별
interface DeviceData {
  device: 'mobile' | 'desktop' | 'tablet'
  sessions: number
  percentage: number
}

// 시간대별
interface HourlyData {
  hour: number    // 0-23
  sessions: number
}

// 시험 시즌 프리셋
interface SeasonPreset {
  id: number
  name: string      // '78회 시즌'
  startDate: string // 'YYYY-MM-DD'
  endDate: string
}

// 통합 대시보드
interface DashboardData {
  overview: KpiData
  channels: ChannelData[]
  topPages: PageData[]
  campaigns: CampaignData[]
  devices: DeviceData[]
  hourly: HourlyData[]
  cachedAt?: string  // 캐시 시점 (없으면 실시간)
}
```

## 6. 사전 준비 (Google Cloud)

1. [Google Cloud Console](https://console.cloud.google.com) → 프로젝트 생성 또는 선택
2. "Google Analytics Data API" 검색 → 활성화
3. IAM & Admin → 서비스 계정 → 새 서비스 계정 생성
4. 서비스 계정 → 키 → JSON 키 생성 → 다운로드
5. [GA4 관리](https://analytics.google.com) → 속성 설정 → 속성 액세스 관리 → 서비스 계정 이메일 추가 (뷰어 역할)
6. 키 파일을 `author-tool/ga4-key.json`에 배치
7. `.gitignore`에 `ga4-key.json` 추가
8. `author-tool/.env`에 `GA4_PROPERTY_ID`와 `GA4_SERVICE_ACCOUNT_KEY` 추가

## 7. Phase C 확장 포인트

현재 설계에서 Phase C를 위해 고려해둘 사항:

- `ga4.service.ts`의 `getDashboard()`는 호출할 메서드를 쉽게 추가할 수 있는 구조로 설계
- `DashboardData` 타입에 optional 필드로 Phase C 데이터 슬롯 예약 가능
- `AnalyticsDashboard.tsx`는 위젯 기반 그리드로, 새 위젯 컴포넌트를 추가하기만 하면 확장
- 커스텀 이벤트 (exam_start 등)는 웹사이트에 이벤트 코드를 먼저 심은 후, 같은 GA4 API로 조회 가능
