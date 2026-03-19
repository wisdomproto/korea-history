"""
Clean up AI-generated explanations in exam JSON files.

Fixes:
1. Remove question content repeated in explanation
2. Remove [N점] markers
3. Remove full choice blocks (① ② ③ ④ ⑤ or "1. " "2. " patterns)
4. Remove "N번 문제" / "N. 다음" question headers appearing in explanation
5. Normalize whitespace: trim lines, collapse 3+ newlines to 2
6. Remove single-char orphan lines
7. Trim leading/trailing whitespace

Usage: python scripts/clean-explanations.py [--dry-run]
"""

import json
import glob
import re
import sys

DRY_RUN = "--dry-run" in sys.argv
DATA_DIR = "C:/projects/korea_history/data/questions"


def clean_explanation(exp: str, question_content: str, choices: list[str]) -> str:
    if not exp:
        return exp

    original = exp

    # 1. Remove question content if it appears in explanation
    content_prefix = question_content.strip()[:30]
    if content_prefix and content_prefix in exp:
        # Find the line containing the question and remove it
        lines = exp.split("\n")
        lines = [l for l in lines if content_prefix not in l]
        exp = "\n".join(lines)

    # 2. Remove [N점] markers
    exp = re.sub(r"\s*\[\d점\]\s*", " ", exp)

    # 3. Remove full choice blocks - circled numbers
    # Pattern: lines starting with ①②③④⑤ followed by text
    exp = re.sub(r"^[①②③④⑤]\s*.+$", "", exp, flags=re.MULTILINE)

    # 4. Remove "N번 문제" or "N. 다음..." question header patterns
    exp = re.sub(r"^\d{1,2}\.\s*다음.+$", "", exp, flags=re.MULTILINE)
    exp = re.sub(r"^\d{1,2}번\s*문제.*$", "", exp, flags=re.MULTILINE)
    exp = re.sub(r"^\d{1,2}\.\s*\(가\).+$", "", exp, flags=re.MULTILINE)
    exp = re.sub(r"^\d{1,2}\.\s*밑줄.+$", "", exp, flags=re.MULTILINE)

    # 5. Remove lines that are just a question number like "11. " or "50."
    exp = re.sub(r"^\d{1,2}\.\s*$", "", exp, flags=re.MULTILINE)

    # 6. Remove orphan single-char lines (not digits, not bullet markers)
    lines = exp.split("\n")
    cleaned_lines = []
    for line in lines:
        stripped = line.strip()
        # Remove lines that are just 1-2 chars and not meaningful
        if 0 < len(stripped) <= 2 and not stripped[0].isdigit() and stripped not in ("→", "-", "·", "•", "※"):
            continue
        cleaned_lines.append(line)
    exp = "\n".join(cleaned_lines)

    # 7. Collapse 3+ consecutive newlines to 2
    exp = re.sub(r"\n{3,}", "\n\n", exp)

    # 8. Remove multiple spaces (but not leading indentation)
    exp = re.sub(r"(?<=\S)  +(?=\S)", " ", exp)

    # 9. Trim each line's trailing whitespace
    exp = "\n".join(line.rstrip() for line in exp.split("\n"))

    # 10. Trim overall
    exp = exp.strip()

    return exp


def main():
    files = sorted(glob.glob(f"{DATA_DIR}/exam-*.json"))
    files = [f for f in files if re.match(r".*exam-\d+\.json$", f.replace("\\", "/"))]

    total_changed = 0
    total_questions = 0

    for filepath in files:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        if not isinstance(data, dict) or "questions" not in data:
            continue

        exam_num = data["exam"]["examNumber"]
        changed_in_file = 0

        for q in data["questions"]:
            exp = q.get("explanation", "")
            if not exp:
                continue

            total_questions += 1
            cleaned = clean_explanation(exp, q.get("content", ""), q.get("choices", []))

            if cleaned != exp:
                changed_in_file += 1
                if DRY_RUN:
                    print(f"\n--- Exam {exam_num} Q{q['questionNumber']} ---")
                    print(f"BEFORE ({len(exp)} chars):")
                    print(exp[:200])
                    print(f"AFTER ({len(cleaned)} chars):")
                    print(cleaned[:200])
                else:
                    q["explanation"] = cleaned

        if changed_in_file > 0:
            total_changed += changed_in_file
            if not DRY_RUN:
                with open(filepath, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                print(f"  Exam {exam_num}: {changed_in_file} explanations cleaned")

    print(f"\nTotal: {total_changed}/{total_questions} explanations cleaned")
    if DRY_RUN:
        print("(dry run — no files modified)")


if __name__ == "__main__":
    main()
