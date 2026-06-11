/**
 * Script de seed — agrega 20 productos de prueba a la BD existente.
 * Ejecutar desde la raíz del proyecto: node scripts/seed-products.js
 */

const path = require('path');
const os   = require('os');
const sqlite3 = require('sqlite3').verbose();

// Ruta donde Electron guarda la BD (app.getPath('userData'))
const DB_PATH = path.join(
  os.homedir(),
  'AppData', 'Roaming', 'gestpalettets', 'gestpalette.db'
);

console.log('[seed] Conectando a:', DB_PATH);
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('[seed] No se pudo abrir la BD:', err.message);
    console.error('[seed] Asegúrate de haber ejecutado la app al menos una vez.');
    process.exit(1);
  }
});

db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');

  // Asegura que las categorías base existen
  const cats = ['Paletas', 'Conos', 'Helados', 'Especiales'];
  const insertCat = db.prepare(
    'INSERT OR IGNORE INTO categories (name) VALUES (?)'
  );
  cats.forEach(c => insertCat.run(c));
  insertCat.finalize();

  db.run('SELECT 1', () => {
    // Obtener IDs de categorías
    db.all('SELECT id, name FROM categories', (err, rows) => {
      if (err) { console.error(err); return; }

      const catId = {};
      rows.forEach(r => { catId[r.name] = r.id; });

      const productos = [
        // Paletas
        { name: 'Paleta de Tamarindo',       cat: 'Paletas',    price: 25.00 },
        { name: 'Paleta de Limón con Chile',  cat: 'Paletas',    price: 25.00 },
        { name: 'Paleta de Coco',             cat: 'Paletas',    price: 25.00 },
        { name: 'Paleta de Sandía',           cat: 'Paletas',    price: 25.00 },
        { name: 'Paleta de Guanábana',        cat: 'Paletas',    price: 25.00 },
        { name: 'Paleta de Maracuyá',         cat: 'Paletas',    price: 25.00 },
        // Conos
        { name: 'Cono de Fresa',              cat: 'Conos',      price: 30.00 },
        { name: 'Cono de Mango',              cat: 'Conos',      price: 30.00 },
        { name: 'Cono de Nutella',            cat: 'Conos',      price: 35.00 },
        { name: 'Cono de Oreo',               cat: 'Conos',      price: 35.00 },
        // Helados
        { name: 'Helado de Vainilla',         cat: 'Helados',    price: 35.00 },
        { name: 'Helado de Chocolate',        cat: 'Helados',    price: 35.00 },
        { name: 'Helado de Fresa',            cat: 'Helados',    price: 35.00 },
        { name: 'Helado de Pistacho',         cat: 'Helados',    price: 40.00 },
        { name: 'Helado de Caramelo',         cat: 'Helados',    price: 40.00 },
        // Especiales
        { name: 'Copa de Helado Clásica',     cat: 'Especiales', price: 55.00 },
        { name: 'Copa Brownie con Helado',    cat: 'Especiales', price: 70.00 },
        { name: 'Malteada de Chocolate',      cat: 'Especiales', price: 65.00 },
        { name: 'Malteada de Fresa',          cat: 'Especiales', price: 65.00 },
        { name: 'Sundae de Cajeta',           cat: 'Especiales', price: 60.00 },
      ];

      const stmt = db.prepare(
        'INSERT INTO products (name, category_id, price, active) VALUES (?, ?, ?, 1)'
      );
      let count = 0;
      productos.forEach(p => {
        const cid = catId[p.cat];
        if (!cid) { console.warn(`[seed] Categoría no encontrada: ${p.cat}`); return; }
        stmt.run(p.name, cid, p.price, (err) => {
          if (err) console.error(`[seed] Error en "${p.name}":`, err.message);
          else { count++; console.log(`[seed] ✓ ${p.name}`); }
        });
      });
      stmt.finalize(() => {
        console.log(`\n[seed] Listo — ${count} productos insertados.`);
        db.close();
      });
    });
  });
});
