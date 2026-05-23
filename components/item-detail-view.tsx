'use client';

import { useState } from 'react';
import { db, InventoryItem } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Pencil, Trash2, ShieldAlert, Barcode, Calendar, DollarSign, Package, AlertCircle } from 'lucide-react';
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

  // Reactively query this specific item from IndexedDB
  const item = useLiveQuery(() => db.items.get(itemId), [itemId]);

  // Reactively query all items from IndexedDB
  const allItems = useLiveQuery(() => db.items.toArray(), []);

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

  const confirmDelete = async () => {
    await db.items.delete(itemId);
    toast.success('Record successfully expunged');
    onClose();
  };

  return (
    <div className="flex flex-col gap-4 max-w-[800px] mx-auto w-full pb-16 animate-in fade-in slide-in-from-bottom duration-300">
      
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
      <div className="bg-[#0D0F13] border border-[#2A2A2A] rounded-2xl p-3.5 sm:p-6 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#D4AF37]/5 via-transparent to-transparent pointer-events-none"></div>
        
        <div className="flex gap-4 sm:gap-6">
          {/* Picture Hero Container */}
          <div className="w-24 h-28 sm:w-48 sm:h-52 bg-[#14161C] border border-[#2A2A2A] rounded-xl flex items-center justify-center overflow-hidden shadow-inner flex-shrink-0">
            <LazyItemImage itemId={item.id} updatedAt={item.updatedAt} alt={item.brand} className="w-full h-full object-cover" />
          </div>

          {/* Item Title & Core Info */}
          <div className="flex-1 flex flex-col justify-between py-0.5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[8px] sm:text-[9px] bg-[#1F2127] border border-[#2A2A2A] px-2 py-0.5 rounded text-[#D4AF37] uppercase tracking-widest font-bold font-mono">
                  {item.category || 'Cigarillos'}
                </span>
                <span className="text-[8px] sm:text-[9px] bg-[#14161C] border border-[#2A2A2A] px-2 py-0.5 rounded text-[#888] uppercase tracking-widest font-bold font-mono">
                  {item.packType || 'Single'}
                </span>
              </div>
              
              <h2 className="text-xl sm:text-3xl font-serif text-[#E5E1DA] leading-tight italic font-bold tracking-wide line-clamp-1">{item.brand.toUpperCase()}</h2>
              <p className="text-sm sm:text-lg text-gray-400 font-semibold tracking-wider font-sans uppercase line-clamp-1">{item.flavor}</p>
            </div>

            {/* Stepper adjustment for tablet/desktop inline */}
            <div className="hidden sm:block mt-4 space-y-1.5">
              <span className="block text-[9px] uppercase tracking-widest text-[#888] font-bold">Quantity</span>
              <div className="flex items-center justify-between bg-[#14161C] border border-[#2A2A2A] rounded-xl overflow-hidden shadow-inner p-1 w-44">
                <button onClick={() => changeQuantity(-1)} className="px-3.5 py-1.5 text-[#888] hover:text-[#D4AF37] hover:bg-[#1F2127] active:bg-[#2A2A2A] transition-all text-xl font-medium cursor-pointer">-</button>
                <span className="text-base font-mono px-2 text-[#E5E1DA] font-semibold">{item.quantity}</span>
                <button onClick={() => changeQuantity(1)} className="px-3.5 py-1.5 text-[#888] hover:text-[#D4AF37] hover:bg-[#1F2127] active:bg-[#2A2A2A] transition-all text-xl font-medium cursor-pointer">+</button>
              </div>
            </div>
          </div>
        </div>

        {/* Stepper adjustment block for mobile view (stacked below side-by-side header) */}
        <div className="block sm:hidden mt-3.5 pt-3.5 border-t border-[#2A2A2A]/40 space-y-1.5">
          <span className="block text-[8px] uppercase tracking-widest text-[#888] font-bold">Inventory Quantity</span>
          <div className="flex items-center justify-between bg-[#14161C] border border-[#2A2A2A] rounded-xl overflow-hidden shadow-inner p-1 w-full animate-in fade-in slide-in-from-bottom duration-300">
            <button 
              onClick={() => changeQuantity(-1)}
              className="px-5 py-2 text-[#888] hover:text-[#D4AF37] hover:bg-[#1F2127] active:bg-[#2A2A2A] transition-all text-xl font-semibold leading-none select-none cursor-pointer"
            >-</button>
            <span className="text-lg font-mono px-3 text-[#E5E1DA] font-bold">{item.quantity}</span>
            <button 
              onClick={() => changeQuantity(1)}
              className="px-5 py-2 text-[#888] hover:text-[#D4AF37] hover:bg-[#1F2127] active:bg-[#2A2A2A] transition-all text-xl font-semibold leading-none select-none cursor-pointer"
            >+</button>
          </div>
        </div>
      </div>

      {/* Grid Specs Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Spec Card Price */}
        <div className="bg-[#0D0F13] border border-[#2A2A2A] p-3 sm:p-4 rounded-xl sm:rounded-2xl flex flex-col justify-between shadow-sm min-h-[68px] sm:min-h-[90px]">
          <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-[#888] font-bold flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-[#22C55E]" />
            Price
          </span>
          <p className="text-lg sm:text-2xl font-mono text-[#22C55E] mt-1 font-semibold">
            {item.price ? `$${item.price.toFixed(2)}` : 'N/A'}
          </p>
        </div>

        {/* Spec Card Reorder */}
        <div className="bg-[#0D0F13] border border-[#2A2A2A] p-3 sm:p-4 rounded-xl sm:rounded-2xl flex flex-col justify-between shadow-sm min-h-[68px] sm:min-h-[90px]">
          <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-[#888] font-bold flex items-center gap-1">
            <Package className="w-3 h-3 text-[#D4AF37]" />
            Threshold
          </span>
          <p className="text-lg sm:text-2xl font-mono text-[#E5E1DA] mt-1 font-semibold">
            {item.reorderThreshold}
          </p>
        </div>

        {/* Spec Card Status */}
        <div className="bg-[#0D0F13] border border-[#2A2A2A] p-3 sm:p-4 rounded-xl sm:rounded-2xl flex flex-col justify-between shadow-sm min-h-[68px] sm:min-h-[90px]">
          <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-[#888] font-bold flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-[#D4AF37]" />
            Status
          </span>
          <div className="mt-1 flex items-center">
            {item.quantity <= item.reorderThreshold ? (
              <span className="text-[7px] sm:text-[9px] px-2 py-0.5 bg-[#C2410C]/10 border border-[#C2410C]/30 rounded-md uppercase tracking-wider text-[#C2410C] font-bold flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-[#C2410C] animate-pulse"></span>
                Reorder
              </span>
            ) : (
              <span className="text-[7px] sm:text-[9px] px-2 py-0.5 bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-md uppercase tracking-wider text-[#22C55E] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]"></span>
                Optimal
              </span>
            )}
          </div>
        </div>

        {/* Spec Card Barcode */}
        <div className="bg-[#0D0F13] border border-[#2A2A2A] p-3 sm:p-4 rounded-xl sm:rounded-2xl flex flex-col justify-between shadow-sm min-h-[68px] sm:min-h-[90px] col-span-2 sm:col-span-1">
          <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-[#888] font-bold flex items-center gap-1">
            <Barcode className="w-3 h-3 text-[#888]" />
            UPC Barcode
          </span>
          <p className="text-[10px] sm:text-xs font-mono text-gray-400 mt-1 font-bold truncate tracking-widest uppercase">
            {item.barcode || 'NO UPC SKU'}
          </p>
        </div>
      </div>

      {/* Other Flavors Cabin/Gallery */}
      <div className="bg-[#0D0F13]/55 border border-[#2A2A2A]/40 rounded-2xl p-4 sm:p-6 shadow-sm mt-0">
        <div className="border-b border-[#2A2A2A]/60 pb-2 mb-3 flex justify-between items-center">
          <h3 className="text-[9px] sm:text-xs uppercase tracking-[0.25em] text-[#D4AF37] font-bold">
            Other Flavors of {item.brand.toUpperCase()}
          </h3>
          <span className="text-[8px] font-mono text-[#888] font-bold uppercase tracking-wider">
            {otherFlavors.length} variant{otherFlavors.length !== 1 && 's'}
          </span>
        </div>

        {otherFlavors.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {otherFlavors.map((variant: InventoryItem) => (
              <div 
                key={variant.id}
                onClick={() => variant.id && onSelectItem(variant.id)}
                className="bg-[#0D0F13] border border-[#2A2A2A] hover:border-[#D4AF37]/50 rounded-xl p-2 flex gap-2.5 items-center cursor-pointer transition-all duration-300 hover:bg-[#14161C]/30 active:scale-98 group"
              >
                <div className="w-10 h-12 bg-[#14161C] border border-[#2A2A2A] rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                  <LazyItemImage itemId={variant.id} updatedAt={variant.updatedAt} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-serif text-[#E5E1DA] font-bold truncate">{variant.flavor}</p>
                  <p className="text-[9px] text-[#888] font-mono mt-0.5 font-semibold">Qty: {variant.quantity}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center bg-[#14161C]/25 border border-dashed border-[#2A2A2A]/30 rounded-xl">
            <p className="text-[9px] uppercase tracking-widest text-[#666] italic">No other variants recorded.</p>
          </div>
        )}
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
    </div>
  );
}
