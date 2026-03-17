/**
 * Extract keywords from question content + explanation for exams missing keywords.
 * Uses pattern matching to find historical terms, names, events, treaties, etc.
 */
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data', 'questions');

// Korean history key terms to match
const TERM_PATTERNS = [
  // People (인물)
  /(?:광개토대왕|장수왕|근초고왕|을지문덕|연개소문|김춘추|김유신|문무왕|원효|의상|장보고|왕건|서희|강감찬|묘청|정중부|최충헌|최우|공민왕|이성계|정도전|세종|장영실|이순신|김정호|정약용|김홍도|신윤복|흥선대원군|김옥균|전봉준|안중근|안창호|이승만|김구|여운형|유관순|윤봉길|이봉창|김좌진|홍범도|신채호|박은식|이광수|한용운|나운규|방정환|김일성|박정희|김대중|노무현|최치원|의천|지눌|일연|이황|이이|송시열|김정희|허준|이제마)/g,
  // Note: Kingdom/dynasty names (고구려, 백제, 신라, 고려, 조선 etc.) excluded — covered by era category
  // Events (사건)
  /(?:임진왜란|병자호란|정묘호란|갑오개혁|동학[농민]*운동|3[·.]1[운동]*|6[·.]25[전쟁]*|4[·.]19[혁명]*|5[·.]18[민주화운동]*|6[월]*항쟁|위화도\s*회군|무신정변|살수대첩|귀주대첩|한산도대첩|행주대첩|홍경래의?\s*난|임오군란|갑신정변|을미사변|아관파천|국채보상운동|물산장려운동|브나로드\s*운동|광주학생[항일]*운동|만세운동|독립운동|의병[운동]*|항일[운동]*|민족[운동]*|농민[운동]*|노동[운동]*)/g,
  // Treaties & Agreements
  /(?:강화도\s*조약|조[·]미\s*수호\s*통상\s*조약|시모노세키\s*조약|포츠머스\s*조약|을사[늑]*조약|한일\s*의정서|한일\s*신협약|한일\s*병합|제물포\s*조약|톈진\s*조약|조[·]일\s*통상\s*장정)/g,
  // Institutions & Organizations
  /(?:집현전|성균관|향교|서원|의금부|비변사|삼정승|의정부|6조|승정원|사헌부|사간원|홍문관|규장각|통리기무아문|별기군|독립협회|만민공동회|대한자강회|신민회|의열단|한인애국단|조선어학회|근우회|신간회)/g,
  // Cultural Heritage & Texts
  /(?:훈민정음|직지심체요절|팔만대장경|무구정광대다라니경|삼국사기|삼국유사|고려사|조선왕조실록|동의보감|경국대전|대동여지도|택리지|성호사설|목민심서|반계수록|열하일기)/g,
  // Wars & Military
  /(?:별무반|삼별초|의병|훈련도감|어영청|금위영|장용영|신기전)/g,
  // Systems & Policies
  /(?:과거제|전시과|과전법|직전법|대동법|균역법|영정법|호패법|사화|예송|탕평[책]*|세도정치|삼정[의]*문란|환곡|군역|전정|토지조사사업|산미증식계획|징병제|징용|공출|창씨개명|황국신민화|문화통치|민족말살[통치]*|무단통치)/g,
  // Architecture & Artifacts
  /(?:첨성대|석굴암|불국사|미륵사[지]*|황룡사|다보탑|석가탑|수원화성|경복궁|창덕궁|종묘|고인돌|비파형동검|세형동검|빗살무늬토기|반량전|명도전|무령왕릉|천마총|금관)/g,
  // Modern concepts
  /(?:개화[파]*|위정척사|동도서기|제헌[국회]*|반민특위|농지개혁|새마을운동|경제개발[5개년]*계획|민주화|통일[정책]*|남북[정상]*회담|금강산[관광]*|개성공단|햇볕정책)/g,
  // Misc important terms
  /(?:삼국통일|남북국시대|후삼국|천리장성|나선정벌|북벌[론]*|호란|왜란|척화비|서경천도|이자겸|묘청|만적|홍건적|왜구|쌍성총관부|철령위|요동정벌|4군6진|사림|훈구|붕당|노론|소론|남인|북인|탕평|정조|영조|순조|헌종|철종|고종|명성황후|순종)/g,
];

function extractKeywords(content, explanation) {
  const text = (content || '') + ' ' + (explanation || '');
  const found = new Set();

  for (const pattern of TERM_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      found.add(match[0].trim());
    }
  }

  return [...found].sort();
}

let totalUpdated = 0;
let totalQuestions = 0;

for (let i = 40; i <= 77; i++) {
  const filePath = path.join(dataDir, `exam-${i}.json`);
  if (!fs.existsSync(filePath)) continue;

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let updated = 0;

  for (const q of data.questions) {
    totalQuestions++;
    // Only fill in missing keywords
    if (q.keywords && q.keywords.length > 0) continue;

    const kws = extractKeywords(q.content, q.explanation);
    if (kws.length > 0) {
      q.keywords = kws;
      updated++;
    }
  }

  if (updated > 0) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    totalUpdated += updated;
    console.log(`exam-${i}: extracted keywords for ${updated} questions`);
  } else {
    console.log(`exam-${i}: no new keywords needed`);
  }
}

console.log(`\nTotal: ${totalUpdated}/${totalQuestions} questions updated`);
