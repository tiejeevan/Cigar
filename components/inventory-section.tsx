'use client';

import { useState, useEffect } from 'react';
import { db, InventoryItem, useLiveQuery } from '@/lib/db';
import { InventoryForm } from '@/components/inventory-form';
import { BulkInventoryForm } from '@/components/bulk-inventory-form';
import { OverviewChart } from '@/components/overview-chart';
import { Plus, Package, AlertTriangle, Archive, Search, Filter, Pencil, Trash2, ArrowUpDown, AlertCircle, Layers } from 'lucide-react';
import { toast } from 'sonner';

export function InventorySection({ pendingBarcode, clearPendingBarcode }: { pendingBarcode?: string | null, clearPendingBarcode?: () => void }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkFormOpen, setIsBulkFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBrand, setFilterBrand] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  useEffect(() => {
    if (pendingBarcode) {
      setEditingItem(undefined);
      setIsFormOpen(true);
    }
  }, [pendingBarcode]);
  
  const items = useLiveQuery(() => db.items.toArray()) || [];
  
  const filteredItems = items.filter(item => {
    const matchesSearch = item.brand.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.flavor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBrand = filterBrand === 'all' || item.brand === filterBrand;
    const matchesCategory = filterCategory === 'all' || (item.category || 'Cigarillos') === filterCategory;
    return matchesSearch && matchesBrand && matchesCategory;
  });

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const lowStockItems = items.filter(item => item.quantity <= item.reorderThreshold);
  const uniqueBrands = Array.from(new Set(items.map(i => i.brand)));
  const uniqueCategories = Array.from(new Set(items.map(i => i.category || 'Cigarillos')));

  const handleDeleteRequest = (id: number) => {
    setItemToDelete(id);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      await db.items.delete(itemToDelete);
      toast.success('Record expunged');
      setItemToDelete(null);
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-4">
        <div>
          <h2 className="text-3xl font-serif text-[#E5E1DA]">Inventory Management</h2>
          <p className="text-[10px] uppercase tracking-widest text-[#888] mt-1">Manage stock and records</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button 
            type="button"
            onClick={() => setIsBulkFormOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-[#14161C] border border-[#2A2A2A] hover:border-[#D4AF37]/50 hover:bg-[#1A1C23] text-[#D4AF37] px-4 py-3 transition-all rounded-xl font-bold uppercase tracking-widest text-[10px] sm:text-xs shadow-md active:scale-95 cursor-pointer"
          >
            <Layers className="w-4 h-4" />
            Bulk Add Brand
          </button>
          <button 
            type="button"
            onClick={openNewForm}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-[#D4AF37] text-black px-5 py-3 hover:bg-[#E5C25A] active:bg-[#B3932E] transition-all rounded-xl font-bold uppercase tracking-widest text-[10px] sm:text-xs shadow-lg active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Single
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
            <div className="flex flex-col sm:flex-row items-center gap-3 px-2 py-2 sm:py-0 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-[#666]" />
                <select 
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="bg-transparent border-none text-[#E5E1DA] text-sm py-2 focus:outline-none appearance-none cursor-pointer w-full text-center sm:text-left"
                >
                  <option value="all">All Categories</option>
                  {uniqueCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="h-4 w-px bg-[#2A2A2A] hidden sm:block"></div>
              <select 
                value={filterBrand}
                onChange={(e) => setFilterBrand(e.target.value)}
                className="bg-transparent border-none text-[#E5E1DA] text-sm py-2 focus:outline-none appearance-none cursor-pointer w-full text-center sm:text-left"
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
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[9px] bg-[#1F2127] border border-[#2A2A2A] px-2 py-1 rounded-md text-[#D4AF37] uppercase tracking-wider">{item.category || 'Cigarillos'}</span>
                        <p className="text-xs text-[#888] font-semibold uppercase tracking-widest">{item.flavor}</p>
                        <span className="text-[9px] bg-[#14161C] border border-[#2A2A2A] px-2 py-1 rounded-md text-[#888] uppercase tracking-wider">{item.packType || 'Single'}</span>
                      </div>
                      <div className="flex gap-1 bg-[#14161C] rounded-lg p-1">
                        <button onClick={() => openEditForm(item)} className="p-2 text-[#888] hover:text-[#D4AF37] hover:bg-[#2A2A2A] rounded-md transition-all active:scale-95"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => item.id && handleDeleteRequest(item.id)} className="p-2 text-[#888] hover:text-[#C2410C] hover:bg-[#2A2A2A] rounded-md transition-all active:scale-95"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <h3 className="text-2xl font-serif text-[#E5E1DA] leading-tight mb-1">{item.brand}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {item.barcode && <p className="text-[10px] text-[#666] font-mono tracking-widest">SKU: {item.barcode}</p>}
                      {item.price && <p className="text-[10px] text-[#22C55E] font-mono tracking-widest">${item.price.toFixed(2)}</p>}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-end mt-4">
                    <div className="flex items-center bg-[#14161C] border border-[#2A2A2A] rounded-xl overflow-hidden shadow-inner">
                      <button 
                        onClick={() => item.id && changeQuantity(item.id, -1, item.quantity)}
                        className="px-4 py-2 text-[#888] hover:text-[#D4AF37] hover:bg-[#1F2127] active:bg-[#2A2A2A] transition-all text-xl font-medium leading-none"
                      >-</button>
                      <span className="text-lg font-mono px-3 text-[#E5E1DA] min-w-[3rem] text-center">{item.quantity}</span>
                      <button 
                        onClick={() => item.id && changeQuantity(item.id, 1, item.quantity)}
                        className="px-4 py-2 text-[#888] hover:text-[#D4AF37] hover:bg-[#1F2127] active:bg-[#2A2A2A] transition-all text-xl font-medium leading-none"
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
                    <div key={`low-${item.id}`} className="flex justify-between items-center text-sm p-2 bg-[#14161C] border border-[#2A2A2A] rounded-xl">
                      <div className="flex flex-col">
                        <span className="text-[#E5E1DA] font-serif">{item.brand} <span className="text-[#888] text-xs font-sans">({item.flavor})</span></span>
                        <span className="text-[#C2410C] font-mono text-[10px] mt-1">Stock: {item.quantity}/{item.reorderThreshold}</span>
                      </div>
                      <button 
                        onClick={async () => {
                          await db.orders.add({
                            inventoryId: item.id,
                            brand: item.brand,
                            flavor: item.flavor,
                            category: item.category || 'Cigarillos',
                            packType: item.packType,
                            quantity: 5,
                            status: 'pending',
                            createdAt: Date.now()
                          });
                          toast.success('Queued for purchasing');
                        }}
                        className="bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 hover:bg-[#D4AF37]/20 px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-widest font-bold transition-colors"
                      >
                        Order
                      </button>
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

      {isFormOpen && (
        <InventoryForm 
          onClose={() => {
            setIsFormOpen(false);
            if (clearPendingBarcode) clearPendingBarcode();
          }} 
          existingItem={editingItem} 
          initialBarcode={pendingBarcode || undefined}
        />
      )}

      {isBulkFormOpen && (
        <BulkInventoryForm 
          onClose={() => setIsBulkFormOpen(false)} 
        />
      )}

      {itemToDelete !== null && (
        <div className="fixed inset-0 z-[70] bg-[#0A0B0E]/90 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0D0F13] border border-[#2A2A2A] rounded-2xl w-full max-w-sm flex flex-col overflow-hidden shadow-2xl">
            <div className="p-6 text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-[#C2410C] mx-auto" />
              <h3 className="text-xl font-serif text-[#E5E1DA]">Confirm Deletion</h3>
              <p className="text-sm text-[#888]">Are you certain you wish to delete this record? This action cannot be undone.</p>
            </div>
            <div className="flex border-t border-[#2A2A2A]">
              <button 
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-4 text-xs tracking-widest uppercase font-semibold text-[#888] hover:bg-[#14161C] transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-4 text-xs tracking-widest uppercase font-bold text-[#C2410C] hover:bg-[#C2410C]/10 border-l border-[#2A2A2A] transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
