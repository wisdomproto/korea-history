/**
 * Extract keywords from question content + explanation for exams missing keywords.
 * Uses pattern matching to find historical terms, names, events, treaties, etc.
 *
 * Usage:
 *   node scripts/extract-keywords.js          # fill missing keywords only
 *   node scripts/extract-keywords.js --all    # re-extract all keywords
 *   node scripts/extract-keywords.js --clean  # clean bad keywords from existing data
 */
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data', 'questions');
const mode = process.argv[2]; // --all or --clean

// Blacklist: keywords that should never appear (too generic, partial, or meaningless)
const BLACKLIST = new Set([
  // Generic/partial terms
  '통일', '민족', '농민', '항일', '노동', '왜란', '호란', '사화', '개화',
  '운동', '사건', '단체', '부대', '개혁', '회의', '자료', '사진', '보기',
  '근대', '의병', '금관', '탕평', '훈구', '사림',
  // Single characters
  '가', '나', '다', '라', '마', '소', '향', '송', '창', '청',
  // Answer markers
  '(가)', '(나)', '(다)', '(라)', '(마)', '(가)~(다)',
  // Incomplete number refs
  '3.1', '3·1', '5.18', '5·18', '6.25', '6·25', '4.19', '4·19',
  // Modern country names
  '소련', '칠레', '영국', '미국', '일본', '중국', '러시아', '프랑스', '독일',
  // Kingdom/dynasty names (covered by era)
  '고구려', '백제', '신라', '가야', '고려', '조선', '대한제국', '발해', '통일신라',
  '부여', '옥저', '동예', '삼한', '마한', '변한', '진한',
  // Generic nouns that are not meaningful historical keywords
  '고추', '담배', '감자', '동굴', '농경', '목축', '따비', '씨름', '화폐', '화천',
  '목책', '환호', '참선', '변발', '호복', '민화', '사고', '교수', '훈도', '향소',
  '포교', '광야', '시사', '도고', '서역', '고흥', '범종', '총독', '개항', '일제',
  '개벽', '동학', '정전', '띄어쓰기',
  // Place names (too generic as keywords)
  '부산', '평양', '인천', '한양', '원산', '도쿄', '웅진', '서경', '남경', '낙랑',
  // Misc non-keywords
  '연표', '발표 순서', '제헌', '청군', '당군',
]);

// Korean history key terms to match
const TERM_PATTERNS = [
  // People (인물)
  /(?:광개토대왕|장수왕|근초고왕|을지문덕|연개소문|김춘추|김유신|문무왕|원효|의상|장보고|왕건|서희|강감찬|묘청|정중부|최충헌|최우|공민왕|이성계|정도전|세종|장영실|이순신|김정호|정약용|김홍도|신윤복|흥선대원군|김옥균|전봉준|안중근|안창호|이승만|김구|여운형|유관순|윤봉길|이봉창|김좌진|홍범도|신채호|박은식|이광수|한용운|나운규|방정환|김일성|박정희|김대중|노무현|최치원|의천|지눌|일연|이황|이이|송시열|김정희|허준|이제마|이자겸|만적|명성황후)/g,
  // Events (사건) — full terms only, no optional suffixes that match partial words
  /(?:임진왜란|병자호란|정묘호란|갑오개혁|동학농민운동|3[·.]1운동|6[·.]25전쟁|4[·.]19혁명|5[·.]18민주화운동|6월항쟁|위화도\s*회군|무신정변|살수대첩|귀주대첩|한산도대첩|행주대첩|홍경래의?\s*난|임오군란|갑신정변|을미사변|아관파천|국채보상운동|물산장려운동|브나로드\s*운동|광주학생[항일]*운동|만세운동|독립운동|의병운동|항일운동|민족운동|농민운동|노동운동)/g,
  // Treaties & Agreements
  /(?:강화도\s*조약|조[·]미\s*수호\s*통상\s*조약|시모노세키\s*조약|포츠머스\s*조약|을사[늑]*조약|한일\s*의정서|한일\s*신협약|한일\s*병합|제물포\s*조약|톈진\s*조약|조[·]일\s*통상\s*장정)/g,
  // Institutions & Organizations
  /(?:집현전|성균관|향교|서원|의금부|비변사|삼정승|의정부|6조|승정원|사헌부|사간원|홍문관|규장각|통리기무아문|별기군|독립협회|만민공동회|대한자강회|신민회|의열단|한인애국단|조선어학회|근우회|신간회)/g,
  // Cultural Heritage & Texts
  /(?:훈민정음|직지심체요절|팔만대장경|무구정광대다라니경|삼국사기|삼국유사|고려사|조선왕조실록|동의보감|경국대전|대동여지도|택리지|성호사설|목민심서|반계수록|열하일기)/g,
  // Wars & Military — full terms only
  /(?:별무반|삼별초|훈련도감|어영청|금위영|장용영|신기전)/g,
  // Systems & Policies — full terms only
  /(?:과거제|전시과|과전법|직전법|대동법|균역법|영정법|호패법|예송|탕평책|세도정치|삼정의?\s*문란|환곡|군역|전정|토지조사사업|산미증식계획|징병제|징용|공출|창씨개명|황국신민화|문화통치|민족말살통치|무단통치)/g,
  // Architecture & Artifacts
  /(?:첨성대|석굴암|불국사|미륵사지?|황룡사|다보탑|석가탑|수원화성|경복궁|창덕궁|종묘|고인돌|비파형동검|세형동검|빗살무늬토기|반량전|명도전|무령왕릉|천마총)/g,
  // Modern concepts — full terms only
  /(?:개화파|위정척사|동도서기|제헌국회|반민특위|농지개혁|새마을운동|경제개발[5개년]*계획|민주화운동|통일정책|남북정상회담|남북회담|금강산관광|개성공단|햇볕정책)/g,
  // Misc important terms
  /(?:삼국통일|남북국시대|후삼국|천리장성|나선정벌|북벌론?|척화비|서경천도|홍건적|왜구|쌍성총관부|철령위|요동정벌|4군6진|붕당정치|노론|소론|남인|북인|정조|영조|순조|헌종|철종|고종|순종)/g,
  // Specific 사화
  /(?:갑자사화|무오사화|기묘사화|을사사화)/g,
];

function extractKeywords(content, explanation) {
  const text = (content || '') + ' ' + (explanation || '');
  const found = new Set();

  for (const pattern of TERM_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const kw = match[0].trim();
      if (!BLACKLIST.has(kw) && kw.length >= 2) {
        found.add(kw);
      }
    }
  }

  return [...found].sort();
}

/** Remove blacklisted keywords from an existing array */
function cleanKeywords(keywords) {
  if (!keywords || !Array.isArray(keywords)) return keywords;
  return keywords.filter((kw) => !BLACKLIST.has(kw) && kw.length >= 2);
}

let totalUpdated = 0;
let totalCleaned = 0;
let totalQuestions = 0;

for (let i = 40; i <= 77; i++) {
  const filePath = path.join(dataDir, `exam-${i}.json`);
  if (!fs.existsSync(filePath)) continue;

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let updated = 0;
  let cleaned = 0;

  for (const q of data.questions) {
    totalQuestions++;

    if (mode === '--clean') {
      // Clean existing keywords only
      if (q.keywords && q.keywords.length > 0) {
        const before = q.keywords.length;
        q.keywords = cleanKeywords(q.keywords);
        if (q.keywords.length < before) {
          cleaned++;
        }
      }
    } else if (mode === '--all') {
      // Re-extract for all questions
      const kws = extractKeywords(q.content, q.explanation);
      if (kws.length > 0) {
        q.keywords = kws;
        updated++;
      }
    } else {
      // Default: fill missing only
      if (q.keywords && q.keywords.length > 0) continue;
      const kws = extractKeywords(q.content, q.explanation);
      if (kws.length > 0) {
        q.keywords = kws;
        updated++;
      }
    }
  }

  const changed = updated + cleaned;
  if (changed > 0) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    totalUpdated += updated;
    totalCleaned += cleaned;
    if (updated > 0) console.log(`exam-${i}: extracted keywords for ${updated} questions`);
    if (cleaned > 0) console.log(`exam-${i}: cleaned keywords for ${cleaned} questions`);
  } else {
    console.log(`exam-${i}: no changes needed`);
  }
}

if (mode === '--clean') {
  console.log(`\nTotal: ${totalCleaned}/${totalQuestions} questions cleaned`);
} else {
  console.log(`\nTotal: ${totalUpdated}/${totalQuestions} questions updated`);
}
