import { useState, useEffect } from 'react';

export interface InventoryItem {
  id?: number;
  category?: string;
  brand: string;
  flavor: string;
  packType: string;
  quantity: number;
  reorderThreshold: number;
  image?: string;
  barcode?: string;
  price?: number;
  updatedAt: number;
}

export interface OrderItem {
  id?: number;
  inventoryId?: number;
  category?: string;
  brand: string;
  flavor: string;
  packType: string;
  quantity: number;
  status: 'pending' | 'ordered';
  createdAt: number;
}

// Simple event-target to notify subscribers when any mutation is completed locally
const DB_EVENTS = typeof window !== 'undefined' ? new EventTarget() : null;

export function notifyDbChanged() {
  if (DB_EVENTS) {
    DB_EVENTS.dispatchEvent(new Event('change'));
  }
}

// Simple fetch wrapper
async function apiCall(body: any) {
  try {
    const res = await fetch('/api/db', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (res.status === 503) {
      const data = await res.json();
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('db-not-configured', { detail: data.error });
        window.dispatchEvent(event);
      }
      return null;
    }

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error('API Call failed:', error);
    return null;
  }
}

export const db = {
  items: {
    toArray: async () => {
      const res = await apiCall({ action: 'getItems' });
      return (res || []) as InventoryItem[];
    },
    get: async (id: number) => {
      const items = await apiCall({ action: 'getItems' });
      return (items?.find((item: any) => item.id === id) || null) as InventoryItem | null;
    },
    add: async (item: Omit<InventoryItem, 'id'>) => {
      const res = await apiCall({ action: 'addItem', item });
      notifyDbChanged();
      return res?.id as number;
    },
    update: async (id: number, updates: Partial<InventoryItem>) => {
      await apiCall({ action: 'updateItem', id, updates });
      notifyDbChanged();
    },
    delete: async (id: number) => {
      await apiCall({ action: 'deleteItem', id });
      notifyDbChanged();
    },
    where: (field: string) => {
      return {
        equals: (value: any) => {
          return {
            first: async () => {
              if (field === 'barcode') {
                return (await apiCall({ action: 'getItemByBarcode', barcode: value })) as InventoryItem | null;
              }
              const items = await apiCall({ action: 'getItems' });
              return (items?.find((item: any) => item[field] === value) || null) as InventoryItem | null;
            }
          };
        }
      };
    }
  },
  orders: {
    toArray: async () => {
      const res = await apiCall({ action: 'getOrders' });
      return (res || []) as OrderItem[];
    },
    add: async (order: Omit<OrderItem, 'id'>) => {
      const res = await apiCall({ action: 'addOrder', order });
      notifyDbChanged();
      return res?.id as number;
    },
    update: async (id: number, updates: Partial<OrderItem>) => {
      await apiCall({ action: 'updateOrder', id, updates });
      notifyDbChanged();
    },
    delete: async (id: number) => {
      await apiCall({ action: 'deleteOrder', id });
      notifyDbChanged();
    }
  }
};

export function useLiveQuery<T>(querier: () => Promise<T>, deps: any[] = []): T | undefined {
  const [data, setData] = useState<T | undefined>(undefined);

  useEffect(() => {
    let active = true;

    async function load() {
      const result = await querier();
      if (active && result !== null && result !== undefined) {
        setData(result);
      }
    }

    load();

    const handler = () => {
      load();
    };

    if (DB_EVENTS) {
      DB_EVENTS.addEventListener('change', handler);
    }

    // Poll every 10 seconds to catch changes from other devices/screens
    const interval = setInterval(load, 10000);

    return () => {
      active = false;
      if (DB_EVENTS) {
        DB_EVENTS.removeEventListener('change', handler);
      }
      clearInterval(interval);
    };
  }, deps);

  return data;
}
