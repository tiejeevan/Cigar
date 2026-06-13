'use client';

import { useState, useEffect } from 'react';
import { InventorySection } from '@/components/inventory-section';
import { OrdersSection } from '@/components/orders-section';
import { OrderBookSection } from '@/components/order-book-section';
import { ItemDetailView } from '@/components/item-detail-view';
import { Package, ShoppingBag, AlertCircle, Settings, BookOpen, UserCheck, LogOut } from 'lucide-react';
import { SettingsModal } from '@/components/settings-modal';
import { db, useLiveQuery, type Employee } from '@/lib/db';
import { toast } from 'sonner';

export default function Home() {
  const [currentView, setCurrentView] = useState<'inventory' | 'orderbook' | 'orders'>('orderbook');
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [pendingBarcode, setPendingBarcode] = useState<string | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
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
    setShowLogoutConfirm(true);
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
          <h1 className="text-3xl font-serif text-[#D4AF37] italic">Gaint Mart</h1>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#888]">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0B0E]">
      <div className="p-3.5 sm:p-8 max-w-[1400px] mx-auto w-full flex flex-col pt-3 sm:pt-8 md:pt-12 pb-24 sm:pb-12 flex-1">

        {selectedItemId === null && (
          <header className="mb-6 sm:mb-10 border-b border-[#2A2A2A] pb-4 sm:pb-6 flex items-center justify-between gap-4 w-full">
            {/* Left: Logo & Description */}
            <div className="flex flex-col items-start min-w-0">
              <h1 className="text-xl sm:text-4xl md:text-5xl font-serif text-[#D4AF37] italic tracking-tight leading-none">Gaint Mart</h1>
              <p className="text-[9px] uppercase tracking-[0.25em] text-[#888] mt-1 hidden sm:block">Unified Retail System</p>
            </div>

            {/* Right Controls: Profile & Settings */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {activeEmployee && (
                <div className="flex items-center gap-1.5 sm:gap-2.5 bg-[#14161C]/60 border border-[#2A2A2A] px-2.5 py-1.5 rounded-xl text-xs">
                  {/* Profile & Role badge */}
                  <div className="flex items-center gap-1.5 font-bold text-[#D4AF37]">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[80px] sm:max-w-[120px] text-xs font-semibold" title={activeEmployee.name}>{activeEmployee.name}</span>
                  </div>
                  <span className="text-[#888] font-bold text-[8px] sm:text-[9px] bg-[#2A2A2A] px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">
                    {activeEmployee.role || 'Employee'}
                  </span>

                  {/* Logout Icon Button */}
                  <button
                    onClick={handleLogout}
                    className="text-red-500 hover:text-red-400 p-1 hover:bg-[#2A2A2A] rounded-lg transition-all cursor-pointer flex items-center justify-center border-l border-[#2A2A2A] pl-2 ml-1"
                    title="Log Out Profile"
                    aria-label="Logout"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Settings button */}
              {activeEmployee && activeEmployee.name.toLowerCase() === 'admin' && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-[#14161C] border border-[#2A2A2A] hover:border-[#D4AF37]/50 rounded-xl text-gray-300 hover:text-white transition-all duration-300 font-semibold text-xs uppercase tracking-wider active:scale-95 shadow-md cursor-pointer"
                  title="Open Settings"
                  aria-label="Settings"
                >
                  <Settings className="w-4 h-4 text-[#D4AF37]" />
                  <span className="hidden sm:inline">Settings</span>
                </button>
              )}
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
                  Gaint Mart is fully configured with a serverless Postgres integration! To make your inventory, pricing, registers, and purchasing records permanent and consistent across all devices and tablets, please configure your Neon connection:
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

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0D0F13] border border-[#2A2A2A] rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-2xl relative overflow-hidden flex flex-col text-left animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>

            <div className="flex items-center gap-3.5 mb-4">
              <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl">
                <LogOut className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold text-[#E5E1DA]">Log Out Profile</h3>
                <p className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Confirm Action</p>
              </div>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed mb-6">
              Are you sure you want to log out of your profile, <strong className="text-[#E5E1DA]">{activeEmployee?.name}</strong>? You will need your PIN to authenticate next time.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 bg-[#14161C] border border-[#2A2A2A] hover:border-gray-500 text-gray-300 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setActiveEmployee(null);
                  sessionStorage.removeItem('active_employee');
                  setShowLogoutConfirm(false);
                  toast.info('Logged out of employee portal');
                }}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-red-500/10 hover:shadow-red-500/20 cursor-pointer text-center"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
