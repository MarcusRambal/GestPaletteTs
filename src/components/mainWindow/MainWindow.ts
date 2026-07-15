import { Search } from './subComponents/Search.js';
import { Products } from './subComponents/Products.js';
import { Table } from './subComponents/Table.js';
import { Checkout } from './subComponents/Checkout.js';

export class MainWindow {
  private search: Search;
  private products: Products;
  
  // 🌟 Las referencias se inicializan en null de forma segura
  private table: Table | null = null;
  private checkout: Checkout | null = null;

  // Recibimos únicamente las instancias compartidas por el Router
  constructor(searchInstance: Search, productsInstance: Products) {
    this.search = searchInstance;
    this.products = productsInstance;
  }

  render(container: HTMLElement): void {
    // 🌟 1. Limpieza preventiva antes de renderizar la nueva vista
    this.destroy();

    container.innerHTML = `
      <div class="main-window-container"> 
        <div class="left-panel">
          <div id="search-container"></div>
          <div id="products-container"></div> 
        </div>
        <div class="right-panel">
          <div id="table-container"></div>
          <div id="checkout-container"></div>
        </div>
      </div>
    `;

    const searchContainer = container.querySelector('#search-container') as HTMLDivElement | null;
    const productsContainer = container.querySelector('#products-container') as HTMLDivElement | null;
    const tableContainer = container.querySelector("#table-container") as HTMLDivElement | null;
    const checkoutContainer = container.querySelector("#checkout-container") as HTMLDivElement | null;

    // 🌟 2. Instanciación "perezosa" (on-demand)
    if (tableContainer) {
      this.table = new Table();
      this.table.render(tableContainer);
    }
    
    if (checkoutContainer) {
      this.checkout = new Checkout();
      this.checkout.render(checkoutContainer);
    }

    // Renderizado de las instancias compartidas
    if (searchContainer) this.search.render(searchContainer);
    if (productsContainer) this.products.render(productsContainer);
  }

  /**
   * 🌟 PROPAGACIÓN DE LIMPIEZA SIMÉTRICA:
   * Cuando el Router desmonta MainWindow, destruimos las vistas locales
   * y liberamos sus referencias para el recolector de basura.
   */
  public destroy(): void {
    if (!this.table && !this.checkout) return;

    console.log("[MainWindow] Propagando destrucción simétrica a Table y Checkout...");
    
    if (this.table && typeof this.table.destroy === 'function') {
      this.table.destroy();
    }
    
    if (this.checkout && typeof this.checkout.destroy === 'function') {
      this.checkout.destroy();
    }

    // 🌟 3. Anulación de referencias (Garantiza liberación de RAM)
    this.table = null;
    this.checkout = null;
  }
}