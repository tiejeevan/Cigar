'use client';

import { useState, useCallback, useMemo } from 'react';
import { db, InventoryItem } from '@/lib/db';
import { DEFAULT_BRANDS, PRODUCT_CATEGORIES } from '@/lib/constants';
import { UploadCloud, X, Plus, Trash2, ScanBarcode, Check, Layers, Coins, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { BarcodeScanner } from './barcode-scanner';

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
    'Blue', 'Wine', 'Irish Cream', 'Black', 'Honey Bourbon'
  ],
  'Disposable Vapes': [
    'Cool Mint', 'Watermelon Ice', 'Blue Razz Ice', 'Strawberry Banana', 
    'Peach Ice', 'Grape Ice', 'Strawberry Kiwi', 'Mango Blast', 'Tobacco', 'Clear'
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

  // New Flavor name current text input
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
    toast.success('Defaults applied to all queued flavors!');
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
      toast.error('Please add at least one Flavor to commit.');
      return;
    }

    try {
      let successCount = 0;
      toast.loading('Writing database records...', { id: 'bulk-commit' });

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

      toast.success(`Successfully archived ${successCount} flavor records!`, { id: 'bulk-commit' });
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('An error occurred committing batch records.', { id: 'bulk-commit' });
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-[#0A0B0E]/95 flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-md overflow-hidden">
        <div className="bg-[#0D0F13] sm:border border-[#2A2A2A] w-full max-w-4xl flex flex-col h-full sm:h-[90vh] sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl">
          
          {/* Main header block */}
          <div className="flex justify-between items-center p-6 border-b border-[#2A2A2A] bg-[#0D0F13] z-10 flex-shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase font-mono tracking-[0.2em] bg-[#D4AF37]/10 text-[#D4AF37] px-2 py-0.5 rounded border border-[#D4AF37]/20 font-bold">Fast-Add Engine</span>
                <span className="text-[10px] uppercase font-mono tracking-[0.2em] bg-[#14161C] text-[#888] px-2 py-0.5 rounded border border-[#2A2A2A]">Bulk Brand Wizard</span>
              </div>
              <h2 className="text-2xl font-serif text-[#E5E1DA] leading-none">Bulk Flavor Provisioning</h2>
            </div>
            <button onClick={onClose} className="p-3 hover:text-[#D4AF37] hover:bg-[#1F2127] rounded-full transition-all text-[#888] active:scale-95">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Scrollable contents split into 2 visual side maps on desktop */}
          <div className="overflow-y-auto flex-1 bg-[#0A0B0E]/50 flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-[#2A2A2A]">
            
            {/* Left Box: Shared Specifications */}
            <div className="w-full lg:w-[380px] p-6 space-y-6 flex-shrink-0">
              <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-[#888] border-b border-[#2A2A2A] pb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#D4AF37]" />
                1. Brand Blueprint
              </h3>

              <div className="space-y-4">
                {/* Category Selection */}
                <div className="space-y-2">
                  <label className="block text-xs uppercase tracking-[0.2em] text-[#666] font-semibold">Category</label>
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setFlavorEntries([]); // Reset entries on category change to optimize preset logic
                    }}
                    className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-3 text-sm focus:outline-none focus:border-[#D4AF37] transition-colors rounded-xl appearance-none cursor-pointer"
                  >
                    {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Brand Selection */}
                <div className="space-y-2">
                  <label className="block text-xs uppercase tracking-[0.2em] text-[#666] font-semibold">Brand / Vendor</label>
                  <input
                    list="bulk-brand-options"
                    type="text"
                    required
                    maxLength={100}
                    placeholder="e.g. Dutch Masters"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-3 text-sm focus:outline-none focus:border-[#D4AF37] transition-colors rounded-xl font-medium"
                  />
                  <datalist id="bulk-brand-options">
                    {DEFAULT_BRANDS.map(b => <option key={b} value={b} />)}
                  </datalist>
                </div>

                {/* Pack Packaging Format */}
                <div className="space-y-2">
                  <label className="block text-xs uppercase tracking-[0.2em] text-[#666] font-semibold">Format</label>
                  <div className="flex bg-[#14161C] border border-[#2A2A2A] w-full p-1 gap-1 rounded-xl">
                    {['Single', 'Box', 'Carton'].map(pt => (
                      <button
                        key={pt}
                        type="button"
                        onClick={() => setPackType(pt)}
                        className={`flex-1 py-1.5 text-[10px] tracking-widest uppercase transition-all rounded-lg ${packType === pt ? 'bg-[#2A2A2A] text-[#D4AF37] font-bold' : 'text-[#666] hover:text-[#E5E1DA]'}`}
                      >
                        {pt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Shared pricing and threshold triggers */}
                <div className="grid grid-cols-2 gap-3 bg-[#111317] border border-[#2A2A2A] p-3 rounded-xl shadow-inner">
                  <div className="space-y-1.5 text-center">
                    <label className="block text-[9px] uppercase tracking-[0.1em] text-[#666] font-semibold">Default Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={defaultPrice}
                      onChange={(e) => setDefaultPrice(e.target.value)}
                      className="w-full bg-[#14161C] border border-[#2A2A2A] rounded-lg text-center text-[#22C55E] p-2 text-base font-serif font-bold focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 text-center">
                    <label className="block text-[9px] uppercase tracking-[0.1em] text-[#666] font-semibold">Default Reorder</label>
                    <input
                      type="number"
                      min="0"
                      value={defaultReorder}
                      onChange={(e) => setDefaultReorder(e.target.value)}
                      className="w-full bg-[#14161C] border border-[#2A2A2A] rounded-lg text-center text-[#E5E1DA] p-2 text-base font-serif focus:outline-none"
                    />
                  </div>
                </div>

                {/* Apply buttons for dynamic settings sync */}
                {flavorEntries.length > 0 && (
                  <button
                    type="button"
                    onClick={handleApplyDefaultsToAll}
                    className="w-full py-2 bg-[#1F2127] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-[#888] hover:text-[#E5E1DA] rounded-lg text-[9px] font-mono uppercase tracking-widest transition-all"
                  >
                    Apply default price & threshold to all rows
                  </button>
                )}

                {/* Shared Brand Image Visual Aspect */}
                <div className="space-y-2 pt-2">
                  <label className="block text-xs uppercase tracking-[0.2em] text-[#666] font-semibold">Shared Brand Photo</label>
                  {sharedImage ? (
                    <div className="relative inline-block w-full text-center">
                      <img src={sharedImage} alt="Shared Brand Preview" className="h-28 w-28 object-cover border border-[#2A2A2A] bg-[#14161C] mx-auto shadow-md rounded-xl" />
                      <button
                        type="button"
                        onClick={removeSharedImage}
                        className="absolute top-1/2 -translate-y-1/2 right-4 bg-[#0D0F13] border border-[#D4AF37]/50 text-[#D4AF37] p-1.5 hover:bg-[#D4AF37] hover:text-black transition-colors rounded-full shadow-md z-10"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-[#2D2D2D] rounded-xl p-5 flex flex-col items-center justify-center bg-[#14161C]/50 hover:bg-[#171920] hover:border-[#D4AF37]/30 transition-all cursor-pointer relative relative group overflow-hidden">
                      <UploadCloud className="w-8 h-8 text-[#444] mb-1 group-hover:text-[#D4AF37]/50 transition-colors" />
                      <span className="text-[9px] uppercase tracking-wider text-[#666]">Upload Shared Logo/Picture</span>
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
            <div className="flex-1 p-6 flex flex-col overflow-hidden min-h-[400px]">
              <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-[#888] border-b border-[#2A2A2A] pb-3 flex items-center justify-between flex-shrink-0">
                <span className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-[#D4AF37]" />
                  2. Flavor Deployment Register
                </span>
                <span className="text-[10px] font-mono text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-0.5 rounded-full border border-[#D4AF37]/20 font-bold">
                  {flavorEntries.length} Items Queued
                </span>
              </h3>

              {/* Presets Grid Section */}
              <div className="py-4 space-y-2 border-b border-[#2A2A2A]/50 flex-shrink-0 bg-[#0E1014]/30 rounded-xl px-3 my-4">
                <p className="text-[9px] uppercase tracking-widest text-[#666] font-bold">Select predefined {category} flavors to batch instantly:</p>
                <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto pr-1">
                  {dynamicPresets.map(preset => {
                    const isAdded = flavorEntries.some(f => f.flavor.toLowerCase() === preset.toLowerCase());
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleTogglePreset(preset)}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-all duration-150 flex items-center gap-1 cursor-pointer select-none active:scale-95 ${isAdded ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37] font-bold' : 'bg-[#14161C] border-[#2A2A2A] text-[#888] hover:text-[#E5E1DA] hover:border-[#444]'}`}
                      >
                        {isAdded && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                        {preset}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Add Line Input Form */}
              <div className="flex gap-3 mb-6 flex-shrink-0">
                <input
                  type="text"
                  placeholder="Custom flavored entry... e.g. White Grape (Hit enter to add)"
                  value={customFlavorInput}
                  onChange={(e) => setCustomFlavorInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomFlavor();
                    }
                  }}
                  className="flex-1 bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] px-4 py-3 text-sm focus:outline-none focus:border-[#D4AF37] transition-colors rounded-xl placeholder:text-[#444]"
                />
                <button
                  type="button"
                  onClick={handleAddCustomFlavor}
                  className="bg-[#1F2127] border border-[#2A2A2A] text-[#D4AF37] hover:border-[#D4AF37] px-4 rounded-xl flex items-center justify-center transition-colors active:scale-95 shadow-sm"
                >
                  <Plus className="w-5 h-5 mr-1" />
                  <span className="text-xs uppercase tracking-widest font-bold">Add Line</span>
                </button>
              </div>

              {/* Scrollable grid representing current item configurations */}
              <div className="flex-1 overflow-y-auto space-y-3 min-h-[150px] pr-1.5 pb-6">
                {flavorEntries.length > 0 ? (
                  flavorEntries.map((entry, index) => (
                    <div 
                      key={entry.id} 
                      className="bg-[#14161C] border border-[#2A2A2A] hover:border-[#444] rounded-xl p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center relative shadow-sm"
                    >
                      {/* Row index indicator */}
                      <div className="text-[10px] font-mono text-[#444] absolute top-2 left-2 md:static select-none">
                        #{index + 1}
                      </div>

                      {/* Flavor name */}
                      <div className="flex-1 min-w-[130px] space-y-1">
                        <label className="md:hidden block text-[9px] uppercase tracking-widest text-[#555]">Flavor Name</label>
                        <input
                          type="text"
                          required
                          value={entry.flavor}
                          onChange={(e) => handleUpdateFlavorEntry(entry.id, { flavor: e.target.value })}
                          className="bg-transparent border-b border-[#2A2A2A] md:border-none text-sm text-[#E5E1DA] py-1 focus:outline-none focus:border-[#D4AF37] w-full font-serif text-lg leading-tight"
                        />
                      </div>

                      {/* Quantity counter widget */}
                      <div className="w-full md:w-[140px] flex flex-col gap-1">
                        <label className="block text-[9px] uppercase tracking-widest text-[#555]">Qty In-Stock</label>
                        <div className="flex bg-[#0D0F13] border border-[#2A2A2A] rounded-lg p-0.5 items-center justify-between">
                          <button
                            type="button"
                            onClick={() => handleUpdateFlavorEntry(entry.id, { quantity: Math.max(0, entry.quantity - 1) })}
                            className="w-8 h-8 rounded text-[#888] hover:text-[#D4AF37] hover:bg-[#1E2026] flex items-center justify-center font-bold"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={entry.quantity}
                            onChange={(e) => handleUpdateFlavorEntry(entry.id, { quantity: parseInt(e.target.value, 10) || 0 })}
                            className="w-12 bg-transparent text-center text-sm font-mono text-[#D4AF37] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateFlavorEntry(entry.id, { quantity: entry.quantity + 1 })}
                            className="w-8 h-8 rounded text-[#888] hover:text-[#D4AF37] hover:bg-[#1E2026] flex items-center justify-center font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Customized Price line value */}
                      <div className="w-full md:w-[95px] flex flex-col gap-1">
                        <label className="block text-[9px] uppercase tracking-widest text-[#555] md:text-center">Custom Price</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#666] font-bold">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={entry.price}
                            onChange={(e) => handleUpdateFlavorEntry(entry.id, { price: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-[#0D0F13] border border-[#2A2A2A] rounded-lg p-1.5 pl-5 text-xs text-right text-[#22C55E] font-serif focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Barcode scanner action for this specific flavor */}
                      <div className="w-full md:w-[150px] flex flex-col gap-1">
                        <label className="block text-[9px] uppercase tracking-widest text-[#555]">Flavor Barcode</label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="Optional UPC"
                            value={entry.barcode}
                            onChange={(e) => handleUpdateFlavorEntry(entry.id, { barcode: e.target.value })}
                            className="flex-1 bg-[#0D0F13] border border-[#2A2A2A] rounded-lg p-1.5 text-[10px] font-mono text-[#E5E1DA] placeholder:text-[#333] focus:outline-none min-w-0"
                          />
                          <button
                            type="button"
                            onClick={() => setActiveScanningFlavId(entry.id)}
                            className="p-1.5 bg-[#1F2127] border border-[#2A2A2A] text-[#D4AF37] hover:border-[#D4AF37] hover:bg-[#2A2A2A] transition-colors rounded-lg flex items-center justify-center"
                            title="Scan Specific Barcode"
                          >
                            <ScanBarcode className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Clear line deletion option */}
                      <button
                        type="button"
                        onClick={() => handleRemoveFlavorEntry(entry.id)}
                        className="p-2 md:p-3 text-[#555] hover:text-[#C2410C] hover:bg-[#2A2A2A] rounded-lg transition-all absolute top-2 right-2 md:static self-center"
                        title="Remove Flavor Line"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-[#2A2A2A] rounded-2xl bg-[#0D0F13]/20">
                    <AlertCircle className="w-8 h-8 text-[#555] mb-2" />
                    <p className="text-[#888] text-xs font-serif italic max-w-xs">No flavor lines configured yet. Click preset chips above or type custom names to deploy immediate stock.</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Atomic Bulk Action control footer */}
          <div className="p-5 sm:p-6 border-t border-[#2A2A2A] bg-[#0D0F13] flex gap-4 flex-shrink-0 z-10">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 border border-[#2A2A2A] rounded-xl text-[#888] bg-transparent hover:text-[#E5E1DA] hover:bg-[#1A1C23] active:bg-[#1F2127] transition-all text-xs uppercase tracking-widest font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={flavorEntries.length === 0 || !brand.trim()}
              onClick={handleCommitBulk}
              className={`flex-[2] py-4 rounded-xl text-black border transition-all text-xs uppercase tracking-widest font-bold shadow-lg ${flavorEntries.length > 0 && brand.trim() ? 'bg-[#D4AF37] border-[#D4AF37] hover:bg-[#E5C25A] active:bg-[#B3932E] shadow-[#D4AF37]/10' : 'bg-[#14161C] border-[#2A2A2A] text-[#444] cursor-not-allowed shadow-none'}`}
            >
              Import {flavorEntries.length} Flavor Records
            </button>
          </div>

        </div>
      </div>

      {/* Embedded Barcode scanner modal frame */}
      {activeScanningFlavId && (
        <BarcodeScanner 
          onResult={handleScanResult} 
          onClose={() => setActiveScanningFlavId(null)} 
        />
      )}
    </>
  );
}
