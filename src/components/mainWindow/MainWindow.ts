import { Search } from './subComponents/Search.js';
import { Products } from './subComponents/Products.js';
import { Table } from './subComponents/Table.js';
import { Checkout } from './subComponents/Checkout.js';

export class MainWindow {
  private search: Search;
  private products: Products;
  
  // 🌟 Instanciamos los componentes exclusivos una sola
  private table: Table;
  private checkout: Checkout;

  //Recibimos las instancias únicas compartidas por el Router
  constructor(searchInstance: Search, productsInstance: Products) {
    this.search = searchInstance;
    this.products = productsInstance;

    // 🌟 Creamos las instancias exclusivas de forma segura en el constructor
    this.table = new Table();
    this.checkout = new Checkout();
  }

  render(container: HTMLElement): void {
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

    // Renderizado limpio en sus respectivos contenedores
    if (searchContainer) this.search.render(searchContainer);
    if (productsContainer) this.products.render(productsContainer);
    if (tableContainer) this.table.render(tableContainer);
    if (checkoutContainer) this.checkout.render(checkoutContainer);
  }

  /**
   * 🌟 PROPAGACIÓN DE LIMPIEZA:
   * Cuando el Router destruye MainWindow, esta se encarga de apagar
   * las suscripciones de sus componentes exclusivos.
   */
  public destroy(): void {
    console.log("[MainWindow] Propagando destrucción a Table y Checkout...");
    
    if (typeof this.table.destroy === 'function') {
      this.table.destroy();
    }
    
    if (typeof this.checkout.destroy === 'function') {
      this.checkout.destroy();
    }
  }
}