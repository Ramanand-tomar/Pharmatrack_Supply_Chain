import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/card"; // Wait, Dialog is in ui/dialog
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicineId: number;
  medicineName: string;
}

export function QRModal({ isOpen, onClose, medicineId, medicineName }: QRModalProps) {
  const trackingUrl = `${window.location.origin}?track=${medicineId}`;

  const downloadQR = () => {
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `QR_${medicineName}_#${medicineId}.png`;
      link.href = url;
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background p-6 rounded-lg shadow-xl max-w-sm w-full space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold font-display">{medicineName} # {medicineId}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="flex justify-center p-4 bg-white rounded-md">
          <QRCodeSVG
            id="qr-code-svg"
            value={trackingUrl}
            size={200}
            level="H"
            includeMargin={true}
          />
        </div>
        <p className="text-xs text-center text-muted-foreground">{trackingUrl}</p>
        <Button onClick={downloadQR} className="w-full">
          <Download className="h-4 w-4 mr-2" /> Download PNG
        </Button>
      </div>
    </div>
  );
}
