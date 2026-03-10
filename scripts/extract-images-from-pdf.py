"""
PDF 기출문제 지문/자료 이미지 추출 스크립트

1단계 통합 방식: PDF 페이지 이미지에서 직접 각 문제의 지문/자료 영역을 감지하여 크롭

Usage:
  python scripts/extract-images-from-pdf.py <pdf_path> [--output <dir>] [--exam-id <id>] [--pages <range>]

Example:
  python scripts/extract-images-from-pdf.py "57회_문제지.pdf" --output data/images/exam-57 --exam-id 57
  python scripts/extract-images-from-pdf.py "57회_문제지.pdf" -e 57 --pages 1    # first page only
  python scripts/extract-images-from-pdf.py "57회_문제지.pdf" -e 57 --pages 1-3  # pages 1 to 3
"""

import sys
import os
import json
import re
import io
import base64
import argparse
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

import fitz  # PyMuPDF
from PIL import Image

# ── Config ──────────────────────────────────────────
RENDER_SCALE = 3.0       # High resolution for accurate cropping
GEMINI_MAX_SIZE = 2400   # Max dimension for Gemini input
MARGIN_RATIO = 0.02      # 2% margin added to each side of bbox


def load_api_key():
    env_path = Path(__file__).resolve().parent.parent / "author-tool" / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if line.startswith("GEMINI_API_KEY="):
                return line.split("=", 1)[1].strip()
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        return key
    raise RuntimeError("GEMINI_API_KEY not found")


API_KEY = load_api_key()
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key={API_KEY}"


# ── Helpers ──────────────────────────────────────────

def render_page(doc: fitz.Document, page_num: int) -> Image.Image:
    page = doc[page_num]
    mat = fitz.Matrix(RENDER_SCALE, RENDER_SCALE)
    pix = page.get_pixmap(matrix=mat)
    return Image.frombytes("RGB", (pix.width, pix.height), pix.samples)


def image_to_base64(img: Image.Image, max_size: int = GEMINI_MAX_SIZE) -> str:
    w, h = img.size
    if max(w, h) > max_size:
        ratio = max_size / max(w, h)
        img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=92)
    return base64.b64encode(buf.getvalue()).decode()


def call_gemini(img_base64: str, prompt: str) -> str:
    import urllib.request

    payload = {
        "contents": [{"parts": [
            {"text": prompt},
            {"inline_data": {"mime_type": "image/jpeg", "data": img_base64}},
        ]}],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 8192,
            "thinkingConfig": {"thinkingBudget": 8192},
        },
    }

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        GEMINI_URL, data=data,
        headers={"Content-Type": "application/json"}, method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            # Handle thinking model response (may have multiple parts)
            parts = result["candidates"][0]["content"]["parts"]
            for part in reversed(parts):
                if "text" in part:
                    return part["text"]
            return ""
    except Exception as e:
        print(f"  [ERROR] Gemini API: {e}")
        return ""


def parse_json_response(text: str) -> list:
    text = text.strip()
    # Remove markdown code fence
    if "```" in text:
        match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
        if match:
            text = match.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        print(f"  JSON parse error: {e}")
        print(f"  Response preview: {text[:500]}")
        return []


def crop_bbox_with_margin(img: Image.Image, bbox: list[float], margin: float = MARGIN_RATIO) -> Image.Image:
    """Crop with normalized [0-1] bbox coords and percentage-based margin."""
    w, h = img.size
    # Add margin (percentage of image dimensions)
    x1 = max(0, bbox[0] - margin) * w
    y1 = max(0, bbox[1] - margin) * h
    x2 = min(1, bbox[2] + margin) * w
    y2 = min(1, bbox[3] + margin) * h
    return img.crop((int(x1), int(y1), int(x2), int(y2)))


# ── Single-step: Detect passage/reference areas directly from page ──

DETECT_PROMPT = """이 이미지는 한국사능력검정시험 기출문제 PDF의 한 페이지입니다.
이미지 크기: {width} x {height} 픽셀

각 문제에서 "지문/자료" 영역의 바운딩 박스를 찾아주세요.

## 지문/자료란?
문제를 풀기 위해 제공된 참고 자료입니다. 아래 유형이 있습니다:
- **screenshot**: 태블릿/스마트폰/PC 화면 캡처 (VR전시관, 웹검색, SNS, 채팅 등)
- **photo**: 실제 사진 (유적, 유물, 인물, 풍경, 문화재)
- **passage**: 텍스트 사료 — 회색/노란/파란 배경 박스 안의 인용문, 대화문, 서적 발췌
- **document**: 신문기사, 포스터, 공문서, 편지 등 문서 형태
- **map**: 지도
- **chart**: 연표, 도표, 그래프, 표
- **illustration**: 만화, 삽화 (대화 말풍선이 있는 일러스트)

## 중요 규칙
1. 문제 번호("1.", "2."), 문제 질문 텍스트("밑줄 그은 '이 나라'에 대한..."), 선지(①②③④⑤)는 **절대 포함하지 마세요**
2. 지문/자료 영역의 **전체 테두리/프레임**을 완전히 포함하세요 (태블릿 화면이면 기기 프레임 전체, 텍스트 박스면 배경 박스 전체)
3. 하나의 문제에 여러 자료가 있으면 (예: 사진 4장) **하나의 bbox로 통합**하세요
4. 자료가 없는 순수 텍스트 문제는 제외하세요
5. 선지에 포함된 이미지(예: ①~⑤ 각각이 사진인 경우)는 "choices_image" 타입으로 별도 처리하세요

## 응답 형식
JSON 배열로만 응답하세요 (설명 없이):
```json
[
  {{
    "question": 1,
    "type": "screenshot",
    "description": "TV 뉴스 화면 - 김해 고인돌",
    "bbox": [x1_ratio, y1_ratio, x2_ratio, y2_ratio]
  }}
]
```

bbox는 이미지 비율 좌표 (0.0~1.0):
- [좌측비율, 상단비율, 우측비율, 하단비율]
- 예: 이미지 왼쪽 절반의 중앙 영역 = [0.02, 0.15, 0.48, 0.55]

**bbox를 지문/자료의 실제 경계에 정확히 맞추세요. 너무 작게 잡아 내용이 잘리는 것보다 약간 크게 잡는 것이 낫습니다.**"""


def process_page(doc, page_num: int, page_img: Image.Image) -> list[dict]:
    """Single-step: detect passage/reference areas directly from page image."""
    print(f"\n── Page {page_num + 1} ({page_img.width}x{page_img.height}) ──")

    b64 = image_to_base64(page_img)
    prompt = DETECT_PROMPT.format(width=page_img.width, height=page_img.height)
    resp = call_gemini(b64, prompt)
    items = parse_json_response(resp)

    if not items:
        print("  No reference materials detected")
        return []

    results = []

    for item in items:
        q_num = item.get("question", 0)
        bbox = item.get("bbox")
        p_type = item.get("type", "unknown")
        p_desc = item.get("description", "")

        if not bbox or len(bbox) != 4:
            print(f"  Q{q_num}: invalid bbox, skipping")
            continue

        # Validate bbox values
        if any(v < 0 or v > 1 for v in bbox):
            print(f"  Q{q_num}: bbox out of range {bbox}, clamping")
            bbox = [max(0, min(1, v)) for v in bbox]

        if bbox[2] <= bbox[0] or bbox[3] <= bbox[1]:
            print(f"  Q{q_num}: invalid bbox dimensions {bbox}, skipping")
            continue

        # Crop with margin from full page image
        cropped = crop_bbox_with_margin(page_img, bbox)

        if cropped.width < 50 or cropped.height < 50:
            print(f"  Q{q_num}: crop too small ({cropped.width}x{cropped.height}), skipping")
            continue

        print(f"  Q{q_num}: [{p_type}] {p_desc} → {cropped.width}x{cropped.height}")

        results.append({
            "question": q_num,
            "type": p_type,
            "description": p_desc,
            "page": page_num + 1,
            "bbox": bbox,
            "image": cropped,
        })

    return results


def parse_page_range(page_str: str, total_pages: int) -> list[int]:
    """Parse page range like '1', '1-3', '2,5,8'."""
    pages = set()
    for part in page_str.split(","):
        part = part.strip()
        if "-" in part:
            start, end = part.split("-", 1)
            start = max(1, int(start))
            end = min(total_pages, int(end))
            pages.update(range(start - 1, end))  # 0-indexed
        else:
            p = int(part) - 1  # 0-indexed
            if 0 <= p < total_pages:
                pages.add(p)
    return sorted(pages)


def extract_images(pdf_path: str, output_dir: str, exam_id: str | None = None, pages_str: str | None = None):
    doc = fitz.open(pdf_path)
    print(f"PDF: {Path(pdf_path).name}")
    print(f"Pages: {len(doc)}")
    print(f"Output: {output_dir}")

    os.makedirs(output_dir, exist_ok=True)
    prefix = f"exam-{exam_id}" if exam_id else Path(pdf_path).stem

    # Determine which pages to process
    if pages_str:
        page_nums = parse_page_range(pages_str, len(doc))
        print(f"Processing pages: {[p + 1 for p in page_nums]}")
    else:
        page_nums = list(range(len(doc)))

    all_results = []

    # Pre-render all pages (fast, CPU-bound)
    print(f"Rendering {len(page_nums)} pages...")
    page_images = {}
    for page_num in page_nums:
        page_images[page_num] = render_page(doc, page_num)

    # Call Gemini in parallel for all pages (slow, I/O-bound)
    MAX_WORKERS = min(4, len(page_nums))
    page_results = {}

    if len(page_nums) == 1:
        # Single page — no need for thread pool
        pn = page_nums[0]
        page_results[pn] = process_page(doc, pn, page_images[pn])
    else:
        print(f"Processing {len(page_nums)} pages in parallel (workers={MAX_WORKERS})...")
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = {
                executor.submit(process_page, doc, pn, page_images[pn]): pn
                for pn in page_nums
            }
            for future in as_completed(futures):
                pn = futures[future]
                try:
                    page_results[pn] = future.result()
                except Exception as e:
                    print(f"  [ERROR] Page {pn + 1}: {e}")
                    page_results[pn] = []

    # Save results in page order
    for page_num in page_nums:
        results = page_results.get(page_num, [])
        for r in results:
            q_num = r["question"]
            p_type = r["type"]
            img = r.pop("image")
            r.pop("bbox", None)

            # Generate filename
            filename = f"{prefix}_q{q_num:02d}_{p_type}.png"
            filepath = os.path.join(output_dir, filename)

            # Handle duplicates
            counter = 1
            while os.path.exists(filepath):
                filename = f"{prefix}_q{q_num:02d}_{p_type}_{counter}.png"
                filepath = os.path.join(output_dir, filename)
                counter += 1

            img.save(filepath, "PNG")
            r["file"] = filename
            all_results.append(r)

    doc.close()

    # Save manifest
    manifest = {
        "source": Path(pdf_path).name,
        "examId": exam_id,
        "totalImages": len(all_results),
        "images": all_results,
    }
    manifest_path = os.path.join(output_dir, f"{prefix}_manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*50}")
    print(f"Total extracted: {len(all_results)} images")
    print(f"Manifest: {manifest_path}")


def main():
    parser = argparse.ArgumentParser(description="한국사 기출 PDF 지문/자료 이미지 추출")
    parser.add_argument("pdf", help="PDF 파일 경로")
    parser.add_argument("--output", "-o", default="data/images", help="출력 디렉토리 (default: data/images)")
    parser.add_argument("--exam-id", "-e", help="시험 ID (파일명 접두사)")
    parser.add_argument("--pages", "-p", help="처리할 페이지 범위 (예: '1', '1-3', '2,5')")
    args = parser.parse_args()

    if not os.path.exists(args.pdf):
        print(f"Error: PDF not found: {args.pdf}")
        sys.exit(1)

    extract_images(args.pdf, args.output, args.exam_id, args.pages)


if __name__ == "__main__":
    main()
