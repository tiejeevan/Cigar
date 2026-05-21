'use client';

import { useState, useMemo } from 'react';
import { db, InventoryItem } from '@/lib/db';
import { DEFAULT_BRANDS, PRODUCT_CATEGORIES } from '@/lib/constants';
import { 
  UploadCloud, 
  X, 
  Plus, 
  Trash2, 
  ScanBarcode, 
  Check, 
  Layers, 
  Coins, 
  ArrowLeft, 
  ChevronRight,
  Package,
  Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { BarcodeScanner } from './barcode-scanner';
import { motion, AnimatePresence } from 'motion/react';

interface BulkInventoryFormProps {
  onClose: () => void;
}

interface QueuedFlavor {
  id: string;
  flavor: string;
  quantity: number;
  price: number;
  reorderThreshold: number;
  barcode: string;
  image?: string; // individual picture for each flavor!
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
  // Wizard flow state
  // Step 1: brand & specifications
  // Step 2: add flavors with price, quantity, and picture
  const [step, setStep] = useState<'brand' | 'flavors'>('brand');

  // STEP 1 FIELDS (Brand specifiers)
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('Cigarillos');
  const [packType, setPackType] = useState('Single');
  const [basePrice, setBasePrice] = useState('1.29');
  const [baseReorder, setBaseReorder] = useState('10');

  // STEP 2 FIELDS (Current active flavor editor values)
  const [activeFlavorName, setActiveFlavorName] = useState('');
  const [activeFlavorPrice, setActiveFlavorPrice] = useState('1.29');
  const [activeFlavorQty, setActiveFlavorQty] = useState(20); // standard bulk batch start qty
  const [activeFlavorBarcode, setActiveFlavorBarcode] = useState('');
  const [activeFlavorImage, setActiveFlavorImage] = useState<string | undefined>(undefined);

  // Active queued list of complete flavors
  const [queuedFlavors, setQueuedFlavors] = useState<QueuedFlavor[]>([]);

  // Scanning bar state
  const [isScanningActive, setIsScanningActive] = useState<boolean>(false);

  // Helper mapping category preset choices
  const dynamicPresets = useMemo(() => {
    return CATEGORY_FLAVOR_PRESETS[category] || CATEGORY_FLAVOR_PRESETS['Other'];
  }, [category]);

  // Adjust active flavor price via fast mobile buttons
  const adjustActivePrice = (amount: number) => {
    const current = parseFloat(activeFlavorPrice) || 0;
    const finalVal = Math.max(0, current + amount);
    setActiveFlavorPrice(finalVal.toFixed(2));
  };

  // Adjust active flavor quantity via fast mobile buttons
  const adjustActiveQty = (amount: number) => {
    setActiveFlavorQty(prev => Math.max(0, prev + amount));
  };

  // Convert uploaded image to Base64 thumbnail compressed
  const handleActiveImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
            setActiveFlavorImage(canvas.toDataURL('image/jpeg', 0.8));
            toast.success('Flavor photo captured.');
          } else {
            setActiveFlavorImage(reader.result as string);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // Capture barcode and inject into current flavor item
  const handleScanResult = (decodedBarcode: string) => {
    setActiveFlavorBarcode(decodedBarcode);
    setIsScanningActive(false);
    toast.success(`Barcode connected: ${decodedBarcode}`);
  };

  // Add the current active flavor details into the queued array
  const handleAddFlavorToQueue = () => {
    const cleanedName = activeFlavorName.trim();
    if (!cleanedName) {
      toast.error('Specify a flavor name, or tap presets below!');
      return;
    }

    // Guard duplicate
    const exists = queuedFlavors.some(q => q.flavor.toLowerCase() === cleanedName.toLowerCase());
    if (exists) {
      toast.error(`"${cleanedName}" flavor is already added to this batch.`);
      return;
    }

    const priceVal = parseFloat(activeFlavorPrice) || 1.29;

    const newFlavor: QueuedFlavor = {
      id: Math.random().toString(36).substring(2, 9),
      flavor: cleanedName,
      quantity: activeFlavorQty,
      price: priceVal,
      reorderThreshold: parseInt(baseReorder, 10) || 10,
      barcode: activeFlavorBarcode.trim(),
      image: activeFlavorImage
    };

    setQueuedFlavors(prev => [...prev, newFlavor]);
    
    // Reset specific active editor fields, saving price & image fallback as convenient default
    setActiveFlavorName('');
    setActiveFlavorBarcode('');
    setActiveFlavorImage(undefined);
    toast.success(`Queued: ${cleanedName}`);
  };

  // Instant fast-add preset tap handler
  const handleTapPreset = (presetFlavor: string) => {
    // If flavor name empty, prefill it! Or if they tap, prefill and keep price/image
    setActiveFlavorName(presetFlavor);
  };

  // Complete and save to Postgres
  const handleDatabaseSubmit = async () => {
    if (!brand.trim()) {
      toast.error('Please input a valid Brand Name.');
      setStep('brand');
      return;
    }

    if (queuedFlavors.length === 0) {
      toast.error('Queue is empty! Add at least one flavor first.');
      return;
    }

    try {
      toast.loading('Importing product records into databases...', { id: 'neon-bulk-write' });
      let counter = 0;

      for (const flav of queuedFlavors) {
        const item: Omit<InventoryItem, 'id'> = {
          brand: brand.trim(),
          flavor: flav.flavor.trim(),
          category: category,
          packType: packType,
          quantity: flav.quantity,
          reorderThreshold: flav.reorderThreshold,
          price: flav.price,
          barcode: flav.barcode || undefined,
          image: flav.image, // Saved customized individual photo!
          updatedAt: Date.now()
        };

        await db.items.add(item);
        counter++;
      }

      toast.success(`Successfully dispatched ${counter} product records to database!`, { id: 'neon-bulk-write' });
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('An error occurred writing catalog items.', { id: 'neon-bulk-write' });
    }
  };

  // Screen 1: Brand details
  const renderBrandStep = () => {
    return (
      <div className="space-y-6 pt-2">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-[#888] mb-1">Step 1: Brand Configuration</h3>
          <p className="text-xs text-[#555] font-serif italic">First, specify the manufacturer and default settings for your batch.</p>
        </div>

        {/* Enter Brand name with easy clear button / text field */}
        <div className="space-y-2">
          <label className="block text-xs uppercase tracking-[0.2em] text-[#666] font-bold">Write Brand / Company Name</label>
          <div className="relative">
            <input
              type="text"
              required
              maxLength={120}
              placeholder="e.g. Dutch Masters, Swisher, Slapwoods..."
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full bg-[#14161C] border border-[#222] text-[#E5E1DA] focus:text-[#D4AF37] px-4 py-4 text-lg focus:outline-none focus:border-[#D4AF37] transition-all rounded-2xl font-serif"
            />
            {brand && (
              <button 
                type="button"
                onClick={() => setBrand('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#E2DFD2] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Brand name quick buttons */}
        <div className="space-y-2">
          <span className="block text-[10px] uppercase font-mono text-[#555] font-bold">Quick Select Brand:</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DEFAULT_BRANDS.map(b => (
              <button
                key={b}
                type="button"
                onClick={() => {
                  setBrand(b);
                  // Dynamic autofill base settings for custom brands
                  if (b === 'Backwoods' || b === 'Slapwoods') {
                    setBasePrice('6.99');
                    setPackType('Box');
                  } else {
                    setBasePrice('1.29');
                    setPackType('Single');
                  }
                }}
                className={`py-3 px-2 text-xs rounded-xl font-mono uppercase tracking-wider text-center transition-all border ${brand === b ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37] font-bold shadow-lg shadow-[#D4AF37]/5 scale-[1.02]' : 'bg-[#14161C] border-[#222]/60 hover:border-[#333] text-[#888]'}`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          {/* Category touch grid selector */}
          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-[0.2em] text-[#666] font-bold">Category</label>
            <div className="grid grid-cols-2 gap-2 max-h-[190px] overflow-y-auto pr-1">
              {PRODUCT_CATEGORIES.slice(0, 8).map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`py-2.5 px-2 text-[10px] tracking-wide uppercase rounded-xl transition-all border font-bold ${category === cat ? 'bg-[#1D2128] border-[#D4AF37]/80 text-[#D4AF37]' : 'bg-[#14161C] border-[#222]/60 text-[#666] hover:text-[#888]'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Formats touch grid selector */}
          <div className="space-y-2 flex flex-col justify-between">
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-[0.2em] text-[#666] font-bold">Packaging / Format</label>
              <div className="grid grid-cols-3 gap-2">
                {['Single', 'Box', 'Carton'].map(pt => (
                  <button
                    key={pt}
                    type="button"
                    onClick={() => setPackType(pt)}
                    className={`py-3 text-[10px] tracking-widest uppercase transition-all rounded-xl font-bold border ${packType === pt ? 'bg-[#1E2128] border-[#D4AF37]/80 text-[#D4AF37]' : 'bg-[#14161C] border-[#222]/60 text-[#666]'}`}
                  >
                    {pt}
                  </button>
                ))}
              </div>
            </div>

            {/* Default values preset helpers */}
            <div className="grid grid-cols-2 gap-3 bg-[#111317] border border-[#222] p-3 rounded-xl mt-3">
              <div className="text-center">
                <span className="block text-[9px] uppercase tracking-wider text-[#555] font-bold mb-1">Base Price ($)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={basePrice}
                  onChange={(e) => {
                    setBasePrice(e.target.value);
                    setActiveFlavorPrice(e.target.value);
                  }}
                  className="w-full bg-[#14161C] border border-[#222] text-center text-emerald-500 font-serif font-bold p-1 rounded-lg text-sm"
                />
              </div>
              <div className="text-center">
                <span className="block text-[9px] uppercase tracking-wider text-[#555] font-bold mb-1">Alert Level</span>
                <input
                  type="number"
                  min="1"
                  value={baseReorder}
                  onChange={(e) => setBaseReorder(e.target.value)}
                  className="w-full bg-[#14161C] border border-[#222] text-center text-[#E5E1DA] font-mono p-1 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Big tactile navigation trigger */}
        <button
          type="button"
          onClick={() => {
            if (!brand.trim()) {
              toast.error('Write or select a Brand Name first.');
              return;
            }
            setStep('flavors');
          }}
          className="w-full py-4.5 bg-[#D4AF37] hover:bg-[#E5C25A] text-black rounded-2xl flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-xs shadow-xl active:scale-95 transition-all mt-6"
        >
          <span>Define brand flavors for "{brand}"</span>
          <ChevronRight className="w-5 h-5 stroke-[3px]" />
        </button>
      </div>
    );
  };

  // Screen 2: Insert flavors with individual prices & pictures & queue them
  const renderFlavorsStep = () => {
    return (
      <div className="space-y-6 flex flex-col h-full overflow-hidden">
        
        {/* Brand spec description header with Back navigation block */}
        <div className="flex justify-between items-center bg-[#111317]/80 border border-[#222] px-4 py-3 rounded-2xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStep('brand')}
              className="p-2 bg-[#1A1C22] border border-[#333] hover:border-[#D4AF37]/50 rounded-xl text-[#888] hover:text-[#D4AF37] active:scale-95 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <p className="text-[9px] uppercase font-mono tracking-wider text-[#666] font-bold">Deploying Brand</p>
              <h4 className="text-base font-serif text-[#E5E1DA] leading-none font-bold italic">{brand}</h4>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] bg-[#D4AF37]/10 text-[#D4AF37] px-2.5 py-1 rounded-lg border border-[#D4AF37]/10 font-bold uppercase tracking-wider">
              {category} • {packType}
            </span>
          </div>
        </div>

        {/* The active Flavor Input Block */}
        <div className="bg-[#14161C]/50 border border-[#222]/80 rounded-2.5xl p-4 sm:p-5 flex-shrink-0 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs uppercase tracking-widest font-bold text-[#888] flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-[#D4AF37]" />
              Flavor Blueprint
            </h4>
            <span className="text-[10px] uppercase font-mono text-[#444] font-semibold">Multiple pictures supported</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Row: Flavor name text field & fast presets */}
            <div className="space-y-3">
              <div className="space-y-1">
                <span className="block text-[9px] uppercase tracking-wider text-[#555] font-bold">1. Flavor Name</span>
                <input
                  type="text"
                  placeholder="e.g. Russian Cream, Sweet, Mango..."
                  value={activeFlavorName}
                  onChange={(e) => setActiveFlavorName(e.target.value)}
                  className="w-full bg-[#0D0F13] border border-[#222] text-[#E5E1DA] focus:text-[#D4AF37] px-3.5 py-3 rounded-xl font-serif text-base focus:outline-none focus:border-[#D4AF37] transition-colors"
                />
              </div>

              {/* Instant dynamic presets tap cards */}
              <div className="space-y-1">
                <span className="block text-[8px] uppercase tracking-wider text-[#555] font-bold">Quick presets (Tap to prefill name)</span>
                <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto pr-1">
                  {dynamicPresets.map(preset => {
                    const isSelected = activeFlavorName.toLowerCase() === preset.toLowerCase();
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleTapPreset(preset)}
                        className={`px-2.5 py-1 text-[10px] rounded-lg border transition-all select-none cursor-pointer active:scale-95 ${isSelected ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37] font-bold' : 'bg-[#0D0F12] border-[#222] text-[#666] hover:text-[#AAA]'}`}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Column 2: Price, Photo and Qty counter values */}
            <div className="grid grid-cols-2 gap-3">
              {/* Quant with buttons adjustment */}
              <div className="space-y-1.5">
                <span className="block text-[9px] uppercase tracking-wider text-[#555] font-bold">2. Quantity</span>
                <div className="flex bg-[#0D0F13] border border-[#222] rounded-xl items-center justify-between p-0.5">
                  <button
                    type="button"
                    onClick={() => adjustActiveQty(-5)}
                    className="w-8 h-8 rounded-lg bg-[#14161B] hover:bg-[#1E2026] text-xs font-bold text-gray-400 active:scale-90 transition-all cursor-pointer select-none"
                  >
                    -5
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={activeFlavorQty}
                    onChange={(e) => setActiveFlavorQty(parseInt(e.target.value, 10) || 0)}
                    className="w-8 bg-transparent text-center text-sm font-bold font-mono text-[#D4AF37] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => adjustActiveQty(5)}
                    className="w-8 h-8 rounded-lg bg-[#14161B] hover:bg-[#1E2026] text-xs font-bold text-gray-400 active:scale-90 transition-all cursor-pointer select-none"
                  >
                    +5
                  </button>
                </div>
              </div>

              {/* Pricing with micro adjustments */}
              <div className="space-y-1.5">
                <span className="block text-[9px] uppercase tracking-wider text-[#555] font-bold">3. Price ($)</span>
                <div className="flex bg-[#0D0F13] border border-[#222] rounded-xl items-center justify-between p-0.5 relative">
                  <button
                    type="button"
                    onClick={() => adjustActivePrice(-0.10)}
                    className="px-2 h-8 rounded-lg bg-[#14161B] text-[10px] font-mono text-gray-400 active:scale-90 cursor-pointer"
                  >
                    -.10
                  </button>
                  <input
                    type="text"
                    value={activeFlavorPrice}
                    onChange={(e) => setActiveFlavorPrice(e.target.value)}
                    className="w-10 bg-transparent text-center text-sm font-serif font-bold text-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => adjustActivePrice(0.10)}
                    className="px-2 h-8 rounded-lg bg-[#14161B] text-[10px] font-mono text-gray-400 active:scale-90 cursor-pointer"
                  >
                    +.10
                  </button>
                </div>
              </div>

              {/* UPC capturing state & scan triggers */}
              <div className="col-span-1 space-y-1.5">
                <span className="block text-[9px] uppercase tracking-wider text-[#555] font-bold">4. UPC/Barcode</span>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="None"
                    value={activeFlavorBarcode}
                    onChange={(e) => setActiveFlavorBarcode(e.target.value)}
                    className="flex-1 bg-[#0D0F13] border border-[#222] text-xs font-mono p-2 rounded-xl text-[#E5E1DA]"
                  />
                  <button
                    type="button"
                    onClick={() => setIsScanningActive(true)}
                    className="p-2 bg-[#1A1C22] border border-[#333] hover:border-[#D4AF37] text-[#D4AF37] rounded-xl cursor-pointer active:scale-95 transition-all flex items-center justify-center shrink-0"
                  >
                    <ScanBarcode className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Pic Upload Trigger specifically designed as Buttons for phone */}
              <div className="col-span-1 space-y-1.5">
                <span className="block text-[9px] uppercase tracking-wider text-[#555] font-bold">5. Upload Picture</span>
                {activeFlavorImage ? (
                  <div className="flex items-center gap-2 border border-emerald-500/30 bg-emerald-500/5 p-1 rounded-xl relative justify-between">
                    <img src={activeFlavorImage} className="w-8 h-8 rounded-lg object-cover" />
                    <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-emerald-500">Captured</span>
                    <button
                      type="button"
                      onClick={() => setActiveFlavorImage(undefined)}
                      className="p-1 text-red-400 bg-[#0F1014] hover:bg-red-500/20 rounded-lg active:scale-90 transition-all font-bold"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="relative border border-dashed border-[#222] bg-[#0A0B0D] hover:border-[#D4AF37]/50 transition-colors h-[32px] rounded-xl flex items-center justify-center overflow-hidden cursor-pointer group">
                    <div className="flex items-center gap-1.5 text-[10px] text-[#666] font-bold group-hover:text-[#D4AF37]">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Take Photo</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleActiveImageUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Button style queue trigger */}
          <button
            type="button"
            onClick={handleAddFlavorToQueue}
            className="w-full py-3 bg-[#1D2128] hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] border border-[#2B303A] text-[#888] rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-widest font-black transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            Queue Added Flavor Line
          </button>
        </div>

        {/* Current list representing queued items catalog */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b border-[#222] pb-2 mb-3 flex justify-between items-center bg-[#090A0D]/50 z-10 flex-shrink-0">
            <h5 className="text-[10px] uppercase font-mono tracking-widest text-[#555] font-bold">
              Current Queue ({queuedFlavors.length})
            </h5>
            {queuedFlavors.length > 0 && (
              <button
                type="button"
                onClick={() => setQueuedFlavors([])}
                className="text-[9px] uppercase font-mono font-bold text-red-400 hover:underline px-2"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1.5 pb-6">
            <AnimatePresence initial={false}>
              {queuedFlavors.length > 0 ? (
                queuedFlavors.map((q, index) => (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="p-3 bg-[#111317] border border-[#222] rounded-xl flex gap-3 items-center justify-between"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-11 h-11 bg-[#0A0B0E] border border-[#222] rounded-lg shrink-0 flex items-center justify-center overflow-hidden">
                        {q.image ? (
                          <img src={q.image} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 text-[#333]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-serif text-[#E2DFD2] truncate font-bold leading-none mb-1">
                          {q.flavor}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[9px] text-[#555] font-mono">
                            UPC: {q.barcode || 'Empty'}
                          </span>
                          <span className="text-[9px] text-emerald-500 font-serif font-bold">
                            ${q.price.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Qty count overrides */}
                      <div className="flex bg-[#0A0C0F] border border-[#222] rounded-lg items-center gap-2 px-2 py-1">
                        <button
                          type="button"
                          onClick={() => {
                            setQueuedFlavors(prev => prev.map(item => item.id === q.id ? { ...item, quantity: Math.max(0, item.quantity - 1) } : item));
                          }}
                          className="text-xs font-bold text-gray-500 px-1 hover:text-white"
                        >
                          -
                        </button>
                        <span className="text-xs font-mono text-[#D4AF37] font-bold w-6 text-center">
                          {q.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setQueuedFlavors(prev => prev.map(item => item.id === q.id ? { ...item, quantity: item.quantity + 1 } : item));
                          }}
                          className="text-xs font-bold text-gray-500 px-1 hover:text-white"
                        >
                          +
                        </button>
                      </div>

                      {/* Line deleter */}
                      <button
                        type="button"
                        onClick={() => {
                          setQueuedFlavors(prev => prev.filter(item => item.id !== q.id));
                          toast.success('Removed flavor line');
                        }}
                        className="p-1.5 text-[#555] hover:text-red-400 bg-transparent hover:bg-red-500/5 rounded-lg active:scale-90 transition-all font-bold cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="py-8 text-center border border-dashed border-[#1B1D22] bg-[#111216]/10 rounded-xl">
                  <p className="text-xs text-[#555] tracking-wide font-serif italic">Use the form above to add custom flavors of {brand}.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-[#0A0B0E]/95 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, y: 120 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 120 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="bg-[#0D0F13] border-t sm:border border-[#222] w-full max-w-4xl flex flex-col h-[95vh] sm:h-[88vh] max-h-[96vh] rounded-t-[2.5rem] sm:rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* Main system header */}
          <div className="flex justify-between items-center px-6 py-4.5 border-b border-[#222] bg-[#0E1015] z-10 flex-shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] uppercase font-mono tracking-[0.2em] bg-[#D4AF37]/10 text-[#D4AF37] px-2 py-0.5 rounded border border-[#D4AF37]/20 font-bold">SMOKE SYSTEM</span>
                <span className="text-[9px] uppercase font-mono tracking-[0.2em] bg-[#00E5FF]/10 text-[#00E5FF] px-2 py-0.5 rounded border border-[#00E5FF]/20 font-bold">BULK BRAND DEPLOYER</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-serif text-[#E5E1DA] leading-none font-bold">Deploy Brand Batch</h2>
            </div>
            <button 
              type="button" 
              onClick={onClose}
              className="p-2 hover:text-[#D4AF37] hover:bg-[#1E2026] text-[#888] rounded-full transition-all border border-transparent hover:border-[#222]"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Stepper Breadcrumb header */}
          <div className="bg-[#111317] px-6 py-2 border-b border-[#222]/80 flex-shrink-0 flex items-center justify-between text-[10px] uppercase font-mono font-bold text-[#555] tracking-widest">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded ${step === 'brand' ? 'bg-[#D4AF37] text-black' : 'bg-[#1E2026] text-gray-400'}`}>1</span>
              <span className={step === 'brand' ? 'text-gray-300' : 'text-gray-500'}>Brand Blueprint</span>
            </div>
            <div className="w-12 h-px bg-[#222]"></div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded ${step === 'flavors' ? 'bg-[#D4AF37] text-black' : 'bg-[#1E2026] text-gray-400'}`}>2</span>
              <span className={step === 'flavors' ? 'text-gray-300' : 'text-gray-500'}>Flavor Deployment</span>
            </div>
          </div>

          {/* Core Content Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4 bg-[#090A0D]/50">
            {step === 'brand' ? renderBrandStep() : renderFlavorsStep()}
          </div>

          {/* Shared persistent dialog footer logic */}
          <div className="p-5 border-t border-[#1F2026] bg-[#0E1015] flex gap-3.5 flex-shrink-0 z-10">
            {step === 'flavors' && (
              <button
                type="button"
                onClick={() => setStep('brand')}
                className="flex-1 py-3.5 border border-[#222] rounded-xl text-[#888] bg-transparent hover:text-white hover:bg-[#15171C] active:bg-[#1C1F26] transition-all text-xs uppercase tracking-widest font-bold font-mono cursor-pointer"
              >
                ◀ Back
              </button>
            )}
            
            <button
              type="button"
              onClick={step === 'brand' ? onClose : handleDatabaseSubmit}
              className={`py-3.5 border rounded-xl text-xs uppercase tracking-widest font-black transition-all cursor-pointer ${step === 'brand' ? 'flex-1 bg-transparent border-[#222] text-[#888] hover:text-[#E2DFD2] hover:bg-[#15171C]' : 'flex-[2] bg-[#D4AF37] border-[#D4AF37] hover:bg-[#E5C25A] active:bg-[#B3932E] text-black shadow-lg shadow-[#D4AF37]/10'}`}
              disabled={step === 'flavors' && queuedFlavors.length === 0}
            >
              {step === 'brand' 
                ? 'Cancel Deployment' 
                : `Submit Deploy (${queuedFlavors.length} Flavors)`
              }
            </button>
          </div>
        </motion.div>
      </div>

      {/* Shared Barcode Scanner framework */}
      <AnimatePresence>
        {isScanningActive && (
          <BarcodeScanner 
            onResult={handleScanResult} 
            onClose={() => setIsScanningActive(false)} 
          />
        )}
      </AnimatePresence>
    </>
  );
}
