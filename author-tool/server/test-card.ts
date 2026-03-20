import fs from 'fs';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

async function test() {
  console.log('Loading font...');
  const fontPath = 'C:/Windows/Fonts/malgun.ttf';
  const fontData = fs.readFileSync(fontPath).buffer as ArrayBuffer;

  const node = {
    type: 'div',
    props: {
      style: {
        width: '1080px',
        height: '1080px',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        padding: '60px',
      },
      children: [
        {
          type: 'div',
          props: {
            style: { display: 'flex', gap: '12px', marginBottom: '40px' },
            children: [
              { type: 'div', props: { style: { background: 'rgba(255,255,255,0.2)', borderRadius: '20px', padding: '8px 20px', fontSize: '22px', fontWeight: 700, color: 'white' }, children: '#한능검' } },
              { type: 'div', props: { style: { background: 'rgba(255,255,255,0.2)', borderRadius: '20px', padding: '8px 20px', fontSize: '22px', fontWeight: 700, color: 'white' }, children: '#고려' } },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: { fontSize: '52px', fontWeight: 800, color: 'white', textAlign: 'center', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' },
            children: '🔥 이거 맞히면 1급!',
          },
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' },
            children: [
              { type: 'div', props: { style: { fontSize: '22px', color: 'rgba(255,255,255,0.7)' }, children: '제77회 1번' } },
              { type: 'div', props: { style: { fontSize: '20px', color: 'rgba(255,255,255,0.5)' }, children: '기출노트 한능검' } },
            ],
          },
        },
      ],
    },
  };

  console.log('Rendering SVG...');
  const svg = await satori(node as any, {
    width: 1080,
    height: 1080,
    fonts: [{ name: 'NotoSansKR', data: fontData, weight: 400, style: 'normal' }],
  });
  console.log('SVG length:', svg.length);

  console.log('Converting to PNG...');
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1080 } });
  const pngData = resvg.render();
  const pngBuffer = Buffer.from(pngData.asPng());

  fs.writeFileSync('test-card-full.png', pngBuffer);
  console.log('SUCCESS: test-card-full.png created, size =', pngBuffer.length, 'bytes');
  console.log('Base64 preview length:', pngBuffer.toString('base64').length);
}

test().catch((e) => console.error('FAILED:', e));
