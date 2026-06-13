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
  boxSize?: number;
  image?: string;
  barcode?: string;
  price?: number;
  flag?: string | null;
  updatedAt: number;
}

export interface Employee {
  id: number;
  name: string;
  role: 'employee' | 'manager';
  createdAt: number;
  isDeleted?: boolean;
  pin?: string;
}

export interface SettingItem {
  key: string;
  value: string;
  updatedBy: string;
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
  status: 'pending' | 'approved' | 'ordered' | 'received';
  createdAt: number;
  addedBy?: string | null;
  completedBy?: string | null;
  completedAt?: number | null;
  listId?: string | null;
  urgency?: 'low' | 'medium' | 'high';
  timeframe?: 'asap' | '1week' | '2weeks' | 'monthly';
  estimatedPrice?: number;
  notes?: string;
  approvedBy?: string | null;
  approvedAt?: number | null;
  receivedBy?: string | null;
  receivedAt?: number | null;
}

export interface OrderSession {
  id?: number;
  listId: string;
  sessionName?: string;
  vendorName?: string;
  completedBy: string;
  completedAt: number;
  notes?: string;
}

export interface PersonalNote {
  id: number;
  employeeId: number;
  content: string;
  createdAt: number;
}

// Simple event-target to notify subscribers when any mutation is completed locally
const DB_EVENTS = typeof window !== 'undefined' ? new EventTarget() : null;

let ws: WebSocket | null = null;
if (typeof window !== 'undefined') {
  function connectWs() {
    // Determine the WS URL correctly based on the current origin
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/_ws`;
    ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      if (event.data === 'db-change') {
        if (DB_EVENTS) {
          DB_EVENTS.dispatchEvent(new Event('change'));
        }
      }
    };

    ws.onclose = () => {
      // Reconnect after 3 seconds
      setTimeout(connectWs, 3000);
    };
  }
  connectWs();
}

export function notifyDbChanged() {
  if (DB_EVENTS) {
    DB_EVENTS.dispatchEvent(new Event('change'));
  }
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send('db-change');
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
    },
    completeActiveOrders: async (ids: number[], completedBy: string, sessionName?: string, vendorName?: string, notes?: string) => {
      const res = await apiCall({ action: 'completeActiveOrders', ids, completedBy, sessionName, vendorName, notes });
      notifyDbChanged();
      return res;
    }
  },
  orderSessions: {
    list: async () => {
      const res = await apiCall({ action: 'getOrderSessions' });
      return (res || []) as OrderSession[];
    }
  },
  personalNotes: {
    list: async (employeeId: number) => {
      const res = await apiCall({ action: 'getPersonalNotes', employeeId });
      return (res || []) as PersonalNote[];
    },
    add: async (employeeId: number, content: string) => {
      const res = await apiCall({ action: 'addPersonalNote', employeeId, content });
      notifyDbChanged();
      return res as PersonalNote;
    },
    delete: async (id: number, employeeId: number) => {
      const res = await apiCall({ action: 'deletePersonalNote', id, employeeId });
      notifyDbChanged();
      return res;
    },
    update: async (id: number, employeeId: number, content: string) => {
      const res = await apiCall({ action: 'updatePersonalNote', id, employeeId, content });
      notifyDbChanged();
      return res as PersonalNote;
    }
  },
  employees: {
    list: async () => {
      const res = await apiCall({ action: 'getEmployees' });
      return (res || []) as Employee[];
    },
    register: async (name: string, pin: string, role: 'employee' | 'manager' = 'employee') => {
      const res = await apiCall({ action: 'registerEmployee', name, pin, role });
      return res;
    },
    verifyPin: async (name: string, pin: string) => {
      const res = await apiCall({ action: 'verifyEmployeePin', name, pin });
      return res;
    },
    update: async (id: number, updates: Partial<Employee>) => {
      const res = await apiCall({ action: 'updateEmployee', id, updates });
      notifyDbChanged();
      return res;
    },
    delete: async (id: number) => {
      const res = await apiCall({ action: 'deleteEmployee', id });
      notifyDbChanged();
      return res;
    }
  },
  settings: {
    get: async () => {
      const res = await apiCall({ action: 'getSettings' });
      return (res || []) as SettingItem[];
    },
    update: async (key: string, value: string, updatedBy: string) => {
      const res = await apiCall({ action: 'updateSetting', key, value, updatedBy });
      notifyDbChanged();
      return res;
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
    const res = await apiCall({ action: 'getCompleteBackupData' });
    return {
      version: '1.1',
      exportTimestamp: Date.now(),
      items: res?.items || [],
      orders: res?.orders || [],
      employees: res?.employees || [],
      orderSessions: res?.orderSessions || [],
      settings: res?.settings || [],
      personalNotes: res?.personalNotes || []
    };
  },
  importBackupData: async (backupData: any, conflictStrategy: 'overwrite' | 'merge' | 'skip') => {
    if (!backupData || typeof backupData !== 'object') {
      throw new Error('Invalid backup data format');
    }
    if (!Array.isArray(backupData.items)) {
      throw new Error('Backup data items must be an array');
    }

    const result = await apiCall({
      action: 'bulkImportBackup',
      items: backupData.items,
      orders: backupData.orders || [],
      employees: backupData.employees || [],
      orderSessions: backupData.orderSessions || [],
      settings: backupData.settings || [],
      personalNotes: backupData.personalNotes || [],
      conflictStrategy
    });

    notifyDbChanged();

    return {
      itemsCount: result?.itemsCount || 0,
      ordersCount: result?.ordersCount || 0,
      employeesCount: result?.employeesCount || 0,
      sessionsCount: result?.sessionsCount || 0,
      settingsCount: result?.settingsCount || 0,
      notesCount: result?.notesCount || 0,
      success: !!result?.success
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
