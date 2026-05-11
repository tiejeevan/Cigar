'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';

interface BarcodeScannerProps {
  onResult: (result: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onResult, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (!scannerRef.current) return;

    const html5QrcodeScanner = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 150 },
        aspectRatio: 1.0,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE
        ]
      },
      false
    );

    html5QrcodeScanner.render(
      (decodedText) => {
        html5QrcodeScanner.clear().then(() => {
          onResult(decodedText);
        }).catch(e => {
          console.error("Failed to clear scanner", e);
        });
      },
      (error) => {
        // Ignored, happens constantly when no barcode is found
      }
    );

    setScanner(html5QrcodeScanner);

    return () => {
      html5QrcodeScanner.clear().catch(error => {
        console.error("Failed to clear html5QrcodeScanner. ", error);
      });
    };
  }, [onResult]);

  return (
    <div className="fixed inset-0 z-[60] bg-[#0A0B0E]/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[#0D0F13] border border-[#2A2A2A] w-full max-w-md flex flex-col overflow-hidden relative">
        <div className="flex justify-between items-center p-4 border-b border-[#2A2A2A]">
          <h2 className="text-xl font-serif text-[#D4AF37] flex items-center gap-2 italic">
            <Camera className="w-5 h-5" />
            Scan Barcode
          </h2>
          <button onClick={onClose} className="p-2 hover:text-[#D4AF37] transition-colors text-[#888]">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 bg-[#14161C]">
          <style dangerouslySetInnerHTML={{__html: `
            #qr-reader { border: none !important; width: 100%; border-radius: 4px; overflow: hidden; }
            #qr-reader__scan_region { background: #0A0B0E; }
            #qr-reader__dashboard { background: #0D0F13; padding: 10px !important; color: #888; border-top: 1px solid #2A2A2A; margin-top: 10px; }
            #qr-reader__dashboard_section_csr span { color: #D4AF37; margin-bottom: 10px; display: block; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; }
            #qr-reader button { background: #D4AF37 !important; border: 1px solid #D4AF37 !important; color: #000 !important; cursor: pointer; padding: 6px 12px !important; margin: 5px; font-weight: bold; border-radius: 0 !important; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; transition: all 0.2s; }
            #qr-reader button:hover { background: transparent !important; color: #D4AF37 !important; }
            #qr-reader select { background: #14161C; color: #E5E1DA; border: 1px solid #2A2A2A; padding: 6px; font-size: 12px; margin-bottom: 10px; border-radius: 0; outline: none; }
            #qr-reader a { display: none !important; }
          `}} />
          <div id="qr-reader" ref={scannerRef}></div>
          <p className="text-[10px] text-center uppercase tracking-widest text-[#888] mt-4">Point camera at the product barcode</p>
        </div>
      </div>
    </div>
  );
}
