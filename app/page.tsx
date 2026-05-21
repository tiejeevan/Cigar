'use client';

import { useState, useEffect } from 'react';
import { InventorySection } from '@/components/inventory-section';
import { PosSection } from '@/components/pos-section';
import { OrdersSection } from '@/components/orders-section';
import { Package, ShoppingCart, ShoppingBag, AlertCircle } from 'lucide-react';

export default function Home() {
  const [currentView, setCurrentView] = useState<'pos' | 'inventory' | 'orders'>('pos');
  const [pendingBarcode, setPendingBarcode] = useState<string | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    // Check if DATABASE_URL is missing by listening to DB events
    const handleDbNotConfigured = (e: Event) => {
      const customEvent = e as CustomEvent;
      setDbError(customEvent.detail || 'DATABASE_URL is not configured');
    };

    window.addEventListener('db-not-configured', handleDbNotConfigured);
    return () => {
      window.removeEventListener('db-not-configured', handleDbNotConfigured);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0B0E]">
      <div className="p-4 md:p-8 max-w-[1400px] mx-auto w-full flex flex-col pt-8 md:pt-12 flex-1">
        
        <header className="mb-10 flex border-b border-[#2A2A2A] pb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-serif text-[#D4AF37] italic tracking-tight mb-2">Smoke OS</h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#888]">Unified Retail System</p>
          </div>
        </header>

        {dbError && (
          <div className="mb-10 border border-[#D4AF37]/30 bg-[#D4AF37]/5 rounded-2xl p-6 text-[#E5E1DA] shadow-xl relative overflow-hidden backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#D4AF37]"></div>
            <div className="flex gap-4 items-start">
              <AlertCircle className="w-6 h-6 text-[#D4AF37] shrink-0 mt-0.5" />
              <div>
                <h3 className="font-serif text-lg font-bold text-[#D4AF37] mb-2">Neon Serverless DB Connection Required</h3>
                <p className="text-sm opacity-90 leading-relaxed mb-4">
                  Smoke OS is fully configured with a serverless Postgres integration! To make your inventory, pricing, registers, and purchasing records permanent and consistent across all devices and tablets, please configure your Neon connection:
                </p>
                <ol className="list-decimal pl-5 text-sm opacity-80 space-y-2 mb-4">
                  <li>Retrieve your <strong>Postgres connection string</strong> from your <a href="https://neon.tech" target="_blank" className="text-[#D4AF37] underline font-semibold">Neon Console</a> dashboard.</li>
                  <li>In this AI Studio window, open the <strong>Settings</strong> cabinet (the gear icon on the very top-right or sidebar menu).</li>
                  <li>Click on <strong>Environment Variables</strong> and add a new secret named <code className="text-[#D4AF37] bg-[#14161C] px-1.5 py-0.5 rounded border border-[#2A2A2A] font-mono font-bold text-xs">DATABASE_URL</code>.</li>
                  <li>Set the value to your connection string (e.g. <code className="text-xs font-mono opacity-80">postgresql://user:password@ep-host.region.neon.tech/neondb?sslmode=require</code>) and hit save.</li>
                </ol>
                <p className="text-[10px] uppercase font-mono tracking-wider opacity-60">
                  Note: Client components are securely isolated—your database password is never exposed to the web browser.
                </p>
              </div>
            </div>
          </div>
        )}

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
          {currentView === 'pos' && (
            <PosSection 
              onBarcodeNotFound={(barcode) => {
                setPendingBarcode(barcode);
                setCurrentView('inventory');
              }} 
            />
          )}
          {currentView === 'inventory' && (
            <InventorySection 
              pendingBarcode={pendingBarcode}
              clearPendingBarcode={() => setPendingBarcode(null)}
            />
          )}
          {currentView === 'orders' && <OrdersSection />}
        </main>

        <footer className="mt-20 pt-8 border-t border-[#2A2A2A] text-center">
           <p className="text-[9px] uppercase tracking-[0.4em] text-[#444]">Confidential & Proprietary</p>
        </footer>
      </div>
    </div>
  );
}
