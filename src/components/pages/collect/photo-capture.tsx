import { useRef, useCallback, useState } from "react";
import Webcam from "react-webcam";
import { Camera, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface Props {
  photo: string | null;
  onPhoto: (dataUrl: string) => void;
}

function PhotoThumbnail({ photo }: { photo: string | null }) {
  return (
    <div className="flex items-center gap-3">
      <div className="size-14 rounded-2xl bg-accent text-primary flex items-center justify-center">
        <Camera className="size-6" />
      </div>
      <div className="flex-1">
        <div className="font-semibold">Foto da garrafa PET</div>
        <div className="text-xs text-muted-foreground">
          Opcional — aumenta a confiança da coleta
        </div>
      </div>
      {photo && (
        <img src={photo} alt="Pré-visualização" className="size-12 rounded-xl object-cover" />
      )}
    </div>
  );
}

export function PhotoCapture({ photo, onPhoto }: Props) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const webcamRef = useRef<Webcam>(null);

  const handleCapture = useCallback(() => {
    const dataUrl = webcamRef.current?.getScreenshot();
    if (dataUrl) {
      onPhoto(dataUrl);
      setOpen(false);
    }
  }, [onPhoto]);

  if (isMobile) {
    return (
      <label className="block bg-card rounded-3xl p-4 shadow-soft border border-dashed border-border cursor-pointer active:scale-[0.99] transition">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPhoto(URL.createObjectURL(f));
          }}
        />
        <PhotoThumbnail photo={photo} />
      </label>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full bg-card rounded-3xl p-4 shadow-soft border border-dashed border-border cursor-pointer active:scale-[0.99] transition text-left"
      >
        <PhotoThumbnail photo={photo} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="relative w-full max-w-md mx-4 bg-card rounded-3xl overflow-hidden shadow-2xl">
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: "environment" }}
              className="w-full"
            />
            <div className="flex gap-3 p-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 h-12 rounded-2xl border border-border text-sm font-semibold flex items-center justify-center gap-2"
              >
                <X className="size-4" /> Cancelar
              </button>
              <button
                type="button"
                onClick={handleCapture}
                className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2"
              >
                <Camera className="size-4" /> Capturar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
