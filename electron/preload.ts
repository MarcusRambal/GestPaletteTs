import { contextBridge, ipcRenderer } from 'electron';
import { Product, Category } from '@app/types';


// 1. Creamos el objeto con todas tus APIs tipadas de forma nativa
const paletteAPI = {
  Products: {
    getProducts: async (): Promise<Product[]> => {
      return await ipcRenderer.invoke('get-products');
    },
    getCategories: async (): Promise<Category[]> => {
      return await ipcRenderer.invoke('get-categories')
    }, 
    createCategory: async (category: { name: string; color: string }): Promise<number> => {
      return await ipcRenderer.invoke('create-category', category);
    },
    createProduct: async (product: { name: string; price: number; category_id: number; category_name: string; }): Promise<number> => {
      return await ipcRenderer.invoke('create-product', product);
    },
    updateProduct: async (productId: number, updatedData: { name: string; price: number; category_id: number; }): Promise<void> => {
      return await ipcRenderer.invoke('update-product', productId, updatedData);
    },
     deleteProduct: async (productId: number): Promise<any> => {
      return await ipcRenderer.invoke('delete-product', productId);
    },
  },
  Invoice: {
    addInvoice: async (invoice: any): Promise<any> => {
      return await ipcRenderer.invoke('db:add-invoice', invoice);
    },
    getInvoice: async (): Promise<any[]> => {
      return await ipcRenderer.invoke('db:get-invoices');
    },
    downloadInvoices: async (invoiceId: number): Promise<any> => {
      return await ipcRenderer.invoke('db:download-invoices', invoiceId);
    }
  },
  Operations: {
    calcTotal: async (product: any): Promise<number> => {
      return await ipcRenderer.invoke('calc-total', product);
    },
    filterByDate: async (date: string): Promise<any[]> => {
      return await ipcRenderer.invoke('filter-by-date', date);
    },
    filterByDay: async (day: string): Promise<any[]> => {
      return await ipcRenderer.invoke('daily-balance', day);
    }
  },
  Calls: {
    historyButton: async (): Promise<any> => {
      return await ipcRenderer.invoke('history-button');
    },
    detailButton: async (invoiceId: number): Promise<any> => {
      return await ipcRenderer.invoke('get-invoiceDetail', invoiceId);
    }
  },
  Printer: {
    printTicket: async (invoice: any): Promise<any> => {
      return await ipcRenderer.invoke('print-ticket', invoice);
    }
  }
};

// 2. Exponemos el objeto al proceso de renderizado (Frontend)
contextBridge.exposeInMainWorld('paletteAPI', paletteAPI);
