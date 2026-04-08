# CBT 요약노트 생성 시스템

## 개요

기출문제에서 핵심 개념을 추출하고, Google Search로 보강하여 교과서급 요약노트를 자동 생성하는 시스템.

## 파이프라인

```
기출문제 (5회분, ~500문제)
    ↓
[Step 1] Gemini + Google Search Grounding으로 개념 추출
    - 5문제씩 배치, 1.2초 간격
    - 각 문제 → topic, subtopic, concept, key_terms
    - 웹 검색으로 부족한 정보 보강
    ↓
[Step 2] 주제별 그룹핑
    - 같은 topic → 하나로 통합
    - frequency(출제 빈도) 계산
    - 빈도순 정렬
    ↓
[Step 3] 교과서 형태로 polish (25개 주제씩 배치)
    - Gemini + Google Search Grounding
    - 해설 문체 X → 교과서 문체 (~이다, ~한다)
    - 정의, 원리, 예시, 비교표, 공식 포함
    - 세부주제 최소 200자, 핵심 주제 500자+
    ↓
[Step 4] 한능검 HTML 형식으로 래핑
    - details/summary 접이식 구조
    - highlight, keyword, note, table 스타일
    - CSS 내장 완전한 HTML 페이지
```

## 생성된 파일

### 정보처리산업기사 (첫 번째 테스트)

| 파일 | 설명 | 크기 |
|------|------|------|
| `정보처리산업기사_concepts_full.json` | 추출된 개념 원본 (490개) | 424KB |
| `정보처리산업기사_topics.json` | 그룹핑된 주제 (131개, 5회분 첫 버전) | 345KB |
| `정보처리산업기사_full.html` | **완전판 요약노트** (260개 주제, CSS 포함) | 122KB |
| `정보처리산업기사_summary_polished.html` | polish 테스트 버전 (30개 주제) | 19KB |
| `정보처리산업기사_summary.html` | quick 모드 버전 (131개 주제, CSS 없음) | 399KB |

### R2 저장 위치

```
korea-history-data/cbt/정보처리산업기사/summary-notes/
├── _index.json                          # 노트 목록
└── sn-정보처리산업기사-full.json         # 완전판 노트 데이터
```

## 비용 & 성능

### 정보처리산업기사 (실측, 5회분 500문제)

| 항목 | 수치 |
|------|------|
| 개념 추출 | 490/500 (98%) |
| 추출 시간 | ~50분 |
| 주제 수 | 260개 |
| polish 시간 | ~13분 (11배치) |
| 총 시간 | 63분 |
| 비용 | ~$0.50 |

### 미사용 시험 커버리지 (5개 시험으로 검증)

| 시험 | 커버리지 |
|------|---------|
| 2018-08-19 | 97% |
| 2018-04-28 | 99% |
| 2018-03-04 | 97% |
| 2017-08-26 | 99% |
| 2017-05-07 | 99% |
| **평균** | **98.2%** |

### 전체 728개 시험 추정

| 항목 | 수치 |
|------|------|
| 총 비용 | ~$250-300 |
| 총 시간 | ~26시간 |
| 카테고리당 평균 | $0.32, 2.1분 |

## 스크립트

| 스크립트 | 설명 | 사용법 |
|----------|------|--------|
| `generate-summary-note.ts` | 개별 실행 (개념 추출 + quick/polish) | `--category=X --exams=5` |
| `full-summary-note.ts` | 완전판 생성 (전체 커버) | `--category=X --exams=5 --model=gemini-3-flash-preview` |
| `polish-summary-note.ts` | 기존 topics.json에서 polish만 | `카테고리명 모델명` |
| `save-note-to-r2.ts` | HTML을 R2에 수동 저장 | `카테고리명` |

## 저작도구 통합

- CBT 프로젝트 → 시험 패널 → **📖 요약노트 만들기** 버튼
- 범위: 전체 회차 (자동으로 5개) / 선택한 시험만
- 모드: 빠른 생성 (quick) / 고품질 (polish + grounding)
- SSE 스트리밍으로 실시간 진행률 표시
- 생성 완료 후 사이드바 📝 노트 탭에서 확인

## 기술 참고

- Gemini 2.5 Flash가 503 자주 뜸 → gemini-3-flash-preview로 fallback
- Google Search Grounding: `tools: [{ googleSearch: {} }]` 옵션
- 개념 추출 프롬프트에 "웹 검색으로 보충" 지시 필수
- polish 프롬프트에 "해설 문체 금지, 교과서 문체" 명시 필수
- 한능검 HTML 클래스: highlight, keyword, note, sub-details, content
