import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

let tablesEnsured = false;

// Lazily get the Neon SQL client
function getSql() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL is not configured');
  }
  return neon(dbUrl);
}

// Ensure database tables exist with proper schema
async function ensureTables(sql: any) {
  // Schema for items table
  await sql`
    CREATE TABLE IF NOT EXISTS items (
      id SERIAL PRIMARY KEY,
      category TEXT DEFAULT 'Cigarillos',
      brand TEXT NOT NULL,
      flavor TEXT NOT NULL,
      "packType" TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      "reorderThreshold" INTEGER NOT NULL DEFAULT 10,
      image TEXT,
      barcode TEXT,
      price NUMERIC(10, 2) DEFAULT 0.00,
      "updatedAt" BIGINT NOT NULL
    )
  `;

  // Schema for orders table
  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      "inventoryId" INTEGER,
      category TEXT DEFAULT 'Cigarillos',
      brand TEXT NOT NULL,
      flavor TEXT NOT NULL,
      "packType" TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'pending',
      "createdAt" BIGINT NOT NULL
    )
  `;
}

// Convert DB returned fields into accurate numbers/types for Javascript
function mapDbResult(row: any) {
  if (!row) return row;
  const mapped = { ...row };
  if ('price' in mapped && mapped.price !== null) {
    mapped.price = parseFloat(mapped.price);
  }
  if ('quantity' in mapped) {
    mapped.quantity = parseInt(mapped.quantity, 10);
  }
  if ('reorderThreshold' in mapped) {
    mapped.reorderThreshold = parseInt(mapped.reorderThreshold, 10);
  }
  if ('updatedAt' in mapped) {
    mapped.updatedAt = Number(mapped.updatedAt);
  }
  if ('createdAt' in mapped) {
    mapped.createdAt = Number(mapped.createdAt);
  }
  if ('inventoryId' in mapped && mapped.inventoryId !== null) {
    mapped.inventoryId = parseInt(mapped.inventoryId, 10);
  }
  return mapped;
}

export async function POST(req: NextRequest) {
  try {
    let sql;
    try {
      sql = getSql();
    } catch {
      return NextResponse.json(
        { 
          error: 'DATABASE_URL is missing. Please set your Neon Database connection string in the AI Studio Settings menu as DATABASE_URL.',
          notConfigured: true 
        },
        { status: 503 }
      );
    }

    // Auto-bootstrap and verify tables exist on the fly using neon http query client
    if (!tablesEnsured) {
      await ensureTables(sql);
      tablesEnsured = true;
    }

    const body = await req.json();
    const { action, id, item, order, updates, barcode } = body;

    // 1. Fetch all items (excluding image to optimize payload)
    if (action === 'getItems') {
      const rows = await sql`
        SELECT id, category, brand, flavor, "packType", quantity, "reorderThreshold", barcode, price, "updatedAt"
        FROM items
        ORDER BY id DESC
      `;
      return NextResponse.json(rows.map(mapDbResult));
    }

    // 2. Fetch all orders
    if (action === 'getOrders') {
      const rows = await sql`SELECT * FROM orders ORDER BY id DESC`;
      return NextResponse.json(rows.map(mapDbResult));
    }

    // 3. Find unique item by barcode (excluding image)
    if (action === 'getItemByBarcode') {
      const rows = await sql`
        SELECT id, category, brand, flavor, "packType", quantity, "reorderThreshold", barcode, price, "updatedAt"
        FROM items
        WHERE barcode = ${barcode}
        LIMIT 1
      `;
      return NextResponse.json(rows.length > 0 ? mapDbResult(rows[0]) : null);
    }

    // 3a. Fetch dynamic single-item Base64 image
    if (action === 'getItemImage') {
      if (!id) {
        return NextResponse.json({ error: 'Missing id' }, { status: 400 });
      }
      const rows = await sql`SELECT image FROM items WHERE id = ${id} LIMIT 1`;
      return NextResponse.json({ image: rows.length > 0 ? rows[0].image : null });
    }

    // 3b. Fetch all items including images (exclusively for backups)
    if (action === 'getItemsWithImages') {
      const rows = await sql`SELECT * FROM items ORDER BY id DESC`;
      return NextResponse.json(rows.map(mapDbResult));
    }

    // 4. Create new inventory item
    if (action === 'addItem') {
      const rows = await sql`
        INSERT INTO items (category, brand, flavor, "packType", quantity, "reorderThreshold", image, barcode, price, "updatedAt")
        VALUES (
          ${item.category || 'Cigarillos'}, 
          ${item.brand}, 
          ${item.flavor}, 
          ${item.packType || 'Single'}, 
          ${parseInt(item.quantity, 10) || 0}, 
          ${parseInt(item.reorderThreshold, 10) || 10}, 
          ${item.image || null}, 
          ${item.barcode || null}, 
          ${parseFloat(item.price) || 0.00}, 
          ${Date.now()}
        )
        RETURNING *
      `;
      return NextResponse.json(mapDbResult(rows[0]));
    }

    // 5. Create new purchasing order
    if (action === 'addOrder') {
      const rows = await sql`
        INSERT INTO orders ("inventoryId", category, brand, flavor, "packType", quantity, status, "createdAt")
        VALUES (
          ${order.inventoryId || null}, 
          ${order.category || 'Cigarillos'}, 
          ${order.brand}, 
          ${order.flavor}, 
          ${order.packType || 'Single'}, 
          ${parseInt(order.quantity, 10) || 1}, 
          ${order.status || 'pending'}, 
          ${Date.now()}
        )
        RETURNING *
      `;
      return NextResponse.json(mapDbResult(rows[0]));
    }

    // 6. Update inventory item using static fields schema
    if (action === 'updateItem') {
      if (!id || !updates) {
        return NextResponse.json({ error: 'Missing id or updates' }, { status: 400 });
      }
      
      const selectRows = await sql`SELECT * FROM items WHERE id = ${id} LIMIT 1`;
      if (selectRows.length === 0) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }
      
      const existing = selectRows[0];
      const category = updates.category !== undefined ? updates.category : existing.category;
      const brand = updates.brand !== undefined ? updates.brand : existing.brand;
      const flavor = updates.flavor !== undefined ? updates.flavor : existing.flavor;
      const packType = updates.packType !== undefined ? updates.packType : existing.packType;
      const quantity = updates.quantity !== undefined ? parseInt(updates.quantity, 10) : parseInt(existing.quantity, 10);
      const reorderThreshold = updates.reorderThreshold !== undefined ? parseInt(updates.reorderThreshold, 10) : parseInt(existing.reorderThreshold, 10);
      const image = updates.image !== undefined ? updates.image : existing.image;
      const barcode = updates.barcode !== undefined ? updates.barcode : existing.barcode;
      const price = updates.price !== undefined ? parseFloat(updates.price) : parseFloat(existing.price);
      const updatedAt = Date.now();

      const updateRows = await sql`
        UPDATE items 
        SET 
          category = ${category}, 
          brand = ${brand}, 
          flavor = ${flavor}, 
          "packType" = ${packType}, 
          quantity = ${quantity}, 
          "reorderThreshold" = ${reorderThreshold}, 
          image = ${image}, 
          barcode = ${barcode}, 
          price = ${price}, 
          "updatedAt" = ${updatedAt}
        WHERE id = ${id}
        RETURNING *
      `;
      return NextResponse.json(mapDbResult(updateRows[0]));
    }

    // 7. Update purchasing order
    if (action === 'updateOrder') {
      if (!id || !updates) {
        return NextResponse.json({ error: 'Missing id or updates' }, { status: 400 });
      }
      
      const selectRows = await sql`SELECT * FROM orders WHERE id = ${id} LIMIT 1`;
      if (selectRows.length === 0) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      
      const existing = selectRows[0];
      const inventoryId = updates.inventoryId !== undefined ? updates.inventoryId : existing.inventoryId;
      const category = updates.category !== undefined ? updates.category : existing.category;
      const brand = updates.brand !== undefined ? updates.brand : existing.brand;
      const flavor = updates.flavor !== undefined ? updates.flavor : existing.flavor;
      const packType = updates.packType !== undefined ? updates.packType : existing.packType;
      const quantity = updates.quantity !== undefined ? parseInt(updates.quantity, 10) : parseInt(existing.quantity, 10);
      const status = updates.status !== undefined ? updates.status : existing.status;

      const updateRows = await sql`
        UPDATE orders
        SET
          "inventoryId" = ${inventoryId},
          category = ${category},
          brand = ${brand},
          flavor = ${flavor},
          "packType" = ${packType},
          quantity = ${quantity},
          status = ${status}
        WHERE id = ${id}
        RETURNING *
      `;
      return NextResponse.json(mapDbResult(updateRows[0]));
    }

    // 8. Delete inventory item
    if (action === 'deleteItem') {
      await sql`DELETE FROM items WHERE id = ${id}`;
      return NextResponse.json({ success: true });
    }

    // 9. Delete purchasing order
    if (action === 'deleteOrder') {
      await sql`DELETE FROM orders WHERE id = ${id}`;
      return NextResponse.json({ success: true });
    }

    // 10. Bulk upsert inventory items
    if (action === 'bulkUpsertItems') {
      const { items: backupItems, conflictStrategy } = body;
      if (!Array.isArray(backupItems)) {
        return NextResponse.json({ error: 'Items must be an array' }, { status: 400 });
      }

      const activeRows = await sql`SELECT * FROM items`;
      const results = [];

      for (const incoming of backupItems) {
        let existing = null;
        if (incoming.barcode) {
          existing = activeRows.find(r => r.barcode === incoming.barcode);
        } else {
          existing = activeRows.find(r => 
            r.brand.toLowerCase() === incoming.brand.toLowerCase() &&
            r.flavor.toLowerCase() === incoming.flavor.toLowerCase() &&
            r.packType.toLowerCase() === incoming.packType.toLowerCase()
          );
        }

        if (existing) {
          if (conflictStrategy === 'overwrite') {
            const quantity = parseInt(incoming.quantity, 10) || 0;
            const reorderThreshold = parseInt(incoming.reorderThreshold, 10) || 10;
            const price = parseFloat(incoming.price) || 0.00;
            await sql`
              UPDATE items 
              SET 
                category = ${incoming.category || existing.category}, 
                brand = ${incoming.brand}, 
                flavor = ${incoming.flavor}, 
                "packType" = ${incoming.packType || existing.packType}, 
                quantity = ${quantity}, 
                "reorderThreshold" = ${reorderThreshold}, 
                image = ${incoming.image !== undefined ? incoming.image : existing.image}, 
                price = ${price}, 
                "updatedAt" = ${Date.now()}
              WHERE id = ${existing.id}
            `;
            results.push({ action: 'overwrite', id: existing.id });
          } else if (conflictStrategy === 'merge') {
            const newQuantity = (parseInt(existing.quantity, 10) || 0) + (parseInt(incoming.quantity, 10) || 0);
            await sql`
              UPDATE items 
              SET 
                quantity = ${newQuantity}, 
                "updatedAt" = ${Date.now()}
              WHERE id = ${existing.id}
            `;
            results.push({ action: 'merge', id: existing.id });
          } else {
            results.push({ action: 'skip', id: existing.id });
          }
        } else {
          const quantity = parseInt(incoming.quantity, 10) || 0;
          const reorderThreshold = parseInt(incoming.reorderThreshold, 10) || 10;
          const price = parseFloat(incoming.price) || 0.00;
          await sql`
            INSERT INTO items (category, brand, flavor, "packType", quantity, "reorderThreshold", image, barcode, price, "updatedAt")
            VALUES (
              ${incoming.category || 'Cigarillos'}, 
              ${incoming.brand}, 
              ${incoming.flavor}, 
              ${incoming.packType || 'Single'}, 
              ${quantity}, 
              ${reorderThreshold}, 
              ${incoming.image || null}, 
              ${incoming.barcode || null}, 
              ${price}, 
              ${Date.now()}
            )
          `;
          results.push({ action: 'insert' });
        }
      }
      return NextResponse.json({ success: true, results });
    }

    // 11. Bulk insert purchasing orders
    if (action === 'bulkInsertOrders') {
      const { orders: backupOrders } = body;
      if (!Array.isArray(backupOrders)) {
        return NextResponse.json({ error: 'Orders must be an array' }, { status: 400 });
      }

      const activeOrders = await sql`SELECT * FROM orders`;
      const results = [];

      for (const incoming of backupOrders) {
        const exists = activeOrders.some(r => 
          r.brand.toLowerCase() === incoming.brand.toLowerCase() &&
          r.flavor.toLowerCase() === incoming.flavor.toLowerCase() &&
          Number(r.createdAt) === Number(incoming.createdAt) &&
          parseInt(r.quantity, 10) === parseInt(incoming.quantity, 10)
        );

        if (!exists) {
          await sql`
            INSERT INTO orders ("inventoryId", category, brand, flavor, "packType", quantity, status, "createdAt")
            VALUES (
              ${incoming.inventoryId || null}, 
              ${incoming.category || 'Cigarillos'}, 
              ${incoming.brand}, 
              ${incoming.flavor}, 
              ${incoming.packType || 'Single'}, 
              ${parseInt(incoming.quantity, 10) || 1}, 
              ${incoming.status || 'pending'}, 
              ${incoming.createdAt || Date.now()}
            )
          `;
          results.push({ action: 'insert' });
        } else {
          results.push({ action: 'skip' });
        }
      }
      return NextResponse.json({ success: true, results });
    }

    // 11a. Merge duplicate brand casings case-insensitively
    if (action === 'mergeDuplicateBrands') {
      const items = await sql`SELECT id, brand FROM items`;
      const orders = await sql`SELECT id, brand FROM orders`;
      
      const brandGroups: { [lowerBrand: string]: { [originalBrand: string]: number } } = {};
      
      const addOccurrence = (brand: string) => {
        if (!brand) return;
        const lower = brand.toLowerCase();
        if (!brandGroups[lower]) {
          brandGroups[lower] = {};
        }
        brandGroups[lower][brand] = (brandGroups[lower][brand] || 0) + 1;
      };
      
      items.forEach((item: any) => addOccurrence(item.brand));
      orders.forEach((order: any) => addOccurrence(order.brand));
      
      const mergedBrands: string[] = [];
      let updatedItemsCount = 0;
      let updatedOrdersCount = 0;
      const now = Date.now();
      
      for (const lower in brandGroups) {
        const casingsMap = brandGroups[lower];
        const casings = Object.keys(casingsMap);
        
        if (casings.length <= 1) {
          continue;
        }
        
        // Canonical selection logic:
        // 1. Sort by frequency count (descending)
        // 2. Tie-break by number of uppercase characters (descending)
        // 3. Alphabetical tie-break as fallback
        casings.sort((a, b) => {
          const countA = casingsMap[a];
          const countB = casingsMap[b];
          if (countA !== countB) {
            return countB - countA;
          }
          const upperA = (a.match(/[A-Z]/g) || []).length;
          const upperB = (b.match(/[A-Z]/g) || []).length;
          if (upperA !== upperB) {
            return upperB - upperA;
          }
          return a.localeCompare(b);
        });
        
        const canonical = casings[0];
        const duplicates = casings.slice(1);
        
        for (const duplicate of duplicates) {
          const itemUpdateRes = await sql`
            UPDATE items 
            SET brand = ${canonical}, "updatedAt" = ${now} 
            WHERE brand = ${duplicate}
            RETURNING id
          `;
          updatedItemsCount += itemUpdateRes.length;
          
          const orderUpdateRes = await sql`
            UPDATE orders 
            SET brand = ${canonical} 
            WHERE brand = ${duplicate}
            RETURNING id
          `;
          updatedOrdersCount += orderUpdateRes.length;
          
          mergedBrands.push(`${duplicate} → ${canonical}`);
        }
      }
      
      return NextResponse.json({
        success: true,
        mergedBrands,
        updatedItemsCount,
        updatedOrdersCount
      });
    }

    // 12. Wipe all tables
    if (action === 'wipeDatabase') {
      await sql`DELETE FROM items`;
      await sql`DELETE FROM orders`;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Database connection / query error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
