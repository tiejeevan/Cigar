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
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        category TEXT DEFAULT 'Cigarillos',
        brand TEXT NOT NULL,
        flavor TEXT NOT NULL,
        "packType" TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        "reorderThreshold" INTEGER NOT NULL DEFAULT 10,
        "boxSize" INTEGER NOT NULL DEFAULT 15,
        image TEXT,
        barcode TEXT,
        price NUMERIC(10, 2) DEFAULT 0.00,
        flag TEXT,
        "updatedAt" BIGINT NOT NULL
      )
    `;
  } catch (err) {
    console.error('Error creating items table:', err);
  }

  // Dynamically add boxSize and flag if missing
  try {
    const colsResult = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='items' AND column_name IN ('boxSize', 'flag')
    `;
    const cols = colsResult.map((r: any) => r.column_name);
    if (!cols.includes('boxSize')) {
      await sql`ALTER TABLE items ADD COLUMN "boxSize" INTEGER NOT NULL DEFAULT 15`;
    }
    if (!cols.includes('flag')) {
      await sql`ALTER TABLE items ADD COLUMN flag TEXT`;
    }
  } catch (err) {
    console.error('Error adding columns:', err);
  }

  // Schema for orders table
  try {
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
  } catch (err) {
    console.error('Error creating orders table:', err);
  }

  // Schema for employees table
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        pin TEXT NOT NULL,
        "createdAt" BIGINT NOT NULL
      )
    `;
  } catch (err) {
    console.error('Error creating employees table:', err);
  }

  // Dynamically add columns to orders table if missing
  try {
    const colsResult = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='orders'
    `;
    const cols = colsResult.map((r: any) => r.column_name.toLowerCase());
    if (!cols.includes('addedby')) {
      await sql`ALTER TABLE orders ADD COLUMN "addedBy" TEXT`;
    }
    if (!cols.includes('completedby')) {
      await sql`ALTER TABLE orders ADD COLUMN "completedBy" TEXT`;
    }
    if (!cols.includes('completedat')) {
      await sql`ALTER TABLE orders ADD COLUMN "completedAt" BIGINT`;
    }
    if (!cols.includes('listid')) {
      await sql`ALTER TABLE orders ADD COLUMN "listId" TEXT`;
    }
    if (!cols.includes('urgency')) {
      await sql`ALTER TABLE orders ADD COLUMN urgency TEXT DEFAULT 'medium'`;
    }
    if (!cols.includes('timeframe')) {
      await sql`ALTER TABLE orders ADD COLUMN timeframe TEXT DEFAULT '1week'`;
    }
    if (!cols.includes('estimatedprice')) {
      await sql`ALTER TABLE orders ADD COLUMN "estimatedPrice" NUMERIC(10, 2) DEFAULT 0.00`;
    }
    if (!cols.includes('notes')) {
      await sql`ALTER TABLE orders ADD COLUMN notes TEXT DEFAULT ''`;
    }
    if (!cols.includes('approvedby')) {
      await sql`ALTER TABLE orders ADD COLUMN "approvedBy" TEXT`;
    }
    if (!cols.includes('approvedat')) {
      await sql`ALTER TABLE orders ADD COLUMN "approvedAt" BIGINT`;
    }
    if (!cols.includes('receivedby')) {
      await sql`ALTER TABLE orders ADD COLUMN "receivedBy" TEXT`;
    }
    if (!cols.includes('receivedat')) {
      await sql`ALTER TABLE orders ADD COLUMN "receivedAt" BIGINT`;
    }
  } catch (err) {
    console.error('Error adding columns to orders:', err);
  }

  // Schema for order_sessions table
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS order_sessions (
        id SERIAL PRIMARY KEY,
        "listId" TEXT UNIQUE NOT NULL,
        "sessionName" TEXT,
        "vendorName" TEXT,
        "completedBy" TEXT NOT NULL,
        "completedAt" BIGINT NOT NULL,
        notes TEXT
      )
    `;
  } catch (err) {
    console.error('Error creating order_sessions table:', err);
  }

  // Schema for settings table
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        "updatedBy" TEXT,
        "updatedAt" BIGINT NOT NULL
      )
    `;
  } catch (err) {
    console.error('Error creating settings table:', err);
  }

  // Ensure role column exists on employees table
  try {
    const colsResult = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='employees'
    `;
    const cols = colsResult.map((r: any) => r.column_name.toLowerCase());
    if (!cols.includes('role')) {
      await sql`ALTER TABLE employees ADD COLUMN role TEXT DEFAULT 'employee'`;
    }
  } catch (err) {
    console.error('Error adding role column to employees:', err);
  }

  // Pre-populate setting default
  try {
    const exists = await sql`SELECT key FROM settings WHERE key = 'isInventoryDisabled'`;
    if (exists.length === 0) {
      await sql`
        INSERT INTO settings (key, value, "updatedBy", "updatedAt")
        VALUES ('isInventoryDisabled', 'false', 'System', ${Date.now()})
      `;
    }
    const existsPurchasing = await sql`SELECT key FROM settings WHERE key = 'isPurchasingDisabled'`;
    if (existsPurchasing.length === 0) {
      await sql`
        INSERT INTO settings (key, value, "updatedBy", "updatedAt")
        VALUES ('isPurchasingDisabled', 'false', 'System', ${Date.now()})
      `;
    }
  } catch (err) {
    console.error('Error pre-populating settings table:', err);
  }
}

// Convert DB returned fields into accurate numbers/types for Javascript
function mapDbResult(row: any) {
  if (!row) return row;
  const mapped = { ...row };
  if ('price' in mapped && mapped.price !== null) {
    mapped.price = parseFloat(mapped.price);
  }
  if ('estimatedPrice' in mapped && mapped.estimatedPrice !== null) {
    mapped.estimatedPrice = parseFloat(mapped.estimatedPrice);
  }
  if ('quantity' in mapped) {
    mapped.quantity = parseInt(mapped.quantity, 10);
  }
  if ('reorderThreshold' in mapped) {
    mapped.reorderThreshold = parseInt(mapped.reorderThreshold, 10);
  }
  if ('boxSize' in mapped) {
    mapped.boxSize = parseInt(mapped.boxSize, 10);
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
  if ('completedAt' in mapped && mapped.completedAt !== null) {
    mapped.completedAt = Number(mapped.completedAt);
  }
  if ('approvedAt' in mapped && mapped.approvedAt !== null) {
    mapped.approvedAt = Number(mapped.approvedAt);
  }
  if ('receivedAt' in mapped && mapped.receivedAt !== null) {
    mapped.receivedAt = Number(mapped.receivedAt);
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
    const { action, id, item, order, updates, barcode, name, pin, ids, completedBy, key, value, updatedBy } = body;

    // 1. Fetch all items (excluding image to optimize payload)
    if (action === 'getItems') {
      const rows = await sql`
        SELECT id, category, brand, flavor, "packType", quantity, "reorderThreshold", "boxSize", barcode, price, flag, "updatedAt"
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

    // 2.1 Fetch all system settings
    if (action === 'getSettings') {
      const rows = await sql`SELECT key, value, "updatedBy", "updatedAt" FROM settings`;
      return NextResponse.json(rows.map(mapDbResult));
    }

    // 2.2 Update system setting
    if (action === 'updateSetting') {
      if (!key || value === undefined || !updatedBy) {
        return NextResponse.json({ error: 'Missing key, value, or updatedBy' }, { status: 400 });
      }
      const rows = await sql`
        INSERT INTO settings (key, value, "updatedBy", "updatedAt")
        VALUES (${key}, ${value}, ${updatedBy}, ${Date.now()})
        ON CONFLICT (key) 
        DO UPDATE SET value = EXCLUDED.value, "updatedBy" = EXCLUDED."updatedBy", "updatedAt" = EXCLUDED."updatedAt"
        RETURNING *
      `;
      return NextResponse.json(mapDbResult(rows[0]));
    }

    // 2a. Fetch all employees
    if (action === 'getEmployees') {
      const rows = await sql`SELECT id, name, role, "createdAt" FROM employees ORDER BY name ASC`;
      return NextResponse.json(rows.map(mapDbResult));
    }

    // 2b. Register employee profile with 4-digit PIN
    if (action === 'registerEmployee') {
      if (!name || !pin) {
        return NextResponse.json({ error: 'Missing name or pin' }, { status: 400 });
      }
      const exists = await sql`SELECT id FROM employees WHERE LOWER(name) = LOWER(${name}) LIMIT 1`;
      if (exists.length > 0) {
        return NextResponse.json({ error: 'Employee name already exists' }, { status: 400 });
      }
      const role = body.role || 'employee';
      const rows = await sql`
        INSERT INTO employees (name, pin, role, "createdAt")
        VALUES (${name}, ${pin}, ${role}, ${Date.now()})
        RETURNING id, name, role, "createdAt"
      `;
      return NextResponse.json(mapDbResult(rows[0]));
    }

    // 2c. Verify employee PIN
    if (action === 'verifyEmployeePin') {
      if (!name || !pin) {
        return NextResponse.json({ error: 'Missing name or pin' }, { status: 400 });
      }
      const rows = await sql`SELECT id, name, role FROM employees WHERE name = ${name} AND pin = ${pin} LIMIT 1`;
      if (rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Incorrect PIN' });
      }
      return NextResponse.json({ success: true, employee: mapDbResult(rows[0]) });
    }

    // 2d. Complete active list of orders
    if (action === 'completeActiveOrders') {
      if (!Array.isArray(ids) || ids.length === 0 || !completedBy) {
        return NextResponse.json({ error: 'Missing ids or completedBy' }, { status: 400 });
      }
      const listId = `list_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const completedAt = Date.now();
      const sessionName = body.sessionName || `Restock Session - ${new Date(completedAt).toLocaleDateString()}`;
      const vendorName = body.vendorName || 'General Supplier';
      const sessionNotes = body.notes || '';
      
      const results = [];
      for (const orderId of ids) {
        const updated = await sql`
          UPDATE orders
          SET status = 'ordered', "completedBy" = ${completedBy}, "completedAt" = ${completedAt}, "listId" = ${listId}
          WHERE id = ${orderId}
          RETURNING *
        `;
        results.push(mapDbResult(updated[0]));
      }

      // Record order session in DB
      try {
        await sql`
          INSERT INTO order_sessions ("listId", "sessionName", "vendorName", "completedBy", "completedAt", notes)
          VALUES (${listId}, ${sessionName}, ${vendorName}, ${completedBy}, ${completedAt}, ${sessionNotes})
        `;
      } catch (err) {
        console.error('Error inserting into order_sessions:', err);
      }

      return NextResponse.json({ success: true, listId, completedAt, results });
    }

    // 2e. Fetch all order sessions
    if (action === 'getOrderSessions') {
      const rows = await sql`SELECT * FROM order_sessions ORDER BY "completedAt" DESC`;
      return NextResponse.json(rows.map(mapDbResult));
    }

    // 3. Find unique item by barcode (excluding image)
    if (action === 'getItemByBarcode') {
      const rows = await sql`
        SELECT id, category, brand, flavor, "packType", quantity, "reorderThreshold", "boxSize", barcode, price, flag, "updatedAt"
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
        INSERT INTO items (category, brand, flavor, "packType", quantity, "reorderThreshold", "boxSize", image, barcode, price, flag, "updatedAt")
        VALUES (
          ${item.category || 'Cigarillos'}, 
          ${item.brand}, 
          ${item.flavor}, 
          ${item.packType || 'Single'}, 
          ${parseInt(item.quantity, 10) || 0}, 
          ${parseInt(item.reorderThreshold, 10) || 10}, 
          ${parseInt(item.boxSize, 10) || 15},
          ${item.image || null}, 
          ${item.barcode || null}, 
          ${parseFloat(item.price) || 0.00}, 
          ${item.flag || null},
          ${Date.now()}
        )
        RETURNING *
      `;
      return NextResponse.json(mapDbResult(rows[0]));
    }

    // 5. Create new purchasing order
    if (action === 'addOrder') {
      const rows = await sql`
        INSERT INTO orders ("inventoryId", category, brand, flavor, "packType", quantity, status, "createdAt", "addedBy", urgency, timeframe, "estimatedPrice", notes)
        VALUES (
          ${order.inventoryId || null}, 
          ${order.category || 'Cigarillos'}, 
          ${order.brand}, 
          ${order.flavor}, 
          ${order.packType || 'Single'}, 
          ${parseInt(order.quantity, 10) || 1}, 
          ${order.status || 'pending'}, 
          ${Date.now()},
          ${order.addedBy || null},
          ${order.urgency || 'medium'},
          ${order.timeframe || '1week'},
          ${order.estimatedPrice || 0.00},
          ${order.notes || ''}
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
      const boxSize = updates.boxSize !== undefined ? parseInt(updates.boxSize, 10) : parseInt(existing.boxSize || 15, 10);
      const image = updates.image !== undefined ? updates.image : existing.image;
      const barcode = updates.barcode !== undefined ? updates.barcode : existing.barcode;
      const price = updates.price !== undefined ? parseFloat(updates.price) : parseFloat(existing.price);
      const flag = updates.flag !== undefined ? updates.flag : existing.flag;
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
          "boxSize" = ${boxSize},
          image = ${image}, 
          barcode = ${barcode}, 
          price = ${price}, 
          flag = ${flag},
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
      const urgency = updates.urgency !== undefined ? updates.urgency : existing.urgency;
      const timeframe = updates.timeframe !== undefined ? updates.timeframe : existing.timeframe;
      const estimatedPrice = updates.estimatedPrice !== undefined ? parseFloat(updates.estimatedPrice) : (existing.estimatedPrice !== null ? parseFloat(existing.estimatedPrice) : 0.00);
      const notes = updates.notes !== undefined ? updates.notes : existing.notes;
      const approvedBy = updates.approvedBy !== undefined ? updates.approvedBy : existing.approvedBy;
      const approvedAt = updates.approvedAt !== undefined ? (updates.approvedAt !== null ? Number(updates.approvedAt) : null) : (existing.approvedAt !== null ? Number(existing.approvedAt) : null);
      const completedBy = updates.completedBy !== undefined ? updates.completedBy : existing.completedBy;
      const completedAt = updates.completedAt !== undefined ? (updates.completedAt !== null ? Number(updates.completedAt) : null) : (existing.completedAt !== null ? Number(existing.completedAt) : null);
      const receivedBy = updates.receivedBy !== undefined ? updates.receivedBy : existing.receivedBy;
      const receivedAt = updates.receivedAt !== undefined ? (updates.receivedAt !== null ? Number(updates.receivedAt) : null) : (existing.receivedAt !== null ? Number(existing.receivedAt) : null);

      const updateRows = await sql`
        UPDATE orders
        SET
          "inventoryId" = ${inventoryId},
          category = ${category},
          brand = ${brand},
          flavor = ${flavor},
          "packType" = ${packType},
          quantity = ${quantity},
          status = ${status},
          urgency = ${urgency},
          timeframe = ${timeframe},
          "estimatedPrice" = ${estimatedPrice},
          notes = ${notes},
          "approvedBy" = ${approvedBy},
          "approvedAt" = ${approvedAt},
          "completedBy" = ${completedBy},
          "completedAt" = ${completedAt},
          "receivedBy" = ${receivedBy},
          "receivedAt" = ${receivedAt}
        WHERE id = ${id}
        RETURNING *
      `;

      // Auto-increment quantity in items if status changes to 'received'
      if (status === 'received' && existing.status !== 'received') {
        const targetInventoryId = inventoryId || existing.inventoryId;
        if (targetInventoryId) {
          const invItem = await sql`SELECT quantity FROM items WHERE id = ${targetInventoryId} LIMIT 1`;
          if (invItem.length > 0) {
            const currentQty = parseInt(invItem[0].quantity, 10) || 0;
            const newQty = currentQty + quantity;
            await sql`
              UPDATE items 
              SET quantity = ${newQty}, "updatedAt" = ${Date.now()} 
              WHERE id = ${targetInventoryId}
            `;
          }
        }
      }

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
            const boxSize = parseInt(incoming.boxSize, 10) || parseInt(existing.boxSize, 10) || 15;
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
                "boxSize" = ${boxSize},
                image = ${incoming.image !== undefined ? incoming.image : existing.image}, 
                price = ${price}, 
                flag = ${incoming.flag !== undefined ? incoming.flag : existing.flag},
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
          const boxSize = parseInt(incoming.boxSize, 10) || 15;
          const price = parseFloat(incoming.price) || 0.00;
          await sql`
            INSERT INTO items (category, brand, flavor, "packType", quantity, "reorderThreshold", "boxSize", image, barcode, price, flag, "updatedAt")
            VALUES (
              ${incoming.category || 'Cigarillos'}, 
              ${incoming.brand}, 
              ${incoming.flavor}, 
              ${incoming.packType || 'Single'}, 
              ${quantity}, 
              ${reorderThreshold}, 
              ${boxSize},
              ${incoming.image || null}, 
              ${incoming.barcode || null}, 
              ${price}, 
              ${incoming.flag || null},
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
      await sql`DELETE FROM employees`;
      await sql`UPDATE settings SET value = 'false', "updatedBy" = 'System', "updatedAt" = ${Date.now()} WHERE key IN ('isInventoryDisabled', 'isPurchasingDisabled')`;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Database connection / query error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
