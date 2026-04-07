# CBT 기출문제 데이터 — 구조 문서

## 개요

cbtbank.kr에서 크롤링한 CBT 자격시험 기출문제 데이터.

| 항목 | 수치 |
|------|------|
| 카테고리 (자격시험) | 728개 |
| 시험 | 15,767개 |
| 문제 | 1,004,324개 |
| 이미지 | 239,451개 |
| 전체 용량 | 약 5.9 GB |

### 카테고리 분포

| 유형 | 수 |
|------|-----|
| 기타 (수능, 자격증 등) | 181개 |
| 공무원 | 174개 |
| 기능사 | 125개 |
| 기사 | 118개 |
| 산업기사 | 105개 |
| 기능장 | 25개 |

---

## 폴더 구조

```
cbt_data/
├── _checkpoint.json              # 크롤링 체크포인트 (완료된 시험/카테고리 목록)
├── crawler.log                   # 크롤링 로그
├── json/
│   ├── _categories.json          # 전체 728개 카테고리 목록
│   ├── {카테고리명}.json          # 카테고리별 통합 파일 (730개)
│   │   예: 전기기능사.json, 정보처리기사.json
│   └── exams/
│       ├── {exam_id}.json        # 개별 시험 파일 (15,767개)
│       │   예: jo20160710.json, b420010923.json
│       └── ...
├── images/
│   ├── {prefix}/                 # 시험 코드 prefix별 폴더 (726개)
│   │   ├── {exam_id}/            # 시험별 이미지 폴더
│   │   │   ├── {exam_id}m{N}.gif        # 문제 N번 이미지
│   │   │   ├── {exam_id}m{N}b{M}.gif    # 문제 N번 선지 M 이미지
│   │   │   └── ...
│   │   └── ...
│   └── ...
└── summary_notes/                # 요약노트 (프로토타입, 1개)
    ├── b420010923_concepts.json  # 추출된 원시 개념
    ├── b420010923_topics.json    # 그룹핑된 주제
    ├── b420010923_summary.md     # 최종 요약노트 (Markdown)
    └── b420010923_summary.html   # HTML 미리보기
```

---

## JSON 파일 구조

### _categories.json

전체 카테고리(자격시험) 목록. 728개.

```json
[
  {
    "name": "전기기능사",
    "url": "https://cbtbank.kr/category/전기기능사"
  },
  {
    "name": "정보처리기사",
    "url": "https://cbtbank.kr/category/정보처리기사"
  }
]
```

> **참고**: `code`, `examCount`, `questionCount` 필드 없음.
> 저작도구 R2 업로드 시 전처리 스크립트로 보강 필요.

### 카테고리 통합 파일 ({카테고리명}.json)

한 자격시험의 모든 시험 + 문제를 하나의 파일에 통합.

```json
{
  "category": "전기기능사",
  "category_url": "https://cbtbank.kr/category/전기기능사",
  "exams": [Exam]
}
```

### 개별 시험 (exams/{exam_id}.json)

```json
{
  "exam_id": "jo20160710",
  "label": "전기기능사 (2016-07-10)",
  "date": "2016-07-10",
  "url": "https://cbtbank.kr/exam/jo20160710",
  "question_count": 60,
  "questions": [Question]
}
```

### Question 스키마

```json
{
  "question_id": "jo20160710-1",
  "number": 1,
  "text": "2전력계법으로 3상 전력을 측정할 때...",
  "images": null,
  "choices": [
    { "number": 1, "text": "600", "is_correct": false, "images": null },
    { "number": 2, "text": "300", "is_correct": false, "images": null },
    { "number": 3, "text": "400", "is_correct": true, "images": null },
    { "number": 4, "text": "500", "is_correct": false, "images": null }
  ],
  "correct_answer": 3,
  "answer_rate": 83.0,
  "explanation": "이 문제는 2전력계법으로 3상 전력을..."
}
```

#### 필드 설명

| 필드 | 타입 | 설명 |
|------|------|------|
| `question_id` | string | `{exam_id}-{number}` |
| `number` | number | 문제 번호 (1-based) |
| `text` | string | 문제 텍스트 |
| `images` | QuestionImage[] \| null | 문제 이미지 (없으면 null) |
| `choices` | Choice[] | 4~5지선다 |
| `correct_answer` | number | 정답 번호 (1-based) |
| `answer_rate` | number \| null | 정답률 (%, 예: 83.0) |
| `explanation` | string \| null | AI 해설 |

#### QuestionImage

```json
{
  "url": "https://cbtbank.kr/images/jo/jo20160710/jo20160710m5.gif",
  "local_path": "images/jo/jo20160710/jo20160710m5.gif"
}
```

#### Choice

```json
{
  "number": 1,
  "text": "600",
  "is_correct": false,
  "images": null
}
```

- `images`: 선지 이미지 (도면 비교 문제 등). 없으면 null.

---

## 이미지 명명 규칙

| 패턴 | 설명 | 예시 |
|------|------|------|
| `{exam_id}m{N}.gif` | 문제 N번 이미지 | `jo20160710m5.gif` |
| `{exam_id}m{N}b{M}.gif` | 문제 N번 선지 M 이미지 | `jo20160710m4b1.gif` |

---

## Exam ID 패턴

`{카테고리코드}{YYYYMMDD}` 형태.

| Prefix | 시험 유형 예시 |
|--------|--------------|
| `jo` | 전기기능사류 |
| `j3` | 정보처리산업기사 |
| `b4` | 대기환경기사 |
| `wc` | 9급 공무원 건축계획 |
| `wd` | 9급 공무원 건축구조 |

---

## 지문 유형

### 1. 텍스트만 (가장 많음)
```json
{ "text": "플레밍의 왼손법칙에서...", "images": null, "choices": [{ "text": "엄지", "images": null }] }
```

### 2. 텍스트 + 이미지 (도면/회로도)
```json
{ "text": "다음 회로에서 전류값은?", "images": [{ "url": "...", "local_path": "..." }] }
```

### 3. 이미지 선지 (도면 비교)
```json
{ "choices": [{ "text": "", "images": [{ "url": "...", "local_path": "..." }] }] }
```

---

## _checkpoint.json

크롤링 재시작용 체크포인트.

```json
{
  "completed_exams": ["b220051126", "b220060603", ...],
  "completed_categories": ["9급 국가직 공무원 건축계획", ...]
}
```

- `completed_exams`: 15,767개
- `completed_categories`: 727개

---

## 참고

- 크롤러: `gcnote/cbt_crawler.py`
- 원본 사이트: https://cbtbank.kr
- 저작도구 연동 스펙: `docs/superpowers/specs/2026-04-06-cbt-exam-data-spec.md`
- 저작도구 R2 업로드 시 `_categories.json`에 `code`, `examCount`, `questionCount` 필드 보강 필요
