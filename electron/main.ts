import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { initDB, closeDB } from '../db/schema';
import { getProducts, getCategories, createCategory, createProduct, editProduct, disableProduct} from '../db/queries/products';

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

  // ❌ Desactivar Producto (Borrado Lógico)
  ipcMain.handle('delete-product', async (_event, productId) => {
    try {
      await disableProduct(productId);
      return; 
    } catch (error) {
      console.error("Error en el canal IPC 'delete-product':", error);
      throw error;
    }
  });

  // TODO (Fase 2):
  // ipcMain.handle('add-product',    async (_, product) => { ... })
  // ipcMain.handle('save-product',   async (_, product) => { ... })
  // ipcMain.handle('delete-product', async (_, productId) => { ... })

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
