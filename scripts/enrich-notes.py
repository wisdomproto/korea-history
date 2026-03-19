"""
Enrich summary notes using YouTube lecture transcripts + Gemini API.

For each note:
1. Download linked lecture subtitles
2. Send transcript to Gemini with the 발해 template format
3. Update note content with enriched HTML

Usage:
  python scripts/enrich-notes.py              # all deficient notes
  python scripts/enrich-notes.py s2-10 s2-11  # specific notes
  python scripts/enrich-notes.py --dry-run    # preview only
"""

import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

# ── Config ──
NOTES_DIR = Path("C:/projects/korea_history/data/notes")
LECTURES_PATH = Path("C:/projects/korea_history/web/data/note-lectures.json")
SUBS_DIR = Path("C:/projects/korea_history/temp-subs")
SUBS_DIR.mkdir(exist_ok=True)

# Load Gemini API key from author-tool .env
ENV_PATH = Path("C:/projects/korea_history/author-tool/.env")
GEMINI_KEY = ""
if ENV_PATH.exists():
    for line in ENV_PATH.read_text().splitlines():
        if line.startswith("GEMINI_API_KEY="):
            GEMINI_KEY = line.split("=", 1)[1].strip()

if not GEMINI_KEY:
    print("ERROR: GEMINI_API_KEY not found in author-tool/.env")
    sys.exit(1)


def download_subtitle(video_id: str, name: str) -> str | None:
    """Download Korean auto-subs, return transcript text."""
    srt_path = SUBS_DIR / f"{name}.ko.srt"

    if not srt_path.exists():
        try:
            subprocess.run(
                ["python", "-m", "yt_dlp", "--skip-download",
                 "--write-auto-sub", "--sub-lang", "ko",
                 "--sub-format", "srt", "--convert-subs", "srt",
                 "-o", str(SUBS_DIR / name),
                 f"https://www.youtube.com/watch?v={video_id}"],
                capture_output=True, encoding="utf-8", timeout=30,
            )
        except subprocess.TimeoutExpired:
            pass

    if not srt_path.exists():
        return None

    content = srt_path.read_text(encoding="utf-8")
    lines = []
    for block in re.split(r"\n\n+", content.strip()):
        parts = block.strip().split("\n")
        if len(parts) >= 3:
            lines.append(" ".join(parts[2:]))
    return " ".join(lines)


def call_gemini(prompt: str) -> str:
    """Call Gemini API and return text response."""
    import urllib.request
    import json as j

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_KEY}"
    body = j.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 4000},
    }).encode()

    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Content-Type", "application/json")

    try:
        resp = urllib.request.urlopen(req, timeout=60)
        data = j.loads(resp.read().decode())
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        print(f"    Gemini API error: {e}")
        return ""


TEMPLATE = """너는 한국사능력검정시험 요약노트 작성 전문가야.

아래 YouTube 강의 자막을 참고해서, "{title}" 요약노트 HTML을 작성해줘.

## 규칙
1. 강의에서 다루는 내용만 포함 (없는 내용 추가 금지)
2. 속성 시험 대비용이니 핵심만 간결하게
3. 표(table)를 적극 활용 (왕 업적, 비교 등)
4. 마지막에 "시험 핵심 키워드" 표 필수
5. HTML 형식: <details><summary><strong>이모지 제목</strong></summary><div class="content">...</div></details>
6. 키워드는 <span class="keyword">키워드</span>, 중요 포인트는 <span class="highlight">내용</span>
7. 참고사항은 <div class="note">⚡ 내용</div>
8. 하위 섹션은 <details class="sub-details"><summary>제목</summary><div class="content">...</div></details>
9. 전체 2000자 내외 (HTML 포함), 너무 길면 안 됨
10. <details> 태그로 시작하고 끝나야 함 (다른 wrapper 없이)
11. 코드블록(```) 없이 순수 HTML만 출력

## 관련 키워드 (시험에 나오는 것들)
{keywords}

## 강의 자막
{transcript}

## 현재 노트 내용 (참고용)
{current_content}

위 자막을 기반으로 요약노트 HTML을 작성해줘. 순수 HTML만 출력하고 다른 설명은 하지 마."""


def enrich_note(note_id: str, dry_run: bool = False) -> bool:
    """Enrich a single note. Returns True if updated."""
    # Load note
    note_path = NOTES_DIR / f"{note_id}.json"
    if not note_path.exists():
        print(f"    Note file not found: {note_path}")
        return False

    note = json.loads(note_path.read_text(encoding="utf-8"))

    # Load lectures
    lectures_data = json.loads(LECTURES_PATH.read_text(encoding="utf-8"))
    lectures = lectures_data["notes"].get(note_id, [])

    if not lectures:
        print(f"    No linked lectures")
        return False

    # Download and combine transcripts
    transcripts = []
    for i, lec in enumerate(lectures):
        print(f"    Downloading subtitle: {lec['title']}...", end=" ", flush=True)
        text = download_subtitle(lec["videoId"], f"note-{note_id}-{i}")
        if text:
            transcripts.append(text)
            print(f"OK ({len(text)} chars)")
        else:
            print("SKIP")

    if not transcripts:
        print(f"    No transcripts available")
        return False

    combined_transcript = "\n\n".join(transcripts)
    # Limit transcript to ~6000 chars for Gemini
    if len(combined_transcript) > 6000:
        combined_transcript = combined_transcript[:6000] + "..."

    # Strip HTML from current content for reference
    current_text = re.sub(r"<[^>]+>", "", note.get("content", ""))

    # Build prompt
    keywords = ", ".join(note.get("relatedKeywords", [])[:20])
    prompt = TEMPLATE.format(
        title=note["title"],
        keywords=keywords,
        transcript=combined_transcript,
        current_content=current_text[:1000],
    )

    if dry_run:
        print(f"    Would call Gemini with {len(prompt)} char prompt")
        return False

    # Call Gemini
    print(f"    Calling Gemini...", end=" ", flush=True)
    result = call_gemini(prompt)

    if not result:
        print("FAILED")
        return False

    # Clean up response - remove markdown code blocks if present
    result = re.sub(r"^```html?\s*\n?", "", result.strip())
    result = re.sub(r"\n?```\s*$", "", result.strip())

    # Validate it starts with <details>
    if not result.strip().startswith("<details"):
        print(f"INVALID (doesn't start with <details>)")
        print(f"    First 100 chars: {result[:100]}")
        return False

    new_text = re.sub(r"<[^>]+>", "", result)
    old_text = re.sub(r"<[^>]+>", "", note.get("content", ""))

    print(f"OK ({len(old_text)} → {len(new_text)} chars)")

    # Update note
    note["content"] = result
    note_path.write_text(json.dumps(note, ensure_ascii=False, indent=2), encoding="utf-8")
    return True


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry_run = "--dry-run" in sys.argv

    # Load index
    index = json.loads((NOTES_DIR / "index.json").read_text(encoding="utf-8"))

    if args:
        # Specific notes
        targets = args
    else:
        # All deficient notes (ratio < 15, sorted by worst first)
        targets_with_ratio = []
        for note in index:
            nid = note["id"]
            if nid == "s1-09":  # Already done
                continue
            path = NOTES_DIR / f"{nid}.json"
            if not path.exists():
                continue
            data = json.loads(path.read_text(encoding="utf-8"))
            text = re.sub(r"<[^>]+>", "", data.get("content", ""))
            q_count = note.get("questionCount", 0)
            ratio = len(text) / max(q_count, 1)
            if ratio < 15:
                targets_with_ratio.append((nid, ratio, len(text), q_count))

        targets_with_ratio.sort(key=lambda x: x[1])
        targets = [t[0] for t in targets_with_ratio]

        print(f"Found {len(targets)} notes to enrich")
        for nid, ratio, chars, qcount in targets_with_ratio[:10]:
            n = next(n for n in index if n["id"] == nid)
            print(f"  {nid:10s} {n['title'][:25]:25s} {chars:5d}chars / {qcount:3d}Q = {ratio:.1f}")
        if len(targets) > 10:
            print(f"  ... and {len(targets) - 10} more")
        print()

    success = 0
    failed = 0

    for i, nid in enumerate(targets):
        note_meta = next((n for n in index if n["id"] == nid), None)
        title = note_meta["title"] if note_meta else nid
        print(f"\n[{i+1}/{len(targets)}] {nid}: {title}")

        try:
            if enrich_note(nid, dry_run):
                success += 1
            else:
                failed += 1
        except Exception as e:
            print(f"    ERROR: {e}")
            failed += 1

        # Rate limit: 2 sec between API calls
        if not dry_run and i < len(targets) - 1:
            time.sleep(2)

    print(f"\n=== Done: {success} enriched, {failed} failed ===")


if __name__ == "__main__":
    main()
