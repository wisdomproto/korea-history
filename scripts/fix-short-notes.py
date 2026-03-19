"""
Re-generate all notes under 500 chars with more detailed content.
"""

import json
import re
import sys
import time
import urllib.request
from pathlib import Path

NOTES_DIR = Path("C:/projects/korea_history/data/notes")
ENV_PATH = Path("C:/projects/korea_history/author-tool/.env")
GEMINI_KEY = ""
for line in ENV_PATH.read_text().splitlines():
    if line.startswith("GEMINI_API_KEY="):
        GEMINI_KEY = line.split("=", 1)[1].strip()

MIN_CHARS = int(sys.argv[1]) if len(sys.argv) > 1 else 500


def call_gemini(prompt: str) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_KEY}"
    body = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": 8000},
    }).encode()
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Content-Type", "application/json")
    try:
        resp = urllib.request.urlopen(req, timeout=120)
        data = json.loads(resp.read().decode())
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        print(f"    Gemini error: {e}")
        return ""


PROMPT = """너는 한국사능력검정시험 속성 요약노트 작성 전문가야.

"{title}" ({era}) 에 대한 요약노트를 작성해줘.

## 규칙
1. 한능검 시험에 자주 출제되는 핵심 내용 위주
2. 표(table)를 적극 활용 — 왕 업적, 비교, 제도 등
3. 분량: 순수 텍스트 기준 1500~3000자 (충분히 상세하게)
4. 마지막에 반드시 "📌 시험 핵심 키워드" 정리표 포함
5. 절대 금지: "자막", "YouTube", "유튜브", "강의", "제공된" 등 출처 언급
6. HTML만 출력 (```코드블록 없이)

## HTML 형식
- 대섹션: <details><summary><strong>이모지 제목</strong></summary><div class="content">내용</div></details>
- 소섹션: <details class="sub-details"><summary>제목</summary><div class="content">내용</div></details>
- 키워드: <span class="keyword">키워드</span>
- 강조: <span class="highlight">내용</span>
- 참고박스: <div class="note">⚡ 내용</div>
- 표: <table><thead><tr><th>...</th></tr></thead><tbody>...</tbody></table>

## 관련 키워드 (시험 출제)
{keywords}

{extra_context}

첫 줄을 <details>로 시작해. 다른 설명 없이 HTML만 출력해."""


def get_extra_context(nid, title):
    """Provide topic-specific guidance for better content."""
    contexts = {
        's1-02': '부여(영고, 순장, 1책12가), 고구려(서옥제, 동맹), 옥저(민며느리제, 골장제), 동예(책화, 무천, 단궁), 삼한(소도, 천군, 벼농사) 각각의 특징을 표로 비교',
        's1-03': '단군신화, 8조법금, 위만조선 건국, 한사군 설치, 비파형동검/세형동검/미송리식토기 등 유물',
        's1-04': '고구려(소수림왕~장수왕), 백제(근초고왕~성왕~의자왕), 신라(내물왕~법흥왕~진흥왕~선덕여왕~무열왕~문무왕) 왕별 업적을 표로 정리',
        's1-06': '고구려(대대로, 10만 관등), 백제(16관등, 6좌평, 22담로), 신라(17관등, 골품제, 화백회의) 비교표',
        's1-07': '무열왕~혜공왕까지 주요 왕 업적표. 신문왕(녹읍 폐지, 9주5소경, 국학), 성덕왕(정전), 경덕왕(녹읍 부활) 등',
        's1-10': '불교(수용시기 비교: 고구려372 백제384 신라527), 유교(태학, 임신서기석), 도교, 풍수지리 정리',
        's2-03': '태조~공민왕까지 왕별 업적표 (태조: 호족통합, 광종: 과거제/노비안검법, 성종: 최승로/12목, 현종 등)',
        's2-06': '무신정변(1170) → 최씨정권(최충헌~최우~최항~최의) → 삼별초항쟁 → 원간섭기(정동행성, 쌍성총관부) 흐름',
        's3-01': '위화도회군(1388) → 과전법(1391) → 조선건국(1392) → 한양천도(1394) → 경국대전 흐름',
        's3-02': '태조~성종 왕별 업적표. 태종(6조직계제, 호패법), 세종(한글, 집현전), 세조(직전법, 6조직계제), 성종(경국대전 완성)',
        's6-01': '1910년대(무단통치: 헌병경찰, 토지조사사업), 1920년대(문화통치: 치안유지법, 산미증식계획), 1930년대~(민족말살: 황국신민화, 창씨개명, 징병제) 비교표',
    }
    ctx = contexts.get(nid, '')
    if ctx:
        return f"## 포함해야 할 핵심 내용\n{ctx}"
    return ""


def main():
    index = json.loads((NOTES_DIR / "index.json").read_text(encoding="utf-8"))

    targets = []
    for note_meta in index:
        nid = note_meta["id"]
        path = NOTES_DIR / f"{nid}.json"
        if not path.exists(): continue
        note = json.loads(path.read_text(encoding="utf-8"))
        text = re.sub(r"<[^>]+>", "", note.get("content", ""))
        if len(text) < MIN_CHARS:
            targets.append((nid, note_meta["title"], len(text)))

    targets.sort(key=lambda x: x[2])
    print(f"Found {len(targets)} notes under {MIN_CHARS} chars\n")

    success = 0
    for i, (nid, title, old_len) in enumerate(targets):
        print(f"[{i+1}/{len(targets)}] {nid}: {title} ({old_len} chars)")

        path = NOTES_DIR / f"{nid}.json"
        note = json.loads(path.read_text(encoding="utf-8"))
        keywords = ", ".join(note.get("relatedKeywords", [])[:25])
        extra = get_extra_context(nid, title)

        prompt = PROMPT.format(
            title=note["title"],
            era=note.get("eraLabel", ""),
            keywords=keywords,
            extra_context=extra,
        )

        print(f"    Calling Gemini...", end=" ", flush=True)
        result = call_gemini(prompt)

        if not result:
            print("FAILED")
            continue

        result = re.sub(r"^```html?\s*\n?", "", result.strip())
        result = re.sub(r"\n?```\s*$", "", result.strip())

        if not result.strip().startswith("<details"):
            print(f"INVALID (starts with: {result[:50]})")
            continue

        # Check for forbidden words
        text = re.sub(r"<[^>]+>", "", result)
        forbidden = ["자막", "YouTube", "유튜브", "제공된", "강의 내용"]
        clean = True
        for word in forbidden:
            if word in text:
                print(f"CONTAINS '{word}'")
                clean = False
                break

        if not clean:
            continue

        new_len = len(text)
        print(f"OK ({old_len} → {new_len} chars)")

        note["content"] = result
        path.write_text(json.dumps(note, ensure_ascii=False, indent=2), encoding="utf-8")
        success += 1

        if i < len(targets) - 1:
            time.sleep(2)

    print(f"\n=== Done: {success}/{len(targets)} fixed ===")


if __name__ == "__main__":
    main()
