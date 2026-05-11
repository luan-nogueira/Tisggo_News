import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface MediaCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  aspectRatio: number;
  onCropComplete: (croppedImage: string) => void;
}

export function MediaCropDialog({ open, onOpenChange, mediaUrl, mediaType, aspectRatio: initialAspect, onCropComplete }: MediaCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState(initialAspect);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropChange = useCallback((crop: any) => {
    setCrop(crop);
  }, []);

  const onZoomChange = useCallback((zoom: any) => {
    setZoom(zoom);
  }, []);

  const onCropCompleteInternal = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (mediaType === 'video') {
      // For video, we save the full video but ideally we'd store crop data.
      // Since we can't easily crop video in browser, we'll just pass the URL.
      onCropComplete(mediaUrl);
      onOpenChange(false);
      return;
    }

    try {
      const croppedImage = await getCroppedImg(mediaUrl, croppedAreaPixels);
      onCropComplete(croppedImage);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
    }
  };

  const aspectRatios = [
    { label: 'Quadrado', value: 1 },
    { label: 'Horizontal', value: 16 / 9 },
    { label: 'Largo', value: 21 / 9 },
    { label: 'Livre', value: undefined }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-gray-900 border-gray-800 text-white h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Ajustar Enquadramento</DialogTitle>
        </DialogHeader>
        
        <div className="relative flex-1 bg-black rounded-lg overflow-hidden mt-4">
          <Cropper
            image={mediaType === 'image' ? mediaUrl : undefined}
            video={mediaType === 'video' ? mediaUrl : undefined}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={onCropChange}
            onCropComplete={onCropCompleteInternal}
            onZoomChange={onZoomChange}
            objectFit="contain"
          />
        </div>

        <div className="py-6 space-y-6">
          <div className="flex flex-wrap gap-2">
            {aspectRatios.map((ar) => (
              <Button
                key={ar.label}
                variant={aspect === ar.value ? "default" : "outline"}
                size="sm"
                onClick={() => setAspect(ar.value as any)}
                className={aspect === ar.value ? "bg-accent text-black" : "text-gray-400 border-gray-700"}
              >
                {ar.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Zoom</span>
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-accent"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-gray-400">Cancelar</Button>
          <Button onClick={handleSave} className="bg-accent text-black font-bold">Aplicar Recorte</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

async function getCroppedImg(imageSrc: string, pixelCrop: any): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return "";

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return canvas.toDataURL('image/jpeg');
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });
}
