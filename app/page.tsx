'use client';

import { useState, useEffect, Fragment } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, InventoryItem } from '@/lib/db';
import { InventoryForm } from '@/components/inventory-form';
import { OverviewChart } from '@/components/overview-chart';
import { Plus, Package, Pencil, Trash2, PlusCircle, MinusCircle, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function Home() {
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const items = useLiveQuery(() => db.items.toArray()) || [];

  const totalStock = items.reduce((sum, item) => sum + item.quantity, 0);
  const lowStockItems = items.filter(item => item.quantity <= item.reorderThreshold);

  const filteredItems = items.filter(item => 
    item.brand.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.flavor.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => b.updatedAt - a.updatedAt);

  const groupedFilteredItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.brand]) {
      acc[item.brand] = [];
    }
    acc[item.brand].push(item);
    return acc;
  }, {} as Record<string, InventoryItem[]>);

  const brandTotals = items.reduce((acc, item) => {
    acc[item.brand] = (acc[item.brand] || 0) + item.quantity;
    return acc;
  }, {} as Record<string, number>);

  const sortedBrands = Object.entries(brandTotals).sort((a, b) => b[1] - a[1]);

  const handleUpdateQuantity = async (id: number, delta: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const newQuantity = Math.max(0, item.quantity + delta);
    try {
      await db.items.update(id, { quantity: newQuantity, updatedAt: Date.now() });
    } catch (e) {
      toast.error('Failed to update quantity');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await db.items.delete(id);
        toast.success('Item deleted');
      } catch (e) {
        toast.error('Failed to delete item');
      }
    }
  };

  const openEditForm = (item: InventoryItem) => {
    setEditingItem(item);
    setIsAddFormOpen(true);
  };

  if (!mounted) {
    return null; // prevent hydration mismatch from dexie
  }

  const now = new Date();
  const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

  return (
    <>
      <header className="h-20 border-b border-[#2A2A2A] bg-[#0D0F13] flex items-center justify-between px-6 lg:px-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex w-10 h-10 border border-[#D4AF37] items-center justify-center rotate-45">
            <span className="-rotate-45 font-serif text-[#D4AF37] font-bold text-xl">C</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif tracking-widest text-[#D4AF37]">CIGARILLO ARCHIVE</h1>
        </div>
        <div className="flex items-center gap-6 lg:gap-12">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#888] mb-1">Total Inventory</p>
            <p className="text-lg lg:text-xl font-light">{totalStock} Units</p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#888] mb-1">Low Stock Alerts</p>
            <p className="text-lg lg:text-xl font-light text-[#C2410C]">
              {lowStockItems.length < 10 ? `0${lowStockItems.length}` : lowStockItems.length} SKUs
            </p>
          </div>
          <button 
            onClick={() => { setEditingItem(undefined); setIsAddFormOpen(true); }}
            className="px-4 lg:px-6 py-2 border border-[#D4AF37] text-[#D4AF37] text-xs tracking-widest uppercase hover:bg-[#D4AF37] hover:text-black transition-colors whitespace-nowrap"
          >
            Add New
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden flex-col md:flex-row">
        {/* Sidebar Analysis */}
        <aside className="w-full md:w-80 border-r border-[#2A2A2A] p-6 lg:p-8 flex flex-col gap-8 lg:gap-10 bg-[#0D0F13] shrink-0 overflow-y-auto md:overflow-y-hidden md:min-h-0">
          <section className="flex-shrink-0">
            <h3 className="text-[10px] uppercase tracking-[0.3em] text-[#D4AF37] mb-6 font-bold">Brand Distribution</h3>
            <div className="space-y-4">
              {sortedBrands.slice(0, 4).map(([brand, count], idx) => {
                const percent = totalStock > 0 ? (count / totalStock) * 100 : 0;
                // Vary opacity based on idx for a cool effect like the design
                let opacity = '1';
                if (idx === 1) opacity = '0.7';
                if (idx === 2) opacity = '0.4';
                if (idx > 2) opacity = '0.2';
                
                return (
                  <div key={brand} className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>{brand}</span>
                      <span className="text-[#888]">{percent.toFixed(0)}%</span>
                    </div>
                    <div className="h-1 bg-[#1F2127] rounded-full overflow-hidden">
                      <div className="h-full bg-[#D4AF37] transition-all duration-500" style={{ width: `${percent}%`, opacity }}></div>
                    </div>
                  </div>
                );
              })}
              {sortedBrands.length === 0 && <p className="text-xs text-[#888]">No data yet.</p>}
            </div>
            {sortedBrands.length > 0 && (
              <div className="mt-8">
                <OverviewChart items={items} />
              </div>
            )}
          </section>

          <section className="flex-1 flex flex-col min-h-[200px]">
            <h3 className="text-[10px] uppercase tracking-[0.3em] text-[#D4AF37] mb-4 font-bold">Procurement List</h3>
            <div className="flex-1 bg-[#14161C] border border-[#2A2A2A] rounded p-4 space-y-4 overflow-y-auto">
              {lowStockItems.length === 0 ? (
                <p className="text-xs text-[#888]">Stock levels optimal. No reorders needed.</p>
              ) : (
                lowStockItems.sort((a,b) => a.quantity - b.quantity).map(item => (
                  <div key={item.id} className="pb-3 border-b border-[#2A2A2A] last:border-0 last:pb-0">
                    <p className="text-xs font-semibold">{item.brand} {item.flavor}</p>
                    <p className={`text-[10px] ${item.quantity === 0 ? 'text-[#C2410C]' : 'text-[#A16207]'}`}>
                      {item.quantity === 0 ? 'Out of Stock' : `Critically Low: ${item.quantity} units left`}
                    </p>
                    <p className="text-[10px] text-[#888] mt-1">Threshold: {item.reorderThreshold} Units</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>

        {/* Main Inventory Grid */}
        <section className="flex-1 p-6 lg:p-10 bg-[#0A0B0E] overflow-y-auto content-start flex flex-col">
          <div className="mb-6 flex justify-between items-end">
            <div className="w-full max-w-sm relative flex-shrink-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" />
              <input
                type="text"
                placeholder="Search brand or flavor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-[#14161C] border border-[#2A2A2A] rounded text-sm w-full focus:outline-none focus:border-[#D4AF37] text-[#E5E1DA] transition-colors"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8 content-start h-max flex-1">
            {Object.keys(groupedFilteredItems).length === 0 && (
              <div className="col-span-1 xl:col-span-2 text-center py-20 text-[#888]">
                {items.length === 0 ? 'Archive is empty. Click "Add New" to begin.' : 'No items match your search.'}
              </div>
            )}
            
            {Object.entries(groupedFilteredItems).map(([brand, brandItems]) => (
              <Fragment key={brand}>
                <div className="col-span-1 xl:col-span-2 flex items-center gap-4 mb-2 mt-4 first:mt-0">
                  <h2 className="font-serif text-xl italic">{brand} Collection</h2>
                  <div className="h-[1px] flex-1 bg-[#2D2D2D]"></div>
                </div>
                {brandItems.map(item => {
                  const isLowStock = item.quantity <= item.reorderThreshold;
                  return (
                    <div key={item.id} className={`bg-[#14161C] border ${isLowStock ? 'border-l-4 border-l-[#C2410C] border-[#2A2A2A]' : 'border-[#2A2A2A]'} p-4 lg:p-5 flex gap-4 hover:border-[#D4AF37] transition-all group`}>
                      <div className="w-20 h-20 lg:w-24 lg:h-24 bg-[#1F2127] flex-shrink-0 flex flex-col items-center justify-center text-[#444] border border-[#2A2A2A] relative overflow-hidden group-hover:border-[#D4AF37]/50 transition-colors">
                        {item.image ? (
                          <img src={item.image} alt={item.flavor} className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" />
                        ) : (
                          <Package className="w-8 h-8 opacity-20" />
                        )}
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                             <div className="flex items-center gap-2">
                               <p className="text-[10px] text-[#D4AF37] uppercase tracking-widest mb-1">{item.flavor}</p>
                               <span className="text-[8px] border border-[#2A2A2A] px-1.5 py-0.5 rounded-sm text-[#888] uppercase mb-1">{item.packType || 'Single'}</span>
                             </div>
                             <div className="flex gap-2">
                               <button onClick={() => openEditForm(item)} className="text-[#888] hover:text-[#D4AF37] transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                               <button onClick={() => item.id && handleDelete(item.id)} className="text-[#888] hover:text-[#C2410C] transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                             </div>
                          </div>
                          <h4 className="text-base lg:text-lg font-serif mb-2 leading-tight">{item.brand} {item.flavor}</h4>
                        </div>
                        <div className="flex justify-between items-end">
                          <div className="flex items-center gap-3">
                             <button onClick={() => item.id && handleUpdateQuantity(item.id, -1)} className="text-[#555] hover:text-[#E5E1DA] transition-colors"><MinusCircle className="w-5 h-5" /></button>
                             <p className={`text-xl lg:text-2xl font-light ${isLowStock ? 'text-[#C2410C]' : ''} min-w-[2ch] text-center`}>
                               {item.quantity.toString().padStart(2, '0')}
                             </p>
                             <button onClick={() => item.id && handleUpdateQuantity(item.id, 1)} className="text-[#555] hover:text-[#E5E1DA] transition-colors"><PlusCircle className="w-5 h-5" /></button>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase text-[#888]">Target: {item.reorderThreshold}</p>
                            {isLowStock ? (
                              <p className="text-[10px] text-[#C2410C] font-bold uppercase tracking-tight">Restock Needed</p>
                            ) : (
                              <p className="text-[10px] text-green-500 font-bold tracking-widest mt-0.5">OPTIMAL</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </Fragment>
            ))}
          </div>
        </section>
      </main>

      {/* Status Footer */}
      <footer className="h-8 bg-[#0D0F13] border-t border-[#2A2A2A] px-6 lg:px-10 flex items-center justify-between shrink-0">
        <div className="flex gap-6 items-center">
          <p className="text-[9px] uppercase tracking-widest text-[#555] hidden sm:block">DB Status: <span className="text-green-800 font-bold">Synced IndexedDB</span></p>
          <p className="text-[9px] uppercase tracking-widest text-[#555]">Last Scan: {timeString}</p>
        </div>
        <p className="text-[9px] uppercase tracking-[0.2em] text-[#D4AF37] hidden sm:block">Inventory Management System V2.4</p>
      </footer>

      {isAddFormOpen && (
        <InventoryForm 
          onClose={() => setIsAddFormOpen(false)} 
          existingItem={editingItem}
        />
      )}
    </>
  );
}
