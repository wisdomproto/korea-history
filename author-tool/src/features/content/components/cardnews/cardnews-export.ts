import type { InstagramSlide } from '../../../../lib/content-types';
import JSZip from 'jszip';

export const BASE_W = 1080;

export async function renderSlideToBlob(slide: InstagramSlide): Promise<Blob> {
  const html2canvas = (await import('html2canvas')).default;
  const W = 1080, H = 1350;
  const canvasData = slide.canvas;
  const imgUrl = canvasData?.imageUrl || slide.imageUrl;
  // Use proxy for R2 images
  const proxyImgUrl = imgUrl?.includes('.r2.dev/') ? '/r2/' + imgUrl.split('.r2.dev/')[1] : imgUrl;

  // Create offscreen container at export resolution
  const container = document.createElement('div');
  container.style.cssText = `position:fixed;left:-9999px;top:0;width:${W}px;height:${H}px;overflow:hidden;background:${canvasData?.bgColor || '#18181b'};`;

  // Image layer
  if (proxyImgUrl) {
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.src = proxyImgUrl;
    img.style.cssText = `position:absolute;width:100%;object-fit:contain;top:${canvasData?.imageY || 50}%;transform:translateY(-50%);`;
    container.appendChild(img);
    // Wait for image to load
    await new Promise<void>((resolve) => { img.onload = () => resolve(); img.onerror = () => resolve(); });
  }

  // Text blocks (same CSS as SlideCanvas)
  if (canvasData?.textBlocks) {
    for (const block of canvasData.textBlocks) {
      if (block.hidden) continue;
      const div = document.createElement('div');
      div.style.cssText = `position:absolute;left:${block.x}%;top:${block.y}%;width:${block.width}%;font-size:${block.fontSize}px;color:${block.color};font-weight:${block.fontWeight};text-align:${block.textAlign};line-height:1.4;white-space:pre-wrap;${block.shadow ? `text-shadow:0 2px 8px rgba(0,0,0,0.7);` : ''}`;
      div.textContent = block.text || '';
      container.appendChild(div);
    }
  }

  document.body.appendChild(container);

  const canvas = await html2canvas(container, {
    width: W, height: H, scale: 1,
    useCORS: true, allowTaint: false,
    backgroundColor: null,
  });

  document.body.removeChild(container);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png');
  });
}

export async function downloadSlide(slide: InstagramSlide, index: number): Promise<void> {
  const blob = await renderSlideToBlob(slide);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `cardnews_${index + 1}.png`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadAllSlides(slides: InstagramSlide[], caption?: string): Promise<void> {
  const zip = new JSZip();
  for (let i = 0; i < slides.length; i++) {
    const blob = await renderSlideToBlob(slides[i]);
    zip.file(`cardnews_${String(i + 1).padStart(2, '0')}.png`, blob);
  }
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cardnews_${caption?.slice(0, 20) || 'slides'}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
