import Dexie, { type EntityTable } from 'dexie';

export interface InventoryItem {
  id?: number;
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
  brand: string;
  flavor: string;
  packType: string;
  quantity: number;
  status: 'pending' | 'ordered';
  createdAt: number;
}

const db = new Dexie('CigarilloInventoryDB') as Dexie & {
  items: EntityTable<InventoryItem, 'id'>;
  orders: EntityTable<OrderItem, 'id'>;
};

db.version(3).stores({
  items: '++id, brand, flavor, packType, quantity, reorderThreshold, barcode, price, updatedAt',
  orders: '++id, inventoryId, brand, flavor, packType, status, createdAt'
});

export { db };
