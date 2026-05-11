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
  updatedAt: number;
}

const db = new Dexie('CigarilloInventoryDB') as Dexie & {
  items: EntityTable<InventoryItem, 'id'>;
};

db.version(2).stores({
  items: '++id, brand, flavor, packType, quantity, reorderThreshold, barcode, updatedAt'
});

export { db };
