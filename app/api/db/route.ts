import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

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
    await ensureTables(sql);

    const body = await req.json();
    const { action, id, item, order, updates, barcode } = body;

    // 1. Fetch all items
    if (action === 'getItems') {
      const rows = await sql`SELECT * FROM items ORDER BY id DESC`;
      return NextResponse.json(rows.map(mapDbResult));
    }

    // 2. Fetch all orders
    if (action === 'getOrders') {
      const rows = await sql`SELECT * FROM orders ORDER BY id DESC`;
      return NextResponse.json(rows.map(mapDbResult));
    }

    // 3. Find unique item by barcode
    if (action === 'getItemByBarcode') {
      const rows = await sql`SELECT * FROM items WHERE barcode = ${barcode} LIMIT 1`;
      return NextResponse.json(rows.length > 0 ? mapDbResult(rows[0]) : null);
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

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Database connection / query error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
