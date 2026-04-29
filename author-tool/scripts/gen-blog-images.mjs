// Generate hero images for 22 blog posts via ComfyUI (Flux dev fp8).
// Style: Korean traditional painting (한국 전통 회화 / minhwa / ink wash).
// Output: web/public/blog-images/{slug}.png + heroImage path injected
//         into data/blog/{slug}.json
//
// Run: cd author-tool && node scripts/gen-blog-images.mjs [slug]
//   - no arg: generates ALL 22
//   - slug arg: generates only that one (test)
//
// Requires: ComfyUI running on http://127.0.0.1:8188 with
// flux1-dev-fp8.safetensors checkpoint loaded.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../');
const BLOG_DIR = path.join(ROOT, 'data', 'blog');
const OUTPUT_DIR = path.join(ROOT, 'web', 'public', 'blog-images');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const COMFY_URL = 'http://127.0.0.1:8188';
const CKPT_NAME = 'flux1-dev-fp8.safetensors';
// Flux dev: ~20 steps, CFG 1.0 (no CFG), euler/simple
const STEPS = 20;
const CFG = 1.0;
const SAMPLER = 'euler';
const SCHEDULER = 'simple';
// 1216×640 ≈ OG image ratio (1.9:1), good for Flux
const WIDTH = 1216;
const HEIGHT = 640;

// ─── Style template ─────────────────────────────────────────────────────
// Base style for Korean traditional painting + topic-specific subject
const STYLE_BASE = 'Korean traditional painting (minhwa style), ink wash with subtle color, gold leaf accents, traditional Joseon aesthetic, museum-quality artwork, hanji paper texture, ornate brushwork, atmospheric perspective, no modern elements, no text';

// Per-slug subject prompts (historically faithful, visual focus)
const SUBJECTS = {
  'byeongja-horan': 'Joseon king Injo kneeling in snow at Samjeondo, surrounded by armored Manchu warriors, dramatic winter scene 1637, Namhansanseong fortress in background',
  'daedong-beob': 'Joseon dynasty 17th century farmers carrying rice bags to government office, scribes recording on hanji paper documents, wide rural landscape, autumn harvest scene',
  'hwan-guk': 'Joseon court scene with king and rivaling factions of scholars in formal hanbok, dramatic political tension, palace interior with paper screens, late 17th century',
  'gyunyeok-beob': 'Joseon farmers receiving relief from soldier-tax burden, government clerks distributing white cloth (gunpo) reduction edict, 18th century scene under King Yeongjo',
  'gwangmu-gaehyeok': 'Daehan Empire era 1900s scene mixing traditional and early modern elements, electric lights and traditional buildings together, Hangseong city scene with first telegraph poles',
  'heungseon-daewongun': 'Joseon court scene with regent in formal hanbok issuing edicts to ministers, mid-19th century palace interior, restored Gyeongbokgung halls in background',
  'hunminjeongeum': 'King Sejong the Great holding Hangul script document, surrounded by scholars in royal study chamber Gyeonghoeru, calligraphy brushes and ink stones, dawn light through paper screens',
  'gyeongguk-daejeon': 'Royal scholars compiling thick legal codex on traditional desks, large bound volumes Gyeongguk Daejeon, Joseon palace library scene, ink and brush, formal scholar hanbok',
  'sejong-daewang-eopjeok': 'King Sejong the Great in royal scholar pose with multiple symbolic objects: hangul scroll, water clock Jagyeokru, stone gauge cheugu-gi, all arranged on traditional desk, golden royal hanbok',
  'gwangjong-eopjeok': 'Goryeo dynasty 10th century king on throne issuing reform edicts, court scholars taking civil service examination in foreground, royal yellow robe',
  'nobi-angeombeob': 'Goryeo era 956 scene of slaves being freed and registered as commoners by court officials, joyful peaceful crowd scene, scrolls and bamboo brushes, 10th century setting',
  'eumseo-je': 'Goryeo aristocratic family scene with multiple generations of scholar-officials, sons and grandsons being appointed to positions without exams, formal Goryeo robes, palace gate background',
  '6wol-minju-hangjaeng': 'Stylized 1987 Korean democratic protest scene rendered in traditional ink painting, citizens with white headbands raising fists, dignified protest, no faces, atmospheric haze',
  '5-18-gwangju': 'Stylized 1980 Gwangju citizens defending city in traditional ink wash style, somber and dignified, citizens guarding old provincial hall, no graphic violence, monumental composition',
  'daehan-jeguk': 'Emperor Gojong of Daehan Empire in formal yellow imperial robe at Hwanggudan altar 1897, traditional Korean ceremonial setting, golden phoenix accents, dignified imperial portrait',
  'husamguk-tongil': 'Wang Geon riding war horse with banner uniting Three Later Kingdoms, 936 victory scene at Iri-cheon battle, dramatic landscape with mountains, Goryeo unification era',
  'balhae-myeolmang': 'Last days of Balhae kingdom 926, Khitan invaders silhouetted in distance, Sangyong-bu palace abandoned, falling snow and broken banners, mournful atmosphere',
  'jeongjo-eopjeok': 'King Jeongjo at Hwaseong Fortress 1796 with construction crane (geojunggi by Jeong Yak-yong), rounded fortress walls, royal procession, late Joseon golden age scene',
  'gwanghaegun-eopjeok': 'King Gwanghaegun studying maps of Ming-Later Jin border with Kang Hong-rip, candlelight on tactical document, contemplative night scene, early 17th century court',
  'seongjong-eopjeok': 'King Seongjong with scholars at Hongmungwan library, scrolls and bound books Gyeongguk Daejeon being completed, Joseon early period scholarly scene 1485',
  'imjin-waeran-gyeolgwa': 'Aftermath of Imjin War 1598, ruined villages being rebuilt, surviving farmers and scholars rebuilding hanok houses, traditional ink wash showing devastation and recovery',
};

const NEGATIVE = 'modern people, modern clothes, modern buildings, cars, photography, watermark, text, signature, blurry, low quality, deformed, ugly';

// ─── Comfy API helpers ──────────────────────────────────────────────────
function comfyPost(pathn, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1', port: 8188, path: pathn, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let chunks = '';
      res.on('data', (d) => chunks += d);
      res.on('end', () => {
        try { resolve(JSON.parse(chunks)); } catch (e) { reject(new Error(`Parse fail: ${chunks.slice(0,200)}`)); }
      });
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
        } else {
          resolve(buf);
        }
      });
    }).on('error', reject);
  });
}

// ─── Workflow ───────────────────────────────────────────────────────────
function buildWorkflow(prompt, seed) {
  return {
    '1': {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: CKPT_NAME },
    },
    '2': {
      class_type: 'CLIPTextEncode',
      inputs: { text: prompt, clip: ['1', 1] },
    },
    '3': {
      class_type: 'CLIPTextEncode',
      inputs: { text: NEGATIVE, clip: ['1', 1] },
    },
    '4': {
      class_type: 'EmptyLatentImage',
      inputs: { width: WIDTH, height: HEIGHT, batch_size: 1 },
    },
    '5': {
      class_type: 'KSampler',
      inputs: {
        seed,
        steps: STEPS,
        cfg: CFG,
        sampler_name: SAMPLER,
        scheduler: SCHEDULER,
        denoise: 1.0,
        model: ['1', 0],
        positive: ['2', 0],
        negative: ['3', 0],
        latent_image: ['4', 0],
      },
    },
    '6': {
      class_type: 'VAEDecode',
      inputs: { samples: ['5', 0], vae: ['1', 2] },
    },
    '7': {
      class_type: 'SaveImage',
      inputs: { images: ['6', 0], filename_prefix: 'blog_hero' },
    },
  };
}

// ─── Submit + wait ──────────────────────────────────────────────────────
async function generateImage(slug, subject) {
  const prompt = `${subject}. ${STYLE_BASE}`;
  const seed = Math.floor(Math.random() * 1e9);
  const workflow = buildWorkflow(prompt, seed);

  console.log(`\n[${slug}] Submitting...`);
  console.log(`  prompt: ${subject.slice(0, 80)}...`);
  const res = await comfyPost('/prompt', { prompt: workflow });
  const promptId = res.prompt_id;
  if (!promptId) throw new Error('No prompt_id: ' + JSON.stringify(res).slice(0,200));
  console.log(`  prompt_id: ${promptId}`);

  // Poll history
  const start = Date.now();
  while (true) {
    await new Promise(r => setTimeout(r, 2000));
    const hist = await comfyGet(`/history/${promptId}`);
    if (hist[promptId]?.outputs) {
      const outputs = hist[promptId].outputs;
      const node7 = outputs['7']?.images;
      if (node7?.[0]) {
        const { filename, subfolder, type } = node7[0];
        console.log(`  generated: ${filename} (${Math.round((Date.now()-start)/1000)}s)`);
        // Download
        const imgBuf = await comfyGet(`/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder ?? '')}&type=${type ?? 'output'}`);
        const outPath = path.join(OUTPUT_DIR, `${slug}.png`);
        fs.writeFileSync(outPath, imgBuf);
        console.log(`  saved: ${path.relative(ROOT, outPath)}`);
        return `/blog-images/${slug}.png`;
      }
    }
    if (Date.now() - start > 5 * 60 * 1000) {
      throw new Error('Timeout waiting for image (5 min)');
    }
    process.stdout.write('.');
  }
}

// ─── Inject heroImage into blog JSON ────────────────────────────────────
function injectHeroImage(slug, imagePath) {
  const jsonPath = path.join(BLOG_DIR, `${slug}.json`);
  if (!fs.existsSync(jsonPath)) {
    console.warn(`  ⚠️ Blog JSON not found: ${jsonPath}`);
    return;
  }
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  data.heroImage = imagePath;
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  console.log(`  injected heroImage into ${slug}.json`);
}

// ─── Main ───────────────────────────────────────────────────────────────
const onlySlug = process.argv[2];
const slugs = onlySlug ? [onlySlug] : Object.keys(SUBJECTS);

console.log(`Generating ${slugs.length} blog hero images via ComfyUI Flux...`);
console.log(`Output dir: ${OUTPUT_DIR}`);

let ok = 0, fail = 0;
for (const slug of slugs) {
  const subject = SUBJECTS[slug];
  if (!subject) {
    console.warn(`No subject defined for ${slug}, skipping`);
    fail++;
    continue;
  }
  try {
    const imagePath = await generateImage(slug, subject);
    injectHeroImage(slug, imagePath);
    ok++;
  } catch (err) {
    console.error(`[${slug}] FAILED:`, err.message);
    fail++;
  }
}

console.log(`\n=== Done: ${ok} ok / ${fail} failed ===`);
