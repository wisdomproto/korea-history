"""
YouTube timestamp matcher v5 — answer verification approach.

Key idea: Each "정답은 N번" in the transcript should match the correct answer
for the corresponding question. Use this to verify question numbering.

Flow:
1. Extract ALL answer signals from auto-captions (with timestamps)
2. Match the sequence of detected answers against the known correct answer sequence
3. Use alignment to determine which question each answer corresponds to
4. Derive question start times from the gaps between consecutive answers

Usage: python scripts/match-youtube-timestamps.py
"""

import json
import re
from pathlib import Path

EXAM_NUMBER = 76
VIDEO_ID = "GA7OfZmlSxc"
VIDEO_DURATION = 2307
SRT_PATH = Path("C:/projects/korea_history/temp-subs.ko.srt")
EXAM_PATH = Path(f"C:/projects/korea_history/data/questions/exam-{EXAM_NUMBER}.json")


def parse_srt(path):
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


def extract_answer_signals(entries):
    """Extract ALL answer signals: (time, answer_number, text)."""
    signals = []
    for sec, text in entries:
        # "정답은 N번" - strongest signal
        m = re.search(r"정답은?\s*(\d)번", text)
        if m:
            signals.append((sec, int(m.group(1)), "정답", text[:50]))
            continue

        # "N번 고르시면" - strong
        m = re.search(r"(\d)번\s*고르시면", text)
        if m:
            signals.append((sec, int(m.group(1)), "고르시면", text[:50]))
            continue

        # "N번입니다" - weaker (only 1-5)
        m = re.search(r"([1-5])번입니다", text)
        if m and not re.search(r"\d{2}번입니다", text):
            signals.append((sec, int(m.group(1)), "N번입니다", text[:50]))
            continue

    # Deduplicate: merge signals within 5 seconds of each other
    merged = []
    for sig in signals:
        if merged and sig[0] - merged[-1][0] < 5 and sig[1] == merged[-1][1]:
            continue  # Same answer within 5 sec, skip duplicate
        merged.append(sig)

    return merged


def extract_start_signals(entries):
    """Extract question START signals."""
    signals = []
    for sec, text in entries:
        # "다음 문제"
        if re.search(r"다음\s*문제", text):
            signals.append((sec, "next", text[:50]))

        # "N번 풀어/문제/문항"
        m = re.search(r"(\d{1,2})번\s*(?:풀어|문제를?\s*[풀갑자]|문항)", text)
        if m:
            qnum = int(m.group(1))
            if 1 <= qnum <= 50:
                signals.append((sec, f"Q{qnum}", text[:50]))

    return signals


def align_answers(detected_answers, correct_answers):
    """Align detected answer sequence with correct answer sequence.

    Uses dynamic programming (like sequence alignment) to find the best
    mapping, allowing for missed detections and false positives.

    Returns: list of (question_number, answer_time) for matched answers.
    """
    det = detected_answers  # [(time, answer_num, type, text)]
    correct = correct_answers  # [answer_num for Q1, Q2, ...]
    n = len(det)
    m = len(correct)

    # DP: dp[i][j] = best score aligning det[:i] with correct[:j]
    # Match score: +3 if answers match, -1 if mismatch
    # Gap penalty: -1 (skip a detection or skip a question)
    MATCH = 3
    MISMATCH = -1
    GAP = -1

    dp = [[0] * (m + 1) for _ in range(n + 1)]
    trace = [[""] * (m + 1) for _ in range(n + 1)]

    for i in range(1, n + 1):
        dp[i][0] = i * GAP
        trace[i][0] = "skip_det"
    for j in range(1, m + 1):
        dp[0][j] = j * GAP
        trace[0][j] = "skip_q"

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            # Option 1: Match det[i-1] with correct[j-1]
            score = MATCH if det[i - 1][1] == correct[j - 1] else MISMATCH
            match_score = dp[i - 1][j - 1] + score

            # Option 2: Skip this detection (false positive)
            skip_det_score = dp[i - 1][j] + GAP

            # Option 3: Skip this question (missed detection)
            skip_q_score = dp[i][j - 1] + GAP

            best = max(match_score, skip_det_score, skip_q_score)
            dp[i][j] = best

            if best == match_score:
                trace[i][j] = "match"
            elif best == skip_det_score:
                trace[i][j] = "skip_det"
            else:
                trace[i][j] = "skip_q"

    # Traceback
    aligned = []
    i, j = n, m
    while i > 0 and j > 0:
        if trace[i][j] == "match":
            is_correct = det[i - 1][1] == correct[j - 1]
            aligned.append((j, det[i - 1][0], det[i - 1][1], correct[j - 1], is_correct))
            i -= 1
            j -= 1
        elif trace[i][j] == "skip_det":
            i -= 1
        else:
            j -= 1

    aligned.reverse()
    return aligned


def derive_question_starts(aligned, total_questions, video_duration):
    """Derive question start times from aligned answer times.

    Each answer marks the END of a question.
    The next question starts ~3 seconds after the answer.
    The first question starts at the FIRST detected transition or ~4 min in.
    """
    # answer_times: question_number → answer_time
    answer_times = {qn: time for qn, time, _, _, _ in aligned}

    # Question N starts right after question N-1's answer
    question_starts = {}

    for qn in range(1, total_questions + 1):
        if qn == 1:
            # Q1 starts before its answer — estimate from first answer
            if 1 in answer_times:
                # Q1 explanation typically lasts 40-80 sec before answer
                question_starts[1] = max(answer_times[1] - 60, 0)
            else:
                question_starts[1] = 240  # Default 4 min (after intro)
        elif (qn - 1) in answer_times:
            # Start right after previous question's answer
            question_starts[qn] = answer_times[qn - 1] + 3
        # else: will be interpolated

    # Interpolate gaps
    known = sorted(question_starts.items())
    for qn in range(1, total_questions + 1):
        if qn in question_starts:
            continue

        before = [(q, t) for q, t in known if q < qn]
        after = [(q, t) for q, t in known if q > qn]

        if before and after:
            q_b, t_b = before[-1]
            q_a, t_a = after[0]
            ratio = (qn - q_b) / (q_a - q_b)
            question_starts[qn] = int(t_b + ratio * (t_a - t_b))
        elif before:
            q_b, t_b = before[-1]
            avg = (known[-1][1] - known[0][1]) / max(known[-1][0] - known[0][0], 1)
            question_starts[qn] = min(int(t_b + (qn - q_b) * avg), video_duration - 10)
        else:
            question_starts[qn] = 0

    return question_starts


def fmt(sec):
    return f"{sec // 60:2d}:{sec % 60:02d}"


def main():
    print(f"=== Exam {EXAM_NUMBER} — v5 Answer Verification ===\n")

    entries = parse_srt(SRT_PATH)
    with open(EXAM_PATH, "r", encoding="utf-8") as f:
        questions = json.load(f)["questions"]
    total = len(questions)
    correct_answers = [q["correctAnswer"] for q in questions]

    # Step 1: Extract answer signals
    answer_signals = extract_answer_signals(entries)
    print(f"Answer signals found: {len(answer_signals)}")
    for time, ans, typ, text in answer_signals:
        print(f"  [{fmt(time)}] ans={ans} ({typ:<10}) {text}")
    print()

    # Step 2: Align with correct answers
    print(f"Correct answers: {correct_answers}")
    print()
    aligned = align_answers(answer_signals, correct_answers)

    print(f"Aligned {len(aligned)}/{total} questions:")
    print(f"{'Q':>3} | {'Time':>7} | Det | Cor | {'Match':>5}")
    print("-" * 40)
    for qn, time, detected, correct, is_match in aligned:
        mark = "✓" if is_match else "✗"
        print(f" {qn:2d} | {fmt(time)} | {detected}   | {correct}   | {mark}")

    matches = sum(1 for _, _, _, _, m in aligned if m)
    print(f"\nMatches: {matches}/{len(aligned)} ({matches/len(aligned)*100:.0f}%)")
    print()

    # Step 3: Derive question start times
    q_starts = derive_question_starts(aligned, total, VIDEO_DURATION)

    # Determine detected vs interpolated
    answer_qns = {qn for qn, _, _, _, _ in aligned}
    detected_starts = set()
    for qn in range(1, total + 1):
        if qn in answer_qns or (qn - 1) in answer_qns:
            detected_starts.add(qn)

    print(f"{'Q':>3} | {'Start':>7} | {'Status':<14}")
    print("-" * 35)
    for qn in range(1, total + 1):
        status = "detected" if qn in detected_starts else "interpolated"
        print(f" {qn:2d} | {fmt(q_starts[qn])} | {status}")

    det_count = len(detected_starts)
    print(f"\n=== {det_count}/{total} detected, {total - det_count} interpolated ===")

    # Monotonicity check
    prev = 0
    for qn in range(1, total + 1):
        if q_starts[qn] < prev:
            print(f"  ⚠ Q{qn} ({fmt(q_starts[qn])}) < Q{qn-1} ({fmt(prev)})")
        prev = q_starts[qn]
    else:
        print("  ✓ Monotonically increasing")

    avg = (q_starts[total] - q_starts[1]) / (total - 1)
    print(f"  Average: {avg:.0f}s/question")

    # Save
    output = {
        "examNumber": EXAM_NUMBER,
        "videoId": VIDEO_ID,
        "questions": {str(qn): q_starts[qn] for qn in range(1, total + 1)},
    }
    out_path = Path(f"C:/projects/korea_history/temp-youtube-exam{EXAM_NUMBER}.json")
    out_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nSaved to {out_path}")


if __name__ == "__main__":
    main()
