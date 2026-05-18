'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, InventoryItem } from '@/lib/db';
import { InventoryForm } from '@/components/inventory-form';
import { OverviewChart } from '@/components/overview-chart';
import { Plus, Package, AlertTriangle, Archive, Search, Filter, Pencil, Trash2, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';

export default function Home() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBrand, setFilterBrand] = useState<string>('all');
  
  const items = useLiveQuery(() => db.items.toArray()) || [];
  
  const filteredItems = items.filter(item => {
    const matchesSearch = item.brand.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.flavor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBrand = filterBrand === 'all' || item.brand === filterBrand;
    return matchesSearch && matchesBrand;
  });

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const lowStockItems = items.filter(item => item.quantity <= item.reorderThreshold);
  const uniqueBrands = Array.from(new Set(items.map(i => i.brand)));

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you certain you wish to delete this record?')) {
      await db.items.delete(id);
      toast.success('Record expunged');
    }
  };

  const openEditForm = (item: InventoryItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const openNewForm = () => {
    setEditingItem(undefined);
    setIsFormOpen(true);
  };

  const changeQuantity = async (id: number, delta: number, currentQty: number) => {
    const newQty = Math.max(0, currentQty + delta);
    await db.items.update(id, { quantity: newQty });
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto flex flex-col pt-12 md:pt-20">
      <header className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-serif text-[#D4AF37] italic tracking-tight mb-2">Cigaar Archive</h1>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#888]">Inventory Management System v1.0</p>
        </div>
        <button 
          onClick={openNewForm}
          className="w-full md:w-auto flex items-center justify-center gap-3 bg-[#D4AF37] text-black px-8 py-4 hover:bg-[#E5C25A] active:bg-[#B3932E] transition-all duration-300 font-bold uppercase tracking-widest text-xs md:text-sm rounded-xl shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Log New Entry
        </button>
      </header>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-[#0D0F13] border border-[#2A2A2A] rounded-2xl p-6 relative overflow-hidden group shadow-md">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Archive className="w-16 h-16 text-[#D4AF37]" />
          </div>
          <p className="text-[10px] uppercase tracking-widest text-[#888] mb-2">Total Arsenal</p>
          <p className="text-4xl font-serif text-[#E5E1DA]">{totalItems}</p>
        </div>
        
        <div className="bg-[#0D0F13] border border-[#2A2A2A] rounded-2xl p-6 relative overflow-hidden group shadow-md">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Package className="w-16 h-16 text-[#D4AF37]" />
          </div>
          <p className="text-[10px] uppercase tracking-widest text-[#888] mb-2">Unique SKUs</p>
          <p className="text-4xl font-serif text-[#E5E1DA]">{items.length}</p>
        </div>

        <div className={`bg-[#0D0F13] border border-[#2A2A2A] rounded-2xl p-6 relative overflow-hidden group shadow-md ${lowStockItems.length > 0 ? 'border-b-[#C2410C]' : ''}`}>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <AlertTriangle className={`w-16 h-16 ${lowStockItems.length > 0 ? 'text-[#C2410C]' : 'text-[#D4AF37]'}`} />
          </div>
          <p className="text-[10px] uppercase tracking-widest text-[#888] mb-2">Low Stock Alerts</p>
          <p className={`text-4xl font-serif ${lowStockItems.length > 0 ? 'text-[#C2410C]' : 'text-[#E5E1DA]'}`}>
            {lowStockItems.length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
        
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center bg-[#0D0F13] border border-[#2A2A2A] rounded-2xl p-2 px-4 shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="w-5 h-5 absolute left-2 top-1/2 -translate-y-1/2 text-[#666]" />
              <input 
                type="text" 
                placeholder="Search archive..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none text-base text-[#E5E1DA] py-3 pl-10 pr-4 focus:outline-none placeholder:text-[#666] font-mono"
              />
            </div>
            <div className="h-8 w-px bg-[#2A2A2A] hidden sm:block"></div>
            <div className="flex items-center gap-3 px-2 py-2 sm:py-0 w-full sm:w-auto">
              <Filter className="w-5 h-5 text-[#666]" />
              <select 
                value={filterBrand}
                onChange={(e) => setFilterBrand(e.target.value)}
                className="bg-transparent border-none text-[#E5E1DA] text-base py-2 focus:outline-none appearance-none cursor-pointer w-full text-center sm:text-left"
              >
                <option value="all">All Brands</option>
                {uniqueBrands.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems.map(item => (
              <div key={item.id} className="bg-[#0D0F13] border border-[#2A2A2A] rounded-2xl p-5 group hover:border-[#D4AF37]/50 transition-colors flex gap-4 shadow-sm">
                {/* Image Placeholder or Actual Image */}
                <div className="w-24 h-28 flex-shrink-0 bg-[#14161C] border border-[#2A2A2A] rounded-xl flex items-center justify-center overflow-hidden">
                  {item.image ? (
                    <img src={item.image} alt={item.brand} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    <Package className="w-10 h-10 text-[#2A2A2A]" />
                  )}
                </div>
                
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-[#D4AF37] font-semibold uppercase tracking-widest">{item.flavor}</p>
                        <span className="text-[9px] bg-[#14161C] border border-[#2A2A2A] px-2 py-1 rounded-md text-[#888] uppercase tracking-wider">{item.packType || 'Single'}</span>
                      </div>
                      <div className="flex gap-1 bg-[#14161C] rounded-lg p-1">
                        <button onClick={() => openEditForm(item)} className="p-2 text-[#888] hover:text-[#D4AF37] hover:bg-[#2A2A2A] rounded-md transition-all active:scale-95"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => item.id && handleDelete(item.id)} className="p-2 text-[#888] hover:text-[#C2410C] hover:bg-[#2A2A2A] rounded-md transition-all active:scale-95"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <h3 className="text-2xl font-serif text-[#E5E1DA] leading-tight mb-1">{item.brand}</h3>
                    {item.barcode && <p className="text-[10px] text-[#666] font-mono tracking-widest mt-1">SKU: {item.barcode}</p>}
                  </div>
                  
                  <div className="flex justify-between items-end mt-4">
                    <div className="flex items-center bg-[#14161C] border border-[#2A2A2A] rounded-xl overflow-hidden shadow-inner">
                      <button 
                        onClick={() => item.id && changeQuantity(item.id, -1, item.quantity)}
                        className="px-5 py-3 text-[#888] hover:text-[#D4AF37] hover:bg-[#1F2127] active:bg-[#2A2A2A] transition-all text-xl font-medium leading-none"
                      >-</button>
                      <span className="text-lg font-mono px-4 text-[#E5E1DA] min-w-[3.5rem] text-center">{item.quantity}</span>
                      <button 
                        onClick={() => item.id && changeQuantity(item.id, 1, item.quantity)}
                        className="px-5 py-3 text-[#888] hover:text-[#D4AF37] hover:bg-[#1F2127] active:bg-[#2A2A2A] transition-all text-xl font-medium leading-none"
                      >+</button>
                    </div>
                    
                    {item.quantity <= item.reorderThreshold && (
                      <span className="text-[10px] px-2 py-1 bg-[#C2410C]/10 border border-[#C2410C]/30 rounded-md uppercase tracking-widest text-[#C2410C] flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#C2410C] animate-pulse"></span>
                        Reorder
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {filteredItems.length === 0 && (
              <div className="col-span-full py-16 text-center border border-dashed border-[#2A2A2A] rounded-2xl">
                <p className="text-[10px] uppercase tracking-widest text-[#888]">No records found matching criteria.</p>
              </div>
            )}
          </div>
        </div>

        {/* Analytics Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-[#0D0F13] border border-[#2A2A2A] rounded-2xl p-6 sticky top-8 shadow-md">
            <h3 className="text-[10px] uppercase tracking-widest text-[#888] mb-6 flex items-center gap-2">
              <ArrowUpDown className="w-3 h-3" />
              Volume Distribution
            </h3>
            
            <OverviewChart items={items} />

            <div className="mt-8 pt-6 border-t border-[#2A2A2A]">
              <h3 className="text-[10px] uppercase tracking-widest text-[#888] mb-4">Critical Depletions</h3>
              <div className="space-y-3">
                {lowStockItems.length > 0 ? (
                  lowStockItems.map(item => (
                    <div key={`low-${item.id}`} className="flex justify-between items-center text-sm">
                      <span className="text-[#E5E1DA] font-serif">{item.brand} <span className="text-[#888] text-xs font-sans">({item.flavor})</span></span>
                      <span className="text-[#C2410C] font-mono">{item.quantity}/{item.reorderThreshold}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#444] italic">All stock levels optimal.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isFormOpen && <InventoryForm onClose={() => setIsFormOpen(false)} existingItem={editingItem} />}

      <footer className="mt-20 pt-8 border-t border-[#2A2A2A] text-center">
         <p className="text-[9px] uppercase tracking-[0.4em] text-[#444]">Confidential & Proprietary</p>
      </footer>
    </div>
  );
}
