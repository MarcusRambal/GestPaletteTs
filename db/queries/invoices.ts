import { getDB } from '../schema';
import type { Invoice } from '../../types/types';


export function createInvoice(invoiceData: Invoice): Promise<{ success: boolean; invoiceId: number; invoiceNumber: string }> {
  return new Promise((resolve, reject) => {
    const db = getDB();

    // 1. Obtener la sesión diaria activa (el 'day_id' abierto)
    db.get<{ id: number }>(
      `SELECT id FROM daily_sessions WHERE status = 'open' LIMIT 1`,
      [],
      (err, session) => {
        if (err) {
          return reject(new Error("Error al buscar sesión diaria activa: " + err.message));
        }
        if (!session) {
          return reject(new Error("No hay ninguna sesión de caja abierta. Abra caja antes de facturar."));
        }

        const dayId = session.id;

        // 2. Generar un número de factura único consecutivo
        const timestamp = Date.now();
        const invoiceNumber = `FAC-${timestamp}`;

        // 3. Iniciar Transacción secuencial con serialize para asegurar consistencia
        db.serialize(() => {
          db.run("BEGIN TRANSACTION");

          // Preparar inserción de la cabecera de la factura
          const insertInvoiceStmt = db.prepare(`
            INSERT INTO invoices (
              invoice_number, day_id, total, payment_method, 
              cash_amount, transfer_amount, cash_received
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `);

          // Nota: Usamos una función tradicional 'function' para preservar el contexto 'this' que tiene 'lastID'
          insertInvoiceStmt.run(
            [
              invoiceNumber,
              dayId,
              invoiceData.total,
              invoiceData.payment_method,
              invoiceData.cash_amount,
              invoiceData.transfer_amount,
              invoiceData.cash_received
            ],
            function (this: any, err: Error | null) {
              if (err) {
                db.run("ROLLBACK");
                insertInvoiceStmt.finalize();
                return reject(new Error("Error al registrar la cabecera de la factura: " + err.message));
              }

              // Obtenemos el ID generado por SQLite para esta inserción
              const invoiceId = this.lastID; 

              // Preparar la inserción de los ítems de la factura
              const insertItemStmt = db.prepare(`
                INSERT INTO invoice_items (
                  invoice_id, product_id, product_name, unit_price, quantity, subtotal
                ) VALUES (?, ?, ?, ?, ?, ?)
              `);

              let itemErrorOccurred = false;
              let itemsPending = invoiceData.items.length;

              // Si por alguna razón la factura no tiene ítems, cancelamos
              if (itemsPending === 0) {
                db.run("ROLLBACK");
                insertInvoiceStmt.finalize();
                insertItemStmt.finalize();
                return reject(new Error("La factura debe tener al menos un producto."));
              }

              for (const item of invoiceData.items) {
                insertItemStmt.run(
                  [
                    invoiceId,
                    item.product_id,
                    item.product_name,
                    item.unit_price,
                    item.quantity,
                    item.subtotal
                  ],
                  (itemErr) => {
                    itemsPending--;

                    if (itemErr && !itemErrorOccurred) {
                      itemErrorOccurred = true;
                      db.run("ROLLBACK");
                      insertInvoiceStmt.finalize();
                      insertItemStmt.finalize();
                      return reject(new Error("Error al insertar ítem de factura: " + itemErr.message));
                    }

                    // Una vez que todos los inserts asíncronos terminaron sin fallos
                    if (itemsPending === 0 && !itemErrorOccurred) {
                      // Finalizar las consultas preparadas antes de hacer el commit
                      insertInvoiceStmt.finalize();
                      insertItemStmt.finalize();

                      db.run("COMMIT", (commitErr) => {
                        if (commitErr) {
                          db.run("ROLLBACK");
                          return reject(new Error("Error al confirmar transacción (COMMIT): " + commitErr.message));
                        }
                        resolve({ success: true, invoiceId, invoiceNumber });
                      });
                    }
                  }
                );
              }
            }
          );
        });
      }
    );
  });
}