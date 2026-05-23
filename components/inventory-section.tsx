'use client';

import { useState, useEffect } from 'react';
import { db, InventoryItem } from '@/lib/db';
import { InventoryForm } from '@/components/inventory-form';
import { BulkInventoryForm } from '@/components/bulk-inventory-form';
import { BrandsOverviewModal } from '@/components/brands-overview-modal';
import { OverviewChart } from '@/components/overview-chart';
import { Plus, Package, AlertTriangle, Archive, Search, Filter, Pencil, Trash2, ArrowUpDown, AlertCircle, Layers, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { LazyItemImage } from './lazy-item-image';

interface InventorySectionProps {
  items: InventoryItem[];
  pendingBarcode?: string | null;
  clearPendingBarcode?: () => void;
  onSelectItem: (id: number) => void;
}

export function InventorySection({ items, pendingBarcode, clearPendingBarcode, onSelectItem }: InventorySectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkFormOpen, setIsBulkFormOpen] = useState(false);
  const [isBrandsOverviewOpen, setIsBrandsOverviewOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBrand, setFilterBrand] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>({});

  const toggleBrandExpand = (brand: string) => {
    setExpandedBrands(prev => ({
      ...prev,
      [brand]: !prev[brand]
    }));
  };

  useEffect(() => {
    if (pendingBarcode) {
      setEditingItem(undefined);
      setIsFormOpen(true);
    }
  }, [pendingBarcode]);
  
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

  // Group filtered items by brand
  const itemsByBrand: Record<string, InventoryItem[]> = {};
  filteredItems.forEach(item => {
    if (!itemsByBrand[item.brand]) {
      itemsByBrand[item.brand] = [];
    }
    itemsByBrand[item.brand].push(item);
  });
  const sortedBrands = Object.keys(itemsByBrand).sort();

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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 mb-4">
        <div>
          <h2 className="text-3xl font-serif text-[#E5E1DA]">Inventory Management</h2>
          <p className="text-[10px] uppercase tracking-widest text-[#888] mt-1">Manage stock and records</p>
        </div>
        <div className="grid grid-cols-2 lg:flex lg:w-auto gap-2 sm:gap-3 w-full">
          <button 
            type="button"
            onClick={() => setIsBrandsOverviewOpen(true)}
            className="flex items-center justify-center gap-2 bg-[#14161C] border border-[#2A2A2A] hover:border-[#D4AF37]/50 hover:bg-[#1A1C23] text-[#D4AF37] px-4 py-3 sm:py-4 transition-all rounded-xl font-bold uppercase tracking-widest text-[10px] sm:text-xs shadow-md active:scale-95 cursor-pointer"
          >
            <Tag className="w-4 h-4" />
            Brands
          </button>
          <button 
            type="button"
            onClick={() => setIsBulkFormOpen(true)}
            className="flex items-center justify-center gap-2 bg-[#14161C] border border-[#2A2A2A] hover:border-[#D4AF37]/50 hover:bg-[#1A1C23] text-[#D4AF37] px-4 py-3 sm:py-4 transition-all rounded-xl font-bold uppercase tracking-widest text-[10px] sm:text-xs shadow-md active:scale-95 cursor-pointer"
          >
            <Layers className="w-4 h-4" />
            Bulk Add
          </button>
          <button 
            type="button"
            onClick={openNewForm}
            className="col-span-2 lg:col-span-1 flex items-center justify-center gap-2 bg-[#D4AF37] text-black px-5 py-3 sm:py-4 hover:bg-[#E5C25A] active:bg-[#B3932E] transition-all rounded-xl font-bold uppercase tracking-widest text-[10px] sm:text-xs shadow-lg active:scale-95 cursor-pointer focus:outline-none"
          >
            <Plus className="w-4 h-4" />
            Add Single
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-3 md:gap-6">
        <div className="bg-[#0D0F13] border border-[#2A2A2A] rounded-xl sm:rounded-2xl p-3.5 sm:p-6 relative overflow-hidden group shadow-md">
          <div className="absolute top-0 right-0 p-2 sm:p-4 opacity-5 sm:opacity-10 group-hover:opacity-20 transition-opacity">
            <Archive className="w-8 h-8 sm:w-16 sm:h-16 text-[#D4AF37]" />
          </div>
          <p className="text-[8px] sm:text-[10px] uppercase tracking-wider sm:tracking-widest text-[#888] mb-1 sm:mb-2 line-clamp-1">Total Arsenal</p>
          <p className="text-xl sm:text-4xl font-serif text-[#E5E1DA]">{totalItems}</p>
        </div>
        
        <div className="bg-[#0D0F13] border border-[#2A2A2A] rounded-xl sm:rounded-2xl p-3.5 sm:p-6 relative overflow-hidden group shadow-md">
          <div className="absolute top-0 right-0 p-2 sm:p-4 opacity-5 sm:opacity-10 group-hover:opacity-20 transition-opacity">
            <Package className="w-8 h-8 sm:w-16 sm:h-16 text-[#D4AF37]" />
          </div>
          <p className="text-[8px] sm:text-[10px] uppercase tracking-wider sm:tracking-widest text-[#888] mb-1 sm:mb-2 line-clamp-1">Unique SKUs</p>
          <p className="text-xl sm:text-4xl font-serif text-[#E5E1DA]">{items.length}</p>
        </div>

        <div className={`bg-[#0D0F13] border border-[#2A2A2A] rounded-xl sm:rounded-2xl p-3.5 sm:p-6 relative overflow-hidden group shadow-md transition-all ${lowStockItems.length > 0 ? 'border-b-2 border-b-[#C2410C] sm:border-b-[#C2410C]' : ''}`}>
          <div className="absolute top-0 right-0 p-2 sm:p-4 opacity-5 sm:opacity-10 group-hover:opacity-20 transition-opacity">
            <AlertTriangle className={`w-8 h-8 sm:w-16 sm:h-16 ${lowStockItems.length > 0 ? 'text-[#C2410C]' : 'text-[#D4AF37]'}`} />
          </div>
          <p className="text-[8px] sm:text-[10px] uppercase tracking-wider sm:tracking-widest text-[#888] mb-1 sm:mb-2 line-clamp-1">Low Stock</p>
          <p className={`text-xl sm:text-4xl font-serif ${lowStockItems.length > 0 ? 'text-[#C2410C]' : 'text-[#E5E1DA]'}`}>
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

          <div className="space-y-8">
            {sortedBrands.map(brand => {
              const brandItems = itemsByBrand[brand];
              const isExpanded = expandedBrands[brand] || filterBrand !== 'all';
              const itemsToRender = isExpanded ? brandItems : brandItems.slice(0, 2);

              return (
                <div key={brand} className="bg-[#0A0C0F]/45 border border-[#2A2A2A]/40 rounded-2xl p-3.5 sm:p-6 shadow-sm animate-in fade-in duration-300">
                  {/* Brand Header */}
                  <div className="flex justify-between items-center border-b border-[#2A2A2A] pb-2 sm:pb-3 mb-3.5 sm:mb-5">
                    <div 
                      onClick={() => brandItems[0]?.id && onSelectItem(brandItems[0].id)}
                      className="flex items-center gap-3 cursor-pointer group/brand hover:opacity-85 active:scale-98 transition-all"
                      title={`View ${brand.toUpperCase()} detail page`}
                    >
                      <h3 className="text-xl font-serif text-[#D4AF37] italic font-bold tracking-wide group-hover/brand:underline">{brand.toUpperCase()}</h3>
                      <span className="text-[9px] bg-[#14161C] border border-[#2A2A2A] px-2.5 py-0.5 rounded-full text-gray-400 font-mono font-bold tracking-wider group-hover/brand:border-[#D4AF37]/50">
                        {brandItems.length} {brandItems.length === 1 ? 'SKU' : 'SKUs'}
                      </span>
                    </div>
                  </div>

                  {/* Items Grid for this Brand */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {itemsToRender.map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => item.id && onSelectItem(item.id)}
                        className="bg-[#0D0F13] border border-[#2A2A2A] rounded-2xl p-3 sm:p-4.5 group hover:border-[#D4AF37]/50 transition-all cursor-pointer hover:bg-[#14161C]/25 flex flex-col gap-3 shadow-sm active:scale-[0.99] relative overflow-hidden"
                      >
                        {/* Image Container */}
                        <div className="w-full h-28 sm:h-36 flex-shrink-0 bg-[#14161C] border border-[#2A2A2A] rounded-xl flex items-center justify-center overflow-hidden">
                          <LazyItemImage itemId={item.id} updatedAt={item.updatedAt} alt={item.brand} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                        </div>
                        
                        {/* Info & Metadata */}
                        <div className="flex-1 flex flex-col justify-between gap-2.5">
                          <div>
                            <div className="flex justify-between items-start gap-1 mb-1.5">
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="text-[8px] bg-[#1F2127] border border-[#2A2A2A] px-1.5 py-0.5 rounded text-[#D4AF37] uppercase tracking-wider font-bold">{item.category || 'Cigarillos'}</span>
                                <span className="text-[8px] bg-[#14161C] border border-[#2A2A2A] px-1.5 py-0.5 rounded text-[#888] uppercase tracking-wider font-bold">{item.packType || 'Single'}</span>
                              </div>
                              <div className="flex gap-0.5 bg-[#14161C] rounded-lg p-0.5 z-10">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); openEditForm(item); }} 
                                  className="p-1.5 text-[#888] hover:text-[#D4AF37] hover:bg-[#2A2A2A] rounded-md transition-all active:scale-95 cursor-pointer" 
                                  aria-label="Edit item"
                                >
                                  <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); item.id && handleDeleteRequest(item.id); }} 
                                  className="p-1.5 text-[#888] hover:text-[#C2410C] hover:bg-[#2A2A2A] rounded-md transition-all active:scale-95 cursor-pointer" 
                                  aria-label="Delete item"
                                >
                                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </button>
                              </div>
                            </div>
                            
                            <h3 className="text-sm sm:text-lg font-serif text-[#E5E1DA] leading-tight font-bold italic line-clamp-1">{item.brand.toUpperCase()}</h3>
                            <p className="text-[9px] sm:text-xs text-[#888] font-bold uppercase tracking-wider line-clamp-1 mt-0.5">{item.flavor}</p>
                            
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                              {item.barcode && <p className="text-[8px] sm:text-[9px] text-[#555] font-mono tracking-wider truncate max-w-[80px]">UPC: {item.barcode}</p>}
                              {item.price && <p className="text-[9px] sm:text-[10px] text-[#22C55E] font-mono tracking-wider font-bold">${item.price.toFixed(2)}</p>}
                            </div>
                          </div>
                          
                          {/* Stepper Control */}
                          <div className="flex flex-col gap-2 mt-1">
                            <div className="flex items-center justify-between bg-[#14161C] border border-[#2A2A2A] rounded-xl overflow-hidden shadow-inner w-full z-10">
                              <button 
                                onClick={(e) => { e.stopPropagation(); item.id && changeQuantity(item.id, -1, item.quantity); }}
                                className="px-3 py-1.5 sm:px-4 sm:py-2 text-[#888] hover:text-[#D4AF37] hover:bg-[#1F2127] active:bg-[#2A2A2A] transition-all text-base sm:text-xl font-medium leading-none select-none h-full cursor-pointer"
                              >-</button>
                              <span className="text-xs sm:text-base font-mono px-1.5 text-[#E5E1DA] font-semibold">{item.quantity}</span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); item.id && changeQuantity(item.id, 1, item.quantity); }}
                                className="px-3 py-1.5 sm:px-4 sm:py-2 text-[#888] hover:text-[#D4AF37] hover:bg-[#1F2127] active:bg-[#2A2A2A] transition-all text-base sm:text-xl font-medium leading-none select-none h-full cursor-pointer"
                              >+</button>
                            </div>
                            
                            {item.quantity <= item.reorderThreshold && (
                              <span className="text-[8px] sm:text-[9px] px-2 py-0.5 bg-[#C2410C]/10 border border-[#C2410C]/30 rounded-md uppercase tracking-wider font-bold text-[#C2410C] flex items-center justify-center gap-1 self-start">
                                <span className="w-1 h-1 rounded-full bg-[#C2410C] animate-pulse"></span>
                                Reorder
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* View All / Show Less button */}
                  {brandItems.length > 2 && filterBrand === 'all' && (
                    <div className="flex justify-center mt-5">
                      <button
                        onClick={() => toggleBrandExpand(brand)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#14161C] border border-[#2A2A2A] hover:border-[#D4AF37]/50 hover:bg-[#1A1C23] text-xs text-gray-300 hover:text-white rounded-xl transition-all duration-300 active:scale-95 font-semibold font-mono tracking-wider shadow-sm cursor-pointer"
                      >
                        {isExpanded ? (
                          <>
                            <span>Show Less</span>
                            <span className="text-[9px] text-[#D4AF37]">▲</span>
                          </>
                        ) : (
                          <>
                            <span>View All ({brandItems.length} items)</span>
                            <span className="text-[9px] text-[#D4AF37]">▼</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {sortedBrands.length === 0 && (
              <div className="py-16 text-center border border-dashed border-[#2A2A2A] rounded-2xl bg-[#0D0F13]">
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
              <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                {lowStockItems.length > 0 ? (
                  lowStockItems.map(item => (
                    <div key={`low-${item.id}`} className="flex justify-between items-center text-sm p-2 bg-[#14161C] border border-[#2A2A2A] rounded-xl">
                      <div className="flex flex-col">
                        <span className="text-[#E5E1DA] font-serif">{item.brand.toUpperCase()} <span className="text-[#888] text-xs font-sans">({item.flavor})</span></span>
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

            {/* Missing Barcodes Section */}
            <div className="mt-8 pt-6 border-t border-[#2A2A2A]">
              <h3 className="text-[10px] uppercase tracking-widest text-[#888] mb-4 flex items-center gap-2 text-yellow-500">
                <AlertTriangle className="w-3 h-3" />
                Missing SKUs / Barcodes
              </h3>
              <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                {items.filter(i => !i.barcode).length > 0 ? (
                  items.filter(i => !i.barcode).map(item => (
                    <div key={`noupc-${item.id}`} className="flex justify-between items-center text-sm p-2 bg-[#14161C] border border-[#2A2A2A] rounded-xl">
                      <div className="flex flex-col">
                        <span className="text-[#E5E1DA] font-serif">{item.brand.toUpperCase()} <span className="text-[#888] text-xs font-sans">({item.flavor})</span></span>
                        <span className="text-yellow-500 font-mono text-[10px] mt-1">MISSING UPC</span>
                      </div>
                      <button 
                        onClick={() => openEditForm(item)}
                        className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 hover:bg-yellow-500/20 px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-widest font-bold transition-colors"
                      >
                        Update
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#444] italic">All active items have SKUs.</p>
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

      {isBrandsOverviewOpen && (
        <BrandsOverviewModal 
          onClose={() => setIsBrandsOverviewOpen(false)}
          items={items}
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
