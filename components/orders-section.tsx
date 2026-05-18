'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, OrderItem } from '@/lib/db';
import { ShoppingBag, Search, Plus, Trash2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export function OrdersSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newFlavor, setNewFlavor] = useState('');
  const [newPackType, setNewPackType] = useState('Box');
  const [newQty, setNewQty] = useState('1');
  
  const orders = useLiveQuery(() => db.orders.toArray()) || [];
  const inventory = useLiveQuery(() => db.items.toArray()) || [];
  
  const filteredOrders = orders.filter(o => 
    o.brand.toLowerCase().includes(searchQuery.toLowerCase()) || 
    o.flavor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Auto-completion suggestions
  const brandSuggestions = Array.from(new Set(inventory.filter(i => i.brand.toLowerCase().includes(newBrand.toLowerCase())).map(i => i.brand)));
  const flavorSuggestions = Array.from(new Set(inventory.filter(i => newBrand ? i.brand === newBrand : true).filter(i => i.flavor.toLowerCase().includes(newFlavor.toLowerCase())).map(i => i.flavor)));

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrand || !newFlavor) return;

    // See if exists in inventory
    const existing = inventory.find(i => i.brand === newBrand && i.flavor === newFlavor && i.packType === newPackType);

    const order: OrderItem = {
      inventoryId: existing?.id,
      brand: newBrand,
      flavor: newFlavor,
      packType: newPackType,
      quantity: parseInt(newQty) || 1,
      status: 'pending',
      createdAt: Date.now()
    };

    await db.orders.add(order);
    toast.success('Added to order list');
    
    setNewBrand('');
    setNewFlavor('');
    setNewQty('1');
  };

  const handleDelete = async (id: number) => {
    await db.orders.delete(id);
  };

  const markOrdered = async (id: number) => {
    await db.orders.update(id, { status: 'ordered' });
    toast.info('Marked as ordered');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Order List */}
      <div className="flex-1 flex flex-col gap-6">
        <div className="flex justify-between items-end mb-2">
          <div>
            <h2 className="text-3xl font-serif text-[#E5E1DA]">Purchasing</h2>
            <p className="text-[10px] uppercase tracking-widest text-[#888] mt-1">Manage vendor orders</p>
          </div>
        </div>

        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
          <input 
            type="text" 
            placeholder="Search orders..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0D0F13] border border-[#2A2A2A] rounded-xl text-base text-[#E5E1DA] py-4 pl-12 pr-4 focus:outline-none focus:border-[#D4AF37] transition-colors font-mono shadow-sm"
          />
        </div>

        <div className="bg-[#0D0F13] border border-[#2A2A2A] rounded-2xl shadow-md overflow-hidden">
          {filteredOrders.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center justify-center space-y-4">
              <ShoppingBag className="w-12 h-12 text-[#2A2A2A]" />
              <p className="text-[10px] uppercase tracking-widest text-[#888]">No active orders.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#2A2A2A]">
              {filteredOrders.map(order => (
                <div key={order.id} className="p-5 flex items-center justify-between hover:bg-[#14161C] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-12 rounded-full ${order.status === 'pending' ? 'bg-[#D4AF37]' : 'bg-[#22C55E]'}`}></div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] bg-[#14161C] border border-[#2A2A2A] px-2 py-0.5 rounded text-[#888] uppercase tracking-wider">{order.packType}</span>
                        <span className={`text-[10px] uppercase tracking-widest font-bold ${order.status === 'pending' ? 'text-[#D4AF37]' : 'text-[#22C55E]'}`}>{order.status}</span>
                      </div>
                      <h4 className="text-lg font-serif text-[#E5E1DA]">{order.brand} <span className="text-[#888] font-sans text-sm">({order.flavor})</span></h4>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-widest text-[#888] mb-1">Qty</p>
                      <p className="text-xl font-mono text-[#E5E1DA]">{order.quantity}</p>
                    </div>
                    
                    <div className="flex gap-2 border-l border-[#2A2A2A] pl-6">
                      {order.status === 'pending' && (
                        <button onClick={() => markOrdered(order.id!)} className="p-3 text-[#22C55E] bg-[#22C55E]/10 hover:bg-[#22C55E]/20 rounded-xl transition-colors" title="Mark Ordered">
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(order.id!)} className="p-3 text-[#C2410C] bg-[#C2410C]/10 hover:bg-[#C2410C]/20 rounded-xl transition-colors" title="Delete Order">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add New Order Draft */}
      <div className="w-full lg:w-96 flex flex-col gap-6">
        <div className="bg-[#0D0F13] border border-[#2A2A2A] rounded-2xl p-6 shadow-md">
          <h3 className="text-lg font-serif text-[#D4AF37] mb-6 flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Draft Requirement
          </h3>
          
          <form onSubmit={handleCreateOrder} className="space-y-5">
            <div className="space-y-2 relative">
              <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-semibold">Brand / Vendor</label>
              <input
                type="text"
                value={newBrand}
                onChange={(e) => setNewBrand(e.target.value)}
                className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-4 text-base focus:outline-none focus:border-[#D4AF37] transition-colors rounded-xl shadow-inner"
                placeholder="e.g. Swisher"
                required
              />
              {newBrand && brandSuggestions.length > 0 && !brandSuggestions.includes(newBrand) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#1A1C23] border border-[#2A2A2A] rounded-xl overflow-hidden z-10 shadow-xl">
                  {brandSuggestions.map(s => (
                    <button key={s} type="button" onClick={() => setNewBrand(s)} className="w-full text-left p-3 text-[#E5E1DA] hover:bg-[#2A2A2A] transition-colors text-sm">{s}</button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 relative">
              <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-semibold">Flavor Variant</label>
              <input
                type="text"
                value={newFlavor}
                onChange={(e) => setNewFlavor(e.target.value)}
                className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-4 text-base focus:outline-none focus:border-[#D4AF37] transition-colors rounded-xl shadow-inner"
                placeholder="e.g. Grape"
                required
              />
              {newFlavor && flavorSuggestions.length > 0 && !flavorSuggestions.includes(newFlavor) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#1A1C23] border border-[#2A2A2A] rounded-xl overflow-hidden z-10 shadow-xl">
                  {flavorSuggestions.map(s => (
                    <button key={s} type="button" onClick={() => setNewFlavor(s)} className="w-full text-left p-3 text-[#E5E1DA] hover:bg-[#2A2A2A] transition-colors text-sm">{s}</button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-semibold">Format</label>
                <select
                  value={newPackType}
                  onChange={(e) => setNewPackType(e.target.value)}
                  className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-4 text-base focus:outline-none focus:border-[#D4AF37] transition-colors rounded-xl shadow-inner appearance-none cursor-pointer"
                >
                  <option value="Single">Single</option>
                  <option value="Box">Box</option>
                  <option value="Carton">Carton</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-semibold">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={newQty}
                  onChange={(e) => setNewQty(e.target.value)}
                  className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-4 text-base focus:outline-none focus:border-[#D4AF37] transition-colors rounded-xl shadow-inner text-center font-mono"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full mt-4 bg-[#D4AF37] text-black py-4 rounded-xl font-bold uppercase tracking-widest text-sm shadow-lg hover:bg-[#E5C25A] active:bg-[#B3932E] transition-all"
            >
              Add to Orders
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
