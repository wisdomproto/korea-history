"""
Batch: Find YouTube videos for all exams and extract per-question timestamps.

For each exam:
1. Search YouTube for "최태성 1TV 별해설심화{N}회"
2. Download Korean auto-captions
3. Extract answer signals from captions
4. Align with correct answer sequence using DP
5. Derive question start times

Output: web/data/youtube-videos.json

Usage: python scripts/build-youtube-timestamps.py
"""

import json
import re
import subprocess
import sys
import time
from pathlib import Path

DATA_DIR = Path("C:/projects/korea_history/data/questions")
OUTPUT_PATH = Path("C:/projects/korea_history/web/data/youtube-videos.json")
SUBS_DIR = Path("C:/projects/korea_history/temp-subs")
SUBS_DIR.mkdir(exist_ok=True)


# ── YouTube helpers ──

def search_youtube(exam_number: int) -> dict | None:
    """Search YouTube for exam video, return {id, title, duration}."""
    # Try "별해설심화{N}" first (newer format)
    queries = [
        f"ytsearch:최태성 1TV 별해설심화{exam_number} 한능검",
        f"ytsearch:최태성 1TV 제{exam_number}회 한능검 심화 해설",
        f"ytsearch:최태성 제{exam_number}회 한국사능력검정시험 심화 해설",
    ]

    for query in queries:
        try:
            result = subprocess.run(
                ["python", "-m", "yt_dlp", "--skip-download", "--dump-json", query],
                capture_output=True, encoding="utf-8", timeout=30,
            )
            if result.stdout:
                d = json.loads(result.stdout)
                title = d.get("title", "")
                channel = d.get("channel", "")

                # Verify it's the right video
                if "최태성" in channel or "1TV" in channel:
                    # Check exam number in title
                    if (f"심화{exam_number}" in title.replace(" ", "") or
                        f"{exam_number}회" in title or
                        f"{exam_number}]" in title):
                        return {
                            "id": d["id"],
                            "title": title,
                            "duration": d.get("duration", 0),
                            "channel": channel,
                        }
        except (subprocess.TimeoutExpired, json.JSONDecodeError):
            continue

    return None


def download_subtitles(video_id: str, exam_number: int) -> Path | None:
    """Download Korean auto-captions as SRT."""
    out_path = SUBS_DIR / f"exam-{exam_number}"
    srt_path = SUBS_DIR / f"exam-{exam_number}.ko.srt"

    if srt_path.exists():
        return srt_path

    try:
        subprocess.run(
            ["python", "-m", "yt_dlp",
             "--skip-download",
             "--write-auto-sub",
             "--sub-lang", "ko",
             "--sub-format", "srt",
             "--convert-subs", "srt",
             "-o", str(out_path),
             f"https://www.youtube.com/watch?v={video_id}"],
            capture_output=True, encoding="utf-8", timeout=30,
        )
    except subprocess.TimeoutExpired:
        pass

    if srt_path.exists():
        return srt_path
    return None


# ── SRT parsing ──

def parse_srt(path: Path) -> list[tuple[int, str]]:
    content = path.read_text(encoding="utf-8")
    entries = []
    for block in re.split(r"\n\n+", content.strip()):
        lines = block.strip().split("\n")
        if len(lines) >= 3:
            m = re.match(r"(\d+):(\d+):(\d+),(\d+)\s*-->", lines[1])
            if m:
                sec = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + int(m.group(3))
                entries.append((sec, " ".join(lines[2:])))
    return entries


# ── Answer extraction & alignment ──

def extract_answer_signals(entries: list[tuple[int, str]]) -> list[tuple[int, int]]:
    """Extract (time, answer_number) from subtitles."""
    signals = []
    for sec, text in entries:
        m = re.search(r"정답은?\s*(\d)번", text)
        if m:
            signals.append((sec, int(m.group(1))))
            continue
        m = re.search(r"(\d)번\s*고르시면", text)
        if m:
            signals.append((sec, int(m.group(1))))
            continue
        m = re.search(r"([1-5])번입니다", text)
        if m and not re.search(r"\d{2}번입니다", text):
            signals.append((sec, int(m.group(1))))
            continue

    # Deduplicate within 5 sec
    merged = []
    for sig in signals:
        if merged and sig[0] - merged[-1][0] < 5 and sig[1] == merged[-1][1]:
            continue
        merged.append(sig)
    return merged


def align_answers(detected: list[tuple[int, int]], correct: list[int]) -> list[tuple[int, int]]:
    """DP alignment. Returns [(question_number, answer_time)]."""
    n, m = len(detected), len(correct)
    if n == 0 or m == 0:
        return []

    MATCH, MISMATCH, GAP = 3, -1, -1
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    trace = [[""] * (m + 1) for _ in range(n + 1)]

    for i in range(1, n + 1):
        dp[i][0] = i * GAP
        trace[i][0] = "sd"
    for j in range(1, m + 1):
        dp[0][j] = j * GAP
        trace[0][j] = "sq"

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            score = MATCH if detected[i - 1][1] == correct[j - 1] else MISMATCH
            opts = [
                (dp[i - 1][j - 1] + score, "m"),
                (dp[i - 1][j] + GAP, "sd"),
                (dp[i][j - 1] + GAP, "sq"),
            ]
            best_val, best_dir = max(opts, key=lambda x: x[0])
            dp[i][j] = best_val
            trace[i][j] = best_dir

    aligned = []
    i, j = n, m
    while i > 0 and j > 0:
        if trace[i][j] == "m":
            if detected[i - 1][1] == correct[j - 1]:
                aligned.append((j, detected[i - 1][0]))
            i -= 1
            j -= 1
        elif trace[i][j] == "sd":
            i -= 1
        else:
            j -= 1

    aligned.reverse()
    return aligned


def derive_starts(aligned: list[tuple[int, int]], total: int, duration: int) -> dict[str, int]:
    """Derive question start times from aligned answer times."""
    answer_times = {qn: t for qn, t in aligned}
    starts = {}

    for qn in range(1, total + 1):
        if qn == 1:
            starts[qn] = max(answer_times.get(1, 240) - 60, 0)
        elif (qn - 1) in answer_times:
            starts[qn] = answer_times[qn - 1] + 3

    # Interpolate
    known = sorted(starts.items())
    if not known:
        return {}

    for qn in range(1, total + 1):
        if qn in starts:
            continue
        before = [(q, t) for q, t in known if q < qn]
        after = [(q, t) for q, t in known if q > qn]

        if before and after:
            q_b, t_b = before[-1]
            q_a, t_a = after[0]
            ratio = (qn - q_b) / (q_a - q_b)
            starts[qn] = int(t_b + ratio * (t_a - t_b))
        elif before:
            q_b, t_b = before[-1]
            avg = (known[-1][1] - known[0][1]) / max(known[-1][0] - known[0][0], 1)
            starts[qn] = min(int(t_b + (qn - q_b) * avg), duration - 10)
        else:
            starts[qn] = 0

    return {str(qn): starts[qn] for qn in range(1, total + 1)}


# ── Main ──

def process_exam(exam_number: int, questions: list[dict], duration: int = 0) -> dict | None:
    """Process a single exam: search video, get subs, align answers."""
    correct = [q["correctAnswer"] for q in questions]

    answer_signals = extract_answer_signals(parse_srt(SUBS_DIR / f"exam-{exam_number}.ko.srt"))
    if not answer_signals:
        return None

    aligned = align_answers(answer_signals, correct)
    matches = len(aligned)
    match_pct = matches / len(correct) * 100

    q_starts = derive_starts(aligned, len(questions), duration)
    if not q_starts:
        return None

    return {
        "questions": q_starts,
        "matched": matches,
        "total": len(correct),
        "match_pct": match_pct,
    }


def fmt(sec):
    return f"{sec // 60}:{sec % 60:02d}"


def main():
    # Load all exam files
    exam_files = [f for f in DATA_DIR.glob("exam-*.json") if re.match(r"exam-\d+\.json$", f.name)]
    exam_files.sort(key=lambda f: int(re.search(r"exam-(\d+)", f.name).group(1)))
    exams = {}
    for f in exam_files:
        with open(f, "r", encoding="utf-8") as fh:
            d = json.load(fh)
            if isinstance(d, dict) and "exam" in d:
                num = d["exam"]["examNumber"]
                exams[num] = d

    print(f"=== Building YouTube timestamps for {len(exams)} exams ===\n")

    # Load existing data to preserve already-processed exams
    existing = {}
    if OUTPUT_PATH.exists():
        with open(OUTPUT_PATH, "r", encoding="utf-8") as f:
            existing = json.load(f)

    results = dict(existing)
    failed = []

    for exam_num in sorted(exams.keys()):
        if str(exam_num) in results and results[str(exam_num)].get("questions"):
            print(f"  Exam {exam_num}: already processed, skipping")
            continue

        print(f"\n{'='*50}")
        print(f"  Exam {exam_num}:")

        # Step 1: Search YouTube
        print(f"    Searching YouTube...", end=" ", flush=True)
        video = search_youtube(exam_num)
        if not video:
            print("NOT FOUND")
            failed.append((exam_num, "video not found"))
            continue
        print(f"OK → {video['id']} ({fmt(video['duration'])})")
        print(f"    Title: {video['title']}")

        # Step 2: Download subtitles
        print(f"    Downloading subtitles...", end=" ", flush=True)
        srt_path = download_subtitles(video["id"], exam_num)
        if not srt_path:
            print("FAILED")
            failed.append((exam_num, "subtitle download failed"))
            continue
        print("OK")

        # Step 3: Process
        print(f"    Aligning answers...", end=" ", flush=True)
        questions = exams[exam_num]["questions"]
        result = process_exam(exam_num, questions, video["duration"])
        if not result:
            print("FAILED")
            failed.append((exam_num, "alignment failed"))
            continue
        print(f"OK → {result['matched']}/{result['total']} ({result['match_pct']:.0f}%)")

        results[str(exam_num)] = {
            "videoId": video["id"],
            "channelName": video.get("channel", "최태성 1TV"),
            "questions": result["questions"],
        }

        # Rate limit
        time.sleep(1)

    # Save
    OUTPUT_PATH.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n{'='*50}")
    print(f"Saved to {OUTPUT_PATH}")
    print(f"Success: {len(results)}/{len(exams)}")
    if failed:
        print(f"Failed ({len(failed)}):")
        for num, reason in failed:
            print(f"  Exam {num}: {reason}")


if __name__ == "__main__":
    main()
