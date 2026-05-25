'use client';

import { useState, useEffect } from 'react';
import { db, InventoryItem } from '@/lib/db';
import { useLiveQuery } from '@/lib/db';
import { ArrowLeft, Pencil, Trash2, ShieldAlert, Barcode, DollarSign, Package, AlertCircle, ShoppingCart, Layers, Plus } from 'lucide-react';
import { LazyItemImage } from './lazy-item-image';
import { InventoryForm } from './inventory-form';
import { toast } from 'sonner';

interface ItemDetailViewProps {
  itemId: number;
  onClose: () => void;
  onSelectItem: (id: number) => void;
}

export function ItemDetailView({ itemId, onClose, onSelectItem }: ItemDetailViewProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [brandSettingState, setBrandSettingState] = useState<{type: 'price' | 'boxSize', value: string} | null>(null);
  
  const [adjustWizard, setAdjustWizard] = useState<'box' | 'custom' | null>(null);
  const [wizardValue, setWizardValue] = useState<string>('');

  // Local state to prevent lag when typing
  const [localQty, setLocalQty] = useState<string>('');
  const [localThreshold, setLocalThreshold] = useState<string>('');
  const [localBoxSize, setLocalBoxSize] = useState<string>('');

  const item = useLiveQuery(() => db.items.get(itemId), [itemId]);
  const allItems = useLiveQuery(() => db.items.toArray(), []);

  // Update local state when DB state changes, but only if not currently focused
  useEffect(() => {
    if (item) {
      if (document.activeElement?.id !== 'qty-input') setLocalQty(item.quantity.toString());
      if (document.activeElement?.id !== 'thresh-input') setLocalThreshold(item.reorderThreshold.toString());
      if (document.activeElement?.id !== 'box-input') setLocalBoxSize((item.boxSize || 15).toString());
    }
  }, [item]);

  if (!item) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 text-center p-6">
        <div className="w-16 h-16 bg-[#14161C] border border-[#2A2A2A] rounded-2xl flex items-center justify-center animate-pulse">
          <AlertCircle className="w-8 h-8 text-[#D4AF37]" />
        </div>
        <h3 className="text-xl font-serif text-[#E5E1DA]">Archived Record Missing</h3>
        <p className="text-sm text-[#888] max-w-xs">The requested inventory item could not be retrieved from the database.</p>
        <button 
          onClick={onClose}
          className="mt-4 px-6 py-2.5 bg-[#14161C] border border-[#2A2A2A] text-xs text-gray-300 hover:text-white rounded-xl uppercase tracking-wider font-semibold"
        >
          Return to Catalog
        </button>
      </div>
    );
  }

  const otherFlavors = (allItems || []).filter((i: InventoryItem) => i.brand === item.brand && i.id !== item.id);

  const changeQuantity = async (delta: number) => {
    const newQty = Math.max(0, item.quantity + delta);
    await db.items.update(itemId, { quantity: newQty });
  };

  const handleQtyBlur = async () => {
    const val = parseInt(localQty);
    if (!isNaN(val) && val !== item.quantity) {
      await db.items.update(itemId, { quantity: val });
    } else {
      setLocalQty(item.quantity.toString());
    }
  };

  const handleThresholdBlur = async () => {
    const val = parseInt(localThreshold);
    if (!isNaN(val) && val !== item.reorderThreshold) {
      await db.items.update(itemId, { reorderThreshold: val });
    } else {
      setLocalThreshold(item.reorderThreshold.toString());
    }
  };

  const handleBoxSizeBlur = async () => {
    const val = parseInt(localBoxSize);
    if (!isNaN(val) && val !== (item.boxSize || 15)) {
      await db.items.update(itemId, { boxSize: val });
    } else {
      setLocalBoxSize((item.boxSize || 15).toString());
    }
  };

  const confirmDelete = async () => {
    await db.items.delete(itemId);
    toast.success('Record successfully expunged');
    onClose();
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 max-w-[800px] mx-auto w-full pb-16 animate-in fade-in slide-in-from-bottom duration-300">
      
      {/* Header Navigation Row */}
      <div className="flex items-center justify-between border-b border-[#2A2A2A]/60 pb-3">
        <button
          onClick={onClose}
          className="flex items-center gap-2 py-1.5 pr-3 bg-transparent text-[#888] hover:text-[#D4AF37] transition-all duration-300 font-bold uppercase tracking-wider text-[10px] cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-[#D4AF37]" />
          <span>Back to Catalog</span>
        </button>
        
        <div className="flex gap-2">
          <button
            onClick={() => setIsFormOpen(true)}
            className="p-2 sm:p-3 bg-[#14161C] border border-[#2A2A2A] hover:border-[#D4AF37]/50 text-gray-300 hover:text-[#D4AF37] rounded-xl transition-all active:scale-95 cursor-pointer"
            aria-label="Edit Item"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 sm:p-3 bg-[#14161C] border border-[#2A2A2A] hover:border-[#C2410C]/50 text-gray-300 hover:text-[#C2410C] rounded-xl transition-all active:scale-95 cursor-pointer"
            aria-label="Delete Item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero Visual Card Stack */}
      <div className="bg-[#0D0F13] border border-[#2A2A2A] rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#D4AF37]/5 via-transparent to-transparent pointer-events-none"></div>
        
        <div className="flex flex-col sm:flex-row gap-5 sm:gap-8 items-center sm:items-start text-center sm:text-left">
          {/* Picture Hero Container */}
          <div className="w-32 h-40 sm:w-48 sm:h-52 bg-[#14161C] border border-[#2A2A2A] rounded-xl flex items-center justify-center overflow-hidden shadow-inner flex-shrink-0 relative">
            <LazyItemImage itemId={item.id} updatedAt={item.updatedAt} alt={item.brand} className="w-full h-full object-cover" />
            
            <div className="absolute top-2 left-2 flex flex-col gap-1">
               {item.quantity <= item.reorderThreshold && (
                <span className="bg-[#C2410C] text-white text-[8px] font-bold px-2 py-0.5 rounded shadow-lg uppercase tracking-widest flex items-center gap-1 border border-[#C2410C]/50 backdrop-blur-md">
                   Low Stock
                </span>
               )}
            </div>
          </div>

          {/* Item Title & Core Info */}
          <div className="flex-1 flex flex-col justify-center py-2 w-full">
            <div className="space-y-3 relative z-10 w-full">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                <span className="text-[9px] bg-[#1F2127] border border-[#2A2A2A] px-2.5 py-1 rounded text-[#D4AF37] uppercase tracking-widest font-bold font-mono">
                  {item.category || 'Cigarillos'}
                </span>
                <span className="text-[9px] bg-[#14161C] border border-[#2A2A2A] px-2.5 py-1 rounded text-[#888] uppercase tracking-widest font-bold font-mono">
                  {item.packType || 'Single'}
                </span>
              </div>
              
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-[#E5E1DA] leading-tight italic font-bold tracking-wide">{item.brand.toUpperCase()}</h2>
              <p className="text-lg sm:text-2xl text-gray-400 font-semibold tracking-wider font-sans uppercase">{item.flavor}</p>
            </div>
            
            <div className="mt-6 flex flex-wrap gap-2 justify-center sm:justify-start">
               {/* Quick read specs under title for mobile, looks cleaner */}
               <div className="flex flex-col items-center sm:items-start px-4 py-2 border border-[#2A2A2A] bg-[#14161C]/50 rounded-xl">
                 <span className="text-[8px] uppercase tracking-widest text-[#888] font-bold">Retail Price</span>
                 <span className="text-lg font-mono text-[#22C55E] font-semibold">{item.price ? `$${item.price.toFixed(2)}` : 'N/A'}</span>
               </div>
               
               <div className="flex flex-col items-center sm:items-start px-4 py-2 border border-[#2A2A2A] bg-[#14161C]/50 rounded-xl">
                 <span className="text-[8px] uppercase tracking-widest text-[#888] font-bold">UPC Barcode</span>
                 <span className="text-[10px] uppercase font-mono text-gray-300 font-bold mt-1.5">{item.barcode || 'MISSING UPC'}</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Management Section */}
      <div className="bg-[#0D0F13] border border-[#2A2A2A] rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-3.5 sm:p-5 border-b border-[#2A2A2A]/60 bg-[#14161C]/30 flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-[#D4AF37]" />
          <h3 className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-[#D4AF37] font-bold">
            Stock & Inventory Control
          </h3>
        </div>
        
        <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Active Stock Setter */}
          <div className="space-y-4">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#14161C] border border-[#2A2A2A] p-3.5 rounded-xl gap-4 sm:gap-0">
               <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold ml-1">Current Quantity</span>
               <div className="flex gap-2 items-center bg-[#0D0F13] border border-[#2A2A2A] p-1 rounded-lg self-stretch sm:self-auto justify-between sm:justify-start">
                 <button onClick={() => changeQuantity(-1)} className="w-10 h-10 flex items-center justify-center bg-[#1F2127] hover:bg-[#2A2A2A] text-white rounded-md active:scale-95 font-bold transition-all text-xl">-</button>
                 <input 
                   id="qty-input"
                   type="number"
                   value={localQty}
                   onChange={(e) => setLocalQty(e.target.value)}
                   onBlur={handleQtyBlur}
                   onKeyDown={(e) => { if(e.key === 'Enter') { e.currentTarget.blur(); } }}
                   className="w-16 bg-transparent text-xl sm:text-2xl font-mono text-center text-[#E5E1DA] focus:outline-none"
                 />
                 <button onClick={() => changeQuantity(1)} className="w-10 h-10 flex items-center justify-center bg-[#1F2127] hover:bg-[#2A2A2A] text-white rounded-md active:scale-95 font-bold transition-all text-xl">+</button>
               </div>
             </div>

             <div className="grid grid-cols-2 gap-2">
               <button 
                 onClick={() => { setAdjustWizard('box'); setWizardValue((item.boxSize || 15).toString()); }}
                 className="flex flex-col items-center justify-center py-2.5 sm:py-3 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 text-[#D4AF37] rounded-xl transition-all active:scale-95 group"
               >
                 <span className="text-sm sm:text-base font-bold mb-0.5 group-hover:scale-105 transition-transform"><Plus className="w-4 h-4 inline" /> Box</span>
                 <span className="text-[8px] uppercase tracking-widest opacity-80">(Add Full Box)</span>
               </button>
               <button 
                 onClick={() => { setAdjustWizard('custom'); setWizardValue(''); }}
                 className="flex flex-col items-center justify-center py-2.5 sm:py-3 bg-[#14161C] hover:bg-[#1A1C23] border border-[#2A2A2A] text-[#E5E1DA] rounded-xl transition-all active:scale-95 group"
               >
                 <span className="text-sm sm:text-base font-bold mb-0.5 group-hover:scale-105 transition-transform"><Pencil className="w-4 h-4 inline" /> Arbitrary</span>
                 <span className="text-[8px] uppercase tracking-widest opacity-80">(Specific Qty)</span>
               </button>
             </div>
          </div>

          {/* Preferences / Alerts */}
          <div className="space-y-3">
             <div className="flex justify-between items-center bg-[#14161C] border border-[#2A2A2A] p-4 rounded-xl group hover:border-[#D4AF37]/30 transition-all">
               <div className="flex flex-col gap-1">
                 <span className="text-[10px] uppercase tracking-wider text-gray-300 font-bold flex items-center gap-1.5">
                   <AlertCircle className={`w-3.5 h-3.5 ${item.quantity <= item.reorderThreshold ? 'text-[#C2410C]' : 'text-[#D4AF37]'}`} />
                   Low Stock Alert
                 </span>
                 <span className="text-[8px] text-gray-500 uppercase tracking-widest leading-tight pr-2">Triggers depletion warning<br/>on dashboard</span>
               </div>
               <div className="flex items-center gap-1.5 focus-within:ring-1 focus-within:ring-[#D4AF37]/50 rounded-lg p-1 bg-[#0D0F13] border border-[#2A2A2A]">
                 <input 
                   id="thresh-input"
                   type="number"
                   value={localThreshold}
                   onChange={(e) => setLocalThreshold(e.target.value)}
                   onBlur={handleThresholdBlur}
                   onKeyDown={(e) => { if(e.key === 'Enter') { e.currentTarget.blur(); } }}
                   className="w-14 sm:w-16 bg-transparent text-base sm:text-xl font-mono text-center text-[#E5E1DA] focus:outline-none py-1"
                 />
               </div>
             </div>

             <div className="flex justify-between items-center bg-[#14161C] border border-[#2A2A2A] p-4 rounded-xl group hover:border-[#D4AF37]/30 transition-all">
               <div className="flex flex-col gap-1">
                 <span className="text-[10px] uppercase tracking-wider text-gray-300 font-bold flex items-center gap-1.5">
                   <Package className="w-3.5 h-3.5 text-[#D4AF37]" />
                   Box Size Preference
                 </span>
                 <span className="text-[8px] text-gray-500 uppercase tracking-widest leading-tight pr-2">Qty equivalent to 1<br/>master box/carton</span>
               </div>
               <div className="flex items-center gap-1.5 focus-within:ring-1 focus-within:ring-[#D4AF37]/50 rounded-lg p-1 bg-[#0D0F13] border border-[#2A2A2A]">
                 <input 
                   id="box-input"
                   type="number"
                   min="1"
                   value={localBoxSize}
                   onChange={(e) => setLocalBoxSize(e.target.value)}
                   onBlur={handleBoxSizeBlur}
                   onKeyDown={(e) => { if(e.key === 'Enter') { e.currentTarget.blur(); } }}
                   className="w-14 sm:w-16 bg-transparent text-base sm:text-xl font-mono text-center text-[#E5E1DA] focus:outline-none py-1"
                 />
               </div>
             </div>
          </div>
        </div>
      </div>

      {/* Item Performance Flags */}
      <div className="bg-[#0D0F13] border border-[#2A2A2A] rounded-2xl shadow-sm">
        <h3 className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-[#D4AF37] font-bold border-b border-[#2A2A2A]/60 px-4 sm:px-5 py-3.5 bg-[#14161C]/30 flex items-center gap-2 rounded-t-2xl">
          <ShieldAlert className="w-4 h-4" /> Item Performance Flags
        </h3>
        <div className="flex flex-wrap gap-2 p-4 sm:p-5">
          {[
            { id: 'blazing-fast', label: 'Blazing Fast Seller', color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30' },
            { id: 'very-best-selling', label: 'Very Best Selling', color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/30' },
            { id: 'best-selling', label: 'Best Selling', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
            { id: 'steady', label: 'Steady Pace', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30' },
            { id: 'dead-item', label: 'Dead Item', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30' },
          ].map(flag => (
            <button
              key={flag.id}
              onClick={async () => {
                await db.items.update(itemId, { flag: item.flag === flag.id ? null : flag.id });
                toast.success(item.flag === flag.id ? 'Flag removed' : `Flagged as ${flag.label}`);
              }}
              className={`px-3 py-2 rounded-lg text-[10px] sm:text-xs font-bold tracking-wider uppercase transition-all active:scale-95 border ${item.flag === flag.id ? `${flag.bg} ${flag.border} ${flag.color}` : 'bg-[#14161C] border-[#2A2A2A] text-gray-500 hover:border-gray-500 hover:bg-[#1A1C23]'}`}
            >
              {flag.label}
            </button>
          ))}
        </div>
      </div>

      {/* Brand-Wide Settings */}
      <div className="bg-[#0D0F13] border border-[#2A2A2A] rounded-2xl shadow-sm overflow-hidden flex flex-col mt-0">
        <div className="border-b border-[#2A2A2A]/60 px-4 sm:px-5 py-3.5 bg-[#14161C]/20 flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#D4AF37]" />
          <h3 className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-[#D4AF37] font-bold">
            Apply changes to entire {item.brand.toUpperCase()} brand
          </h3>
        </div>
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4">
          <button 
            onClick={() => setBrandSettingState({ type: 'price', value: item.price ? item.price.toString() : '' })}
            className="flex-1 flex gap-3 items-center justify-center py-3.5 bg-[#14161C] border border-[#2A2A2A] hover:border-[#D4AF37]/50 text-[#E5E1DA] rounded-xl transition-all active:scale-95 shadow-sm group font-bold tracking-[0.1em] text-[10px] sm:text-xs uppercase"
          >
            <DollarSign className="w-4 h-4 text-[#22C55E]" />
            Set Default Price
          </button>
          
          <button 
            onClick={() => setBrandSettingState({ type: 'boxSize', value: item.boxSize ? item.boxSize.toString() : '15' })}
            className="flex-1 flex gap-3 items-center justify-center py-3.5 bg-[#14161C] border border-[#2A2A2A] hover:border-[#D4AF37]/50 text-[#E5E1DA] rounded-xl transition-all active:scale-95 shadow-sm group font-bold tracking-[0.1em] text-[10px] sm:text-xs uppercase"
          >
            <Package className="w-4 h-4 text-[#D4AF37]" />
            Set Default Box Size
          </button>
        </div>
      </div>

      {/* Other Flavors Cabin/Gallery */}
      <div className="bg-[#0D0F13]/55 border border-[#2A2A2A]/40 rounded-2xl shadow-sm mt-0 overflow-hidden flex flex-col">
        <div className="border-b border-[#2A2A2A]/60 px-4 sm:px-5 py-3.5 bg-[#14161C]/20 flex justify-between items-center">
          <h3 className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-[#D4AF37] font-bold">
            Other variants of {item.brand.toUpperCase()}
          </h3>
          <span className="text-[8px] font-mono text-[#888] font-bold uppercase tracking-wider bg-[#14161C] border border-[#2A2A2A] px-2 py-0.5 rounded px-2">
            {otherFlavors.length} Item{otherFlavors.length !== 1 && 's'}
          </span>
        </div>

        <div className="p-4 sm:p-5">
          {otherFlavors.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {otherFlavors.map((variant: InventoryItem) => (
                <div 
                  key={variant.id}
                  onClick={() => variant.id && onSelectItem(variant.id)}
                  className="bg-[#0D0F13] border border-[#2A2A2A] hover:border-[#D4AF37]/50 rounded-xl p-2.5 flex gap-3 items-center cursor-pointer transition-all duration-300 hover:bg-[#14161C]/40 active:scale-98 group flex-row"
                >
                  <div className="w-12 h-14 sm:w-10 sm:h-12 bg-[#14161C] border border-[#2A2A2A] rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                    <LazyItemImage itemId={variant.id} updatedAt={variant.updatedAt} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-1 sm:gap-0">
                    <p className="text-sm sm:text-xs font-serif text-[#E5E1DA] font-bold truncate">{variant.flavor}</p>
                    <div className="flex gap-2 items-center">
                      <span className="text-[10px] sm:text-[9px] text-[#A8A8A8] font-mono font-semibold">Qty: {variant.quantity}</span>
                      {variant.quantity <= variant.reorderThreshold && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C2410C] animate-pulse" title="Low Stock"></span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 sm:py-6 text-center bg-[#14161C]/25 border border-dashed border-[#2A2A2A]/30 rounded-xl">
              <p className="text-[10px] sm:text-[9px] uppercase tracking-widest text-[#666] italic">No other variants recorded for this brand.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals Cabin */}
      {isFormOpen && (
        <InventoryForm 
          onClose={() => setIsFormOpen(false)} 
          existingItem={item} 
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[70] bg-[#0A0B0E]/90 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0D0F13] border border-[#2A2A2A] rounded-2xl w-full max-w-sm flex flex-col overflow-hidden shadow-2xl">
            <div className="p-6 text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-[#C2410C] mx-auto animate-bounce" />
              <h3 className="text-xl font-serif text-[#E5E1DA]">Confirm Record Deletion</h3>
              <p className="text-sm text-[#888]">Are you absolutely certain you wish to purge this record? This action will permanently remove {item.brand.toUpperCase()} ({item.flavor}) from inventory.</p>
            </div>
            <div className="flex border-t border-[#2A2A2A]">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-4 text-xs tracking-widest uppercase font-semibold text-[#888] hover:bg-[#14161C] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-4 text-xs tracking-widest uppercase font-bold text-[#C2410C] hover:bg-[#C2410C]/10 border-l border-[#2A2A2A] transition-all cursor-pointer"
              >
                Expunge
              </button>
            </div>
          </div>
        </div>
      )}

      {brandSettingState && (
        <div className="fixed inset-0 z-[70] bg-[#0A0B0E]/90 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0D0F13] border border-[#2A2A2A] rounded-2xl w-full max-w-sm flex flex-col overflow-hidden shadow-2xl">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#14161C] border border-[#2A2A2A] rounded-xl flex items-center justify-center text-[#D4AF37]">
                  {brandSettingState.type === 'price' ? <DollarSign className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-serif text-[#E5E1DA]">Update {item.brand.toUpperCase()}</h3>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">Apply to all associated records</p>
                </div>
              </div>
              
              <div className="space-y-1.5 pt-2">
                <label className="text-xs uppercase tracking-widest font-bold text-gray-400">
                  {brandSettingState.type === 'price' ? 'Default Retail Price' : 'Default Box Size Qty'}
                </label>
                <div className="flex items-center bg-[#14161C] border border-[#2A2A2A] rounded-xl p-2 focus-within:border-[#D4AF37]/50 transition-colors">
                  {brandSettingState.type === 'price' && <span className="text-gray-500 pl-3">$</span>}
                  <input
                    type="number"
                    autoFocus
                    value={brandSettingState.value}
                    onChange={(e) => setBrandSettingState({ ...brandSettingState, value: e.target.value })}
                    className="w-full bg-transparent p-2 text-[#E5E1DA] font-mono text-xl focus:outline-none placeholder-gray-700"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex border-t border-[#2A2A2A]">
              <button 
                onClick={() => setBrandSettingState(null)}
                className="flex-1 py-4 text-xs tracking-widest uppercase font-semibold text-[#888] hover:bg-[#14161C] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  const val = parseFloat(brandSettingState.value);
                  if (isNaN(val) || val <= 0) {
                     toast.error('Please enter a valid positive number');
                     return;
                  }
                  
                  try {
                    const allItems = await db.items.toArray();
                    const matchedItems = allItems.filter(i => i.brand === item.brand);
                    
                    if (brandSettingState.type === 'price') {
                      await Promise.all(matchedItems.map(i => i.id !== undefined && db.items.update(i.id, { price: val })));
                      toast.success(`Updated default price for ${item.brand.toUpperCase()}`);
                    } else {
                      await Promise.all(matchedItems.map(i => i.id !== undefined && db.items.update(i.id, { boxSize: Math.round(val) })));
                      toast.success(`Updated default box size for ${item.brand.toUpperCase()}`);
                    }
                    setBrandSettingState(null);
                  } catch (e) {
                    console.error(e);
                    toast.error('Failed to update brand records');
                  }
                }}
                className="flex-1 py-4 text-xs tracking-widest uppercase font-bold text-[#D4AF37] hover:bg-[#D4AF37]/10 border-l border-[#2A2A2A] transition-all cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
      {adjustWizard && (
        <div className="fixed inset-0 z-[70] bg-[#0A0B0E]/90 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0D0F13] border border-[#2A2A2A] rounded-2xl w-full max-w-sm flex flex-col overflow-hidden shadow-2xl">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#14161C] border border-[#2A2A2A] rounded-xl flex items-center justify-center text-[#D4AF37]">
                  {adjustWizard === 'box' ? <Package className="w-5 h-5" /> : <Pencil className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-serif text-[#E5E1DA]">
                    {adjustWizard === 'box' ? 'Add a Full Box' : 'Adjust Stock'}
                  </h3>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                    {adjustWizard === 'box' ? 'Confirm Box Size Quantity' : 'Enter units to add or subtract'}
                  </p>
                </div>
              </div>
              
              <div className="space-y-1.5 pt-2">
                <label className="text-xs uppercase tracking-widest font-bold text-gray-400">
                  {adjustWizard === 'box' ? 'How many units in a box?' : 'Units'}
                </label>
                <div className="flex items-center bg-[#14161C] border border-[#2A2A2A] rounded-xl p-2 focus-within:border-[#D4AF37]/50 transition-colors">
                  <input
                    type="number"
                    autoFocus
                    value={wizardValue}
                    onChange={(e) => setWizardValue(e.target.value)}
                    className="w-full bg-transparent p-2 text-[#E5E1DA] font-mono text-xl focus:outline-none placeholder-gray-700"
                    placeholder="e.g. 15 or -5"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex border-t border-[#2A2A2A]">
              <button 
                onClick={() => setAdjustWizard(null)}
                className="flex-1 py-4 text-xs tracking-widest uppercase font-semibold text-[#888] hover:bg-[#14161C] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  const val = parseInt(wizardValue);
                  if (isNaN(val)) {
                     toast.error('Please enter a valid number');
                     return;
                  }
                  
                  if (adjustWizard === 'box') {
                    // Updating DB with new box size if it changed
                    if (val !== (item.boxSize || 15)) {
                       await db.items.update(itemId, { boxSize: val, quantity: Math.max(0, item.quantity + val) });
                       toast.success(`Box size updated to ${val} & stock increased.`);
                    } else {
                       await db.items.update(itemId, { quantity: Math.max(0, item.quantity + val) });
                       toast.success(`Stock increased by ${val} items.`);
                    }
                  } else {
                    await db.items.update(itemId, { quantity: Math.max(0, item.quantity + val) });
                    toast.success(val >= 0 ? `Stock increased by ${val}` : `Stock decreased by ${Math.abs(val)}`);
                  }
                  setAdjustWizard(null);
                }}
                className="flex-1 py-4 text-xs tracking-widest uppercase font-bold text-[#D4AF37] hover:bg-[#D4AF37]/10 border-l border-[#2A2A2A] transition-all cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
