"""
Match summary notes to YouTube lecture videos.
Output: web/data/note-lectures.json

Strategy: keyword matching between note titles and video topics.
"""

import json
import re

# Load data
with open("C:/projects/korea_history/temp-playlist.json", "r", encoding="utf-8") as f:
    videos = json.load(f)

with open("C:/projects/korea_history/data/notes/index.json", "r", encoding="utf-8") as f:
    notes = json.load(f)

# Parse video structure
parsed_videos = []
for i, v in enumerate(videos):
    title = v["title"]
    # Extract lesson-sub and topic
    m = re.search(r"(\d+)-(\d+)\s+(.+?)\s*[/｜|]", title)
    if not m:
        m = re.search(r"(\d+)-(\d+)\s+(.+?)$", title)
    if m:
        lesson = int(m.group(1))
        sub = int(m.group(2))
        topic = m.group(3).strip()
    else:
        lesson = 0
        sub = 0
        topic = title

    # Extract era from title
    era = ""
    era_m = re.search(r"(\d+)강\s+(.+?)[\(｜|]", title)
    if era_m:
        era = era_m.group(2).strip()

    parsed_videos.append({
        "index": i,
        "id": v["id"],
        "title": title,
        "lesson": lesson,
        "sub": sub,
        "topic": topic,
        "era": era,
        "duration": v["duration"],
    })

# Era mapping: note section → YouTube lesson ranges
ERA_MAP = {
    "s1": list(range(2, 10)),   # 2~9강: 선사·고조선·삼국·남북국
    "s2": list(range(10, 16)),  # 10~15강: 고려
    "s3": list(range(16, 22)),  # 16~21강: 조선 전기
    "s4": list(range(22, 28)),  # 22~27강: 조선 후기
    "s5": list(range(28, 34)),  # 28~33강: 근대(개항기)
    "s6": list(range(34, 38)),  # 34~37강: 일제 강점기
    "s7": list(range(38, 41)),  # 38~40강: 현대
}

# Keyword matching
KEYWORDS = {
    # s1 notes
    "s1-01": ["유물", "유적", "선사", "구석기", "신석기", "청동기", "철기"],
    "s1-02": ["연맹", "부여", "옥저", "동예", "삼한", "여러 나라"],
    "s1-03": ["고조선", "위만"],
    "s1-04": ["삼국", "왕", "고구려", "백제", "신라", "업적"],
    "s1-05": ["가야"],
    "s1-06": ["통치", "체제", "관등", "관직"],
    "s1-07": ["통일신라", "왕"],
    "s1-08": ["통일신라 말기", "후삼국", "후백제", "궁예"],
    "s1-09": ["발해"],
    "s1-10": ["종교", "불교", "유학", "도교", "유교"],
    "s1-11": ["고분", "무덤"],
    "s1-12": ["석탑", "탑"],
    "s1-13": ["불상"],
    # s2 notes
    "s2-01": ["전투", "전쟁"],
    "s2-02": ["후삼국", "통일", "왕건"],
    "s2-03": ["고려", "왕", "업적", "호족"],
    "s2-04": ["별무반", "여진", "윤관"],
    "s2-05": ["중앙", "정치", "조직", "도병마사"],
    "s2-06": ["무신", "정변", "원간섭", "몽골"],
    "s2-07": ["토지", "전시과"],
    "s2-08": ["경제", "상업", "화폐"],
    "s2-09": ["사회", "신분"],
    "s2-10": ["경제", "토지", "신분"],
    "s2-11": ["문화", "역사서", "유학", "불교"],
    # s3 notes
    "s3-01": ["건국", "조선", "이성계", "위화도"],
    "s3-02": ["왕", "업적", "태조", "태종", "세종", "세조", "성종"],
    "s3-03": ["사화", "무오", "갑자", "기묘", "을사"],
    "s3-04": ["중앙", "행정", "조직", "의정부", "6조"],
    "s3-05": ["지방", "행정"],
    "s3-06": ["군사", "제도", "5위"],
    "s3-07": ["사림", "붕당"],
    "s3-08": ["임진왜란", "정유재란"],
    "s3-09": ["광해군", "호란", "병자호란", "정묘호란"],
    "s3-10": ["토지", "과전법", "직전법"],
    "s3-11": ["수취", "전세", "공납", "역"],
    "s3-12": ["신분"],
    "s3-13": ["과거", "교육"],
    "s3-14": ["서원", "향약"],
    "s3-15": ["문화", "성리학", "예술"],
    "s3-16": ["붕당", "분화"],
    "s3-17": ["예송"],
    "s3-18": ["환국", "경신", "기사", "갑술"],
    "s3-19": ["경제"],
    "s3-20": ["대외", "사절"],
    # s4 notes
    "s4-01": ["왕정", "탕평", "세도"],
    "s4-02": ["경제", "사회", "상업", "수공업"],
    "s4-03": ["정치", "군사", "조직"],
    "s4-04": ["종교", "학문", "실학", "양명학"],
    "s4-05": ["문화", "예술", "회화", "서민"],
    # s5 notes
    "s5-01": ["흥선대원군", "대원군"],
    "s5-02": ["개화", "정책"],
    "s5-03": ["동학", "농민", "갑오", "개혁"],
    "s5-04": ["대한제국", "국권", "침탈"],
    "s5-05": ["근대", "문화", "시설", "언론", "교육"],
    # s6 notes
    "s6-01": ["통치", "식민", "무단", "문화통치", "민족말살"],
    "s6-02": ["1910년대", "항일", "독립"],
    "s6-03": ["3·1운동", "3.1운동", "만세"],
    "s6-04": ["대동단결", "선언"],
    "s6-05": ["실력양성", "물산장려"],
    "s6-06": ["6·10", "만세"],
    "s6-07": ["광주", "학생"],
    "s6-08": ["사회", "민족운동"],
    "s6-09": ["신간회"],
    "s6-10": ["무장", "독립", "투쟁", "독립군"],
    "s6-11": ["민족혁명당", "조선의용대"],
    "s6-12": ["광복군"],
    "s6-13": ["교육", "식민지"],
    "s6-14": ["국어", "한글"],
    "s6-15": ["민족사학", "역사"],
    "s6-16": ["종교"],
    "s6-17": ["사건"],
    # s7 notes
    "s7-01": ["광복", "해방"],
    "s7-02": ["모스크바", "삼국외상"],
    "s7-03": ["좌우합작"],
    "s7-04": ["5·10", "총선거"],
    "s7-05": ["정부 수립", "제1공화국", "대한민국"],
    "s7-06": ["한국전쟁", "6.25", "6·25"],
    "s7-07": ["이승만"],
    "s7-08": ["제2공화국", "장면"],
    "s7-09": ["제3공화국", "박정희"],
    "s7-10": ["제4공화국", "유신"],
    "s7-11": ["제5공화국", "전두환"],
    "s7-12": ["6월", "민주항쟁"],
    "s7-13": ["제6공화국", "노태우"],
    "s7-14": ["남북", "통일"],
    "s7-15": ["사건", "정책"],
    "s7-16": ["유네스코", "세계유산"],
}

# Match each note to best videos
result = {}
for note in notes:
    nid = note["id"]
    section = nid[:2]
    lesson_range = ERA_MAP.get(section, [])
    note_keywords = KEYWORDS.get(nid, [])

    # Find videos in the lesson range
    candidates = [v for v in parsed_videos if v["lesson"] in lesson_range]

    # Score each candidate
    scored = []
    for v in candidates:
        score = 0
        text = (v["topic"] + " " + v["title"]).lower()
        for kw in note_keywords:
            if kw.lower() in text:
                score += 2
        # Partial match on note title
        for word in note["title"].replace("️", "").split():
            if len(word) >= 2 and word.lower() in text:
                score += 1
        if score > 0:
            scored.append((score, v))

    scored.sort(key=lambda x: -x[0])
    # Take top 1-3 matches
    matches = [s[1] for s in scored[:3]]

    if matches:
        result[nid] = [{"videoId": m["id"], "title": m["topic"], "duration": m["duration"]} for m in matches]
    else:
        # Fallback: first video of the lesson range
        if candidates:
            first = candidates[0]
            result[nid] = [{"videoId": first["id"], "title": first["topic"], "duration": first["duration"]}]

# Print results
matched = sum(1 for v in result.values() if v)
print(f"Matched: {matched}/{len(notes)} notes")
print()
for note in notes:
    nid = note["id"]
    vids = result.get(nid, [])
    vid_str = ", ".join(f"{v['title']} ({v['duration']//60}분)" for v in vids)
    print(f"  {nid:10s} {note['title'][:25]:25s} → {vid_str}")

# Save
out = {"playlist": "PLE7ogCa1_I6uj-gATOZg56-oMAJM1jpz3", "channelName": "최태성 1TV", "notes": result}
with open("C:/projects/korea_history/web/data/note-lectures.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
print(f"\nSaved to web/data/note-lectures.json")
