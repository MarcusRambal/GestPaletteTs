import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { initDB, closeDB } from '../db/schema';
import { getProducts } from '../db/queries/products';

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
  ipcMain.handle('get-products', async () => {
    return await getProducts();
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
    width: 800,
    height: 600,
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
