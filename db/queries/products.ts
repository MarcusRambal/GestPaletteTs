import { getDB } from '../schema';
import type { Product } from '../../types/types';

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
