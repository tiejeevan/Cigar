'use client';

import { useState } from 'react';
import { InventorySection } from '@/components/inventory-section';
import { PosSection } from '@/components/pos-section';
import { OrdersSection } from '@/components/orders-section';
import { Package, ShoppingCart, ShoppingBag } from 'lucide-react';

export default function Home() {
  const [currentView, setCurrentView] = useState<'pos' | 'inventory' | 'orders'>('pos');

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0B0E]">
      <div className="p-4 md:p-8 max-w-[1400px] mx-auto w-full flex flex-col pt-8 md:pt-12 flex-1">
        
        <header className="mb-10 flex border-b border-[#2A2A2A] pb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-serif text-[#D4AF37] italic tracking-tight mb-2">Cigaar Archive</h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#888]">Unified Retail System</p>
          </div>
        </header>

        {/* Unified Navigation Bar */}
        <div className="flex bg-[#14161C] border border-[#2A2A2A] rounded-2xl p-2 mb-10 w-full max-w-2xl mx-auto shadow-md">
          <button
            onClick={() => setCurrentView('pos')}
            className={`flex-1 flex items-center justify-center gap-3 py-4 text-sm tracking-widest uppercase transition-all duration-300 rounded-xl font-semibold ${currentView === 'pos' ? 'bg-[#2A2A2A] text-[#D4AF37] shadow-lg scale-[1.02]' : 'text-[#888] hover:text-[#E5E1DA] hover:bg-[#1A1C23]'}`}
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="hidden sm:inline">Register</span>
            <span className="sm:hidden">POS</span>
          </button>
          
          <button
            onClick={() => setCurrentView('inventory')}
            className={`flex-1 flex items-center justify-center gap-3 py-4 text-sm tracking-widest uppercase transition-all duration-300 rounded-xl font-semibold ${currentView === 'inventory' ? 'bg-[#2A2A2A] text-[#D4AF37] shadow-lg scale-[1.02]' : 'text-[#888] hover:text-[#E5E1DA] hover:bg-[#1A1C23]'}`}
          >
            <Package className="w-5 h-5" />
            <span className="hidden sm:inline">Inventory</span>
            <span className="sm:hidden">Inv</span>
          </button>
          
          <button
            onClick={() => setCurrentView('orders')}
            className={`flex-1 flex items-center justify-center gap-3 py-4 text-sm tracking-widest uppercase transition-all duration-300 rounded-xl font-semibold ${currentView === 'orders' ? 'bg-[#2A2A2A] text-[#D4AF37] shadow-lg scale-[1.02]' : 'text-[#888] hover:text-[#E5E1DA] hover:bg-[#1A1C23]'}`}
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="hidden sm:inline">Purchasing</span>
            <span className="sm:hidden">Order</span>
          </button>
        </div>

        {/* Main Content Area */}
        <main className="flex-1">
          {currentView === 'pos' && <PosSection />}
          {currentView === 'inventory' && <InventorySection />}
          {currentView === 'orders' && <OrdersSection />}
        </main>

        <footer className="mt-20 pt-8 border-t border-[#2A2A2A] text-center">
           <p className="text-[9px] uppercase tracking-[0.4em] text-[#444]">Confidential & Proprietary</p>
        </footer>
      </div>
    </div>
  );
}
