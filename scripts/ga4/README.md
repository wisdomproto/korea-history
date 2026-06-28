# GA4 데이터 조회 도구

gcnote.co.kr 의 Google Analytics 4 데이터를 직접 쿼리하는 스크립트.
유료화/구독 의사결정에 필요한 행동 지표(재방문율, engagement, 시즌별 트래픽)를 뽑는 용도.

## 1회 세팅 (사용자가 직접 해야 하는 부분)

GA4 Data API 는 측정 ID(`G-CJ7V236NQV`)가 아니라 **숫자 Property ID** 와
**서비스 계정**이 필요하다.

### A. 서비스 계정 + 키 만들기
1. https://console.cloud.google.com → 프로젝트 선택(없으면 생성)
2. "API 및 서비스" → "라이브러리" → **Google Analytics Data API** 검색 후 **사용 설정**
3. "API 및 서비스" → "사용자 인증 정보" → "사용자 인증 정보 만들기" → **서비스 계정**
4. 이름 아무거나 (예: `ga4-reader`) → 만들기 → 역할 없이 완료
5. 만든 서비스 계정 클릭 → "키" 탭 → "키 추가" → "새 키 만들기" → **JSON** → 다운로드
6. 받은 JSON 파일을 이 폴더에 **`service-account.json`** 이름으로 저장
   (gitignore 처리됨 — 절대 커밋 안 됨)

### B. GA4 에 그 서비스 계정 권한 주기
1. https://analytics.google.com → 관리(좌하단 톱니) → "속성 액세스 관리"
2. "+" → 서비스 계정 이메일 추가 (JSON 안의 `client_email` 값,
   예: `ga4-reader@프로젝트.iam.gserviceaccount.com`)
3. 역할: **뷰어** 로 충분
4. 같은 관리 화면 "속성 설정" 에서 **속성 ID(숫자)** 복사

### C. Property ID 알려주기
`service-account.json` 저장 + 속성 ID 만 알려주면 나머지는 스크립트가 처리.

## 사용법

```bash
pip install -r requirements.txt
export GA4_PROPERTY_ID=숫자ID            # Windows PowerShell: $env:GA4_PROPERTY_ID="숫자ID"

# 핵심 지표 개요 (기간 지정)
python ga4.py overview --start 2026-05-01 --end 2026-05-31

# 신규 vs 재방문 (구독 의향의 핵심 지표)
python ga4.py retention --start 2026-05-01 --end 2026-05-31

# 일자별 트래픽 (시즌 곡선 확인)
python ga4.py timeseries --start 2025-05-01 --end 2026-06-22 --granularity month

# 페이지별 engagement (어떤 기능이 붙잡는지)
python ga4.py pages --start 2026-05-01 --end 2026-05-31 --limit 30
```
