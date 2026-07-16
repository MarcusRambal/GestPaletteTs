import { getDB } from '../schema';

/**
 * Verifica si hay una sesión abierta para el día de hoy.
 * Si no existe, crea una nueva sesión de forma automática.
 */
export function ensureDailySession(): Promise<number> {
  return new Promise((resolve, reject) => {
    const db = getDB();
    // Obtenemos la fecha de hoy en formato local YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];

    // 1. Buscamos si ya existe una sesión abierta (sin importar la fecha)
    db.get<{ id: number; date: string }>(
      `SELECT id, date FROM daily_sessions WHERE status = 'open' LIMIT 1`,
      [],
      (err, activeSession) => {
        if (err) {
          return reject(new Error("Error al verificar sesiones activas: " + err.message));
        }

        if (activeSession) {
          // Si hay una sesión abierta, la usamos directamente (incluso si es de ayer trasnochado)
          console.log(`[Session] Usando sesión abierta existente ID: ${activeSession.id} (${activeSession.date})`);
          return resolve(activeSession.id);
        }

        // 2. Si no hay ninguna sesión abierta en absoluto, creamos una nueva para el día de hoy
        db.run(
          `INSERT INTO daily_sessions (date, status) VALUES (?, 'open')`,
          [today],
          function (this: any, insertErr) {
            if (insertErr) {
              // Si falla por restricción UNIQUE (ya existía una cerrada para hoy), 
              // significa que hoy ya abrieron y cerraron. En ese caso podríamos reabrirla o forzar la apertura de otra jornada.
              // Por ahora, para simplificar el auto-inicio, resolvemos el error creando un registro o manejándolo:
              return reject(new Error("Error al abrir nueva sesión automática: " + insertErr.message));
            }
            
            const newSessionId = this.lastID;
            console.log(`[Session] Nueva sesión diaria abierta automáticamente. ID: ${newSessionId} para el día ${today}`);
            resolve(newSessionId);
          }
        );
      }
    );
  });
}