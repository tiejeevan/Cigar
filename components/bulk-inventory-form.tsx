'use client';

import { useState } from 'react';
import { db, InventoryItem } from '@/lib/db';
import { X, Plus, Trash2, Camera, PackageSearch } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

interface BulkInventoryFormProps {
  onClose: () => void;
}

interface FlavorLine {
  id: string;
  name: string;
  price: string;
  quantity: number;
  image?: string;
}

export function BulkInventoryForm({ onClose }: BulkInventoryFormProps) {
  // Brand Step
  const [brand, setBrand] = useState('');
  const [isBrandConfirmed, setIsBrandConfirmed] = useState(false);

  // Flavors Step
  const [flavors, setFlavors] = useState<FlavorLine[]>([]);

  // Add an empty flavor line
  const handleAddFlavor = () => {
    setFlavors([
      ...flavors,
      {
        id: Math.random().toString(36).substring(2, 9),
        name: '',
        price: '1.29',
        quantity: 10,
      }
    ]);
  };

  const handleUpdateFlavor = (id: string, updates: Partial<FlavorLine>) => {
    setFlavors(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleRemoveFlavor = (id: string) => {
    setFlavors(prev => prev.filter(f => f.id !== id));
  };

  // Handle individual picture capture
  const handleImageCapture = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const targetSize = 256;
          const size = Math.min(img.width, img.height);
          const sx = (img.width - size) / 2;
          const sy = (img.height - size) / 2;

          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, sx, sy, size, size, 0, 0, targetSize, targetSize);
            handleUpdateFlavor(id, { image: canvas.toDataURL('image/jpeg', 0.8) });
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit all flavors
  const handleSubmit = async () => {
    // Validate empty lines
    const validFlavors = flavors.filter(f => f.name.trim() !== '');
    
    if (validFlavors.length === 0) {
      toast.error('Please add at least one named flavor.');
      return;
    }

    try {
      toast.loading('Saving batch to inventory...', { id: 'bulk-save' });
      for (const flav of validFlavors) {
        const item: Omit<InventoryItem, 'id'> = {
          brand: brand.trim(),
          flavor: flav.name.trim(),
          category: 'Cigarillos', // Default fallback for now to keep simple
          packType: 'Single',
          quantity: flav.quantity,
          reorderThreshold: 10,
          price: parseFloat(flav.price) || 0,
          image: flav.image,
          updatedAt: Date.now()
        };
        await db.items.add(item);
      }
      toast.success(`Successfully added ${validFlavors.length} products!`, { id: 'bulk-save' });
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('Failed to save products.', { id: 'bulk-save' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col pt-safe backdrop-blur-md">
      
      {/* Header */}
      <div className="flex justify-between items-center px-5 py-4 bg-[#0A0A0A] border-b border-[#222]">
        <h2 className="text-xl font-bold tracking-tight text-white">Bulk Add</h2>
        <button 
          onClick={onClose}
          className="p-2 bg-[#1A1A1A] rounded-full text-gray-400 hover:text-white transition-colors active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto w-full max-w-2xl mx-auto px-4 py-6 pb-32">
        
        {/* Step 1: Brand Info */}
        {!isBrandConfirmed ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="space-y-2 text-center mt-10">
              <div className="w-16 h-16 bg-[#1A1A1A] border border-[#333] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <PackageSearch className="w-8 h-8 text-[#D4AF37]" />
              </div>
              <h3 className="text-2xl font-bold text-white">What Brand?</h3>
              <p className="text-gray-400 text-sm">Enter the company or brand name first.</p>
            </div>

            <input
              type="text"
              autoFocus
              required
              placeholder="e.g. Swisher Sweets"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full bg-[#111] border-2 border-[#333] text-white px-5 py-4 text-center text-xl rounded-2xl focus:outline-none focus:border-[#D4AF37] transition-all"
            />

            <button
              onClick={() => {
                if (!brand.trim()) {
                  toast.error('Brand name is required');
                  return;
                }
                setIsBrandConfirmed(true);
                if (flavors.length === 0) handleAddFlavor(); // give them a slot to start
              }}
              className="w-full py-4 bg-[#D4AF37] text-black font-bold text-lg rounded-2xl shadow-[0_0_15px_rgba(212,175,55,0.2)] active:scale-95 transition-all outline-none"
            >
              Continue
            </button>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#222]">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Brand Lock</span>
                <h3 className="text-xl font-bold text-[#D4AF37]">{brand}</h3>
              </div>
              <button
                onClick={() => setIsBrandConfirmed(false)}
                className="text-xs bg-[#1A1A1A] px-3 py-1.5 rounded-lg text-gray-400 hover:text-white"
              >
                Edit
              </button>
            </div>

            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-4">Add Flavors</p>

            <AnimatePresence>
              {flavors.map((flavor, index) => (
                <motion.div 
                  key={flavor.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  className="bg-[#111] border border-[#222] rounded-3xl p-4 space-y-4 relative"
                >
                  {/* Remove Button */}
                  <button 
                    onClick={() => handleRemoveFlavor(flavor.id)}
                    className="absolute top-4 right-4 p-2 text-gray-500 hover:text-red-400 bg-[#1A1A1A] rounded-full active:scale-90"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="pr-10">
                    <span className="text-xs text-gray-500 font-mono mb-1 block">Flavor #{index + 1} Name</span>
                    <input
                      type="text"
                      placeholder="e.g. Mango Ice"
                      value={flavor.name}
                      onChange={(e) => handleUpdateFlavor(flavor.id, { name: e.target.value })}
                      className="w-full bg-transparent border-b border-[#333] text-white text-lg py-2 focus:outline-none focus:border-[#D4AF37] placeholder:text-[#444]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Price</span>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={flavor.price}
                          onChange={(e) => handleUpdateFlavor(flavor.id, { price: e.target.value })}
                          className="w-full bg-[#1A1A1A] border border-[#222] text-white text-center py-3 rounded-xl focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Picture</span>
                      {flavor.image ? (
                        <div className="relative h-[48px] w-full rounded-xl overflow-hidden border border-[#D4AF37]">
                          <img src={flavor.image} className="w-full h-full object-cover" alt="Captured" />
                          <button
                            type="button"
                            onClick={() => handleUpdateFlavor(flavor.id, { image: undefined })}
                            className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-white active:scale-90"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center h-[48px] bg-[#1A1A1A] border border-[#222] rounded-xl hover:border-[#D4AF37] transition-colors cursor-pointer group active:scale-95">
                          <Camera className="w-5 h-5 text-gray-500 group-hover:text-[#D4AF37]" />
                          <span className="ml-2 text-xs font-bold text-gray-400 group-hover:text-[#D4AF37]">Capture</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => handleImageCapture(flavor.id, e)}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <button
              onClick={handleAddFlavor}
              className="w-full py-5 border-2 border-dashed border-[#333] hover:border-[#D4AF37] text-gray-400 hover:text-[#D4AF37] font-bold rounded-3xl flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Plus className="w-5 h-5" />
              Add Another Flavor
            </button>

          </motion.div>
        )}
      </div>

      {/* Fixed bottom Submit for flavors */}
      {isBrandConfirmed && (
        <div className="absolute bottom-0 left-0 right-0 bg-[#0A0A0A] border-t border-[#222] p-4 sm:p-6 pb-safe">
          <div className="max-w-2xl mx-auto flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-4 rounded-2xl bg-[#1A1A1A] text-gray-400 font-bold active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={flavors.some(f => !f.name.trim()) && flavors.length > 0}
              className="flex-1 py-4 bg-[#D4AF37] disabled:bg-[#1A1A1A] disabled:text-gray-500 text-black font-bold text-lg rounded-2xl active:scale-95 transition-all shadow-[0_0_20px_rgba(212,175,55,0.15)] disabled:shadow-none uppercase tracking-wider"
            >
              Save {flavors.length} Item{flavors.length !== 1 && 's'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

