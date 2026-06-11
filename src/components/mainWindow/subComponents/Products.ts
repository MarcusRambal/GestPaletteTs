
import type { Product } from '../../../../types/types.js';


export class Products {
  // 2. Declaramos la propiedad de la clase con su tipo de elemento del DOM
  private productList: HTMLDivElement | null = null;

  constructor() {
    this.productList = null;
  }

  render(subContainer: HTMLElement): void {
    subContainer.innerHTML = `
      <div class="products-list">
        <div class="product-list" id="product-list">
          <p class="loading">Cargando productos...</p>
        </div>
      </div>
    `;

    // Asignamos el contenedor casteándolo correctamente
    this.productList = subContainer.querySelector('#product-list') as HTMLDivElement | null;
    
    this.loadProducts();
  }

  async loadProducts(): Promise<void> {
    // Si por algún motivo no se encontró el contenedor en el DOM, salimos para evitar romper el flujo
    if (!this.productList) return;

    try {
      // 3. Forzamos a que la respuesta de la API de Electron use el tipado de nuestra interfaz
      // Nota: Si usaste 'window.electronAPI', cámbialo por tu API 'paletteAPI' extendida en el preload
      const products: Product[] = await window.paletteAPI.Products.getProducts();
      console.log("Productos obtenidos:", products);

      this.productList.innerHTML = ""; // Limpiamos el mensaje de carga

      const activeProducts = products.filter(p => p.active === 1);
      if (activeProducts.length === 0) {
        this.productList.innerHTML = `<p class="null-text">No hay productos registrados.</p>`;
        return;
      }

      activeProducts.forEach(product => {
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

    } catch (error) {
      console.error("Error al cargar productos:", error);
      this.productList.innerHTML = `<p class="error-text">Error al cargar productos.</p>`;
    }
  }

  selectProduct(product: Product): void {
    console.log("Producto seleccionado:", product);
    // Aquí más adelante podrás disparar un storeGlobal.update(...) para mandarlo al carrito
  }
}