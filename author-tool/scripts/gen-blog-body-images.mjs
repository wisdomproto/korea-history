// Generate body images (2 per post) for 22 blog posts via ComfyUI Flux.
// Style: Korean traditional painting + topic-specific scenes.
// Output: web/public/blog-images/{slug}-1.png, -2.png + bodyImages array
//         injected into data/blog/{slug}.json
//
// Run: cd author-tool && node scripts/gen-blog-body-images.mjs [slug]

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../');
const BLOG_DIR = path.join(ROOT, 'data', 'blog');
const OUTPUT_DIR = path.join(ROOT, 'web', 'public', 'blog-images');

const COMFY_URL = 'http://127.0.0.1:8188';
const CKPT_NAME = 'flux1-dev-fp8.safetensors';
const STEPS = 20;
const CFG = 1.0;
const SAMPLER = 'euler';
const SCHEDULER = 'simple';
// 4:3 for body images (different from hero 1216×640 OG)
const WIDTH = 1024;
const HEIGHT = 768;

const STYLE_BASE = 'Korean traditional painting (minhwa style), ink wash with subtle color, gold leaf accents, traditional Joseon aesthetic, museum-quality artwork, hanji paper texture, ornate brushwork, atmospheric perspective, no modern elements, no text, no captions';
const NEGATIVE = 'modern people, modern clothes, modern buildings, cars, photography, watermark, text, signature, blurry, low quality, deformed, ugly';

// Body subjects per slug — 2 scenes per post, anchored to specific h2 sections
const BODY = {
  'byeongja-horan': [
    { afterSection: 'process', alt: '병자호란 - 남한산성 농성', caption: '47일간의 남한산성 농성', subject: 'Joseon king Injo and refugees inside Namhansanseong fortress during 47-day siege, snowy winter, soldiers warming hands by fire, weary scholars in council, ink wash 1636' },
    { afterSection: 'figures', alt: '척화파와 주화파 — 김상헌과 최명길', caption: '척화파 김상헌과 주화파 최명길의 대립', subject: 'Two Joseon scholars in dramatic debate facing each other - dignified Confucian elder Kim Sang-heon and pragmatic Choi Myeong-gil, traditional study chamber with brushwork screens' },
  ],
  'daedong-beob': [
    { afterSection: 'process', alt: '대동법 시범 시행 — 경기도 농민', caption: '경기도 농민이 쌀로 공납하는 모습 (1608)', subject: 'Joseon farmers loading rice tribute onto government carts, scribes recording at simple table, 17th century rural office, autumn harvest scene with rice bags' },
    { afterSection: 'result', alt: '공인 — 조선 후기 어용상인', caption: '공인의 등장과 상품화폐 경제', subject: 'Joseon merchants (gongin) trading goods at busy outdoor market with rice payments, copper coin Sangpyeongtongbo, late 17th century commerce scene' },
  ],
  'hwan-guk': [
    { afterSection: 'three-hwanguk', alt: '인현왕후와 장희빈', caption: '인현왕후와 장희빈의 운명', subject: 'Two Joseon royal women in opposing palace settings - dignified Inhyeon Queen and ambitious Jang Hee-bin in formal hanbok, late 17th century palace, dramatic political tension, no faces shown' },
    { afterSection: 'result', alt: '송시열', caption: '척화파의 정신적 지주 송시열', subject: 'Old dignified Korean scholar Song Si-yeol in traditional robes of Confucian elder, surrounded by writing brushes and bound books, scholarly setting' },
  ],
  'gyunyeok-beob': [
    { afterSection: 'content', alt: '균역청과 군포 감면', caption: '균역청에서 군포를 거두는 모습', subject: 'Joseon clerks at Gyunyeokcheong office distributing reduced military cloth tax to commoners, 1750 scene, government building interior with bound documents' },
    { afterSection: 'limitation', alt: '결작 — 토지에 부과한 추가세', caption: '결작 — 양반 지주에게 추가 부과한 토지세', subject: 'Joseon yangban landowner reluctantly handing rice tax to government scribe at large estate, autumn fields in background, 18th century scene' },
  ],
  'gwangmu-gaehyeok': [
    { afterSection: 'reforms', alt: '광무개혁 — 양전 사업', caption: '양전·지계 사업 — 토지 측량과 증서 발급', subject: 'Daehan Empire era surveyors measuring farmland with traditional rulers, scribes drafting jigye land deeds, 1898 rural scene with paper documents' },
    { afterSection: 'limitation', alt: '대한제국의 좌절 — 헤이그 특사', caption: '헤이그 특사 (1907) — 외교권 회복 시도', subject: 'Three Korean envoys in formal Joseon dress arriving at international conference, 1907 Hague, dignified diplomatic mission, foreign building backdrop' },
  ],
  'heungseon-daewongun': [
    { afterSection: 'domestic', alt: '경복궁 중건', caption: '270년 폐허였던 경복궁 중건 (1865~1872)', subject: 'Joseon workers rebuilding Gyeongbokgung palace, large stone foundations, scaffolding, 1860s scene with traditional construction methods, dawn light over royal halls' },
    { afterSection: 'foreign', alt: '척화비 — 통상수교거부의 상징', caption: '전국에 세운 척화비 (1871)', subject: 'Stone monument cheokhwabi standing alone in dramatic landscape, traditional Korean stone carving with Chinese characters carved, mountains in background, 1871' },
  ],
  'hunminjeongeum': [
    { afterSection: 'creation', alt: '훈민정음 반포 — 1446년 9월', caption: '훈민정음 반포식', subject: 'King Sejong proclaiming Hangul alphabet to scholars and ministers, royal hall with bound Hunminjeongeum book on table, gold leaf accents, dawn ceremonial scene' },
    { afterSection: 'principle', alt: '집현전 학사들', caption: '집현전 학사들의 해례본 편찬', subject: 'Joseon scholars in Jiphyeonjeon hall working on Hunminjeongeum Haerye, brushes and ink stones, paper scrolls, candlelit study room, 15th century' },
  ],
  'gyeongguk-daejeon': [
    { afterSection: 'background', alt: '세조의 결단', caption: '세조가 시작한 법전 편찬', subject: 'King Sejo on throne commissioning legal codex compilation, scholars gathered before him with scroll, palace audience hall, 1460s' },
    { afterSection: 'structure', alt: '6전 체제와 6조', caption: '6전 체제 — 이·호·예·병·형·공', subject: 'Six Joseon government office buildings arranged symmetrically, scholars working at each office, six pillars representing six ministries, architectural overview' },
  ],
  'sejong-daewang-eopjeok': [
    { afterSection: 'science', alt: '장영실의 과학 기구', caption: '장영실이 만든 자격루와 측우기', subject: 'Joseon scientist Jang Yeong-sil presenting water clock Jagyeokru and rain gauge cheugu-gi to King Sejong, palace courtyard with scientific instruments, dawn light' },
    { afterSection: 'defense', alt: '4군 6진 개척', caption: '최윤덕과 김종서의 북방 개척', subject: 'Joseon general Kim Jong-seo riding war horse along northern frontier with Tumen river border, mountain landscape, 1430s, banner with traditional motifs' },
  ],
  'gwangjong-eopjeok': [
    { afterSection: 'reforms', alt: '광종의 과거제 도입', caption: '쌍기의 건의로 도입된 과거제 (958)', subject: 'Goryeo scholars taking first civil service examination, 958 setting, formal scholar robes, Chinese-style examination hall with bamboo brushes' },
    { afterSection: 'timeline', alt: '광종의 황제 칭호', caption: '광덕·준풍 연호와 황제 칭호', subject: 'Goryeo King Gwangjong on elaborate dragon throne with imperial yellow robes, palace officials bowing, golden phoenix accents, 950s' },
  ],
  'nobi-angeombeob': [
    { afterSection: 'content', alt: '노비안검법 시행 장면', caption: '노비에서 양인으로 환원되는 장면', subject: 'Goryeo era 956 scene of slaves being freed and registered as commoners by court officials, joyful peaceful crowd scene, scrolls and bamboo brushes, hopeful atmosphere' },
    { afterSection: 'effect', alt: '호족의 약화', caption: '호족 권력의 쇠퇴', subject: 'Aging Goryeo aristocrat sitting in dimming hall, contemplative ink wash style, autumn leaves outside window, sense of declining power' },
  ],
  'eumseo-je': [
    { afterSection: 'definition', alt: '음서 — 가문 세습 관직', caption: '음서로 등용되는 귀족 자제', subject: 'Goryeo aristocratic family scene with multiple generations of scholar-officials, sons and grandsons being appointed to positions, formal Goryeo robes, palace gate background' },
    { afterSection: 'context', alt: '고려 귀족 사회', caption: '귀족 가문의 폐쇄적 결혼 관계', subject: 'Goryeo aristocratic wedding scene with multiple noble families gathering, formal robes, ornate palace setting, intricate ceremonial atmosphere' },
  ],
  '6wol-minju-hangjaeng': [
    { afterSection: 'background', alt: '박종철 사건', caption: '박종철 고문치사 (1987.1)', subject: 'Stylized abstract memorial scene of fallen Korean university student, single white flower on stone monument, somber ink wash style, no specific person depicted' },
    { afterSection: 'protest', alt: '거리의 시민들', caption: '6월 항쟁 - 거리에 나선 시민들', subject: 'Stylized 1987 Korean democratic protest scene rendered in traditional ink painting, citizens with white headbands raising fists, dignified march, no specific faces, atmospheric haze' },
  ],
  '5-18-gwangju': [
    { afterSection: 'protest', alt: '시민군의 결성', caption: '시민군의 자치 (1980.5.21~26)', subject: 'Stylized 1980 Gwangju citizens organizing in city hall during 5-day self-governance, dignified gathering, traditional ink wash, no graphic imagery, monumental composition' },
    { afterSection: 'aftermath', alt: '5·18 추모', caption: '진실을 향한 긴 여정', subject: 'Memorial scene with white flowers and candles in traditional Korean setting, dawn light, hopeful but somber, ink wash style, no specific people' },
  ],
  'daehan-jeguk': [
    { afterSection: 'background', alt: '대한제국 선포 — 환구단', caption: '환구단 황제 즉위식 (1897.10.12)', subject: 'Emperor Gojong of Daehan Empire in formal yellow imperial robe at Hwanggudan altar 1897, traditional Korean ceremonial setting, golden phoenix accents, dignified imperial portrait' },
    { afterSection: 'loss', alt: '을사조약', caption: '을사조약과 외교권 박탈 (1905)', subject: 'Joseon ministers signing forced treaty under Japanese pressure, 1905 setting, somber atmosphere, ink wash style showing power imbalance' },
  ],
  'husamguk-tongil': [
    { afterSection: 'early-war', alt: '공산 전투의 신숭겸', caption: '신숭겸의 충성 (927)', subject: 'Goryeo general Sin Sung-gyeom in dramatic battle scene at Gongsan 927, sacrificing himself to save King Wang Geon, traditional war painting, mountain backdrop' },
    { afterSection: 'decisive', alt: '경순왕의 항복', caption: '신라 경순왕의 자발적 항복 (935)', subject: 'Last Silla king Gyeongsun in dignified procession to Goryeo court, peaceful surrender 935, ceremonial robes, Wang Geon receiving him with respect' },
  ],
  'balhae-myeolmang': [
    { afterSection: 'overview', alt: '발해의 해동성국 시대', caption: '발해 9세기 해동성국 시대', subject: 'Balhae kingdom 9th century scene of prosperity, palace at Sangyong-bu with elaborate roofs, scholars and merchants, ink wash style, golden age atmosphere' },
    { afterSection: 'exodus', alt: '발해 유민의 고려 망명', caption: '대광현의 고려 망명 (934)', subject: 'Balhae refugees led by prince Dae Gwang-hyeon arriving at Goryeo border, snow-covered mountain pass, 934 setting, dignified procession seeking shelter' },
  ],
  'jeongjo-eopjeok': [
    { afterSection: 'hwaseong', alt: '수원화성 건설', caption: '수원화성과 정약용의 거중기', subject: 'Hwaseong Fortress construction with Jeong Yak-yong\'s geojunggi crane lifting heavy stones, 1796 scene, workers and engineers, rounded fortress walls visible' },
    { afterSection: 'silhak', alt: '실학과 학문의 만개', caption: '정조 시대 실학자들', subject: 'Late Joseon scholars Jeong Yak-yong and Park Ji-won in study chamber discussing books, brushwork screens, scholarly atmosphere, candlelit night scene' },
  ],
  'gwanghaegun-eopjeok': [
    { afterSection: 'domestic', alt: '동의보감 완성', caption: '허준의 동의보감 (1610)', subject: 'Joseon physician Heo Jun presenting Donguibogam medical books to King Gwanghaegun, palace scholarly room, 1610 setting, scrolls and herbal preparations' },
    { afterSection: 'darkside', alt: '인조반정', caption: '인조반정 (1623)', subject: 'Western faction scholars in dramatic palace coup scene 1623, dignified armed gathering, somber atmosphere, ink wash style of political upheaval' },
  ],
  'seongjong-eopjeok': [
    { afterSection: 'hongmungwan', alt: '홍문관과 삼사', caption: '홍문관 학사들의 자문 활동', subject: 'King Seongjong with Hongmungwan scholars in palace library, scrolls and bound books being discussed, 1480s scene, scholarly Confucian atmosphere' },
    { afterSection: 'sarim', alt: '사림의 등용', caption: '김종직과 사림의 등장', subject: 'Yeongnam scholar Kim Jong-jik and his disciples in dignified gathering at provincial school, traditional white robes, mountain landscape backdrop, 1480s' },
  ],
  'imjin-waeran-gyeolgwa': [
    { afterSection: 'korea-result', alt: '임진왜란 후 폐허', caption: '폐허가 된 농촌 — 인구 절반 감소', subject: 'Devastated Joseon village after war, abandoned rice paddies, broken pottery, surviving farmers rebuilding, late 16th century post-war scene, somber ink wash' },
    { afterSection: 'diplomacy', alt: '광해군의 중립외교', caption: '광해군과 강홍립의 중립외교', subject: 'King Gwanghaegun studying maps of Ming-Later Jin border with Kang Hong-rip, candlelight on tactical document, contemplative night scene, early 17th century court' },
  ],
};

// ─── Comfy helpers (same as gen-blog-images.mjs) ───
function comfyPost(pathn, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1', port: 8188, path: pathn, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let chunks = '';
      res.on('data', (d) => chunks += d);
      res.on('end', () => { try { resolve(JSON.parse(chunks)); } catch (e) { reject(new Error(`Parse fail: ${chunks.slice(0,200)}`)); } });
    });
    req.on('error', reject);
    req.write(data); req.end();
  });
}

function comfyGet(pathn) {
  return new Promise((resolve, reject) => {
    http.get(`${COMFY_URL}${pathn}`, (res) => {
      let chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (res.headers['content-type']?.includes('application/json')) {
          try { resolve(JSON.parse(buf.toString())); } catch (e) { reject(e); }
        } else { resolve(buf); }
      });
    }).on('error', reject);
  });
}

function buildWorkflow(prompt, seed) {
  return {
    '1': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: CKPT_NAME } },
    '2': { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['1', 1] } },
    '3': { class_type: 'CLIPTextEncode', inputs: { text: NEGATIVE, clip: ['1', 1] } },
    '4': { class_type: 'EmptyLatentImage', inputs: { width: WIDTH, height: HEIGHT, batch_size: 1 } },
    '5': { class_type: 'KSampler', inputs: {
      seed, steps: STEPS, cfg: CFG, sampler_name: SAMPLER, scheduler: SCHEDULER, denoise: 1.0,
      model: ['1', 0], positive: ['2', 0], negative: ['3', 0], latent_image: ['4', 0],
    } },
    '6': { class_type: 'VAEDecode', inputs: { samples: ['5', 0], vae: ['1', 2] } },
    '7': { class_type: 'SaveImage', inputs: { images: ['6', 0], filename_prefix: 'blog_body' } },
  };
}

async function generateImage(slug, idx, body) {
  const prompt = `${body.subject}. ${STYLE_BASE}`;
  const seed = Math.floor(Math.random() * 1e9);
  const workflow = buildWorkflow(prompt, seed);
  console.log(`\n[${slug}-${idx}] ${body.afterSection}: ${body.subject.slice(0,70)}...`);
  const res = await comfyPost('/prompt', { prompt: workflow });
  const promptId = res.prompt_id;
  if (!promptId) throw new Error('No prompt_id');
  const start = Date.now();
  while (true) {
    await new Promise(r => setTimeout(r, 2000));
    const hist = await comfyGet(`/history/${promptId}`);
    if (hist[promptId]?.outputs?.['7']?.images?.[0]) {
      const { filename, subfolder, type } = hist[promptId].outputs['7'].images[0];
      const imgBuf = await comfyGet(`/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder ?? '')}&type=${type ?? 'output'}`);
      const outPath = path.join(OUTPUT_DIR, `${slug}-${idx}.png`);
      fs.writeFileSync(outPath, imgBuf);
      console.log(`  saved ${slug}-${idx}.png (${Math.round((Date.now()-start)/1000)}s)`);
      return `/blog-images/${slug}-${idx}.png`;
    }
    if (Date.now() - start > 5 * 60 * 1000) throw new Error('Timeout');
    process.stdout.write('.');
  }
}

function injectBodyImages(slug, items) {
  const jsonPath = path.join(BLOG_DIR, `${slug}.json`);
  if (!fs.existsSync(jsonPath)) return;
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  data.bodyImages = items;
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  console.log(`  injected bodyImages (${items.length}) into ${slug}.json`);
}

const onlySlug = process.argv[2];
const slugs = onlySlug ? [onlySlug] : Object.keys(BODY);
console.log(`Generating body images for ${slugs.length} slugs (2 each = ${slugs.length * 2} images)...`);

let ok = 0, fail = 0;
for (const slug of slugs) {
  const bodies = BODY[slug];
  if (!bodies) { console.warn(`No body subjects for ${slug}`); fail++; continue; }
  const items = [];
  for (let i = 0; i < bodies.length; i++) {
    const body = bodies[i];
    try {
      const src = await generateImage(slug, i + 1, body);
      items.push({ src, alt: body.alt, caption: body.caption, afterSection: body.afterSection });
      ok++;
    } catch (err) { console.error(`[${slug}-${i+1}] FAILED:`, err.message); fail++; }
  }
  if (items.length > 0) injectBodyImages(slug, items);
}

console.log(`\n=== Done: ${ok} ok / ${fail} failed ===`);
