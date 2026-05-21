'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Tag, Package, DollarSign, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { db, InventoryItem } from '@/lib/db';
import { toast } from 'sonner';

interface BrandsOverviewModalProps {
  onClose: () => void;
  items: InventoryItem[];
}

export function BrandsOverviewModal({ onClose, items }: BrandsOverviewModalProps) {
  const [updatingBrand, setUpdatingBrand] = useState<string | null>(null);
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState<string>('');

  // Calculate brand stats
  const brandStats = items.reduce((acc, item) => {
    if (!acc[item.brand]) {
      acc[item.brand] = { name: item.brand, flavorCount: 0, totalStock: 0, items: [] };
    }
    acc[item.brand].flavorCount += 1;
    acc[item.brand].totalStock += item.quantity;
    acc[item.brand].items.push(item);
    return acc;
  }, {} as Record<string, { name: string; flavorCount: number; totalStock: number; items: InventoryItem[] }>);

  const statsArray = Object.values(brandStats).sort((a, b) => a.name.localeCompare(b.name));

  const handleUpdatePrice = async () => {
    if (!updatingBrand || !newPrice) return;
    
    const priceVal = parseFloat(newPrice);
    if (isNaN(priceVal) || priceVal < 0) {
      toast.error('Please enter a valid price.');
      return;
    }

    try {
      toast.loading(`Updating price for ${updatingBrand}...`, { id: 'price-update' });
      const itemsToUpdate = items.filter(i => i.brand === updatingBrand);
      
      for (const item of itemsToUpdate) {
        if (item.id) {
          await db.items.update(item.id, { price: priceVal });
        }
      }

      toast.success(`Successfully updated price for ${itemsToUpdate.length} items.`, { id: 'price-update' });
      setUpdatingBrand(null);
      setNewPrice('');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update brand pricing.', { id: 'price-update' });
    }
  };

  const handleUpdateItemStock = async (id: number | undefined, delta: number, currentQty: number) => {
    if (!id) return;
    const newQty = Math.max(0, currentQty + delta);
    await db.items.update(id, { quantity: newQty });
  };

  const handleUpdateItemPriceItem = async (id: number | undefined, newPriceVal: number) => {
    if (!id) return;
    await db.items.update(id, { price: Math.max(0, newPriceVal) });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col pt-safe backdrop-blur-md">
      {/* Header */}
      <div className="flex justify-between items-center px-5 py-4 bg-[#0A0A0A] border-b border-[#222]">
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Tag className="w-5 h-5 text-[#D4AF37]" /> Brands Overview
        </h2>
        <button 
          onClick={onClose}
          className="p-2 bg-[#1A1A1A] rounded-full text-gray-400 hover:text-white transition-colors active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 w-full max-w-3xl mx-auto space-y-4">
        {statsArray.length === 0 ? (
          <div className="text-center py-12 text-gray-500 italic">No brands found in inventory.</div>
        ) : (
          statsArray.map(stat => (
            <div key={stat.name} className="bg-[#111] border border-[#222] rounded-3xl p-5 shadow-sm overflow-hidden text-left w-full transition-all">
              <div 
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                onClick={() => {
                  if (updatingBrand !== stat.name) {
                    setExpandedBrand(expandedBrand === stat.name ? null : stat.name);
                  }
                }}
              >
                <div>
                  <h3 className="text-2xl font-bold text-[#E5E1DA] mb-2">{stat.name}</h3>
                  <div className="flex gap-4">
                    <span className="text-xs uppercase tracking-widest text-gray-500 font-bold flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-[#D4AF37]" /> {stat.flavorCount} Flavors
                    </span>
                    <span className="text-xs uppercase tracking-widest text-gray-500 font-bold flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-emerald-500" /> {stat.totalStock} in Stock
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                  {updatingBrand === stat.name ? (
                    <div className="flex items-center gap-2 bg-[#0A0A0A] p-2 rounded-2xl border border-[#333]">
                      <span className="pl-3 text-gray-400 font-bold">$</span>
                      <input 
                        type="number"
                        step="0.01"
                        min="0"
                        autoFocus
                        placeholder="New Price"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        className="w-24 bg-transparent border-none text-white focus:outline-none py-2"
                      />
                      <button 
                        onClick={handleUpdatePrice}
                        className="bg-[#D4AF37] text-black px-4 py-2 rounded-xl font-bold active:scale-95 transition-all text-sm"
                      >
                        Save
                      </button>
                      <button 
                        onClick={() => setUpdatingBrand(null)}
                        className="bg-[#222] text-white p-2 rounded-xl active:scale-95 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setUpdatingBrand(stat.name);
                        setNewPrice('');
                      }}
                      className="flex justify-center items-center gap-2 border border-[#333] hover:border-[#D4AF37] px-4 py-3 rounded-2xl text-gray-300 font-bold text-sm transition-all active:scale-95"
                    >
                      <DollarSign className="w-4 h-4 text-[#D4AF37]" />
                      Update All Prices
                    </button>
                  )}
                  <button onClick={() => setExpandedBrand(expandedBrand === stat.name ? null : stat.name)} className="p-2 text-gray-400 hover:text-white">
                    {expandedBrand === stat.name ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {expandedBrand === stat.name && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mt-4"
                  >
                    <div className="pt-4 border-t border-[#222] grid grid-cols-1 md:grid-cols-2 gap-3">
                      {stat.items.map(item => (
                        <div key={item.id} className="flex flex-col gap-2 p-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-2xl">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-bold text-white mb-0.5">{item.flavor}</p>
                              <p className="text-xs text-gray-500 font-mono tracking-widest">{item.barcode || 'NO UPC'}</p>
                            </div>
                            <div className="flex items-center gap-1 bg-[#14161C] border border-[#222] rounded-lg px-2 py-1">
                              <span className="text-[#888] text-xs font-bold">$</span>
                              <input 
                                type="number" 
                                value={item.price} 
                                onChange={(e) => handleUpdateItemPriceItem(item.id, parseFloat(e.target.value) || 0)}
                                className="w-12 bg-transparent text-white font-mono text-xs focus:outline-none" 
                                step="0.01" 
                                min="0" 
                              />
                            </div>
                          </div>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Stock</span>
                            <div className="flex items-center gap-3 bg-[#14161C] border border-[#222] rounded-xl px-2 py-1">
                              <button onClick={() => handleUpdateItemStock(item.id, -1, item.quantity)} className="text-gray-400 hover:text-[#D4AF37] px-2 py-1 active:scale-95 text-lg font-medium leading-none">-</button>
                              <span className="text-sm font-mono text-white text-center w-8">{item.quantity}</span>
                              <button onClick={() => handleUpdateItemStock(item.id, 1, item.quantity)} className="text-gray-400 hover:text-[#D4AF37] px-2 py-1 active:scale-95 text-lg font-medium leading-none">+</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
