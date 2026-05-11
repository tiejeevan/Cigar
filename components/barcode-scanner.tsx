'use client';

import { useEffect, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, AlertTriangle } from 'lucide-react';

interface BarcodeScannerProps {
  onResult: (result: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onResult, onClose }: BarcodeScannerProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const html5Qrcode = new Html5Qrcode("qr-reader", {
      verbose: false,
      formatsToSupport: [
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.QR_CODE
      ]
    });

    html5Qrcode.start(
      { facingMode: "environment" },
      { 
        fps: 10, 
        qrbox: { width: 250, height: 150 },
        aspectRatio: 1.0
      },
      (decodedText) => {
        if (isMounted) {
          html5Qrcode.stop().then(() => {
            onResult(decodedText);
          }).catch(e => {
            console.error("Failed to stop scanner", e);
          });
        }
      },
      (error) => {
        // Ignored, happens constantly when no barcode is found
      }
    ).catch(err => {
      console.error("Scanner failed to start", err);
      if (isMounted) {
        setErrorMsg("Failed to access camera. Please check permissions.");
      }
    });

    return () => {
      isMounted = false;
      if (html5Qrcode.isScanning) {
        html5Qrcode.stop().then(() => {
          html5Qrcode.clear();
        }).catch(error => {
          console.error("Failed to clear html5Qrcode.", error);
        });
      }
    };
  }, [onResult]);

  return (
    <div className="fixed inset-0 z-[60] bg-[#0A0B0E]/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[#0D0F13] border border-[#2A2A2A] w-full max-w-md flex flex-col overflow-hidden relative shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-[#2A2A2A]">
          <h2 className="text-xl font-serif text-[#D4AF37] flex items-center gap-2 italic">
            <Camera className="w-5 h-5" />
            Scan Barcode
          </h2>
          <button onClick={onClose} className="p-3 hover:text-[#D4AF37] transition-colors text-[#888] active:scale-95">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-4 bg-[#14161C] relative flex flex-col items-center min-h-[300px] justify-center text-center">
          {errorMsg && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 bg-[#14161C] text-center space-y-4">
              <AlertTriangle className="w-12 h-12 text-[#C2410C]" />
              <p className="text-sm text-[#E5E1DA]">{errorMsg}</p>
              <button onClick={onClose} className="px-6 py-3 bg-[#1F2127] border border-[#2A2A2A] text-[#D4AF37] text-xs font-semibold tracking-widest uppercase">
                Close
              </button>
            </div>
          )}
          
          <div id="qr-reader" className="w-full bg-black rounded-lg overflow-hidden border border-[#2A2A2A]"></div>
          
          {!errorMsg && (
            <p className="text-[10px] text-center uppercase tracking-widest text-[#888] mt-6">Point camera at the product barcode</p>
          )}
        </div>
      </div>
    </div>
  );
}
