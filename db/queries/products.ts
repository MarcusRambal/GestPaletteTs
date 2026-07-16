import { getDB } from '../schema';
import type { Product, Category } from '../../types/types';

/**
 * Devuelve todos los productos activos con su nombre de categoría.
 * Usado por el handler IPC 'get-products'.
 */
export function getProducts(): Promise<Product[]> {
  return new Promise((resolve, reject) => {
    getDB().all<Product>(
      `SELECT
         p.id,
         p.name,
         p.price,
         p.active,
         p.category_id,
         c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.active = 1
       ORDER BY c.name, p.name`,
      (err, rows) => {
        if (err) reject(err);
        else     resolve(rows);
      }
    );
  });
}

/**
 * Devuelve todos los productos (activos e inactivos) para el panel de admin.
 */
export function getAllProducts(): Promise<Product[]> {
  return new Promise((resolve, reject) => {
    getDB().all<Product>(
      `SELECT
         p.id,
         p.name,
         p.price,
         p.active,
         p.category_id,
         c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       ORDER BY c.name, p.name`,
      (err, rows) => {
        if (err) reject(err);
        else     resolve(rows);
      }
    );
  });
}


/**
 * Devuelve todas las categorías registradas en el sistema ordenadas alfabéticamente.
 * Usado por el panel de filtros y la gestión de productos.
 */
export function getCategories(): Promise<Category[]> {
  return new Promise((resolve, reject) => {
    getDB().all<Category>(
      `SELECT 
         id, 
         name,
         color
       FROM categories 
       ORDER BY name ASC`,
      (err, rows) => {
        if (err) {
          console.error("Error al obtener las categorias:", err);
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
}

export function createCategory(category: { name: string; color: string }): Promise<number> {
  return new Promise((resolve, reject) => {
    const query = `INSERT INTO categories (name, color) VALUES (?, ?)`;

    // Usamos db.run porque es una mutación (INSERT). 
    // "this.lastID" nos da el ID autoincremental generado por SQLite.
    getDB().run(query, [category.name, category.color], function (err) {
      if (err) {
        console.error("Error al insertar categoría en SQLite:", err);
        reject(err);
        return;
      }
      
      // Retornamos el ID asignado en la base de datos
      resolve(this.lastID); 
    });
  });
}

export function createProduct(product: {name: string;price: number;category_id: number;}): Promise<number> {
  return new Promise((resolve, reject) => {
    // Query corregido alineado con tus columnas exactas
    const query = `
      INSERT INTO products (name, price, category_id) 
      VALUES (?, ?, ?)
    `;

    const params = [product.name, product.price, product.category_id];

    getDB().run(query, params, function (err) {
      if (err) {
        console.error("Error al ejecutar el INSERT de producto en SQLite:", err);
        reject(err);
        return;
      }
      resolve(this.lastID);
    });
  });
}


export function editProduct(productId: number, updatedData: { name: string; price: number; category_id: number; }): Promise<void> {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE products 
      SET name = ?, price = ?, category_id = ? 
      WHERE id = ?
    `;
    

    const params = [updatedData.name, updatedData.price, updatedData.category_id, productId];

    getDB().run(query, params, function (err) {

      if (err) {
        console.error("Error al actualizar el producto en SQLite:", err);
        reject(err);
        return;
      }

      

      resolve();
    });
  });
} 

export function disableProduct(productId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE products 
      SET active = 0 
      WHERE id = ?
    `;

    getDB().run(query, [productId], function (err) {
      if (err) {
        console.error("Error al desactivar el producto en SQLite:", err);
        reject(err);
        return;
      }
      resolve();
    });
  });
}

export function activateProduct(productId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE products 
      SET active = 1 
      WHERE id = ?
    `;

    getDB().run(query, [productId], function (err) {
      if (err) {
        console.error("Error al activar el producto en SQLite:", err);
        reject(err);
        return;
      }
      resolve();
    });
  });
}


export function getDisabledProducts(): Promise<Product[]> {
  return new Promise((resolve, reject) => {
    getDB().all<Product>(
      `SELECT
         p.id,
         p.name,
         p.price,
         p.active,
         p.category_id,
         c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.active = 0
       ORDER BY c.name, p.name`,
      (err, rows) => {
        if (err) reject(err);
        else     resolve(rows);
      }
    );
  });
}