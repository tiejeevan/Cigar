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
  const [customBrand, setCustomBrand] = useState('');
  const [flavor, setFlavor] = useState(existingItem?.flavor || '');
  const [customFlavor, setCustomFlavor] = useState('');
  const [packType, setPackType] = useState(existingItem?.packType || 'Single');
  const [quantity, setQuantity] = useState(existingItem?.quantity?.toString() || '0');
  const [reorderThreshold, setReorderThreshold] = useState(existingItem?.reorderThreshold?.toString() || '10');
  const [barcode, setBarcode] = useState(existingItem?.barcode || '');
  const [image, setImage] = useState<string | undefined>(existingItem?.image);
  
  const [isScanning, setIsScanning] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast.error('Image size must be less than 2MB');
        return;
      }
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
        setBrand(DEFAULT_BRANDS.includes(existing.brand) ? existing.brand : 'Other');
        if (!DEFAULT_BRANDS.includes(existing.brand)) setCustomBrand(existing.brand);
        
        setFlavor(CATEGORIES.includes(existing.flavor) ? existing.flavor : 'Other');
        if (!CATEGORIES.includes(existing.flavor)) setCustomFlavor(existing.flavor);
        
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
    
    const finalBrand = brand === 'Other' ? customBrand : brand;
    const finalFlavor = flavor === 'Other' ? customFlavor : flavor;

    if (!finalBrand || !finalFlavor) {
      toast.error('Brand and Flavor are required');
      return;
    }

    try {
      const item: InventoryItem = {
        brand: finalBrand,
        flavor: finalFlavor,
        packType: packType,
        quantity: parseInt(quantity, 10) || 0,
        reorderThreshold: parseInt(reorderThreshold, 10) || 0,
        image,
        barcode,
        updatedAt: Date.now(),
      };

      if (existingItem?.id) {
        await db.items.update(existingItem.id, item);
        toast.success('Item updated');
      } else {
        await db.items.add(item);
        toast.success('Item added to inventory');
      }
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save item');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-[#0A0B0E]/80 flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-[#0D0F13] border border-[#2A2A2A] w-full max-w-lg flex flex-col max-h-[90vh]">
          <div className="flex justify-between items-center p-6 border-b border-[#2A2A2A]">
            <h2 className="text-xl font-serif text-[#D4AF37] italic">{existingItem ? 'Edit Entry' : 'New Archive Entry'}</h2>
            <button onClick={onClose} className="p-2 hover:text-[#D4AF37] transition-colors text-[#888]">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="overflow-y-auto p-6 flex-1">
            <form id="inventory-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Barcode Section */}
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-[#888] mb-2">Barcode (SKU/UPC)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Scan or enter barcode manually"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="flex-1 bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-3 text-sm focus:outline-none focus:border-[#D4AF37] transition-colors font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setIsScanning(true)}
                    className="px-4 bg-[#1F2127] border border-[#2A2A2A] text-[#D4AF37] hover:border-[#D4AF37] transition-colors flex items-center justify-center"
                    title="Scan Barcode"
                  >
                    <ScanBarcode className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Brand */}
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-[#888] mb-2">Brand Origin</label>
                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-3 text-sm focus:outline-none focus:border-[#D4AF37] transition-colors appearance-none"
                  required
                >
                  <option value="" disabled>Select Brand</option>
                  {DEFAULT_BRANDS.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                  <option value="Other">Other (Custom)</option>
                </select>
                {brand === 'Other' && (
                  <input
                    type="text"
                    placeholder="Enter custom brand"
                    value={customBrand}
                    onChange={(e) => setCustomBrand(e.target.value)}
                    className="mt-3 w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-3 text-sm focus:outline-none focus:border-[#D4AF37] transition-colors"
                    required
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Flavor/Sub-category */}
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-[#888] mb-2">Type / Collection</label>
                  <select
                    value={flavor}
                    onChange={(e) => setFlavor(e.target.value)}
                    className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-3 text-sm focus:outline-none focus:border-[#D4AF37] transition-colors appearance-none"
                    required
                  >
                    <option value="" disabled>Select Type</option>
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="Other">Other (Custom)</option>
                  </select>
                  {flavor === 'Other' && (
                    <input
                      type="text"
                      placeholder="Enter custom flavor"
                      value={customFlavor}
                      onChange={(e) => setCustomFlavor(e.target.value)}
                      className="mt-3 w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-3 text-sm focus:outline-none focus:border-[#D4AF37] transition-colors"
                      required
                    />
                  )}
                </div>

                {/* Pack Type */}
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-[#888] mb-2">Format</label>
                  <select
                    value={packType}
                    onChange={(e) => setPackType(e.target.value)}
                    className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-3 text-sm focus:outline-none focus:border-[#D4AF37] transition-colors appearance-none"
                    required
                  >
                    <option value="Single">Single Pack</option>
                    <option value="Box">Full Box</option>
                    <option value="Carton">Carton</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-[#888] mb-2">Current Units</label>
                  <input
                    type="number"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-3 text-sm focus:outline-none focus:border-[#D4AF37] transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-[#888] mb-2">Reorder Target</label>
                  <input
                    type="number"
                    min="0"
                    value={reorderThreshold}
                    onChange={(e) => setReorderThreshold(e.target.value)}
                    className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-3 text-sm focus:outline-none focus:border-[#D4AF37] transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Image upload */}
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-[#888] mb-2">Visual Asset</label>
                {image ? (
                  <div className="relative inline-block mt-2">
                    <img src={image} alt="Preview" className="h-32 w-32 object-cover border border-[#2A2A2A] bg-[#14161C]" />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-3 -right-3 bg-[#0D0F13] border border-[#D4AF37] text-[#D4AF37] rounded-none p-1 hover:bg-[#D4AF37] hover:text-black transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 border border-dashed border-[#2A2A2A] p-6 flex flex-col items-center justify-center bg-[#14161C] hover:border-[#D4AF37]/50 transition-colors cursor-pointer relative group">
                    <UploadCloud className="w-8 h-8 text-[#444] mb-2 group-hover:text-[#D4AF37]/50 transition-colors" />
                    <span className="text-[10px] uppercase tracking-widest text-[#888]">Select Reference Image</span>
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
          
          <div className="p-6 border-t border-[#2A2A2A] bg-[#0D0F13] flex justify-end gap-4 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-[#2A2A2A] text-[#888] bg-transparent hover:text-[#E5E1DA] transition-colors text-[10px] uppercase tracking-widest"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="inventory-form"
              className="px-6 py-3 bg-[#D4AF37] text-black border border-[#D4AF37] hover:bg-transparent hover:text-[#D4AF37] transition-all text-[10px] uppercase tracking-widest font-bold"
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
