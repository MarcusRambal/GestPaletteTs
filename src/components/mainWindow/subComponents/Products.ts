import { storeGlobal } from '../../../store/Store.js';
import type { Product } from '../../../../types/types.js';


export class Products {
  private productList: HTMLDivElement | null = null;

  constructor() {
    this.productList = null;

    storeGlobal.subscribe((state) => {
      
      if (!this.productList || !document.body.contains(this.productList)) {
      console.log("Products: El componente no está visible en el DOM, ignorando renderizado de fondo.");
      return;
    }

      this.renderList(state.productsCatalog, state.searchQuery, state.selectedCategory);
    })
      
  }

  render(subContainer: HTMLElement): void {
    subContainer.innerHTML = `

    <div class = "products-container">
        <div class="products-header"> 
          <h3>Productos</h3>
        </div>

      
          <div class="products-list" id="products-list">
            <p class="loading">Cargando productos...</p>
          </div>
      </div>
    `;

    // Asignamos el contenedor casteándolo correctamente
    this.productList = subContainer.querySelector('#products-list') as HTMLDivElement | null;
    
    this.loadProducts();
  }

  private async loadProducts(): Promise<void> {
   
    if (!this.productList) return;

    try {
      if(storeGlobal.get().productsCatalog.length > 0  ){
      //  console.log("Productos ya cargados en el store, evitando llamada a API.");

        this.productList.innerHTML = ""; 
        const state = storeGlobal.get();
        this.renderList(state.productsCatalog, state.searchQuery, state.selectedCategory);
        return;
      }
      const products: Product[] = await window.paletteAPI.Products.getProducts();
      
     // console.log("Productos obtenidos:", products);

      this.productList.innerHTML = ""; 

      storeGlobal.update({ productsCatalog: products });

    } catch (error) {
      console.error("Error al cargar productos:", error);
      this.productList.innerHTML = `<p class="error-text">Error al cargar productos.</p>`;
    }
  }

  private renderList (products: Product[], searchQuery: string, selectedCategory: string): void {
    if (!this.productList) return;

    this.productList.innerHTML = ""; // Limpiamos el mensaje de carga

     if (products.length === 0) {
        this.productList.innerHTML = `<p class="null-text">No hay productos registrados.</p>`;
        return;
      }

      products.forEach(product => {
        // Creamos el contenedor de la tarjeta especificando que es un HTMLDivElement
        const productCard = document.createElement('div') as HTMLDivElement;
        
        // Asignamos el dataset de forma segura (los datasets guardan strings)
        productCard.dataset.id = product.id.toString();

        const categoryClass = `cat-${product.category_name.toLowerCase().trim()}`;
        productCard.className = `product-card ${categoryClass}`;

        productCard.innerHTML = `
          <div class="product-info">
            <span class="product-name">${product.name}</span>
            <span class="product-category-name">${product.category_name}</span> 
          </div>
          <div class="product-price-badge">$${product.price}</div>
        `;
        
        // El evento click sabe exactamente qué tipo de objeto 'product' está enviando
        productCard.addEventListener('click', () => this.selectProduct(product));

        // TypeScript sabe con certeza que this.productList no es null gracias a la validación del inicio
        this.productList!.appendChild(productCard);
      });

  }

  selectProduct(product: Product): void {
   // console.log("Producto seleccionado:", product);
    // Aquí más adelante podrás disparar un storeGlobal.update(...) para mandarlo al carrito
  }
}