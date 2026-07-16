import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { initDB, closeDB } from '../db/schema';
import { getProducts, getCategories, createCategory, createProduct, editProduct, disableProduct, activateProduct , getDisabledProducts } from '../db/queries/products';
import { createInvoice } from '../db/queries/invoices';
import { ensureDailySession } from '../db/queries/dailySessions';
// ─── Optimizaciones de rendimiento ────────────────────────────────────────────
// IMPORTANTE: estas flags deben llamarse ANTES de app.whenReady()

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('renderer-process-limit', '1');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=256');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
app.commandLine.appendSwitch('disable-dev-shm-usage');
app.commandLine.appendSwitch('disable-extensions');

// ─── IPC Handlers ────────────────────────────────────────────────────────────

function registerIPCHandlers(): void {
  
  // 📦 Obtener Catálogo de Productos
  ipcMain.handle('get-products', async () => {
    try {
      return await getProducts();
    } catch (error) {
      console.error("Error en el canal IPC 'get-products':", error);
      throw error; // Devuelve el error al proceso Renderer de forma segura
    }
  });

  // 🗂️ Obtener Catálogo de Categorías
  ipcMain.handle('get-categories', async () => {
    try {
      return await getCategories();
    } catch (error) {
      console.error("Error en el canal IPC 'get-categories':", error);
      throw error;
    }
  });

  // ✨ Crear Nueva Categoría
  ipcMain.handle('create-category', async (_event, category) => {
    try {
      return await createCategory(category);
    } catch (error) {
      console.error("Error en el canal IPC 'create-category':", error);
      throw error;
    }
  });

  // 🍦 Crear Nuevo Producto
  ipcMain.handle('create-product', async (_event, product) => {
    try {
      const newId = await createProduct(product);
      return newId; 
    } catch (error) {
      console.error("Error en el canal IPC 'create-product':", error);
      throw error;
    }
  });

  // 📝 Actualizar Producto Existent
  ipcMain.handle('update-product', async (_event, productId, updatedData) => {
    try {
      await editProduct(productId, updatedData);
      return; 
    } catch (error) {
      console.error("Error en el canal IPC 'update-product':", error);
      throw error;
    }
  });

  // 🛑 Obtener Productos Deshabilitados
  ipcMain.handle('get-disabled-products', async () => {
    try {
      return await getDisabledProducts(); // true indica que queremos productos deshabilitados
    } catch (error) {
      console.error("Error en el canal IPC 'get-disabled-products':", error);
      throw error;
    }
  });

  // 🔄 Cambiar Estado Activo/Inactivo de un Product
  ipcMain.handle('toggle-active-state', async (_event, productId, active) => {
    try {
      if (active === 0) {
        await disableProduct(productId);
      } else {
        await activateProduct(productId); // Implementa esta función si deseas reactivar productos
        console.warn(`Reactivación de producto no implementada. ID: ${productId}`);
      }
      return;
    } catch (error) {
      console.error("Error en el canal IPC 'toggle-active-state':", error);
      throw error;
    }
  });

  ipcMain.handle('create-invoice', async (_event, invoice) => {
    try {
      console.log("Factura recibida para creación:", invoice);
      return await createInvoice(invoice);
    } catch (error) {
      console.error("Error en el canal IPC 'create-invoice':", error);
      throw error;
    }
  });


  // TODO (Fase 3): facturas
  // ipcMain.handle('db:add-invoice',       async (_, invoice) => { ... })
  // ipcMain.handle('db:get-invoices',      async () => { ... })
  // ipcMain.handle('db:download-invoices', async (_, invoiceId) => { ... })

  // TODO (Fase 3): operaciones
  // ipcMain.handle('calc-total',     async (_, product) => { ... })
  // ipcMain.handle('filter-by-date', async (_, date) => { ... })
  // ipcMain.handle('daily-balance',  async (_, day) => { ... })

  // TODO (Fase 4): historial y detalle
  // ipcMain.handle('history-button',    async () => { ... })
  // ipcMain.handle('get-invoiceDetail', async (_, invoiceId) => { ... })

  // TODO: impresión
  // ipcMain.handle('print-ticket', async (_, invoice) => { ... })
}

// ─── Ventana principal ────────────────────────────────────────────────────────

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1366,
    height: 768,
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      backgroundThrottling: true,
      v8CacheOptions: 'bypassHeatCheck',
      webSecurity: true,
    },
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  win.loadFile('./src/index.html');

  win.on('minimize', () => {
    win.webContents.setBackgroundThrottling(true);
  });

  win.on('restore', () => {
    win.webContents.setBackgroundThrottling(false);
  });
}

// ─── Ciclo de vida ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  const dbPath = path.join(app.getPath('userData'), 'gestpalette.db');
  initDB(dbPath);

  ensureDailySession()
  registerIPCHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  closeDB();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
