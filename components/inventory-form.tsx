'use client';

import { useState, useCallback } from 'react';
import { db, InventoryItem } from '@/lib/db';
import { CATEGORIES, DEFAULT_BRANDS } from '@/lib/constants';
import { UploadCloud, X, ScanBarcode } from 'lucide-react';
import { toast } from 'sonner';
import { BarcodeScanner } from './barcode-scanner';

interface InventoryFormProps {
  onClose: () => void;
  existingItem?: InventoryItem;
}

export function InventoryForm({ onClose, existingItem }: InventoryFormProps) {
  const [brand, setBrand] = useState(existingItem?.brand || '');
  const [flavor, setFlavor] = useState(existingItem?.flavor || '');
  const [packType, setPackType] = useState(existingItem?.packType || 'Single');
  const [quantity, setQuantity] = useState(existingItem?.quantity?.toString() || '0');
  const [reorderThreshold, setReorderThreshold] = useState(existingItem?.reorderThreshold?.toString() || '10');
  const [barcode, setBarcode] = useState(existingItem?.barcode || '');
  const [image, setImage] = useState<string | undefined>(existingItem?.image);
  
  const [isScanning, setIsScanning] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => setImage(undefined);

  const handleScanResult = useCallback(async (result: string) => {
    setIsScanning(false);
    setBarcode(result);
    // Find if we already have this barcode
    try {
      const existing = await db.items.where('barcode').equals(result).first();
      if (existing) {
        toast.info('Barcode found in inventory! Loading details...');
        setBrand(existing.brand);
        setFlavor(existing.flavor);
        setPackType(existing.packType || 'Single');
        if (existing.image) setImage(existing.image);
      } else {
        toast.success(`Barcode scanned: ${result}`);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!brand.trim() || !flavor.trim()) {
      toast.error('Please specify both brand and flavor.');
      return;
    }

    try {
      const item: InventoryItem = {
        brand: brand.trim(),
        flavor: flavor.trim(),
        packType: packType,
        quantity: parseInt(quantity, 10) || 0,
        reorderThreshold: parseInt(reorderThreshold, 10) || 0,
        image,
        barcode,
        updatedAt: Date.now(),
      };

      if (existingItem?.id) {
        await db.items.update(existingItem.id, item);
        toast.success('Inventory updated');
      } else {
        await db.items.add(item);
        toast.success('Added to inventory');
      }
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save record.');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-[#0A0B0E]/90 flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm">
        <div className="bg-[#0D0F13] border-t sm:border border-[#2A2A2A] w-full max-w-xl flex flex-col max-h-[95vh] sm:max-h-[90vh] rounded-t-xl sm:rounded-none overflow-hidden">
          <div className="flex justify-between items-center p-5 sm:p-6 border-b border-[#2A2A2A] sticky top-0 bg-[#0D0F13] z-10">
            <h2 className="text-2xl font-serif text-[#D4AF37] italic">{existingItem ? 'Edit Entry' : 'New Archive Entry'}</h2>
            <button onClick={onClose} className="p-2 sm:p-3 hover:text-[#D4AF37] transition-colors text-[#888] active:scale-95">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="overflow-y-auto p-5 sm:p-6 flex-1 bg-[#0A0B0E]/50">
            <form id="inventory-form" onSubmit={handleSubmit} className="space-y-8">
              {/* Barcode Section */}
              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-semibold">Barcode (SKU/UPC)</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Scan or enter manually"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="flex-1 bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-4 text-base focus:outline-none focus:border-[#D4AF37] transition-colors font-mono rounded-none"
                  />
                  <button
                    type="button"
                    onClick={() => setIsScanning(true)}
                    className="px-6 bg-[#1F2127] border border-[#2A2A2A] text-[#D4AF37] hover:border-[#D4AF37] transition-colors flex items-center justify-center active:scale-95 shadow-sm"
                    title="Scan Barcode"
                  >
                    <ScanBarcode className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Brand and Flavor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-semibold">Brand Origin</label>
                  <input
                    list="brand-options"
                    type="text"
                    placeholder="e.g. Swisher Sweets"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-4 text-base focus:outline-none focus:border-[#D4AF37] transition-colors rounded-none"
                    required
                  />
                  <datalist id="brand-options">
                    {DEFAULT_BRANDS.map(b => <option key={b} value={b} />)}
                  </datalist>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-semibold">Type / Flavor</label>
                  <input
                    list="flavor-options"
                    type="text"
                    placeholder="e.g. Grape"
                    value={flavor}
                    onChange={(e) => setFlavor(e.target.value)}
                    className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-4 text-base focus:outline-none focus:border-[#D4AF37] transition-colors rounded-none"
                    required
                  />
                  <datalist id="flavor-options">
                    {CATEGORIES.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>

              {/* Format Segmented Control */}
              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-semibold">Format</label>
                <div className="flex bg-[#14161C] border border-[#2A2A2A] w-full p-1 gap-1">
                  {['Single', 'Box', 'Carton'].map(pt => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => setPackType(pt)}
                      className={`flex-1 py-4 text-sm tracking-widest uppercase transition-all duration-200 ${packType === pt ? 'bg-[#2A2A2A] text-[#D4AF37] font-bold shadow-sm' : 'text-[#888] hover:text-[#E5E1DA]'}`}
                    >
                      {pt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantities */}
              <div className="grid grid-cols-2 gap-6 bg-[#14161C] border border-[#2A2A2A] p-2">
                <div className="space-y-2 p-3 pb-0">
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-[#888] font-semibold text-center">Current Units</label>
                  <input
                    type="number"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-transparent text-[#D4AF37] p-2 text-3xl font-serif text-center focus:outline-none transition-colors border-b border-transparent focus:border-[#D4AF37]/50"
                    required
                  />
                </div>
                <div className="space-y-2 p-3 pb-0 border-l border-[#2A2A2A]">
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-[#888] font-semibold text-center">Reorder Target</label>
                  <input
                    type="number"
                    min="0"
                    value={reorderThreshold}
                    onChange={(e) => setReorderThreshold(e.target.value)}
                    className="w-full bg-transparent text-[#E5E1DA] p-2 text-3xl font-serif text-center focus:outline-none transition-colors border-b border-transparent focus:border-[#D4AF37]/50"
                    required
                  />
                </div>
              </div>

              {/* Image upload */}
              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-semibold">Visual Asset</label>
                {image ? (
                  <div className="relative inline-block mt-2 w-full sm:w-auto text-center">
                    <img src={image} alt="Preview" className="h-40 w-40 object-cover border border-[#2A2A2A] bg-[#14161C] mx-auto sm:mx-0 shadow-lg" />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-3 sm:-top-3 right-1/2 translate-x-[50px] sm:translate-x-0 sm:-right-3 bg-[#0D0F13] border border-[#D4AF37] text-[#D4AF37] p-2 hover:bg-[#D4AF37] hover:text-black transition-colors rounded-full sm:rounded-none shadow-md"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 border border-dashed border-[#2A2A2A] p-8 flex flex-col items-center justify-center bg-[#14161C] hover:border-[#D4AF37]/50 transition-colors cursor-pointer relative group active:bg-[#1F2127]">
                    <UploadCloud className="w-10 h-10 text-[#444] mb-3 group-hover:text-[#D4AF37]/50 transition-colors" />
                    <span className="text-xs uppercase tracking-widest text-[#888] font-semibold">Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </form>
          </div>
          
          <div className="p-5 sm:p-6 border-t border-[#2A2A2A] bg-[#0D0F13] flex gap-4 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 border border-[#2A2A2A] text-[#888] bg-transparent hover:text-[#E5E1DA] active:bg-[#1F2127] transition-colors text-xs uppercase tracking-widest font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="inventory-form"
              className="flex-[2] py-4 bg-[#D4AF37] text-black border border-[#D4AF37] hover:bg-[#E5C25A] active:bg-[#B3932E] transition-all text-xs uppercase tracking-widest font-bold shadow-md"
            >
              {existingItem ? 'Save Record' : 'Commit Entry'}
            </button>
          </div>
        </div>
      </div>
      {isScanning && (
        <BarcodeScanner 
          onResult={handleScanResult} 
          onClose={() => setIsScanning(false)} 
        />
      )}
    </>
  );
}
