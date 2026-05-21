'use client';

import { useState, useCallback, useMemo } from 'react';
import { db, InventoryItem } from '@/lib/db';
import { DEFAULT_BRANDS, PRODUCT_CATEGORIES } from '@/lib/constants';
import { UploadCloud, X, Plus, Trash2, ScanBarcode, Check, Layers, Coins, AlertCircle, ChevronDown, Trash, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { BarcodeScanner } from './barcode-scanner';
import { motion, AnimatePresence } from 'motion/react';

interface BulkInventoryFormProps {
  onClose: () => void;
}

interface BulkFlavorEntry {
  id: string; // temp client-side ID
  flavor: string;
  quantity: number;
  price: number;
  reorderThreshold: number;
  barcode: string;
}

// Preset flavor databases by category to empower lightning-fast clicks
const CATEGORY_FLAVOR_PRESETS: Record<string, string[]> = {
  'Cigarillos': [
    'Sweet', 'Diamond', 'Original', 'Honey', 'Russian Cream', 'Green Leaf', 
    'Silver', 'Grape', 'Strawberry', 'Mango', 'Peach', 'Vanilla', 'Chocolate', 
    'Blue', 'Wine', 'Irish Cream', 'Black', 'Honey Bourbon', 'White Grape', 'Tropical'
  ],
  'Disposable Vapes': [
    'Cool Mint', 'Watermelon Ice', 'Blue Razz Ice', 'Strawberry Banana', 
    'Peach Ice', 'Grape Ice', 'Strawberry Kiwi', 'Mango Blast', 'Rich Tobacco', 'Sour Apple', 'Triple Berry'
  ],
  'Vape Juice': [
    'Blue Razz', 'Strawberry Fruit', 'Watermelon Twist', 'Minty Fresh', 
    'Sweet Mango', 'Rich Tobacco', 'Vanilla Custard', 'Grape Vape'
  ],
  'Premium Cigars': [
    'Maduro', 'Connecticut Wrapper', 'Habano Blend', 'Robusto', 'Toro', 'Corona'
  ],
  'Rolling Papers': [
    '1 1/4 Classic', 'King Size Slim', 'Organic Hemp', 'Unbleached Brown', 'Single Wide'
  ],
  'Other': [
    'Original', 'Regular', 'Extra'
  ]
};

export function BulkInventoryForm({ onClose }: BulkInventoryFormProps) {
  // Shared brand variables
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('Cigarillos');
  const [packType, setPackType] = useState('Single');
  const [defaultPrice, setDefaultPrice] = useState('1.29');
  const [defaultReorder, setDefaultReorder] = useState('10');
  const [sharedImage, setSharedImage] = useState<string | undefined>(undefined);

  // Custom Flavor name current text input
  const [customFlavorInput, setCustomFlavorInput] = useState('');

  // Active bulk flavors
  const [flavorEntries, setFlavorEntries] = useState<BulkFlavorEntry[]>([]);

  // Barcode scanning state
  const [activeScanningFlavId, setActiveScanningFlavId] = useState<string | null>(null);

  // Handle shared image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
            setSharedImage(canvas.toDataURL('image/jpeg', 0.8));
          } else {
            setSharedImage(reader.result as string);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSharedImage = () => setSharedImage(undefined);

  // Suggested presets based on category
  const dynamicPresets = useMemo(() => {
    return CATEGORY_FLAVOR_PRESETS[category] || CATEGORY_FLAVOR_PRESETS['Other'];
  }, [category]);

  // Toggle dynamic preset
  const handleTogglePreset = (presetFlavor: string) => {
    const existsIndex = flavorEntries.findIndex(f => f.flavor.toLowerCase() === presetFlavor.toLowerCase());
    
    if (existsIndex >= 0) {
      // Remove it
      setFlavorEntries(prev => prev.filter((_, idx) => idx !== existsIndex));
    } else {
      // Add it
      const newEntry: BulkFlavorEntry = {
        id: Math.random().toString(36).substring(2, 9),
        flavor: presetFlavor,
        quantity: 0,
        price: parseFloat(defaultPrice) || 1.29,
        reorderThreshold: parseInt(defaultReorder, 10) || 10,
        barcode: ''
      };
      setFlavorEntries(prev => [...prev, newEntry]);
    }
  };

  // Select all dynamic presets
  const handleSelectAllPresets = () => {
    const defaultPrVal = parseFloat(defaultPrice) || 1.29;
    const defaultReVal = parseInt(defaultReorder, 10) || 10;
    
    const entriesToAdd: BulkFlavorEntry[] = [];
    
    dynamicPresets.forEach(preset => {
      const exists = flavorEntries.some(f => f.flavor.toLowerCase() === preset.toLowerCase());
      if (!exists) {
        entriesToAdd.push({
          id: Math.random().toString(36).substring(2, 9),
          flavor: preset,
          quantity: 0,
          price: defaultPrVal,
          reorderThreshold: defaultReVal,
          barcode: ''
        });
      }
    });

    if (entriesToAdd.length === 0) {
      toast.info('All preset flavors are already in your queue.');
      return;
    }

    setFlavorEntries(prev => [...prev, ...entriesToAdd]);
    toast.success(`Added ${entriesToAdd.length} dynamic preset flavors to catalog.`);
  };

  // Clear current active queue
  const handleClearQueue = () => {
    if (flavorEntries.length === 0) return;
    setFlavorEntries([]);
    toast.success('Cleared bulk queue.');
  };

  // Add a fully custom flavor line from input
  const handleAddCustomFlavor = () => {
    const trimmed = customFlavorInput.trim();
    if (!trimmed) return;

    const exists = flavorEntries.some(f => f.flavor.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      toast.info(`"${trimmed}" is already added to the batch list.`);
      return;
    }

    const newEntry: BulkFlavorEntry = {
      id: Math.random().toString(36).substring(2, 9),
      flavor: trimmed,
      quantity: 0,
      price: parseFloat(defaultPrice) || 1.29,
      reorderThreshold: parseInt(defaultReorder, 10) || 10,
      barcode: ''
    };

    setFlavorEntries(prev => [...prev, newEntry]);
    setCustomFlavorInput('');
  };

  // Bulk remove single flavor entry
  const handleRemoveFlavorEntry = (id: string) => {
    setFlavorEntries(prev => prev.filter(f => f.id !== id));
  };

  // Modify individual flavor values
  const handleUpdateFlavorEntry = (id: string, updates: Partial<BulkFlavorEntry>) => {
    setFlavorEntries(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  // Adjust all active items price or reorder if defaults change
  const handleApplyDefaultsToAll = () => {
    const pr = parseFloat(defaultPrice) || 0.00;
    const re = parseInt(defaultReorder, 10) || 0;
    setFlavorEntries(prev => prev.map(f => ({
      ...f,
      price: pr,
      reorderThreshold: re
    })));
    toast.success('Successfully synchronized default prices and reorder levels and thresholds!');
  };

  // Barcode scanning result mapping standard
  const handleScanResult = (decodedBarcode: string) => {
    if (activeScanningFlavId) {
      handleUpdateFlavorEntry(activeScanningFlavId, { barcode: decodedBarcode });
      toast.success(`Barcode connected to flavor: ${decodedBarcode}`);
    }
    setActiveScanningFlavId(null);
  };

  // Save entire list sequentially
  const handleCommitBulk = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!brand.trim()) {
      toast.error('Please specify a valid Brand.');
      return;
    }

    if (flavorEntries.length === 0) {
      toast.error('Please add at least one Flavor to import.');
      return;
    }

    try {
      let successCount = 0;
      toast.loading('Writing database records to Neon Postgres...', { id: 'bulk-commit' });

      for (const entry of flavorEntries) {
        const item: InventoryItem = {
          brand: brand.trim(),
          flavor: entry.flavor.trim(),
          category: category,
          packType: packType,
          quantity: entry.quantity,
          reorderThreshold: entry.reorderThreshold,
          price: entry.price,
          image: sharedImage,
          barcode: entry.barcode.trim() || undefined,
          updatedAt: Date.now()
        };

        await db.items.add(item);
        successCount++;
      }

      toast.success(`Successfully added ${successCount} flavor records in bulk!`, { id: 'bulk-commit' });
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('An error occurred committing batch records.', { id: 'bulk-commit' });
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-[#0A0B0E]/90 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="bg-[#0D0F13] border-t sm:border border-[#2D2D2D] w-full max-w-5xl flex flex-col h-[93vh] sm:h-[88vh] max-h-[95vh] rounded-t-[2.5rem] sm:rounded-3xl overflow-hidden shadow-2xl"
        >
          
          {/* Main header block */}
          <div className="flex justify-between items-center px-6 py-5 border-b border-[#222] bg-[#0E1015] z-10 flex-shrink-0">
            <div>
              <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                <span className="text-[9px] uppercase font-mono tracking-[0.2em] bg-[#D4AF37]/10 text-[#D4AF37] px-2 py-0.5 rounded border border-[#D4AF37]/20 font-bold">SMOKE OS</span>
                <span className="text-[9px] uppercase font-mono tracking-[0.2em] bg-[#00E5FF]/10 text-[#00E5FF] px-2 py-0.5 rounded border border-[#00E5FF]/20 font-bold">FAST BULK REGISTER</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-serif text-[#E5E1DA] leading-none tracking-tight">Bulk Brand Deployer</h2>
            </div>
            <button 
              type="button" 
              onClick={onClose} 
              className="p-2 sm:p-2.5 hover:text-[#D4AF37] hover:bg-[#1E2026] text-[#888] rounded-full transition-all active:scale-95 border border-transparent hover:border-[#333]"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
          
          {/* Scrollable contents split into 2 visual columns */}
          <div className="overflow-y-auto flex-1 bg-[#090A0D] flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-[#1F1F1F]">
            
            {/* Left Box: Shared Blueprint Specs */}
            <div className="w-full lg:w-[360px] p-6 space-y-6 flex-shrink-0 bg-[#0C0E12]">
              <div className="flex items-center justify-between border-b border-[#222] pb-3">
                <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-[#888] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#D4AF37]" />
                  1. Brand Identity
                </h3>
                <span className="text-[10px] uppercase font-mono text-[#444] font-semibold">Step 1 of 2</span>
              </div>

              <div className="space-y-4">
                {/* Brand Selection with Datatable Support */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-[#666] font-bold">Brand or Manufacturer</label>
                  <input
                    list="bulk-brand-options-modern"
                    type="text"
                    required
                    maxLength={100}
                    placeholder="e.g. Swisher Sweets, Dutch Masters"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full bg-[#14161C] border border-[#222] text-[#E5E1DA] px-4 py-3 text-base md:text-sm focus:outline-none focus:border-[#D4AF37] transition-all rounded-xl font-medium focus:ring-1 focus:ring-[#D4AF37]/50"
                  />
                  <datalist id="bulk-brand-options-modern">
                    {DEFAULT_BRANDS.map(b => <option key={b} value={b} />)}
                  </datalist>
                </div>

                {/* Category Selector */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-[#666] font-bold">General Category</label>
                  <div className="relative">
                    <select
                      value={category}
                      onChange={(e) => {
                        setCategory(e.target.value);
                        setFlavorEntries([]); // Reset standard queries
                      }}
                      className="w-full bg-[#14161C] border border-[#222] text-[#E5E1DA] px-4 py-3 text-base md:text-sm focus:outline-none focus:border-[#D4AF37] transition-all rounded-xl appearance-none cursor-pointer pr-10 font-medium"
                    >
                      {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 text-[#666] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Format / Packaging Selection */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-[#666] font-bold">Packaging / Sell Type</label>
                  <div className="grid grid-cols-3 bg-[#111318] border border-[#222] p-1 gap-1 rounded-xl">
                    {['Single', 'Box', 'Carton'].map(pt => (
                      <button
                        key={pt}
                        type="button"
                        onClick={() => setPackType(pt)}
                        className={`py-2 text-[10px] tracking-widest uppercase transition-all rounded-lg font-bold ${packType === pt ? 'bg-[#1E2128] border border-[#333] text-[#D4AF37]' : 'text-[#666] hover:text-[#AAA]'}`}
                      >
                        {pt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Shared Defaults Section */}
                <div className="bg-[#111216]/50 border border-[#222] p-4 rounded-xl space-y-3.5 shadow-inner">
                  <span className="block text-[9px] uppercase tracking-[0.15em] text-[#666] font-bold text-center border-b border-[#222] pb-1.5">
                    Shared Row Defaults
                  </span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 text-center">
                      <label className="block text-[9px] uppercase tracking-[0.1em] text-[#666]">Retail Price</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[#D4AF37]">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={defaultPrice}
                          onChange={(e) => setDefaultPrice(e.target.value)}
                          className="w-full bg-[#14161C] border border-[#222] rounded-lg text-right text-[#22C55E] p-2 text-base md:text-sm font-serif font-bold focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                    </div>
                    <div className="space-y-1 text-center">
                      <label className="block text-[9px] uppercase tracking-[0.1em] text-[#666]">Alert At Qty</label>
                      <input
                        type="number"
                        min="0"
                        value={defaultReorder}
                        onChange={(e) => setDefaultReorder(e.target.value)}
                        className="w-full bg-[#14161C] border border-[#222] rounded-lg text-center text-[#E5E1DA] p-2 text-base md:text-sm font-mono focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  </div>

                  {flavorEntries.length > 0 && (
                    <button
                      type="button"
                      onClick={handleApplyDefaultsToAll}
                      className="w-full py-2 bg-[#1B1D23] hover:bg-[#252831] hover:text-[#D4AF37] border border-[#2A2D36]/60 text-[#888] rounded-lg text-[9px] font-mono uppercase tracking-widest transition-all duration-150 flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Sync Defaults to active list
                    </button>
                  )}
                </div>

                {/* Shared Image / Logo Option */}
                <div className="space-y-2 pt-1">
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-[#666] font-bold">Shared Photo (Fallback)</label>
                  {sharedImage ? (
                    <div className="relative inline-block w-full text-center">
                      <img src={sharedImage} alt="Shared Logotype" className="h-24 w-24 object-cover border border-[#2A2A2A] bg-[#14161C] mx-auto shadow-md rounded-xl" />
                      <button
                        type="button"
                        onClick={removeSharedImage}
                        className="absolute top-1 right-2 bg-black/80 border border-red-500/30 text-red-400 p-1.5 hover:bg-red-500 hover:text-white transition-colors rounded-full shadow-lg z-10"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="border border-dashed border-[#333] rounded-xl p-4.5 flex flex-col items-center justify-center bg-[#14161C]/20 hover:bg-[#14161C]/50 hover:border-[#D4AF37]/50 transition-all cursor-pointer relative group overflow-hidden min-h-[100px]">
                      <UploadCloud className="w-7 h-7 text-[#444] mb-1 group-hover:text-[#D4AF37] transition-colors duration-150" />
                      <span className="text-[9px] uppercase tracking-wider text-[#666] font-bold font-mono">Upload Brand Picture</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Box: Dynamic Flavors Builder */}
            <div className="flex-1 p-5 sm:p-6 flex flex-col overflow-hidden min-h-[350px]">
              <div className="flex items-center justify-between border-b border-[#222] pb-3 flex-shrink-0">
                <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-[#888] flex items-center gap-2">
                  <Coins className="w-4 h-4 text-[#D4AF37]" />
                  2. Deploy Flavor Catalog
                </h3>
                <span className="text-[10px] font-mono text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-0.5 rounded-full border border-[#D4AF37]/20 font-bold">
                  {flavorEntries.length} Items In Export
                </span>
              </div>

              {/* Presets Grid Selector block */}
              <div className="py-3 px-3.5 my-4 bg-[#111216]/60 border border-[#222] rounded-2xl flex-shrink-0 space-y-2">
                <div className="flex justify-between items-center bg-[#14161C]/50 p-1.5 rounded-lg border border-[#222]/30">
                  <p className="text-[9px] uppercase tracking-widest text-[#666] font-bold font-mono">Select {category} Flavors:</p>
                  
                  {/* Preset quick action helpers for fast addition */}
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={handleSelectAllPresets}
                      className="px-2.5 py-1 bg-[#D4AF37]/10 hover:bg-[#D4AF37] border border-[#D4AF37]/30 text-[#D4AF37] hover:text-black transition-all rounded text-[9px] uppercase font-mono font-bold active:scale-95 cursor-pointer"
                    >
                      All Presets
                    </button>
                    {flavorEntries.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearQueue}
                        className="px-2.5 py-1 bg-red-500/10 hover:bg-red-600 border border-red-500/20 text-red-400 hover:text-white transition-all rounded text-[9px] uppercase font-mono font-bold active:scale-95 cursor-pointer"
                      >
                        Clear Queue
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-[110px] sm:max-h-[130px] overflow-y-auto pr-1">
                  {dynamicPresets.map(preset => {
                    const isAdded = flavorEntries.some(f => f.flavor.toLowerCase() === preset.toLowerCase());
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleTogglePreset(preset)}
                        className={`px-3 py-1.5 text-xs rounded-xl border transition-all duration-150 flex items-center gap-1 cursor-pointer select-none active:scale-95 text-base md:text-xs ${isAdded ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37] font-bold' : 'bg-[#14161C] border-[#222] text-[#888] hover:text-[#E2DFD2] hover:border-[#444]'}`}
                      >
                        {isAdded && <Check className="w-3 h-3 stroke-[3px]" />}
                        {preset}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom flavored enter row */}
              <div className="flex gap-2.5 mb-4 flex-shrink-0">
                <input
                  type="text"
                  placeholder="Type specialized custom flavor... (then hit Enter)"
                  value={customFlavorInput}
                  onChange={(e) => setCustomFlavorInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomFlavor();
                    }
                  }}
                  className="flex-1 bg-[#14161C] border border-[#222] text-[#E5E1DA] px-4 py-3 text-base md:text-sm focus:outline-none focus:border-[#D4AF37] transition-all rounded-xl placeholder:text-[#444] focus:ring-1 focus:ring-[#D4AF37]/30"
                />
                <button
                  type="button"
                  onClick={handleAddCustomFlavor}
                  className="bg-[#1A1C22] border border-[#333] hover:border-[#D4AF37] hover:bg-[#20222A] text-[#D4AF37] px-4 rounded-xl flex items-center justify-center transition-all active:scale-95 shrink-0"
                >
                  <Plus className="w-5 h-5 shrink-0" />
                  <span className="hidden sm:inline ml-1 text-xs uppercase tracking-widest font-bold">Add Item</span>
                </button>
              </div>

              {/* Scrollable list representing active flavors catalog */}
              <div className="flex-1 overflow-y-auto space-y-2.5 min-h-[140px] pr-1.5 pb-4">
                <AnimatePresence initial={false}>
                  {flavorEntries.length > 0 ? (
                    flavorEntries.map((entry, index) => (
                      <motion.div 
                        key={entry.id}
                        initial={{ opacity: 0, height: 0, scale: 0.95 }}
                        animate={{ opacity: 1, height: 'auto', scale: 1 }}
                        exit={{ opacity: 0, height: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="bg-[#13151A] border border-[#222]/80 hover:border-[#333] rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center relative shadow-sm"
                      >
                        {/* Index identifier */}
                        <div className="hidden md:block text-[10px] font-mono text-[#555] font-bold w-6 text-center select-none">
                          {index + 1}
                        </div>

                        {/* Flavor Name input control */}
                        <div className="flex-1 space-y-1">
                          <span className="md:hidden text-[9px] uppercase tracking-wider text-[#555] font-mono font-bold">Flavor Name</span>
                          <input
                            type="text"
                            required
                            value={entry.flavor}
                            onChange={(e) => handleUpdateFlavorEntry(entry.id, { flavor: e.target.value })}
                            className="bg-transparent border-b border-[#222] md:border-none text-base md:text-sm text-[#E5E1DA] focus:text-[#D4AF37] py-0.5 focus:outline-none focus:border-[#D4AF37] w-full font-serif font-bold tracking-wide"
                          />
                        </div>

                        {/* Flex containers wrapper for price, quant and barcode inside narrow screens */}
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:flex md:items-center gap-4">
                          
                          {/* Quantity Counter Stepper */}
                          <div className="flex flex-col gap-1 w-full md:w-[130px]">
                            <span className="text-[9px] uppercase tracking-wider text-[#555] font-mono font-bold">In-Stock Qty</span>
                            <div className="flex bg-[#0B0C0E] border border-[#222] rounded-xl p-0.5 items-center justify-between">
                              <button
                                type="button"
                                onClick={() => handleUpdateFlavorEntry(entry.id, { quantity: Math.max(0, entry.quantity - 1) })}
                                className="w-9 h-9 rounded-lg text-[#888] hover:text-[#D4AF37] hover:bg-[#1A1C22] flex items-center justify-center font-bold text-lg active:scale-90 transition-all cursor-pointer select-none"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={entry.quantity}
                                onChange={(e) => handleUpdateFlavorEntry(entry.id, { quantity: parseInt(e.target.value, 10) || 0 })}
                                className="w-12 bg-transparent text-center text-sm font-mono text-[#D4AF37] focus:outline-none font-bold"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateFlavorEntry(entry.id, { quantity: entry.quantity + 1 })}
                                className="w-9 h-9 rounded-lg text-[#888] hover:text-[#D4AF37] hover:bg-[#1A1C22] flex items-center justify-center font-bold text-lg active:scale-90 transition-all cursor-pointer select-none"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Flavor Specific Price override */}
                          <div className="flex flex-col gap-1 w-full md:w-[95px]">
                            <span className="text-[9px] uppercase tracking-wider text-[#555] font-mono font-bold">Item Price ($)</span>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[#444] font-bold">$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={entry.price}
                                onChange={(e) => handleUpdateFlavorEntry(entry.id, { price: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-[#0B0C0E] border border-[#222] rounded-xl p-2 pl-6 text-sm text-right text-[#22C55E] font-serif font-bold focus:outline-none focus:border-[#D4AF37]"
                              />
                            </div>
                          </div>

                          {/* Specific Barcode trigger line */}
                          <div className="flex flex-col gap-1 col-span-2 lg:col-span-1 w-full md:w-[160px]">
                            <span className="text-[9px] uppercase tracking-wider text-[#555] font-mono font-bold">UPC Barcode</span>
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                placeholder="Scan/Type UPC"
                                value={entry.barcode}
                                onChange={(e) => handleUpdateFlavorEntry(entry.id, { barcode: e.target.value })}
                                className="flex-1 bg-[#0B0C0E] border border-[#222] rounded-xl p-2 text-xs font-mono text-[#E5E1DA] placeholder:text-[#333] focus:outline-none focus:border-[#D4AF37] min-w-0"
                              />
                              <button
                                type="button"
                                onClick={() => setActiveScanningFlavId(entry.id)}
                                className="p-2 bg-[#1A1C22] border border-[#333] text-[#D4AF37] hover:border-[#D4AF37] hover:bg-[#20222A] transition-colors rounded-xl flex items-center justify-center shrink-0 cursor-pointer active:scale-95"
                                title="Scan UPC"
                              >
                                <ScanBarcode className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                        </div>

                        {/* Separate removal button spaced perfectly */}
                        <div className="absolute top-3.5 right-3.5 md:static md:flex md:items-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveFlavorEntry(entry.id)}
                            className="p-1.5 text-[#555] hover:text-red-400 hover:bg-[#1E2026] rounded-lg transition-all cursor-pointer active:scale-90"
                            title="Remove Single Row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-[#1F1F1F] rounded-2xl bg-[#090A0D]/20 px-4">
                      <div className="p-3 bg-[#111] border border-[#222] rounded-full mb-3 text-[#555]">
                        <AlertCircle className="w-6 h-6 text-[#D4AF37]" />
                      </div>
                      <h4 className="text-sm font-serif text-[#AAA] mb-1 font-bold">Catalog Queue is Empty</h4>
                      <p className="text-[#555] text-xs max-w-sm font-sans">
                        Tap rapid preset chips labeled <span className="text-[#D4AF37] font-semibold">"All Presets"</span>, specific flavor chips above, or enter manually to queue items for the brand.
                      </p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>

          </div>

          {/* Action buttons footer */}
          <div className="p-5 sm:p-6 border-t border-[#1C1D22] bg-[#0E1015] flex gap-3.5 flex-shrink-0 z-10">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 border border-[#222] rounded-xl text-[#888] bg-transparent hover:text-[#E5E1DA] hover:bg-[#15171D] active:bg-[#1A1C22] transition-all text-xs uppercase tracking-widest font-bold font-mono cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={flavorEntries.length === 0 || !brand.trim()}
              onClick={handleCommitBulk}
              className={`flex-[2] py-4 rounded-xl text-black border transition-all text-xs uppercase tracking-widest font-black shadow-lg cursor-pointer ${flavorEntries.length > 0 && brand.trim() ? 'bg-[#D4AF37] border-[#D4AF37] hover:bg-[#E5C25A] active:bg-[#B3932E] shadow-[#D4AF37]/10' : 'bg-[#14161C]/50 border-[#222] text-[#444] cursor-not-allowed shadow-none'}`}
            >
              Deploy {flavorEntries.length} {brand.trim() || 'Product'} Records
            </button>
          </div>

        </motion.div>
      </div>

      {/* Barcode scanner overlay context */}
      <AnimatePresence>
        {activeScanningFlavId && (
          <BarcodeScanner 
            onResult={handleScanResult} 
            onClose={() => setActiveScanningFlavId(null)} 
          />
        )}
      </AnimatePresence>
    </>
  );
}
