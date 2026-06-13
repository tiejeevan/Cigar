'use client';

import { useState, useEffect } from 'react';
import { InventorySection } from '@/components/inventory-section';
import { OrdersSection } from '@/components/orders-section';
import { OrderBookSection } from '@/components/order-book-section';
import { ItemDetailView } from '@/components/item-detail-view';
import { Package, ShoppingBag, AlertCircle, Settings, BookOpen, UserCheck } from 'lucide-react';
import { SettingsModal } from '@/components/settings-modal';
import { db, useLiveQuery, type Employee } from '@/lib/db';
import { toast } from 'sonner';

export default function Home() {
  const [currentView, setCurrentView] = useState<'inventory' | 'orderbook' | 'orders'>('orderbook');
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [pendingBarcode, setPendingBarcode] = useState<string | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  const items = useLiveQuery(() => db.items.toArray(), []);
  const orders = useLiveQuery(() => db.orders.toArray(), []);
  const settings = useLiveQuery(() => db.settings.get(), []);
  
  const itemsCount = items?.length || 0;
  const ordersCount = orders?.length || 0;

  const isInvDisabledSetting = settings?.find(s => s.key === 'isInventoryDisabled');
  const isInventoryDisabled = settings === undefined ? true : (isInvDisabledSetting ? isInvDisabledSetting.value === 'true' : true);

  const isPurchasingDisabledSetting = settings?.find(s => s.key === 'isPurchasingDisabled');
  const isPurchasingDisabled = settings === undefined ? true : (isPurchasingDisabledSetting ? isPurchasingDisabledSetting.value === 'true' : true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedEmployee = sessionStorage.getItem('active_employee');
      if (storedEmployee) {
        try {
          setActiveEmployee(JSON.parse(storedEmployee));
        } catch (e) {
          sessionStorage.removeItem('active_employee');
        }
      }
      const storedView = sessionStorage.getItem('current_view');
      if (storedView === 'inventory' || storedView === 'orderbook' || storedView === 'orders') {
        setCurrentView(storedView);
      }
      setLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    if (loadingSession) return;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('current_view', currentView);
    }
  }, [currentView, loadingSession]);

  const handleLogout = () => {
    setActiveEmployee(null);
    sessionStorage.removeItem('active_employee');
    toast.info('Logged out of employee portal');
  };

  useEffect(() => {
    if (settings === undefined) return;
    if (typeof window !== 'undefined') {
      localStorage.setItem('isInventoryDisabled', String(isInventoryDisabled));
    }
    if (isInventoryDisabled && currentView === 'inventory') {
      setCurrentView('orderbook');
    }
  }, [isInventoryDisabled, currentView, settings]);

  useEffect(() => {
    if (settings === undefined) return;
    if (typeof window !== 'undefined') {
      localStorage.setItem('isPurchasingDisabled', String(isPurchasingDisabled));
    }
    if (isPurchasingDisabled && currentView === 'orders') {
      setCurrentView('orderbook');
    }
  }, [isPurchasingDisabled, currentView, settings]);

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

  if (loadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0B0E]">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <h1 className="text-3xl font-serif text-[#D4AF37] italic">Gaint Martt</h1>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#888]">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0B0E]">
      <div className="p-3.5 sm:p-8 max-w-[1400px] mx-auto w-full flex flex-col pt-3 sm:pt-8 md:pt-12 pb-24 sm:pb-12 flex-1">
        
        {selectedItemId === null && (
          <header className="mb-4 sm:mb-10 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center border-b border-[#2A2A2A] pb-4 sm:pb-8">
            <div>
              <h1 className="text-4xl md:text-5xl font-serif text-[#D4AF37] italic tracking-tight mb-2">Gaint Martt</h1>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#888]">Unified Retail System</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
              {activeEmployee && (
                <div className="flex items-center gap-2 bg-[#14161C] border border-[#2A2A2A] px-3.5 py-2 rounded-xl text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-[#D4AF37]">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[120px] sm:max-w-none">Profile: {activeEmployee.name}</span>
                  </div>
                  <span className="text-[#888] font-bold text-[9px] bg-[#2A2A2A] px-1.5 py-0.5 rounded uppercase tracking-wider">
                    {activeEmployee.role || 'Employee'}
                  </span>
                  <button 
                    onClick={handleLogout}
                    className="text-[#C2410C] border-l border-[#2A2A2A] pl-2.5 ml-0.5 uppercase text-[9px] tracking-wider hover:underline font-bold cursor-pointer"
                  >
                    Logout
                  </button>
                </div>
              )}
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#14161C] border border-[#2A2A2A] hover:border-[#D4AF37]/50 rounded-xl text-gray-300 hover:text-white transition-all duration-300 font-semibold text-xs uppercase tracking-wider active:scale-95 shadow-md cursor-pointer"
              >
                <Settings className="w-4 h-4 text-[#D4AF37]" />
                <span>Settings</span>
              </button>
            </div>
          </header>
        )}

        {selectedItemId === null && dbError && (
          <div className="mb-10 border border-[#D4AF37]/30 bg-[#D4AF37]/5 rounded-2xl p-6 text-[#E5E1DA] shadow-xl relative overflow-hidden backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#D4AF37]"></div>
            <div className="flex gap-4 items-start">
              <AlertCircle className="w-6 h-6 text-[#D4AF37] shrink-0 mt-0.5" />
              <div>
                <h3 className="font-serif text-lg font-bold text-[#D4AF37] mb-2">Neon Serverless DB Connection Required</h3>
                <p className="text-sm opacity-90 leading-relaxed mb-4">
                  Gaint Martt is fully configured with a serverless Postgres integration! To make your inventory, pricing, registers, and purchasing records permanent and consistent across all devices and tablets, please configure your Neon connection:
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

        {/* Desktop Unified Navigation Bar */}
        {selectedItemId === null && (
          <div className="hidden sm:flex bg-[#14161C] border border-[#2A2A2A] rounded-2xl p-2 mb-10 w-full max-w-lg mx-auto shadow-md">
            {!isInventoryDisabled && (
              <button
                onClick={() => setCurrentView('inventory')}
                className={`flex-1 flex items-center justify-center gap-3 py-4 text-sm tracking-widest uppercase transition-all duration-300 rounded-xl font-semibold cursor-pointer ${currentView === 'inventory' ? 'bg-[#2A2A2A] text-[#D4AF37] shadow-lg scale-[1.02]' : 'text-[#888] hover:text-[#E5E1DA] hover:bg-[#1A1C23]'}`}
              >
                <Package className="w-5 h-5" />
                <span>Inventory</span>
              </button>
            )}
            
            <button
              onClick={() => setCurrentView('orderbook')}
              className={`flex-1 flex items-center justify-center gap-3 py-4 text-sm tracking-widest uppercase transition-all duration-300 rounded-xl font-semibold cursor-pointer ${currentView === 'orderbook' ? 'bg-[#2A2A2A] text-[#D4AF37] shadow-lg scale-[1.02]' : 'text-[#888] hover:text-[#E5E1DA] hover:bg-[#1A1C23]'}`}
            >
              <BookOpen className="w-5 h-5" />
              <span>Order book</span>
            </button>
            
            {!isPurchasingDisabled && (
              <button
                onClick={() => setCurrentView('orders')}
                className={`flex-1 flex items-center justify-center gap-3 py-4 text-sm tracking-widest uppercase transition-all duration-300 rounded-xl font-semibold cursor-pointer ${currentView === 'orders' ? 'bg-[#2A2A2A] text-[#D4AF37] shadow-lg scale-[1.02]' : 'text-[#888] hover:text-[#E5E1DA] hover:bg-[#1A1C23]'}`}
              >
                <ShoppingBag className="w-5 h-5" />
                <span>Purchasing</span>
              </button>
            )}
          </div>
        )}

        {/* Mobile Fixed-Bottom Navigation Bar */}
        {selectedItemId === null && (
          <div className="flex sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0D0F13]/95 border-t border-[#2A2A2A] px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-md shadow-[0_-8px_30px_rgba(0,0,0,0.6)] justify-around items-center">
            {!isInventoryDisabled && (
              <button
                onClick={() => setCurrentView('inventory')}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 text-[9px] tracking-widest uppercase transition-all duration-300 rounded-xl font-bold cursor-pointer ${currentView === 'inventory' ? 'text-[#D4AF37]' : 'text-gray-400'}`}
              >
                <Package className={`w-5 h-5 transition-transform ${currentView === 'inventory' ? 'scale-110 text-[#D4AF37]' : 'text-gray-400'}`} />
                <span>Inventory</span>
              </button>
            )}
            
            <button
              onClick={() => setCurrentView('orderbook')}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 text-[9px] tracking-widest uppercase transition-all duration-300 rounded-xl font-bold cursor-pointer ${currentView === 'orderbook' ? 'text-[#D4AF37]' : 'text-gray-400'}`}
            >
              <BookOpen className={`w-5 h-5 transition-transform ${currentView === 'orderbook' ? 'scale-110 text-[#D4AF37]' : 'text-gray-400'}`} />
              <span>Order book</span>
            </button>
            
            {!isPurchasingDisabled && (
              <button
                onClick={() => setCurrentView('orders')}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 text-[9px] tracking-widest uppercase transition-all duration-300 rounded-xl font-bold cursor-pointer ${currentView === 'orders' ? 'text-[#D4AF37]' : 'text-gray-400'}`}
              >
                <ShoppingBag className={`w-5 h-5 transition-transform ${currentView === 'orders' ? 'scale-110 text-[#D4AF37]' : 'text-gray-400'}`} />
                <span>Purchasing</span>
              </button>
            )}
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1">
          {selectedItemId !== null ? (
            <ItemDetailView 
              itemId={selectedItemId}
              onClose={() => setSelectedItemId(null)}
              onSelectItem={(id) => setSelectedItemId(id)}
            />
          ) : (
            <>
              {currentView === 'inventory' && !isInventoryDisabled && (
                <InventorySection 
                  items={items || []}
                  pendingBarcode={pendingBarcode}
                  clearPendingBarcode={() => setPendingBarcode(null)}
                  onSelectItem={(id) => setSelectedItemId(id)}
                />
              )}
              {currentView === 'orderbook' && (
                <OrderBookSection 
                  orders={orders || []}
                  activeEmployee={activeEmployee}
                  setActiveEmployee={setActiveEmployee}
                />
              )}
              {currentView === 'orders' && !isPurchasingDisabled && (
                <OrdersSection 
                  orders={orders || []}
                  inventory={items || []}
                />
              )}
            </>
          )}
        </main>

        {selectedItemId === null && (
          <footer className="mt-20 pt-8 border-t border-[#2A2A2A] text-center">
             <p className="text-[9px] uppercase tracking-[0.4em] text-[#444]">Confidential & Proprietary</p>
          </footer>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal 
          onClose={() => setShowSettings(false)}
          activeItemsCount={itemsCount}
          activeOrdersCount={ordersCount}
          activeEmployee={activeEmployee}
          setActiveEmployee={setActiveEmployee}
        />
      )}
    </div>
  );
}
