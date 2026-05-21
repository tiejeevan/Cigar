'use client';

import { useState, useCallback } from 'react';
import { db, useLiveQuery } from '@/lib/db';
import { Search, Plus, Minus, CreditCard, ShoppingCart, Package, ScanBarcode } from 'lucide-react';
import { toast } from 'sonner';
import { BarcodeScanner } from './barcode-scanner';

export function PosSection({ onBarcodeNotFound }: { onBarcodeNotFound?: (barcode: string) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [cart, setCart] = useState<Array<{ id: number; brand: string; flavor: string; qty: number; price: number }>>([]);
  
  const items = useLiveQuery(() => db.items.toArray()) || [];
  
  const filteredItems = items.filter(item => 
    item.brand.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.flavor.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.barcode && item.barcode.includes(searchQuery))
  );

  const handleScanResult = useCallback(async (result: string) => {
    setIsScanning(false);
    // Find if we already have this barcode
    try {
      const existing = await db.items.where('barcode').equals(result).first();
      if (existing) {
        toast.info('Item matched!');
        addToCart(existing);
        setSearchQuery(''); // Clear the input field
      } else {
        toast.error('Barcode not found in inventory.');
        if (onBarcodeNotFound) {
          onBarcodeNotFound(result);
        } else {
          setSearchQuery(result); // Fallback to setting query only if not handled
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [onBarcodeNotFound]);

  const addToCart = async (item: any) => {
    let itemPrice = item.price || 0;
    
    if (itemPrice === 0) {
      const p = window.prompt(`Enter price for ${item.brand} ${item.flavor}:`);
      itemPrice = parseFloat(p || '0') || 0;
      
      if (itemPrice > 0 && item.id) {
        // Automatically save the price for future so it learns
        await db.items.update(item.id, { price: itemPrice });
      }
    }
    
    setCart(prev => {
      const existing = prev.find(p => p.id === item.id);
      if (existing) {
        return prev.map(p => p.id === item.id ? { ...p, qty: p.qty + 1 } : p);
      }
      return [...prev, { id: item.id!, brand: item.brand, flavor: item.flavor, qty: 1, price: itemPrice }];
    });
  };

  const updateCartQty = (id: number, delta: number) => {
    setCart(prev => prev.map(p => {
      if (p.id === id) {
        const newQty = Math.max(0, p.qty + delta);
        return { ...p, qty: newQty };
      }
      return p;
    }).filter(p => p.qty > 0));
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    try {
      // Deduct from inventory
      for (const cartItem of cart) {
        if (cartItem.id > 0) {
          const dbItem = await db.items.get(cartItem.id);
          if (dbItem) {
            await db.items.update(cartItem.id, { quantity: Math.max(0, dbItem.quantity - cartItem.qty) });
          }
        }
      }
      setCart([]);
      toast.success('Sale completed successfully');
    } catch (e) {
      toast.error('Transaction failed');
    }
  };

  return (
    <>
      <div className="flex flex-col md:flex-row gap-8 h-[75vh]">
        {/* Product Selection */}
        <div className="flex-1 flex flex-col gap-6 bg-[#0D0F13] border border-[#2A2A2A] rounded-2xl p-6 shadow-md overflow-hidden">
          <div>
            <h2 className="text-3xl font-serif text-[#E5E1DA]">Point of Sale</h2>
            <p className="text-[10px] uppercase tracking-widest text-[#888] mt-1">Quick checkout & register</p>
          </div>

          <div className="relative flex gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
              <input 
                type="text" 
                placeholder="Scan barcode or search products..." 
                value={searchQuery}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && searchQuery) {
                    // Check if it's an exact barcode match
                    const existing = await db.items.where('barcode').equals(searchQuery).first();
                    if (existing) {
                      toast.info('Item matched!');
                      addToCart(existing);
                      setSearchQuery('');
                    } else if (/^[0-9]+$/.test(searchQuery)) {
                       // Only assume it's a barcode if it's all digits
                       handleScanResult(searchQuery);
                    }
                  }
                }}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#14161C] border border-[#2A2A2A] rounded-xl text-base text-[#E5E1DA] py-4 pl-12 pr-4 focus:outline-none focus:border-[#D4AF37] transition-colors font-mono shadow-inner"
              />
            </div>
            <button
              onClick={() => setIsScanning(true)}
              className="bg-[#1F2127] border border-[#2A2A2A] text-[#D4AF37] hover:border-[#D4AF37] transition-all rounded-xl px-5 flex items-center justify-center active:scale-95 shadow-sm"
              title="Scan Barcode"
            >
              <ScanBarcode className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 lg:grid-cols-3 gap-4">

          {filteredItems.map(item => (
            <button 
              key={item.id}
              onClick={() => addToCart(item)}
              className="bg-[#14161C] border border-[#2A2A2A] rounded-xl p-4 text-left hover:border-[#D4AF37]/50 focus:border-[#D4AF37] transition-all group flex flex-col active:scale-95 shadow-sm"
            >
              <div className="h-20 w-full bg-[#0A0B0E] rounded-lg mb-3 flex items-center justify-center overflow-hidden border border-[#2A2A2A]">
                {item.image ? (
                  <img src={item.image} alt={item.brand} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <Package className="w-8 h-8 text-[#2A2A2A]" />
                )}
              </div>
              <p className="text-[10px] text-[#D4AF37] font-semibold uppercase tracking-widest mb-1 truncate w-full">
                {item.category || 'Cigarillos'} &bull; {item.flavor}
              </p>
              <h3 className="text-lg font-serif text-[#E5E1DA] leading-tight mb-2 truncate w-full">{item.brand}</h3>
              <div className="mt-auto flex justify-between items-center w-full">
                <span className="text-sm font-mono text-[#22C55E] font-bold">${item.price?.toFixed(2) || '0.00'}</span>
                <span className="text-[10px] text-[#888] uppercase">Qty: {item.quantity}</span>
              </div>
            </button>
          ))}
          
          {searchQuery && filteredItems.length === 0 && (
            <button 
              onClick={() => {
                const p = window.prompt(`Enter price for new item "${searchQuery}":`);
                const itemPrice = parseFloat(p || '0') || 0;
                if (itemPrice > 0) {
                  // We add a temporary unique negative ID for custom items
                  setCart(prev => [...prev, { id: -Date.now(), brand: searchQuery, flavor: 'Custom', qty: 1, price: itemPrice }]);
                }
              }}
              className="col-span-full border-2 border-dashed border-[#D4AF37]/30 bg-[#D4AF37]/5 rounded-xl p-6 text-center hover:bg-[#D4AF37]/10 transition-colors flex flex-col items-center justify-center gap-2"
            >
              <Plus className="w-8 h-8 text-[#D4AF37]" />
              <p className="text-sm font-serif text-[#D4AF37]">Add Custom Item</p>
              <p className="text-[10px] uppercase tracking-widest text-[#888]">"{searchQuery}"</p>
            </button>
          )}
        </div>
      </div>

      {/* Cart/Register */}
      <div className="w-full md:w-96 flex flex-col bg-[#0D0F13] border border-[#2A2A2A] rounded-2xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-[#2A2A2A] bg-[#14161C] flex items-center justify-between">
          <h3 className="text-lg font-serif text-[#E5E1DA] flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[#D4AF37]" />
            Current Order
          </h3>
          <span className="bg-[#2A2A2A] text-[#E5E1DA] text-xs font-mono px-2 py-1 rounded-md">{cart.length} items</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[#444] space-y-4">
              <ShoppingCart className="w-12 h-12 opacity-20" />
              <p className="text-xs uppercase tracking-widest font-semibold">Cart is empty</p>
            </div>
          ) : (
            cart.map(cartItem => (
              <div key={cartItem.id} className="flex flex-col gap-2 p-3 bg-[#14161C] border border-[#2A2A2A] rounded-xl shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-serif text-[#E5E1DA] leading-tight">{cartItem.brand}</p>
                    <p className="text-[10px] text-[#D4AF37] uppercase tracking-widest">{cartItem.flavor}</p>
                  </div>
                  <p className="text-sm font-mono text-[#22C55E] font-bold">${(cartItem.price * cartItem.qty).toFixed(2)}</p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center bg-[#0D0F13] border border-[#2A2A2A] rounded-lg overflow-hidden shadow-inner">
                    <button onClick={() => updateCartQty(cartItem.id, -1)} className="px-3 py-1.5 text-[#888] hover:text-[#D4AF37] hover:bg-[#1F2127] transition-colors"><Minus className="w-3.5 h-3.5" /></button>
                    <span className="text-sm font-mono px-3 text-[#E5E1DA] min-w-[2rem] text-center">{cartItem.qty}</span>
                    <button onClick={() => updateCartQty(cartItem.id, 1)} className="px-3 py-1.5 text-[#888] hover:text-[#D4AF37] hover:bg-[#1F2127] transition-colors"><Plus className="w-3.5 h-3.5" /></button>
                  </div>
                  <span className="text-[10px] text-[#888] font-mono">${cartItem.price.toFixed(2)} ea</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-[#14161C] border-t border-[#2A2A2A]">
          <div className="flex justify-between items-center mb-6">
            <span className="text-sm uppercase tracking-widest text-[#888] font-semibold">Total Due</span>
            <span className="text-3xl font-mono text-[#E5E1DA] font-bold">${total.toFixed(2)}</span>
          </div>
          <button 
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-[#D4AF37] text-black py-4 rounded-xl font-bold uppercase tracking-widest text-sm shadow-lg hover:bg-[#E5C25A] active:bg-[#B3932E] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CreditCard className="w-5 h-5" />
            Charge ${total.toFixed(2)}
          </button>
        </div>
        </div>
      </div>
      
      {isScanning && (
        <BarcodeScanner 
          onResult={handleScanResult} 
          onClose={() => setIsScanning(false)} 
        />
      )}
    </>
  );
}
