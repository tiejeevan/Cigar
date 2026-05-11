import Dexie, { type EntityTable } from 'dexie';

export interface InventoryItem {
  id?: number;
  brand: string;
  flavor: string;
  packType: string; // "Single", "Box"
  quantity: number;
  reorderThreshold: number;
  image?: string; // Base64 data URL for images
  barcode?: string;
  updatedAt: number; // timestamp
}

const db = new Dexie('CigarilloInventoryDB') as Dexie & {
  items: EntityTable<InventoryItem, 'id'>;
};

// Schema declaration
db.version(1).stores({
  items: '++id, brand, flavor, quantity, reorderThreshold, updatedAt'
});

db.version(2).stores({
  items: '++id, brand, flavor, packType, quantity, reorderThreshold, barcode, updatedAt'
}).upgrade(tx => {
  return tx.table('items').toCollection().modify(item => {
    item.packType = item.packType || 'Single';
    item.barcode = item.barcode || '';
  });
});

export { db };
