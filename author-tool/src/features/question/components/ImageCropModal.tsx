import { useState, useRef, useCallback, useMemo } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';

/** Proxy external URLs through our server to avoid CORS canvas tainting */
function proxyUrl(url: string): string {
  if (url.startsWith('http') && !url.startsWith(window.location.origin)) {
    return `/api/images/proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

interface ImageCropModalProps {
  open: boolean;
  imageUrl: string;
  onClose: () => void;
  onCropped: (file: File) => void;
  loading?: boolean;
}

function cropImageToFile(
  image: HTMLImageElement,
  crop: PixelCrop,
): Promise<File> {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  canvas.width = Math.floor(crop.width * scaleX);
  canvas.height = Math.floor(crop.height * scaleY);

  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Canvas toBlob failed'));
      resolve(new File([blob], 'cropped.png', { type: 'image/png' }));
    }, 'image/png');
  });
}

export function ImageCropModal({ open, imageUrl, onClose, onCropped, loading }: ImageCropModalProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const safeSrc = useMemo(() => proxyUrl(imageUrl), [imageUrl]);

  const handleSave = useCallback(async () => {
    if (!imgRef.current || !completedCrop) return;
    const file = await cropImageToFile(imgRef.current, completedCrop);
    onCropped(file);
  }, [completedCrop, onCropped]);

  return (
    <Modal open={open} onClose={onClose} title="이미지 자르기" maxWidth="max-w-3xl">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">자르고 싶은 영역을 드래그하세요.</p>

        <div className="flex justify-center rounded-lg border bg-gray-50 p-2 max-h-[60vh] overflow-auto">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
          >
            <img
              ref={imgRef}
              src={safeSrc}
              alt="Crop target"
              style={{ maxHeight: '55vh', maxWidth: '100%' }}
            />
          </ReactCrop>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>취소</Button>
          <Button
            onClick={handleSave}
            loading={loading}
            disabled={!completedCrop?.width || !completedCrop?.height}
          >
            자르기 적용
          </Button>
        </div>
      </div>
    </Modal>
  );
}
