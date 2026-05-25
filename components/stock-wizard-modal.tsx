'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, Package, Loader, CheckCircle, ShieldAlert, Barcode } from 'lucide-react';
import { db, InventoryItem } from '@/lib/db';
import { toast } from 'sonner';

interface StockWizardModalProps {
  onClose: () => void;
}

const FLAGS = [
  { id: 'blazing-fast', label: 'Blazing Fast Seller', color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30' },
  { id: 'very-best-selling', label: 'Very Best Selling', color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/30' },
  { id: 'moving', label: 'Standard Mover', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30' },
  { id: 'needs-help', label: 'Needs Promotional Help', color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30' },
  { id: 'dead', label: 'Dead Stock', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' }
];

export function StockWizardModal({ onClose }: StockWizardModalProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSessionPrompt, setShowSessionPrompt] = useState(false);
  const [savedIndex, setSavedIndex] = useState(0);

  // Form state
  const [boxes, setBoxes] = useState<string>('');
  const [singles, setSingles] = useState<string>('');
  const [flag, setFlag] = useState<string | null>(null);
  const [barcode, setBarcode] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [boxSize, setBoxSize] = useState<string>('');

  useEffect(() => {
    async function loadItems() {
      try {
        const allItems = await db.items.toArray();
        // Sort by brand then flavor
        allItems.sort((a, b) => {
          if (a.brand.toLowerCase() !== b.brand.toLowerCase()) {
            return a.brand.localeCompare(b.brand);
          }
          return a.flavor.localeCompare(b.flavor);
        });
        setItems(allItems);
        
        const storedIndex = localStorage.getItem('stockWizardIndex');
        if (storedIndex) {
          const idx = parseInt(storedIndex);
          if (!isNaN(idx) && idx > 0 && idx < allItems.length) {
            setSavedIndex(idx);
            setShowSessionPrompt(true);
          }
        }
      } catch (err) {
        console.error('Failed to load items for wizard', err);
        toast.error('Failed to load inventory');
      } finally {
        setLoading(false);
      }
    }
    loadItems();
  }, []);

  const currentItem = items[currentIndex];

  const overallCompletionPercentage = useMemo(() => {
    if (items.length === 0) return 0;
    const totalPossibleAttr = items.length * 7;
    let actualAttr = 0;
    items.forEach(it => {
      let cur = 3; 
      if (it.quantity > 0) cur++;
      if (it.flag) cur++;
      if (it.barcode && it.barcode.trim().length > 0) cur++;
      if (it.price && it.price > 0) cur++;
      actualAttr += cur;
    });
    return Math.round((actualAttr / totalPossibleAttr) * 100);
  }, [items]);

  useEffect(() => {
    if (currentItem) {
      const bs = currentItem.boxSize || 15;
      const b = Math.floor(currentItem.quantity / bs);
      const s = currentItem.quantity % bs;
      setBoxes(b > 0 ? b.toString() : '');
      setSingles(s > 0 ? s.toString() : '');
      setFlag(currentItem.flag || null);
      setBarcode(currentItem.barcode || '');
      setPrice(currentItem.price ? currentItem.price.toString() : '');
      setBoxSize(currentItem.boxSize ? currentItem.boxSize.toString() : '');
    }
  }, [currentIndex, currentItem]);

  const handleNext = async () => {
    if (!currentItem || currentItem.id === undefined) return;

    try {
      const parsedBoxSize = parseInt(boxSize) || currentItem.boxSize || 15;
      const parsedBoxes = parseInt(boxes) || 0;
      const parsedSingles = parseInt(singles) || 0;
      const parsedPrice = parseFloat(price);
      
      const newQty = (parsedBoxes * parsedBoxSize) + parsedSingles;
      
      await db.items.update(currentItem.id, { 
        quantity: newQty,
        flag: flag,
        barcode: barcode.trim() !== '' ? barcode.trim() : undefined,
        price: !isNaN(parsedPrice) && parsedPrice > 0 ? parsedPrice : undefined,
        boxSize: parsedBoxSize > 0 ? parsedBoxSize : undefined
      });

      if (currentIndex < items.length - 1) {
        const nextIdx = currentIndex + 1;
        setCurrentIndex(nextIdx);
        localStorage.setItem('stockWizardIndex', nextIdx.toString());
      } else {
        localStorage.removeItem('stockWizardIndex');
        toast.success('Stock Wizard Complete!');
        onClose();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update stock');
    }
  };

  const handleSkip = () => {
    if (currentIndex < items.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      localStorage.setItem('stockWizardIndex', nextIdx.toString());
    } else {
      localStorage.removeItem('stockWizardIndex');
      toast.success('Stock Wizard Complete!');
      onClose();
    }
  };

  const handlePause = () => {
    localStorage.setItem('stockWizardIndex', currentIndex.toString());
    toast.success('Wizard session paused.');
    onClose();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center backdrop-blur-md">
        <Loader className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black/95 flex flex-col pt-safe backdrop-blur-md">
        <div className="flex justify-between items-center px-5 py-4 bg-[#0A0B0E] border-b border-[#2A2A2A]">
           <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Stock Wizard
          </h2>
          <button onClick={onClose} className="p-2 bg-[#14161C] border border-[#2A2A2A] rounded-full text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          No items found in inventory.
        </div>
      </div>
    );
  }

  if (showSessionPrompt) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0A0B0E]/95 flex items-center justify-center p-4 backdrop-blur-md">
        <div className="bg-[#0D0F13] border border-[#2A2A2A] rounded-2xl w-full max-w-sm p-6 shadow-2xl flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-[#14161C] border border-[#D4AF37]/30 rounded-full flex items-center justify-center mb-4 text-[#D4AF37]">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-serif text-[#E5E1DA] mb-2">Resume Wizard?</h3>
          <p className="text-sm text-gray-400 mb-6 font-mono">
            You previously paused at item {savedIndex + 1} of {items.length}.
          </p>
          <div className="w-full flex flex-col gap-3">
            <button 
              onClick={() => {
                setCurrentIndex(savedIndex);
                setShowSessionPrompt(false);
              }}
              className="w-full py-4 bg-[#D4AF37] hover:bg-[#C4A030] text-black rounded-xl font-bold uppercase tracking-[0.1em] text-sm transition-all focus:outline-none active:scale-95"
            >
              Resume Session
            </button>
            <button 
              onClick={() => {
                setCurrentIndex(0);
                localStorage.removeItem('stockWizardIndex');
                setShowSessionPrompt(false);
              }}
              className="w-full py-4 bg-[#14161C] hover:bg-[#1A1C23] border border-[#2A2A2A] text-gray-400 rounded-xl font-bold uppercase tracking-wider text-sm transition-all focus:outline-none active:scale-95"
            >
              Start Over
            </button>
          </div>
        </div>
      </div>
    );
  }

  const completionPercentage = Math.round((currentIndex / items.length) * 100);

  let currentItemCompletion = 0;
  if (currentItem) {
     const totalAttr = 7;
     let cur = 3; // defaults (brand, flavor, category/packtype handled)
     if (currentItem.quantity > 0) cur++;
     if (flag) cur++;
     if (barcode.trim().length > 0) cur++;
     if (price.trim().length > 0) cur++;
     currentItemCompletion = Math.round((cur / totalAttr) * 100);
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0B0E] flex flex-col pt-safe">
      {/* Header */}
      <div className="flex justify-between items-center px-4 sm:px-5 py-4 bg-[#0A0B0E] border-b border-[#2A2A2A]">
        <div>
          <h2 className="text-sm sm:text-lg font-bold tracking-tight text-[#E5E1DA] flex items-center gap-2">
            Stock Wizard
          </h2>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-[10px] sm:text-xs text-[#888] font-mono tracking-wider">
              Item {currentIndex + 1} of {items.length}
            </p>
            <span className="text-[9px] text-[#D4AF37] border border-[#D4AF37]/30 px-1.5 py-0.5 rounded uppercase tracking-widest bg-[#D4AF37]/10">
              Db Score: {overallCompletionPercentage}%
            </span>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 bg-[#14161C] border border-[#2A2A2A] hover:bg-[#1A1C23] rounded-full text-gray-400 hover:text-white transition-colors active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-[#14161C]">
        <div 
          className="h-full bg-[#D4AF37] transition-all duration-300"
          style={{ width: `${completionPercentage}%` }}
        />
      </div>

      <div className="flex-1 overflow-y-auto w-full max-w-xl mx-auto px-4 py-6 sm:py-10 space-y-6 sm:space-y-8 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentItem?.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col flex-1"
          >
            {currentItem && (
              <div className="space-y-6 sm:space-y-8">
                {/* Brand & Item Info */}
                <div className="text-center space-y-2">
                  <span className="text-[10px] sm:text-xs bg-[#1F2127] border border-[#2A2A2A] px-2.5 py-1 rounded text-[#D4AF37] uppercase tracking-widest font-bold font-mono">
                    {currentItem.brand}
                  </span>
                  <h3 className="text-2xl sm:text-4xl font-serif text-[#E5E1DA] leading-tight italic font-bold tracking-wide mt-3">
                    {currentItem.flavor}
                  </h3>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="text-xs text-[#888] uppercase tracking-widest font-mono border border-[#2A2A2A] px-2 py-0.5 rounded-md bg-[#14161C]">
                      {currentItem.packType}
                    </span>
                    <span className={`text-xs font-mono tracking-wider flex items-center gap-1 border border-[#2A2A2A] px-2 py-0.5 rounded-md ${currentItemCompletion === 100 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-[#14161C] text-gray-500'}`}>
                      Profile {currentItemCompletion}%
                    </span>
                  </div>
                </div>

                {/* Stock Inputs */}
                <div className="bg-[#14161C] border border-[#2A2A2A] rounded-3xl p-5 sm:p-6 shadow-lg space-y-5">
                  <h4 className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-[#D4AF37] font-bold flex items-center gap-2">
                    <Package className="w-4 h-4" /> Current Stock Levels
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400 font-semibold tracking-wider uppercase">Full Boxes</label>
                      <div className="relative">
                        <input
                          type="number"
                          autoFocus
                          value={boxes}
                          onChange={(e) => setBoxes(e.target.value)}
                          className="w-full bg-[#0D0F13] border border-[#2A2A2A] rounded-xl px-4 py-3 text-2xl font-mono text-[#E5E1DA] focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
                          placeholder="0"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-gray-500 flex flex-col items-end">
                           <span className="block leading-none">x{boxSize || currentItem.boxSize || 15}</span>
                           <span className="block leading-none mt-1">units/box</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400 font-semibold tracking-wider uppercase">Singles</label>
                      <input
                        type="number"
                        value={singles}
                        onChange={(e) => setSingles(e.target.value)}
                        className="w-full bg-[#0D0F13] border border-[#2A2A2A] rounded-xl px-4 py-3 text-2xl font-mono text-[#E5E1DA] focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Details Inputs (Barcode, Price, BoxSize) */}
                <div className="bg-[#14161C] border border-[#2A2A2A] rounded-3xl p-5 sm:p-6 shadow-lg space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase">Units Per Box</label>
                       <input
                          type="number"
                          value={boxSize}
                          onChange={(e) => setBoxSize(e.target.value)}
                          className="w-full bg-[#0D0F13] border border-[#2A2A2A] rounded-xl px-3 py-2.5 text-base font-mono text-[#E5E1DA] focus:outline-none focus:border-[#D4AF37]/50"
                          placeholder="15"
                        />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase">Retail Price ($)</label>
                       <input
                          type="number"
                          value={price}
                          step="0.01"
                          onChange={(e) => setPrice(e.target.value)}
                          className="w-full bg-[#0D0F13] border border-[#2A2A2A] rounded-xl px-3 py-2.5 text-base font-mono text-[#22C55E] focus:outline-none focus:border-[#D4AF37]/50"
                          placeholder="0.00"
                        />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase">UPC Barcode</label>
                       <div className="relative">
                         <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                         <input
                            type="text"
                            value={barcode}
                            onChange={(e) => setBarcode(e.target.value)}
                            className="w-full bg-[#0D0F13] border border-[#2A2A2A] rounded-xl pl-9 pr-3 py-2.5 text-xs font-mono text-gray-300 focus:outline-none focus:border-[#D4AF37]/50 tracking-widest uppercase"
                            placeholder="SCAN..."
                          />
                       </div>
                    </div>
                  </div>
                </div>

                {/* Flags Input */}
                <div className="bg-[#14161C] border border-[#2A2A2A] rounded-3xl p-5 sm:p-6 shadow-lg space-y-4">
                  <h4 className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-[#D4AF37] font-bold flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" /> Item Performance Flag
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {FLAGS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setFlag(flag === f.id ? null : f.id)}
                        className={`flex-1 min-w-[120px] px-3 py-3 rounded-xl text-[10px] sm:text-xs font-bold tracking-wider uppercase transition-all active:scale-95 border ${flag === f.id ? `${f.bg} ${f.border} ${f.color}` : 'bg-[#0D0F13] border-[#2A2A2A] text-gray-400 hover:border-gray-500'}`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-auto pt-8 flex gap-3 pb-8">
          <button
            onClick={handlePause}
            className="flex-1 py-4.5 bg-[#14161C] hover:bg-[#1A1C23] border border-[#2A2A2A] text-[#D4AF37] rounded-2xl font-bold uppercase tracking-wider text-sm transition-all focus:outline-none active:scale-95 flex items-center justify-center gap-1.5"
          >
            Pause
          </button>
          <button
            onClick={handleSkip}
            className="flex-1 py-4.5 bg-[#14161C] hover:bg-[#1A1C23] border border-[#2A2A2A] text-gray-400 rounded-2xl font-bold uppercase tracking-wider text-sm transition-all focus:outline-none active:scale-95"
          >
            Skip
          </button>
          <button
            onClick={handleNext}
            className="flex-[2] py-4.5 flex justify-center items-center gap-2 bg-[#D4AF37] hover:bg-[#C4A030] text-black rounded-2xl font-bold uppercase tracking-[0.1em] text-sm transition-all shadow-lg shadow-[#D4AF37]/20 focus:outline-none active:scale-95"
          >
            Save & Next <ChevronRight className="w-5 h-5 -mr-1" />
          </button>
        </div>

      </div>
    </div>
  );
}
