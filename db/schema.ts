import sqlite3 from 'sqlite3';

const { Database } = sqlite3.verbose();

let db: sqlite3.Database | null = null;

// ─── Inicialización ──────────────────────────────────────────────────────────

/**
 * Abre (o crea) la base de datos en el path indicado.
 * Debe llamarse UNA vez desde main.ts, antes de registrar handlers IPC.
 */
export function initDB(dbPath: string): sqlite3.Database {
  if (db) return db;

  db = new Database(dbPath, (err: Error | null) => {
    if (err) console.error('[DB] Error al abrir la base de datos:', err.message);
    else     console.log('[DB] Base de datos abierta en:', dbPath);
  });

  db.serialize(() => {
    db!.run('PRAGMA journal_mode = WAL');
    db!.run('PRAGMA synchronous  = NORMAL');
    db!.run('PRAGMA cache_size   = -8000');
    db!.run('PRAGMA temp_store   = MEMORY');
    db!.run('PRAGMA foreign_keys = ON');

    _createTables();

    // Fence: cuando este SELECT corre, todos los CREATE TABLE ya terminaron.
    db!.run('SELECT 1', () => _runMigrationsAndSeed());
  });

  return db;
}

export function getDB(): sqlite3.Database {
  if (!db) throw new Error('[DB] La base de datos no ha sido inicializada. Llama a initDB() primero.');
  return db;
}

export function closeDB(): void {
  if (db) {
    db.close((err: Error | null) => {
      if (err) console.error('[DB] Error al cerrar:', err.message);
    });
    db = null;
  }
}

// ─── Creación de tablas ──────────────────────────────────────────────────────

function _createTables(): void {
  db!.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL UNIQUE,
      created_at DATETIME DEFAULT (datetime('now'))
    )
  `);

  db!.run(`
    CREATE TABLE IF NOT EXISTS products (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      category_id INTEGER REFERENCES categories(id),
      price       REAL    NOT NULL,
      active      INTEGER NOT NULL DEFAULT 1,
      created_at  DATETIME DEFAULT (datetime('now'))
    )
  `);
  db!.run('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)');
  db!.run('CREATE INDEX IF NOT EXISTS idx_products_active   ON products(active)');

  db!.run(`
    CREATE TABLE IF NOT EXISTS daily_sessions (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      date            DATE    NOT NULL UNIQUE,
      status          TEXT    NOT NULL DEFAULT 'open',
      total_cash      REAL    NOT NULL DEFAULT 0,
      total_transfer  REAL    NOT NULL DEFAULT 0,
      total_sales     REAL    NOT NULL DEFAULT 0,
      invoice_count   INTEGER NOT NULL DEFAULT 0,
      closed_at       DATETIME,
      synced          INTEGER NOT NULL DEFAULT 0
    )
  `);

  db!.run(`
    CREATE TABLE IF NOT EXISTS invoices (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number  TEXT    NOT NULL UNIQUE,
      day_id          INTEGER NOT NULL REFERENCES daily_sessions(id),
      total           REAL    NOT NULL,
      payment_method  TEXT    NOT NULL,
      cash_amount     REAL    NOT NULL DEFAULT 0,
      transfer_amount REAL    NOT NULL DEFAULT 0,
      cash_received   REAL    NOT NULL DEFAULT 0,
      created_at      DATETIME DEFAULT (datetime('now'))
    )
  `);
  db!.run('CREATE INDEX IF NOT EXISTS idx_invoices_day    ON invoices(day_id)');
  db!.run('CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number)');

  db!.run(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id   INTEGER NOT NULL REFERENCES invoices(id),
      product_id   INTEGER NOT NULL REFERENCES products(id),
      product_name TEXT    NOT NULL,
      unit_price   REAL    NOT NULL,
      quantity     INTEGER NOT NULL,
      subtotal     REAL    NOT NULL
    )
  `);
  db!.run('CREATE INDEX IF NOT EXISTS idx_items_invoice ON invoice_items(invoice_id)');
}

// ─── Migraciones + Seed ──────────────────────────────────────────────────────

function _runMigrationsAndSeed(): void {
  db!.all('PRAGMA table_info(products)', (err: Error | null, cols: Array<{ name: string }>) => {
    if (err || !cols) {
      _seedData();
      return;
    }

    const hasCategoryId = cols.some(c => c.name === 'category_id');
    if (!hasCategoryId) {
      db!.run(
        'ALTER TABLE products ADD COLUMN category_id INTEGER REFERENCES categories(id)',
        (err: Error | null) => {
          if (err) console.error('[DB] Migration error (category_id):', err.message);
          else     console.log('[DB] Migration aplicada: products.category_id agregado');
          _seedData();
        }
      );
    } else {
      _seedData();
    }
  });
}

function _seedData(): void {
  db!.get('SELECT COUNT(*) AS count FROM categories', (err: Error | null, row: { count: number }) => {
    if (err || row.count > 0) return;

    db!.serialize(() => {
      const insertCat = db!.prepare('INSERT INTO categories (name) VALUES (?)');
      insertCat.run('Paletas');
      insertCat.run('Conos');
      insertCat.run('Helados');
      insertCat.finalize();

      db!.run(`
        INSERT INTO products (name, category_id, price) VALUES
          ('Paleta de Chocolate',  1, 25.00),
          ('Paleta de Fresa',      1, 25.00),
          ('Cono de Vainilla',     2, 30.00),
          ('Cono de Chocolate',    2, 30.00),
          ('Helado de Mango',      3, 35.00)
      `, (err: Error | null) => {
        if (err) console.error('[DB] Error al insertar seed data:', err.message);
        else     console.log('[DB] Seed data insertada: 3 categorías, 5 productos de prueba');
      });
    });
  });
}
