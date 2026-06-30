import { Search } from './subComponents/Search.js';
import { Products } from './subComponents/Products.js';
import { Table } from './subComponents/Table.js';
import { Checkout } from './subComponents/Checkout.js';


export class MainWindow {
  // 1. Declaramos las propiedades de la clase con sus respectivos tipos
  private search: Search | null = null;
  private products: Products | null = null;
  private table: Table | null = null;
  private checkout: Checkout | null = null;

  render(container: HTMLElement): void {
    // Inyectamos la estructura base del layout
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

    // 2. Capturamos los sub-contenedores asegurando su tipo
    const searchContainer = container.querySelector('#search-container') as HTMLDivElement | null;
    const productsContainer = container.querySelector('#products-container') as HTMLDivElement | null;
    const tableContainer = container.querySelector("#table-container") as HTMLDivElement | null;
    const checkoutContainer = container.querySelector("#checkout-container") as HTMLDivElement | null;

    // 3. Renderizamos los subcomponentes de forma segura con una validación
    if (searchContainer) {
      this.search = new Search();
      this.search.render(searchContainer);
    } else {
      console.error("MainWindow Error: No se encontró '#search-container' en el DOM.");
    }

    if (productsContainer) {
      this.products = new Products();
      this.products.render(productsContainer);
    } else {
      console.error("MainWindow Error: No se encontró '#products-container' en el DOM.");
    }

    if(tableContainer) {
      this.table = new Table();
      this.table.render(tableContainer);
    }else{
      console.error("MainWindow Error: No se encontró '#table-container' en el DOM.")
    }

    if(checkoutContainer) {
      this.checkout = new Checkout();
      this.checkout.render(checkoutContainer)
    }else {
      console.error("MainWindow Error: No se encontró '#payment-container' en el DOM.")
    }
  }
}