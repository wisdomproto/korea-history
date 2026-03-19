"""
Fix notes that have meta-text about YouTube transcripts or are too short.
Re-generate using Gemini with knowledge-only prompt (no transcript reference).

Usage: python scripts/fix-notes.py
"""

import json
import os
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


def call_gemini(prompt: str) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_KEY}"
    body = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 5000},
    }).encode()

    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Content-Type", "application/json")

    try:
        resp = urllib.request.urlopen(req, timeout=90)
        data = json.loads(resp.read().decode())
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        print(f"    Gemini error: {e}")
        return ""


PROMPT = """너는 한국사능력검정시험 요약노트 작성 전문가야.

"{title}" 에 대한 요약노트 HTML을 작성해줘.

## 필수 규칙
1. 한국사능력검정시험 시험 대비용 — 핵심만 간결하게
2. 절대로 "자막", "YouTube", "강의", "제공된" 같은 단어 사용 금지
3. 표(table)를 적극 활용
4. 마지막에 "시험 핵심 키워드" 정리표 필수
5. HTML만 출력 (```코드블록 없이)
6. <details><summary><strong>이모지 제목</strong></summary><div class="content">내용</div></details> 형식
7. 키워드: <span class="keyword">키워드</span>
8. 중요 포인트: <span class="highlight">내용</span>
9. 참고: <div class="note">⚡ 내용</div>
10. 하위: <details class="sub-details"><summary>제목</summary><div class="content">내용</div></details>
11. 1500~2500자 내외
12. 첫 줄이 <details> 태그로 시작해야 함

## 시험에 나오는 관련 키워드
{keywords}

## 시대
{era}

순수 HTML만 출력해. 다른 설명 없이."""


def find_problem_notes():
    """Find notes with meta-text or too short content."""
    index = json.loads((NOTES_DIR / "index.json").read_text(encoding="utf-8"))
    problems = []

    for note_meta in index:
        nid = note_meta["id"]
        path = NOTES_DIR / f"{nid}.json"
        if not path.exists():
            continue

        note = json.loads(path.read_text(encoding="utf-8"))
        content = note.get("content", "")
        text = re.sub(r"<[^>]+>", "", content)

        has_problem = False
        if "강의 자막" in text or "제공된" in text and "자막" in text:
            has_problem = True
        if "YouTube" in text or "유튜브" in text:
            has_problem = True
        if "포함되어 있지 않습니다" in text or "비어 있습니다" in text:
            has_problem = True
        if len(text) < 150:
            has_problem = True

        if has_problem:
            problems.append(nid)

    return problems


def fix_note(nid: str) -> bool:
    path = NOTES_DIR / f"{nid}.json"
    note = json.loads(path.read_text(encoding="utf-8"))

    keywords = ", ".join(note.get("relatedKeywords", [])[:20])
    prompt = PROMPT.format(
        title=note["title"],
        keywords=keywords,
        era=note.get("eraLabel", ""),
    )

    print(f"    Calling Gemini...", end=" ", flush=True)
    result = call_gemini(prompt)

    if not result:
        print("FAILED")
        return False

    result = re.sub(r"^```html?\s*\n?", "", result.strip())
    result = re.sub(r"\n?```\s*$", "", result.strip())

    if not result.strip().startswith("<details"):
        print(f"INVALID")
        return False

    # Verify no forbidden words
    text = re.sub(r"<[^>]+>", "", result)
    forbidden = ["자막", "YouTube", "유튜브", "제공된", "강의 내용"]
    for word in forbidden:
        if word in text:
            print(f"CONTAINS '{word}' - cleaning...")
            # Remove lines with forbidden words
            lines = result.split("\n")
            result = "\n".join(l for l in lines if word not in re.sub(r"<[^>]+>", "", l))

    old_text = re.sub(r"<[^>]+>", "", note.get("content", ""))
    new_text = re.sub(r"<[^>]+>", "", result)
    print(f"OK ({len(old_text)} → {len(new_text)} chars)")

    note["content"] = result
    path.write_text(json.dumps(note, ensure_ascii=False, indent=2), encoding="utf-8")
    return True


def main():
    targets = sys.argv[1:] if len(sys.argv) > 1 else find_problem_notes()
    print(f"Fixing {len(targets)} notes\n")

    success = 0
    for i, nid in enumerate(targets):
        path = NOTES_DIR / f"{nid}.json"
        note = json.loads(path.read_text(encoding="utf-8"))
        print(f"[{i+1}/{len(targets)}] {nid}: {note['title']}")

        if fix_note(nid):
            success += 1

        if i < len(targets) - 1:
            time.sleep(2)

    print(f"\n=== Done: {success}/{len(targets)} fixed ===")


if __name__ == "__main__":
    main()
