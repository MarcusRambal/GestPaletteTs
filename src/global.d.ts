// Archivo ambient (sin import/export) → extiende Window globalmente sin declare global
interface Window {
  paletteAPI: {
    Products: {
      getProducts: () => Promise<import('../types/types').Product[]>;
      addProduct: (product: Omit<import('../types/types').Product, 'id'>) => Promise<any>;
      saveProducts: (product: import('../types/types').Product) => Promise<any>;
      deleteProduct: (productId: number) => Promise<any>;
    };
    Invoice: {
      addInvoice: (invoice: any) => Promise<any>;
      getInvoice: () => Promise<any[]>;
      downloadInvoices: (invoiceId: number) => Promise<any>;
    };
    Operations: {
      calcTotal: (product: any) => Promise<number>;
      filterByDate: (date: string) => Promise<any[]>;
      filterByDay: (day: string) => Promise<any[]>;
    };
    Calls: {
      historyButton: () => Promise<any>;
      detailButton: (invoiceId: number) => Promise<any>;
    };
    Printer: {
      printTicket: (invoice: any) => Promise<any>;
    };
  };
}
