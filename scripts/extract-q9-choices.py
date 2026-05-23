"""
Q9 (78회) — 분류기가 illustration으로 잘못 잡은 선지 이미지를 보강 추출.
페이지 3에서 Q9 선지 5개(①②③④⑤) 영역만 다시 잡아서 별도 PNG 저장.
"""
import os, sys, json, io, base64, urllib.request
import fitz
from PIL import Image

PDF = r"C:\Users\kil21\Downloads\78회 한국사_문제지(심화).pdf"
OUT = "C:/project/korea-history/data/images/exam-78/exam-78_q09_choices_image.png"
ENV = "C:/project/korea-history/author-tool/.env"

# Load API key
for line in open(ENV, encoding='utf-8'):
    if line.startswith("GEMINI_API_KEY="):
        KEY = line.split("=",1)[1].strip()
        break

doc = fitz.open(PDF)
page = doc[2]  # page 3 (0-indexed)
pix = page.get_pixmap(matrix=fitz.Matrix(3.0, 3.0))
img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
print(f"page 3 size: {img.width}x{img.height}")

# Send to Gemini with focused prompt — only Q9's 5 choice images
buf = io.BytesIO()
img.save(buf, format="JPEG", quality=92)
b64 = base64.b64encode(buf.getvalue()).decode()

prompt = f"""이 이미지는 한국사 시험 PDF의 한 페이지입니다 (크기: {img.width}x{img.height} 픽셀).
이 페이지에는 9번 문제가 있고, 9번 문제의 선지(①②③④⑤)는 5개의 작은 사진/그림으로 구성되어 있습니다.

9번 문제의 **①②③④⑤ 5개 선지 이미지가 나열된 가로줄 영역**만의 bbox를 찾아주세요.
- 문제 질문 텍스트와 사료 위 영역은 제외
- 5개 선지 이미지가 가로로 1줄 또는 2줄 배치된 영역을 하나의 bbox로

JSON으로만 응답:
```json
{{"bbox": [x1_ratio, y1_ratio, x2_ratio, y2_ratio]}}
```
bbox는 0.0~1.0 비율 좌표 (left, top, right, bottom)."""

url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key={KEY}"
payload = {
    "contents": [{"parts": [{"text": prompt}, {"inline_data": {"mime_type": "image/jpeg", "data": b64}}]}],
    "generationConfig": {"temperature": 0.1, "maxOutputTokens": 1024, "thinkingConfig": {"thinkingBudget": 2048}},
}
req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"}, method="POST")
with urllib.request.urlopen(req, timeout=120) as r:
    resp = json.loads(r.read())
parts = resp["candidates"][0]["content"]["parts"]
text = ""
for p in reversed(parts):
    if "text" in p:
        text = p["text"]
        break
print("response:", text[:500])

# Parse bbox
import re
m = re.search(r"```(?:json)?\s*([\s\S]+?)```", text)
if m: text = m.group(1)
data = json.loads(text.strip())
bbox = data["bbox"]
print("bbox:", bbox)

# Auto-convert pixel→ratio if needed
fb = list(bbox)
if fb[0] > 1 or fb[2] > 1:
    fb[0] /= img.width; fb[2] /= img.width
if fb[1] > 1 or fb[3] > 1:
    fb[1] /= img.height; fb[3] /= img.height
bbox = [max(0,min(1,v)) for v in fb]
print("normalized:", bbox)

# Add small margin
margin = 0.01
x1 = max(0, bbox[0] - margin) * img.width
y1 = max(0, bbox[1] - margin) * img.height
x2 = min(1, bbox[2] + margin) * img.width
y2 = min(1, bbox[3] + margin) * img.height
cropped = img.crop((int(x1), int(y1), int(x2), int(y2)))
print(f"cropped: {cropped.width}x{cropped.height}")

cropped.save(OUT, "PNG")
print(f"saved: {OUT}")
