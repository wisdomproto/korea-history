import satori from 'satori';
import fs from 'fs';

async function test() {
  const fontData = fs.readFileSync('C:/Windows/Fonts/malgun.ttf').buffer as ArrayBuffer;
  const fonts = [{ name: 'NotoSansKR', data: fontData, weight: 400 as const, style: 'normal' as const }];

  function textNode(text: string, style: any) {
    return { type: 'div', props: { style, children: text } };
  }

  // Test Slide 1
  const slide1 = {
    type: 'div',
    props: {
      style: { width: '1080px', height: '1080px', display: 'flex', flexDirection: 'column', background: '#10B981', fontFamily: 'NotoSansKR', padding: '60px' },
      children: [
        { type: 'div', props: { style: { display: 'flex', gap: '12px', marginBottom: '40px' }, children: [
          textNode('#한능검', { background: 'rgba(255,255,255,0.2)', borderRadius: '20px', padding: '8px 20px', fontSize: '22px', fontWeight: 700, color: 'white' }),
          textNode('#고려', { background: 'rgba(255,255,255,0.2)', borderRadius: '20px', padding: '8px 20px', fontSize: '22px', fontWeight: 700, color: 'white' }),
        ]}},
        textNode('🔥 이거 맞히면 1급!', { fontSize: '52px', fontWeight: 800, color: 'white', textAlign: 'center', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }),
        { type: 'div', props: { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }, children: [
          textNode('제77회 1번', { fontSize: '22px', color: 'rgba(255,255,255,0.7)' }),
          textNode('기출노트 한능검', { fontSize: '20px', color: 'rgba(255,255,255,0.5)' }),
        ]}},
      ],
    },
  };

  try {
    await satori(slide1 as any, { width: 1080, height: 1080, fonts });
    console.log('✅ Slide 1 OK');
  } catch (e: any) {
    console.log('❌ Slide 1 FAIL:', e.message);
  }

  // Test Slide 2 (question)
  const slide2 = {
    type: 'div',
    props: {
      style: { width: '1080px', height: '1080px', display: 'flex', flexDirection: 'column', background: '#10B981', fontFamily: 'NotoSansKR', padding: '60px' },
      children: [
        textNode('Q.', { fontSize: '36px', fontWeight: 800, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }),
        textNode('다음 자료에 해당하는 시대는?', { fontSize: '28px', fontWeight: 700, color: 'white', marginBottom: '32px', lineHeight: '1.5' }),
        { type: 'div', props: { style: { display: 'flex', flexDirection: 'column', flex: 1 }, children: [
          textNode('① 구석기', { fontSize: '26px', color: 'white', padding: '14px 20px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', marginBottom: '8px' }),
          textNode('② 신석기', { fontSize: '26px', color: 'white', padding: '14px 20px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', marginBottom: '8px' }),
        ]}},
        textNode('댓글에 정답 남겨보세요!', { fontSize: '20px', color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: '16px' }),
      ],
    },
  };

  try {
    await satori(slide2 as any, { width: 1080, height: 1080, fonts });
    console.log('✅ Slide 2 OK');
  } catch (e: any) {
    console.log('❌ Slide 2 FAIL:', e.message);
  }

  // Test Slide 3 (answer)
  const slide3 = {
    type: 'div',
    props: {
      style: { width: '1080px', height: '1080px', display: 'flex', flexDirection: 'column', background: '#10B981', fontFamily: 'NotoSansKR', padding: '60px' },
      children: [
        textNode('정답: ②', { fontSize: '44px', fontWeight: 800, color: 'white', marginBottom: '8px' }),
        textNode('신석기', { fontSize: '28px', color: 'rgba(255,255,255,0.85)', marginBottom: '40px' }),
        { type: 'div', props: { style: { background: 'rgba(255,255,255,0.15)', borderRadius: '20px', padding: '32px', flex: 1, display: 'flex', flexDirection: 'column' }, children: [
          textNode('해설', { fontSize: '20px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: '12px' }),
          textNode('빗살무늬 토기는 신석기 시대의 대표적 유물입니다.', { fontSize: '24px', color: 'white', lineHeight: '1.6' }),
        ]}},
        textNode('기출노트 한능검', { fontSize: '20px', color: 'rgba(255,255,255,0.5)', textAlign: 'right', marginTop: '16px' }),
      ],
    },
  };

  try {
    await satori(slide3 as any, { width: 1080, height: 1080, fonts });
    console.log('✅ Slide 3 OK');
  } catch (e: any) {
    console.log('❌ Slide 3 FAIL:', e.message);
  }

  // Test Slide 4 (CTA)
  const slide4 = {
    type: 'div',
    props: {
      style: { width: '1080px', height: '1080px', display: 'flex', flexDirection: 'column', background: '#10B981', fontFamily: 'NotoSansKR', padding: '60px' },
      children: [
        { type: 'div', props: { style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }, children: [
          textNode('📲', { fontSize: '64px', marginBottom: '24px' }),
          textNode('더 많은 기출문제를 풀어보고 싶다면?', { fontSize: '36px', fontWeight: 800, color: 'white', textAlign: 'center', lineHeight: '1.4', marginBottom: '32px' }),
          { type: 'div', props: { style: { background: 'rgba(255,255,255,0.2)', borderRadius: '16px', padding: '20px 40px', display: 'flex' }, children: [
            textNode('gcnote.co.kr', { fontSize: '28px', fontWeight: 700, color: 'white' }),
          ]}},
          textNode('1,900+ 기출문제 · 87개 요약노트 · 무료', { fontSize: '20px', color: 'rgba(255,255,255,0.7)', marginTop: '24px' }),
        ]}},
        textNode('기출노트 한능검', { fontSize: '20px', color: 'rgba(255,255,255,0.5)', textAlign: 'right' }),
      ],
    },
  };

  try {
    await satori(slide4 as any, { width: 1080, height: 1080, fonts });
    console.log('✅ Slide 4 OK');
  } catch (e: any) {
    console.log('❌ Slide 4 FAIL:', e.message);
  }
}

test();
