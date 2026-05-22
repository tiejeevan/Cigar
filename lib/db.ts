import { useState, useEffect } from 'react';
import Dexie, { type Table } from 'dexie';

export interface CachedImage {
  id: number;
  image?: string;
  updatedAt: number;
}

class GaintMartImageCacheDB extends Dexie {
  images!: Table<CachedImage, number>;

  constructor() {
    super('GaintMartImageCache');
    this.version(1).stores({
      images: 'id, updatedAt'
    });
  }
}

export const imageCacheDb = typeof window !== 'undefined' ? new GaintMartImageCacheDB() : null;

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
      if (typeof window !== 'undefined' && imageCacheDb) {
        try {
          await imageCacheDb.images.delete(id);
        } catch (err) {
          console.error('Failed to delete cached image:', err);
        }
      }
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
  },
  getItemImage: async (id: number, updatedAt: number): Promise<string | undefined> => {
    if (typeof window === 'undefined' || !imageCacheDb) return undefined;
    try {
      // Check cache first
      const cached = await imageCacheDb.images.get(id);
      if (cached && cached.updatedAt === updatedAt) {
        return cached.image;
      }
      // Cache miss or outdated -> fetch from api
      const res = await apiCall({ action: 'getItemImage', id });
      const image = res?.image || '';
      // Put in cache
      await imageCacheDb.images.put({ id, image, updatedAt });
      return image || undefined;
    } catch (error) {
      console.error('Failed to get item image:', error);
      return undefined;
    }
  },
  exportBackupData: async () => {
    const res = await apiCall({ action: 'getItemsWithImages' });
    const items = (res || []) as InventoryItem[];
    const orders = await db.orders.toArray();
    return {
      version: '1.0',
      exportTimestamp: Date.now(),
      items,
      orders
    };
  },
  importBackupData: async (backupData: any, conflictStrategy: 'overwrite' | 'merge' | 'skip') => {
    if (!backupData || typeof backupData !== 'object') {
      throw new Error('Invalid backup data format');
    }
    if (!Array.isArray(backupData.items)) {
      throw new Error('Backup data items must be an array');
    }
    if (backupData.orders && !Array.isArray(backupData.orders)) {
      throw new Error('Backup data orders must be an array');
    }

    const itemsResult = await apiCall({ 
      action: 'bulkUpsertItems', 
      items: backupData.items, 
      conflictStrategy 
    });

    const ordersResult = backupData.orders && backupData.orders.length > 0
      ? await apiCall({ action: 'bulkInsertOrders', orders: backupData.orders })
      : { success: true };

    notifyDbChanged();

    return {
      itemsCount: backupData.items.length,
      ordersCount: (backupData.orders || []).length,
      success: !!(itemsResult?.success && ordersResult?.success)
    };
  },
  wipeDatabase: async () => {
    await apiCall({ action: 'wipeDatabase' });
    if (typeof window !== 'undefined' && imageCacheDb) {
      try {
        await imageCacheDb.images.clear();
      } catch (err) {
        console.error('Failed to clear image cache:', err);
      }
    }
    notifyDbChanged();
  },
  mergeDuplicateBrands: async () => {
    const res = await apiCall({ action: 'mergeDuplicateBrands' });
    notifyDbChanged();
    return res;
  }
};

export function useLiveQuery<T>(querier: () => Promise<T>, deps: any[] = []): T | undefined {
  const [data, setData] = useState<T | undefined>(undefined);

  useEffect(() => {
    let active = true;
    let loading = false;

    async function load() {
      if (loading) return;
      loading = true;
      try {
        const result = await querier();
        if (active && result !== null && result !== undefined) {
          setData(result);
        }
      } catch (err) {
        console.error('Error loading data in useLiveQuery:', err);
      } finally {
        loading = false;
      }
    }

    load();

    const handler = () => {
      load();
    };

    if (DB_EVENTS) {
      DB_EVENTS.addEventListener('change', handler);
    }

    return () => {
      active = false;
      if (DB_EVENTS) {
        DB_EVENTS.removeEventListener('change', handler);
      }
    };
  }, deps);

  return data;
}
